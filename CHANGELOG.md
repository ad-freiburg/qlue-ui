# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- The last selected backend is remembered and reused when opening the UI without a backend in the URL path; the loaded backend is reflected in the URL path
- Http errors from the endpoint (e.g. a 404) are now displayed with their status code, status text, and response body
- Example queries have a stable order: an optional `order` frontmatter key sorts them in the examples panel (unordered examples last), settable per example or for a whole endpoint via `PUT /endpoints/{slug}/examples/order`
- Examples can be reordered by dragging them in the examples panel; the new order is persisted to the backend (requires a UI token)
- Examples can be deleted directly from the examples panel via a delete button on each entry, after a confirmation prompt (requires a UI token)

### Changed

- Tab-to-jump now uses the new `qlueLs/jump` API (qlue-ls 3.2.0): the language server formats the document and returns the edits together with the final cursor position in one atomic response

### Fixed

- Jumping with Tab no longer leaves the cursor in the wrong place when formatting removed the line it was on (e.g. a whitespace-only line before `}`)
- Connection errors no longer show "(undefined)"; they now display the actual network error and hint at common causes (server down, wrong endpoint URL, CORS)
- Reflecting the loaded backend in the URL path no longer drops query parameters (e.g. `?query=...`)
- The `query` URL parameter is now URI-decoded before opening it in a tab

## [0.5.0] - 2026-06-32

### Added

- **Experimental:** Alternative result renderers — visualize SPARQL results as charts (e.g. line plots) in addition to the table view, configured per query via the `sparql-results` web component

## [0.4.1] - 2026-06-12

### Fixed

- Switching backends now keeps the configured `BASE_PATH` in the URL instead of navigating to the site root

## [0.4.0] - 2026-06-12

### Added

- Sub-path deployment support via a runtime `BASE_PATH` env var, letting one image be served under any sub-path (e.g. `/ui/`) without rebuilding
- Click a node in the Query-execution-tree to open a details panel showing all of its data
- Infinite scroll for SPARQL query results: additional pages are fetched lazily as the user scrolls, with cancellation support via per-page sub-query IDs
- Download query results as CSV or JSON in addition to TSV, via a format menu on the download button

### Changed

- Cosmetic changes to the Query-execution-tree
- update qlue-ls
- e2e tests now run against a local Oxigraph instance seeded with a fixture dataset (`testing/fixtures/`), removing the dependency on a live WWW SPARQL endpoint (requires the `oxigraph` CLI on `PATH`)


## [0.2.2] - 2026-04-11

### Fixed

- Adapt to new JSON format for updates (QLever specific)

## [0.2.1] - 2026-04-11

### Fixed

- SPA fallback now correctly catches Starlette's `HTTPException`, so client-side routes (e.g. `/wikidata`) serve `index.html` instead of returning a JSON 404

## [0.2.0] - 2026-04-10

### Changed

- Replaced legacy Django backend with FastAPI
- Updated Docker setup for FastAPI backend
- Bumped Python version to 3.14
- Replaced TextMate grammar with LSP semantic tokens for syntax highlighting

### Added

- Structured logging to startup using uvicorn's logger

### Removed

- TextMate grammar (`sparql.tmLanguage.json`) and `@codingame/monaco-vscode-textmate-service-override` dependency
