"""
Import data from the distribution database to the development/production database.

This command imports selected models from the distribution database (db.sqlite3.dist)
into your current working database. Use this to reset your dev environment or to
initialize a fresh production deployment.

USAGE:
    python manage.py import_from_dist [options]

OPTIONS:
    --backends      Import SparqlEndpointConfiguration records
    --examples      Import QueryExample records
    --saved         Import SavedQuery records (usually NOT recommended)
    --all           Import all models
    --select        Interactively select which records to import (use with --backends or --examples)
    --dry-run       Show what would be imported without making changes
    --force         Skip confirmation prompt

EXAMPLES:
    # Preview what backends would be imported
    python manage.py import_from_dist --backends --dry-run

    # Import all backends
    python manage.py import_from_dist --backends

    # Interactively select which backends to import
    python manage.py import_from_dist --backends --select

    # Interactively select which examples to import
    python manage.py import_from_dist --examples --select

    # Reset backends and examples together
    python manage.py import_from_dist --backends --examples

    # Full reset to distribution state (use with caution)
    python manage.py import_from_dist --all

WARNINGS:
    - This DELETES and REPLACES data in your current database
    - If importing examples, the referenced backends must exist (import them first
      or together with --backends --examples)
    - SavedQuery contains user-generated content - importing will delete existing shares
    - Always use --dry-run first to preview changes

DATA FLOW:
    [db.sqlite3.dist] --import--> [current db.sqlite3]
"""

import sqlite3
from pathlib import Path

import questionary
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.db import transaction

from api.models import SparqlEndpointConfiguration, QueryExample, SavedQuery


class Command(BaseCommand):
    help = "Import data from distribution database (db.sqlite3.dist) to current database"

    def add_arguments(self, parser):
        parser.add_argument(
            "--backends",
            action="store_true",
            help="Import SparqlEndpointConfiguration records",
        )
        parser.add_argument(
            "--examples",
            action="store_true",
            help="Import QueryExample records",
        )
        parser.add_argument(
            "--saved",
            action="store_true",
            help="Import SavedQuery records (usually not recommended)",
        )
        parser.add_argument(
            "--all",
            action="store_true",
            help="Import all models",
        )
        parser.add_argument(
            "--select",
            action="store_true",
            help="Interactively select records (use with --backends or --examples)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be imported without making changes",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Skip confirmation prompt",
        )

    def handle(self, *args, **options):
        dist_db_path = Path(settings.BASE_DIR).parent / "db.sqlite3.dist"

        if not dist_db_path.exists():
            raise CommandError(
                f"Distribution database not found at {dist_db_path}\n"
                "Ensure db.sqlite3.dist exists in the project root."
            )

        # Determine which models to import
        import_backends = options["backends"] or options["all"]
        import_examples = options["examples"] or options["all"]
        import_saved = options["saved"] or options["all"]
        interactive_select = options["select"]

        if interactive_select and not any([import_backends, import_examples]):
            raise CommandError(
                "--select requires --backends or --examples.\n"
                "Example: --backends --select"
            )

        if not any([import_backends, import_examples, import_saved]):
            raise CommandError(
                "No models selected for import.\n"
                "Use --backends, --examples, --saved, or --all"
            )

        # Connect to distribution database and read data
        conn = sqlite3.connect(dist_db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        imports = []

        try:
            if import_backends:
                cursor.execute(
                    "SELECT * FROM api_sparqlendpointconfiguration ORDER BY sort_key, name"
                )
                backends = cursor.fetchall()
                if interactive_select:
                    backends = self._interactive_backend_select(backends)
                    if backends is None:
                        self.stdout.write(self.style.WARNING("Selection cancelled."))
                        return
                if backends:
                    imports.append(("SparqlEndpointConfiguration", list(backends)))

            if import_examples:
                cursor.execute(
                    "SELECT e.*, b.slug as backend_slug FROM api_queryexample e "
                    "JOIN api_sparqlendpointconfiguration b ON e.backend_id = b.id "
                    "ORDER BY b.sort_key, e.sort_key, e.name"
                )
                examples = cursor.fetchall()
                if interactive_select:
                    examples = self._interactive_example_select(examples)
                    if examples is None:
                        self.stdout.write(self.style.WARNING("Selection cancelled."))
                        return
                if examples:
                    imports.append(("QueryExample", list(examples)))

            if import_saved:
                cursor.execute("SELECT * FROM api_savedquery")
                saved = cursor.fetchall()
                imports.append(("SavedQuery", list(saved)))

        finally:
            conn.close()

        if not imports:
            self.stdout.write(self.style.WARNING("No data selected for import."))
            return

        # Show current state
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.WARNING("IMPORT FROM DISTRIBUTION DATABASE"))
        self.stdout.write("=" * 60)
        self.stdout.write(f"\nSource: {dist_db_path}\n")

        # Show what will be deleted
        self.stdout.write("Current data that will be DELETED:")
        if import_backends:
            current_backends = SparqlEndpointConfiguration.objects.count()
            self.stdout.write(f"  - SparqlEndpointConfiguration: {current_backends} records")
        if import_examples:
            current_examples = QueryExample.objects.count()
            self.stdout.write(f"  - QueryExample: {current_examples} records")
        if import_saved:
            current_saved = SavedQuery.objects.count()
            self.stdout.write(f"  - SavedQuery: {current_saved} records")

        # Show what will be imported
        self.stdout.write("\nData to import from dist db:")
        for model_name, records in imports:
            self.stdout.write(f"  - {model_name}: {len(records)} records")
            if model_name == "SparqlEndpointConfiguration":
                for r in records:
                    self.stdout.write(f"      * {r['slug']} ({r['name']})")
            elif model_name == "QueryExample":
                for r in records:
                    backend_info = r.get('backend_slug') or f"backend_id: {r['backend_id']}"
                    self.stdout.write(f"      * {r['name']} ({backend_info})")
            elif model_name == "SavedQuery":
                for r in list(records)[:5]:
                    self.stdout.write(f"      * {r['id']}")
                if len(records) > 5:
                    self.stdout.write(f"      * ... and {len(records) - 5} more")

        # Check for FK issues
        if import_examples and not import_backends:
            self.stdout.write("")
            self.stdout.write(
                self.style.WARNING(
                    "NOTE: Importing examples without backends. Ensure backends with "
                    "matching IDs exist in your current database, or import them together."
                )
            )

        if options["dry_run"]:
            self.stdout.write(self.style.SUCCESS("\n[DRY RUN] No changes made."))
            return

        # Confirmation
        self.stdout.write("")
        self.stdout.write(
            self.style.ERROR("WARNING: This will DELETE existing data and replace it!")
        )

        if import_saved:
            self.stdout.write(
                self.style.ERROR(
                    "WARNING: You are importing SavedQuery - existing user shares will be DELETED!"
                )
            )

        if not options["force"]:
            confirm = input("\nType 'yes' to confirm: ")
            if confirm.lower() != "yes":
                self.stdout.write(self.style.WARNING("Import cancelled."))
                return

        # Perform the import within a transaction
        try:
            with transaction.atomic():
                for model_name, records in imports:
                    if model_name == "SparqlEndpointConfiguration":
                        self._import_backends(records)
                    elif model_name == "QueryExample":
                        self._import_examples(records)
                    elif model_name == "SavedQuery":
                        self._import_saved(records)

            self.stdout.write(self.style.SUCCESS("\nImport completed successfully!"))

        except Exception as e:
            raise CommandError(f"Import failed: {e}")

    def _interactive_backend_select(self, all_backends):
        """Show interactive multi-select for backend configurations from dist db."""
        if not all_backends:
            self.stdout.write(self.style.WARNING("No backends found in distribution database."))
            return []

        choices = [
            questionary.Choice(
                title=f"{backend['slug']} ({backend['name']})",
                value=backend,
                checked=True,
            )
            for backend in all_backends
        ]

        self.stdout.write("\nSelect backends to import (space to toggle, enter to confirm):\n")

        selected = questionary.checkbox(
            "Backends:",
            choices=choices,
        ).ask()

        return selected

    def _interactive_example_select(self, all_examples):
        """Show interactive multi-select for query examples from dist db."""
        if not all_examples:
            self.stdout.write(self.style.WARNING("No examples found in distribution database."))
            return []

        choices = [
            questionary.Choice(
                title=f"{example['name']} ({example['backend_slug']})",
                value=example,
                checked=True,
            )
            for example in all_examples
        ]

        self.stdout.write("\nSelect examples to import (space to toggle, enter to confirm):\n")

        selected = questionary.checkbox(
            "Examples:",
            choices=choices,
        ).ask()

        return selected

    def _import_backends(self, records):
        """Import SparqlEndpointConfiguration records."""
        SparqlEndpointConfiguration.objects.all().delete()
        self.stdout.write("  Cleared existing backends")

        for row in records:
            SparqlEndpointConfiguration.objects.create(
                id=row["id"],
                name=row["name"],
                engine=row["engine"],
                slug=row["slug"],
                is_default=row["is_default"],
                sort_key=row["sort_key"],
                url=row["url"],
                api_token=row["api_token"],
                prefixes=row["prefixes"],
                subject_completion=row["subject_completion"],
                predicate_completion_context_sensitive=row["predicate_completion_context_sensitive"],
                predicate_completion_context_insensitive=row["predicate_completion_context_insensitive"],
                object_completion_context_sensitive=row["object_completion_context_sensitive"],
                object_completion_context_insensitive=row["object_completion_context_insensitive"],
                hover=row["hover"],
            )
        self.stdout.write(self.style.SUCCESS(f"  Imported {len(records)} backends"))

    def _import_examples(self, records):
        """Import QueryExample records."""
        QueryExample.objects.all().delete()
        self.stdout.write("  Cleared existing examples")

        for row in records:
            QueryExample.objects.create(
                id=row["id"],
                name=row["name"],
                query=row["query"],
                sort_key=row["sort_key"],
                backend_id=row["backend_id"],
            )
        self.stdout.write(self.style.SUCCESS(f"  Imported {len(records)} examples"))

    def _import_saved(self, records):
        """Import SavedQuery records."""
        SavedQuery.objects.all().delete()
        self.stdout.write("  Cleared existing saved queries")

        for row in records:
            # Bypass the auto-ID generation by directly setting id
            SavedQuery.objects.create(
                id=row["id"],
                content=row["content"],
            )
        self.stdout.write(self.style.SUCCESS(f"  Imported {len(records)} saved queries"))
