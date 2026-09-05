# Setup with Docker

Qlue-UI ships as a single Docker image that contains both the pre-built
frontend and the FastAPI backend. The backend serves the frontend as static
files, so one container is all you need.

## Quick start

!!! important "The image was renamed"
    The image is now published as `ghcr.io/qlever-dev/qlue-ui`. The old
    `ghcr.io/qlever-dev/qlever-ui-new` package receives no further builds —
    update the `image:` line in your `docker-compose.yaml` (or your
    `docker pull` / `docker run` command) to the new name. No configuration
    or data changes are needed.

Pre-built images are published to the GitHub Container Registry. The
repository ships a `docker-compose.yaml` that uses them — clone the
repository and run:

```bash
docker compose up
```

Qlue-UI is now available at <http://localhost>, pre-configured with
the public [Wikidata endpoint](https://qlever.dev/api/wikidata).

### Image tags

| Tag | Meaning |
|-----|---------|
| `edge` | The latest build of the `main` branch. |
| `1.2.3`, `1.2`, `1`, `latest` | Release builds, published for every version tag. |

??? info "Building the image yourself"
    You can also build the image locally from the repository root:

    ```bash
    docker build -t qlue-ui .
    ```

    The `Dockerfile` is a three-stage build:

    1. **Frontend** — Node builds the Vite bundle (`frontend/dist`).
    2. **Dependencies** — [uv](https://docs.astral.sh/uv/) installs the locked
       Python dependencies into a virtualenv.
    3. **Final image** — a slim Python image that contains the backend code,
       the built frontend, the bundled example queries, and the
       shipped default config copied to `/app/config.yaml`. It runs as an
       unprivileged user (`appuser`) and starts uvicorn on port **7000** with
       `--proxy-headers` enabled.

## Configuration

The container is configured through a YAML file and a handful of environment
variables.

### Endpoint configuration

The image ships the default config baked in as `/app/config.yaml` —
the public QLever endpoints (Wikidata, DBLP, OSM planet, IMDb,
Wikidata QLever), with Wikidata as the default. To use your own endpoints,
mount a configuration over it:

```yaml title="docker-compose.yaml"
services:
  ui:
    image: ghcr.io/qlever-dev/qlue-ui:edge
    ports:
      - 80:7000
    volumes:
      - ./config.yaml:/app/config.yaml:ro
```

Alternatively, mount a **directory** of per-endpoint files (one
`<slug>.yaml` per endpoint) and point `CONFIG_PATH` at it:

```yaml title="docker-compose.yaml"
services:
  ui:
    # ...
    environment:
      CONFIG_PATH: endpoints
    volumes:
      - ./endpoints:/app/endpoints
```

The configuration format is described in detail in
[SPARQL Endpoints](../configuration/endpoints.md).

!!! tip "Read-only vs. writable mounts"
    Qlue-UI can also *edit* endpoint configurations and example queries
    through its API (protected by `API_KEY`). If you want to use that, mount
    the configuration and examples **without** `:ro` so the container can
    write changes back to disk.

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CONFIG_PATH` | `config.yaml` | Path to the endpoint configuration. Either a single YAML file, or a directory of `<slug>.yaml` files (one endpoint per file). |
| `EXAMPLES_DIR` | `examples` | Directory containing [example queries](../configuration/examples.md), one sub-directory per endpoint slug. |
| `DB_FILE` | `shared-queries.db` | Path to the SQLite database that stores shared queries. |
| `API_KEY` | *(unset)* | If set, unlocks the write endpoints (`POST`, `PUT`, `PATCH`, `DELETE`). If unset, all writes are rejected. |
| `CORS_ORIGINS` | `*` | Comma-separated list of allowed CORS origins. |
| `BASE_PATH` | `/` | Sub-path to serve the app under (e.g. `/ui/`). Drives both backend routing and frontend asset/URL resolution at runtime. |

All paths are resolved relative to the working directory `/app` inside the
container.

### Persisting shared queries

When a user shares a query, it is stored in a SQLite database
(`shared-queries.db` by default). To survive container re-creation, mount
the database file directly:

```yaml title="docker-compose.yaml"
services:
  ui:
    # ...
    volumes:
      - ./shared-queries.db:/app/shared-queries.db
```

!!! tip
    Create the file before the first start (`touch shared-queries.db`) —
    otherwise Docker creates a *directory* of that name instead.

### Enabling writes with an API key

Without an `API_KEY`, Qlue-UI is effectively read-only: endpoint
configurations and example queries can only be changed by editing the files
on disk. Set an API key to manage them through the API and the UI:

```yaml title="docker-compose.yaml"
services:
  ui:
    # ...
    environment:
      API_KEY: change-me
```

Requests to write endpoints must then carry the key in the `X-Api-Key`
header. The UI prompts for it the first time you run a write command such as
`createExample` (see [Example Queries](../configuration/examples.md)).

## Serving under a sub-path

To serve the app under a sub-path instead of the domain root, set the
`BASE_PATH` environment variable (e.g. `BASE_PATH=/ui/`). The same image
works under any prefix without rebuilding — the backend mounts itself under
the prefix and natively owns `/ui/...`, so no proxy path-rewriting is
required.

## Health check

The backend exposes a health endpoint you can wire into Docker or your
orchestrator:

```bash
curl http://localhost/ui-api/health
```
