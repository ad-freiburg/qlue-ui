# Features

Qlue-UI is built around the [Qlue-ls](https://github.com/IoannisNezis/Qlue-ls)
SPARQL language server, which runs as WebAssembly directly in your browser —
no round-trips to a server for editor intelligence.

<div class="grid cards" markdown>

- **[Editor](editor.md)**

    A Monaco-based SPARQL editor with context-aware completion, a powerful
    formatter, diagnostics, code actions, hover, and automatic prefix
    management.

- **[Results](results.md)**

    Result views for *any* SPARQL operation — including updates on QLever
    endpoints — with type and language annotations, IRI shortening, and a
    map view for geometry results.

- **[Query Analysis](analysis.md)**

    Watch QLever execute your query live in the Query Execution Tree View,
    inspect the parse tree, and iterate on completion templates.

- **[Workbench](workbench.md)**

    Tabs for multiple queries, query sharing via short links, a settings
    panel, keyboard shortcuts, and a command prompt.

</div>

## At a glance

- Modern, lightweight WebUI for SPARQL with rich language capabilities:
  completion, formatting, diagnostics, code actions, and hover
- Result views for any SPARQL operation (including updates for QLever
  endpoints)
- Live query execution monitoring for QLever backends
- Parse tree view for inspecting the internal representation of a query
- Live completion template editor for rapid iteration on query templates
  *(experimental)*
- Tabs for multiple queries
- Share queries with your peers
- Proper indentation support for SPARQL (`.` and `;`)
- Automatic line break after `.` or `;`
- Automatic addition and removal of `PREFIX` declarations (configurable)
- Jump to relevant positions in the query
- Manage [example queries](../configuration/examples.md) per SPARQL endpoint
- Easy [deployment with Docker](../setup/docker.md)
- Clean separation of API and frontend
