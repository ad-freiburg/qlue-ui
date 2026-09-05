<h1 align="center">
    Qlue-UI
</h1>

**Qlue-UI** is a modern WebUI for **SPARQL**, driven by [Qlue-ls](https://github.com/IoannisNezis/Qlue-ls).
It does not target a single, but **many** SPARQL engines.
It’s small, shiny, and ready to help you explore your RDF data effortlessly.

> [!WARNING]
> **Work in progress — expect breaking changes.**
>
> This project is the next generation of **Qlever-UI**, but the migration from
> the legacy version is still ongoing. The API, configuration format, and
> internal structure may change significantly between releases.
>
> The project will be considered stable and final once it reaches **version 1.0**.
> Until then, use at your own risk.

<img width="1128" height="660" alt="The SPARQL editor" src="https://github.com/user-attachments/assets/8dc1ab0d-aaf1-4e74-8463-acffdebedf4c" />

See the [feature overview](docs/features/index.md) for the full tour.

## Availability

> [!IMPORTANT]
> **The container image was renamed.** It is now published as
> `ghcr.io/qlever-dev/qlue-ui`; the old `ghcr.io/qlever-dev/qlever-ui-new`
> package receives no further builds. Update the `image:` line in your
> `docker-compose.yaml` (or your `docker pull` / `docker run` command) to the
> new name — no configuration or data changes are needed.

Prebuilt container images are available from the
[GitHub container registry](https://github.com/qlever-dev/qlue-ui/pkgs/container/qlue-ui).

The `edge` tag is always the latest version.


```bash
docker pull ghcr.io/qlever-dev/qlue-ui:edge
```

The images may be used directly:

```bash
docker run --rm -it -p 7000:7000 ghcr.io/qlever-dev/qlue-ui:edge
```

The Qlue-UI is now available under <http://localhost:7000>, configured to
query the Wikidata SPARQL endpoint.  The `Examples` tab provides several
queries to explore.

## Quick Start

```bash
docker compose up
```
Qlue-UI is now available under <http://localhost>.

## Documentation

| Topic | |
|-------|---|
| [Setup with Docker](docs/setup/docker.md) | Persistence, environment variables, API key, sub-path serving |
| [SPARQL endpoints](docs/configuration/endpoints.md) | Endpoint configuration, presets, completion query templates |
| [Example queries](docs/configuration/examples.md) | Curating per-endpoint examples on disk or from the UI |
| [Features](docs/features/index.md) | Editor, results, query analysis, workbench |

To browse the docs locally, run `uvx --with mkdocs-material mkdocs serve` from the repository root.

## Development Setup

For local development, run the frontend and backend separately:

```bash
# backend (FastAPI, managed with uv) — port 8000
cd backend
uv sync
uv run fastapi dev src/api/main.py

# frontend (Vite) — port 5173
cd frontend
npm install
npm run dev
```

On first start the backend seeds `backend/config.yaml` and
`backend/examples/` from the defaults shipped inside the package, in
`backend/src/api/defaults/`.
Both local paths are git-ignored, so endpoints and examples you add while
developing stay out of commits. To change what ships by default, edit the
`*.default` files.

## Related Projects

- [Qlue-ls](https://github.com/IoannisNezis/Qlue-ls) ([docs](https://docs.qlue-ls.com)) — the SPARQL language server powering the editor
- [QLever](https://github.com/ad-freiburg/qlever) — a fast SPARQL engine this UI integrates with deeply
- [petrimaps](https://github.com/ad-freiburg/petrimaps) — renders geometry results on an interactive map

## License

[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)
