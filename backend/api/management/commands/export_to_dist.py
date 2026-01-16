"""
Export data from the development database to the distribution database.

This command exports selected models from your current (dev) database to the
distribution database (db.sqlite3.dist). The distribution database is meant
to be committed to version control and copied during deployment.

USAGE:
    python manage.py export_to_dist [options]

OPTIONS:
    --backends      Export SparqlEndpointConfiguration records
    --examples      Export QueryExample records
    --saved         Export SavedQuery records (usually NOT recommended)
    --all           Export all models
    --dry-run       Show what would be exported without making changes
    --force         Skip confirmation prompt

EXAMPLES:
    # Preview what backends would be exported
    python manage.py export_to_dist --backends --dry-run

    # Export only example queries
    python manage.py export_to_dist --examples

    # Export backends and examples together
    python manage.py export_to_dist --backends --examples

    # Export everything (use with caution)
    python manage.py export_to_dist --all

WARNINGS:
    - This OVERWRITES data in the distribution database
    - SavedQuery contains user-generated content - think twice before exporting
    - QueryExample has a foreign key to SparqlEndpointConfiguration - if you
      export examples, the referenced backends must exist in the dist db
    - Always use --dry-run first to preview changes

DATA FLOW:
    [dev db.sqlite3] --export--> [db.sqlite3.dist]
"""

import sqlite3
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.core import serializers
from django.conf import settings

from api.models import SparqlEndpointConfiguration, QueryExample, SavedQuery


class Command(BaseCommand):
    help = "Export data from dev database to distribution database (db.sqlite3.dist)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--backends",
            action="store_true",
            help="Export SparqlEndpointConfiguration records",
        )
        parser.add_argument(
            "--examples",
            action="store_true",
            help="Export QueryExample records",
        )
        parser.add_argument(
            "--saved",
            action="store_true",
            help="Export SavedQuery records (usually not recommended)",
        )
        parser.add_argument(
            "--all",
            action="store_true",
            help="Export all models",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be exported without making changes",
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
                "Create it first by copying your dev database:\n"
                "  cp backend/db.sqlite3 db.sqlite3.dist"
            )

        # Determine which models to export
        export_backends = options["backends"] or options["all"]
        export_examples = options["examples"] or options["all"]
        export_saved = options["saved"] or options["all"]

        if not any([export_backends, export_examples, export_saved]):
            raise CommandError(
                "No models selected for export.\n"
                "Use --backends, --examples, --saved, or --all"
            )

        # Collect data to export
        exports = []

        if export_backends:
            backends = list(SparqlEndpointConfiguration.objects.all())
            exports.append(("SparqlEndpointConfiguration", backends))

        if export_examples:
            examples = list(QueryExample.objects.all())
            exports.append(("QueryExample", examples))

        if export_saved:
            saved = list(SavedQuery.objects.all())
            exports.append(("SavedQuery", saved))

        # Show summary
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.WARNING("EXPORT TO DISTRIBUTION DATABASE"))
        self.stdout.write("=" * 60)
        self.stdout.write(f"\nTarget: {dist_db_path}\n")
        self.stdout.write("Models to export:")

        for model_name, records in exports:
            self.stdout.write(f"  - {model_name}: {len(records)} records")
            if model_name == "SparqlEndpointConfiguration":
                for r in records:
                    self.stdout.write(f"      * {r.slug} ({r.name})")
            elif model_name == "QueryExample":
                for r in records:
                    self.stdout.write(f"      * {r.name} (backend: {r.backend.slug})")
            elif model_name == "SavedQuery":
                for r in records[:5]:
                    self.stdout.write(f"      * {r.id}")
                if len(records) > 5:
                    self.stdout.write(f"      * ... and {len(records) - 5} more")

        if options["dry_run"]:
            self.stdout.write(self.style.SUCCESS("\n[DRY RUN] No changes made."))
            return

        # Confirmation
        self.stdout.write("")
        self.stdout.write(
            self.style.ERROR("WARNING: This will OVERWRITE data in the dist database!")
        )

        if export_saved:
            self.stdout.write(
                self.style.ERROR(
                    "WARNING: You are exporting SavedQuery - these are user-generated!"
                )
            )

        if not options["force"]:
            confirm = input("\nType 'yes' to confirm: ")
            if confirm.lower() != "yes":
                self.stdout.write(self.style.WARNING("Export cancelled."))
                return

        # Connect to distribution database
        conn = sqlite3.connect(dist_db_path)
        cursor = conn.cursor()

        try:
            # Export each model
            for model_name, records in exports:
                if model_name == "SparqlEndpointConfiguration":
                    self._export_backends(cursor, records)
                elif model_name == "QueryExample":
                    self._export_examples(cursor, records)
                elif model_name == "SavedQuery":
                    self._export_saved(cursor, records)

            conn.commit()
            self.stdout.write(self.style.SUCCESS("\nExport completed successfully!"))

        except Exception as e:
            conn.rollback()
            raise CommandError(f"Export failed: {e}")
        finally:
            conn.close()

    def _export_backends(self, cursor, records):
        """Export SparqlEndpointConfiguration records."""
        cursor.execute("DELETE FROM api_sparqlendpointconfiguration")
        self.stdout.write(f"  Cleared existing backends from dist db")

        for backend in records:
            cursor.execute(
                """
                INSERT INTO api_sparqlendpointconfiguration (
                    id, name, engine, slug, is_default, sort_key, url, api_token,
                    prefixes, subject_completion, predicate_completion_context_sensitive,
                    predicate_completion_context_insensitive, object_completion_context_sensitive,
                    object_completion_context_insensitive, hover
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    backend.id,
                    backend.name,
                    backend.engine,
                    backend.slug,
                    backend.is_default,
                    backend.sort_key,
                    backend.url,
                    backend.api_token,
                    backend.prefixes,
                    backend.subject_completion,
                    backend.predicate_completion_context_sensitive,
                    backend.predicate_completion_context_insensitive,
                    backend.object_completion_context_sensitive,
                    backend.object_completion_context_insensitive,
                    backend.hover,
                ),
            )
        self.stdout.write(
            self.style.SUCCESS(f"  Exported {len(records)} backends")
        )

    def _export_examples(self, cursor, records):
        """Export QueryExample records."""
        cursor.execute("DELETE FROM api_queryexample")
        self.stdout.write(f"  Cleared existing examples from dist db")

        for example in records:
            cursor.execute(
                """
                INSERT INTO api_queryexample (id, name, query, sort_key, backend_id)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    example.id,
                    example.name,
                    example.query,
                    example.sort_key,
                    example.backend_id,
                ),
            )
        self.stdout.write(
            self.style.SUCCESS(f"  Exported {len(records)} examples")
        )

    def _export_saved(self, cursor, records):
        """Export SavedQuery records."""
        cursor.execute("DELETE FROM api_savedquery")
        self.stdout.write(f"  Cleared existing saved queries from dist db")

        for saved in records:
            cursor.execute(
                """
                INSERT INTO api_savedquery (id, content)
                VALUES (?, ?)
                """,
                (saved.id, saved.content),
            )
        self.stdout.write(
            self.style.SUCCESS(f"  Exported {len(records)} saved queries")
        )
