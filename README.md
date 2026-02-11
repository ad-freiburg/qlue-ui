<h1 align="center">
    Qlue-UI
</h1>

**Qlue-UI** is modern WebUI for **SPARQL**, driven by [Qlue-ls](https://github.com/IoannisNezis/Qlue-ls).  
It does not tarket a single, but **many** SPARQL engines.  
It’s small, shiny, and ready to help you explore your RDF data effortlessly.  

---

<img width="1489" height="761" alt="20251220_13h30m32s_grim" src="https://github.com/user-attachments/assets/2a6ae687-0548-435f-a18a-1d4d767d5167" />

## Features

- Modern, lightweight WebUI for SPARQL with many language capabilities
    - completion
    - formatting
    - diagnostics
    - code actions
    - hover
- Manage example queries per SPARQL endpoint
- Live query execution monitoring for QLever backends
- Result views for SELECT, CONSTRUCT, and UPDATE queries
- Parse tree view for inspecting query structure
- Easy deployment with Docker
- Clean separation of API and frontend

---

## Quick Start

Follow these steps to get Qlue-UI up and running:

### 1. Prepare the environment

```bash
cp db.sqlite3.dist db.sqlite3
cp .env.dist .env
```

Then open .env and update the values according to your setup.

### 2. Change ownership of the db

```bash
chown 1000 db.sqlite3
```

### 2. Build and run with Docker

```bash
docker compose build
docker compose up
```

Qlue-ui is now availiable under <http://localhost:8080>

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `?` | Open help |
| `Escape` | Close any dialog |
| `Ctrl+Enter` | Execute/cancel query |
| `Ctrl+F` | Format document |
| `Ctrl+,` | Open settings |
| `Tab` | Jump to next position |
| `Shift+Tab` | Jump to previous position |

### Commands

Open the command prompt with `:` (editor must be out of focus) and type a command:

| Command | Action |
|---------|--------|
| `parseTree` | Open the parse tree panel |
| `updateExample` | Update the current example query |

---

## Development Setup

For local development, set up the frontend and backend separately.

### Backend Setup

The backend uses **uv** as the package manager.

```bash
cd backend
uv sync                              # Install dependencies
uv run python manage.py migrate      # Run migrations
uv run python manage.py runserver    # Start server on port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev   # Start dev server on port 5173
```

Or run both together:
```bash
cd frontend && npm run dev-test
```

---

## Managing the Distribution Database

Qlue-UI uses a **distribution database** (`db.sqlite3.dist`) to ship default SPARQL backends and example queries. This file is committed to version control and serves as the template for new deployments.

Two management commands help you sync data between your development database and the distribution database.

### Sync Modes

| Mode | Flags | Behavior |
|------|-------|----------|
| **Reset** | *(default)* | ⚠️ **DELETES all existing data** and replaces with source |
| **Update** | `--update` | Adds new records, updates existing ones, **keeps** local-only records |
| **Sync** | `--update --delete` | ⚠️ Adds, updates, AND **DELETES** records not in source |

Records are matched by natural key (not auto-increment ID):
- `SparqlEndpointConfiguration`: matched by `name` field
- `QueryExample`: matched by `(backend.name, example.name)` tuple

### Import from Distribution

Import data from `db.sqlite3.dist` into your local database:

```bash
cd backend

# Preview what would be imported (always recommended first)
uv run python manage.py import_from_dist --backends --examples --dry-run
uv run python manage.py import_from_dist --backends --update --dry-run

# ⚠️ RESET MODE: Wipe and replace (DELETES existing data)
uv run python manage.py import_from_dist --backends --examples --force

# UPDATE MODE: Add/update records, keep local-only records (safe)
uv run python manage.py import_from_dist --backends --examples --update --force

# ⚠️ SYNC MODE: Full sync including deletions
uv run python manage.py import_from_dist --backends --update --delete --force

# Interactively select which records to import
uv run python manage.py import_from_dist --backends --select
uv run python manage.py import_from_dist --backends --select --update
```

### Export to Distribution

Export data from your local database to `db.sqlite3.dist` (for contributors):

```bash
cd backend

# Preview what would be exported
uv run python manage.py export_to_dist --backends --examples --dry-run
uv run python manage.py export_to_dist --backends --update --dry-run

# ⚠️ RESET MODE: Wipe and replace (DELETES existing data in dist)
uv run python manage.py export_to_dist --backends --examples --force

# UPDATE MODE: Add/update records, keep dist-only records (safe)
uv run python manage.py export_to_dist --backends --examples --update --force

# ⚠️ SYNC MODE: Full sync including deletions
uv run python manage.py export_to_dist --backends --update --delete --force

# Interactively select which records to export
uv run python manage.py export_to_dist --backends --select
uv run python manage.py export_to_dist --backends --select --update
```

### Available Options

| Option | Description |
|--------|-------------|
| `--backends` | Include SparqlEndpointConfiguration records |
| `--examples` | Include QueryExample records |
| `--saved` | Include SavedQuery records (not recommended) |
| `--all` | Include all models |
| `--select` | Interactively select records (use with `--backends` or `--examples`) |
| `--update` | Upsert mode: add/update without deleting other records |
| `--delete` | With `--update`: also delete records not in source ⚠️ |
| `--dry-run` | Preview changes without modifying data |
| `--force` | Skip confirmation prompt |

### Dry-run Output

With `--update`, the dry-run shows what will happen to each record:

```
[ADD]    new-backend          (not in destination)
[UPDATE] wikidata             (exists, will be updated)
[KEEP]   my-local-backend     (only in destination, will be kept)
[DELETE] old-backend          (only with --delete flag)
```

### Notes

- **Always use `--dry-run` first** to preview changes before modifying data
- **Use `--update` for safe incremental syncs** that preserve local-only records
- **Import order matters**: If importing examples alone, the referenced backends must already exist
- **SavedQuery is user-generated**: Avoid importing/exporting saved queries unless necessary
- **Interactive selection**: Add `--select` to pick specific records via checkbox UI

---

## License

[MIT License](https://mit-license.org/)
