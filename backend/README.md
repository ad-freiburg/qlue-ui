# Qlue-UI Backend

FastAPI service that serves SPARQL endpoint configurations and shared queries.

## What it serves

All routes are mounted under `{BASE_PATH}/ui-api`.

| Route                              | Method | Description                                         |
|------------------------------------|--------|-----------------------------------------------------|
| `/health`                          | GET    | Health check                                        |
| `/endpoints/`                      | GET    | All SPARQL endpoint configurations                  |
| `/endpoints/{slug}/`               | GET    | Single endpoint configuration by slug               |
| `/endpoints/{slug}/`               | POST   | Create an endpoint configuration (requires API key) |
| `/endpoints/{slug}/`               | PATCH  | Update an endpoint configuration (requires API key) |
| `/endpoints/{slug}/examples/`      | GET    | Example `.rq` queries for an endpoint, in `order`   |
| `/endpoints/{slug}/examples/`      | POST   | Create an example query (requires API key)          |
| `/endpoints/{slug}/examples/`      | PUT    | Overwrite an example query (requires API key)       |
| `/endpoints/{slug}/examples/`      | DELETE | Delete an example query (requires API key)          |
| `/endpoints/{slug}/examples/order` | PUT    | Reorder an endpoint's examples (requires API key)   |
| `/shared-query/`                   | POST   | Store a SPARQL query, returns a short ID            |
| `/shared-query/{short_id}`         | GET    | Retrieve a shared query by short ID                 |

## Storage

**Endpoint configurations** are loaded into memory at startup from the path in `CONFIG_PATH` (default: `config.yaml`). The path may be either:

- a **single YAML file** whose top-level keys are slugs mapping to `SparqlEndpointConfiguration` blocks (name, URL, engine, prefix map, etc.), or
- a **directory** containing one `<slug>.yaml` file per endpoint. The filename stem is the slug; the file content is the endpoint block directly (no top-level slug wrapper). Files whose stem doesn't match the slug pattern are rejected at load.

If `CONFIG_PATH` points at a YAML file that does not exist, it is seeded from
the shipped `src/api/defaults/config.yaml` on startup. `backend/config.yaml` is
git-ignored, so local endpoint edits never end up in a commit.

API writes (`POST` / `PATCH`) persist to the same shape: file mode rewrites the single file, directory mode rewrites only the affected `<slug>.yaml` files.

**Example queries** are read from the filesystem. Each endpoint slug has a directory under `examples/` containing `.rq` files. If `EXAMPLES_DIR` does not exist, it is seeded from the shipped `src/api/defaults/examples/` on startup; `backend/examples/` is git-ignored, so examples curated through the UI stay local. Files created through the API use OS-safe, enumerated names (`example-001.rq`, `example-002.rq`, …); the human-readable name is stored in a leading frontmatter comment so it can contain characters that are invalid in filenames on non-Linux systems:

```
#+ title: My example query
#+ order: 20

SELECT * WHERE { ?s ?p ?o }
```

The frontmatter is YAML: stripping the `#+ ` prefix from each leading line yields a valid YAML mapping, and the `title` key holds the name (so names with special characters are quoted automatically). You can also drop in your own `.rq` files with arbitrary names — those without a `title` fall back to the filename as their name.

The optional `order` key controls the position of an example in the listing: examples are sorted by `order` ascending, and those without one sort after all ordered examples (ties fall back to filename order). It can be set per example via the `order` field on `POST` / `PUT /endpoints/{slug}/examples/`, or for a whole endpoint at once via `PUT /endpoints/{slug}/examples/order`, whose body is the ordered list of example names and which assigns them positions `1..n`. On `PUT /endpoints/{slug}/examples/` an omitted `order` leaves the example's current position untouched, while an explicit `null` removes it.

**Shared queries** are stored in a SQLite database (`data/data.db` by default). Queries are deduplicated by SHA-256 hash. Each row stores a 6-character alphanumeric short ID, the query text, a hash, creation date, share count, and view count. The database uses WAL mode.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `CONFIG_PATH` | `config.yaml` | Path to the endpoint configuration. Either a single YAML file, or a directory of `<slug>.yaml` files |
| `EXAMPLES_DIR` | `examples` | Directory containing example query files |
| `DB_FILE` | `data/data.db` | Path to the SQLite database |
| `CORS_ORIGINS` | `*` | Comma-separated list of allowed CORS origins |
| `API_KEY` | — | Required to use write endpoints (e.g. updating examples) |

## Running

```
uv run fastapi dev src/api/main.py
```
