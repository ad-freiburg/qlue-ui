<h1 align="center">
    Qlue-UI
</h1>

**Qlue-UI** is modern WebUI for **SPARQL**, driven by [Qlue-ls](https://github.com/IoannisNezis/Qlue-ls).  
It does not tarket a single, but **many** SPARQL engines.  
It’s small, shiny, and ready to help you explore your RDF data effortlessly.  

---

<img width="1489" height="761" alt="20251220_13h30m32s_grim" src="https://github.com/user-attachments/assets/2a6ae687-0548-435f-a18a-1d4d767d5167" />

## Features

- Modern, lightweight WebUI for QLever with many language capabilities
    - completion
    - formatting
    - diagnostics
    - code actions
    - hover
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

Two management commands help you sync data between your development database and the distribution database:

### Import from Distribution

Reset your local database to match the distribution state:

```bash
cd backend

# Preview what would be imported
uv run python manage.py import_from_dist --backends --examples --dry-run

# Import backends and examples
uv run python manage.py import_from_dist --backends --examples

# Interactively select which backends to import
uv run python manage.py import_from_dist --backends --select

# Interactively select which examples to import
uv run python manage.py import_from_dist --examples --select

# Skip confirmation prompt
uv run python manage.py import_from_dist --backends --examples --force
```

### Export to Distribution

Update the distribution database with your local changes (for contributors):

```bash
cd backend

# Preview what would be exported
uv run python manage.py export_to_dist --backends --examples --dry-run

# Export backends and examples
uv run python manage.py export_to_dist --backends --examples

# Interactively select which backends to export
uv run python manage.py export_to_dist --backends --select

# Interactively select which examples to export
uv run python manage.py export_to_dist --examples --select

# Skip confirmation prompt
uv run python manage.py export_to_dist --backends --examples --force
```

### Available Options

| Option | Description |
|--------|-------------|
| `--backends` | Include SparqlEndpointConfiguration records |
| `--examples` | Include QueryExample records |
| `--saved` | Include SavedQuery records (not recommended) |
| `--all` | Include all models |
| `--select` | Interactively select records (use with `--backends` or `--examples`) |
| `--dry-run` | Preview changes without modifying data |
| `--force` | Skip confirmation prompt |

### Notes

- **Always use `--dry-run` first** to preview changes before modifying data
- **Import order matters**: If importing examples alone, the referenced backends must already exist in your database
- **SavedQuery is user-generated**: Avoid importing/exporting saved queries unless you have a specific reason
- **Interactive selection**: Add `--select` to `--backends` or `--examples` to pick specific records via a checkbox UI (space to toggle, enter to confirm)
- Both commands show detailed summaries of affected records before execution

---

## License

[MIT License](https://mit-license.org/)
