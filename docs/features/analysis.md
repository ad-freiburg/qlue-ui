# Query Analysis

Beyond writing and running queries, Qlue-UI offers tooling to understand
*how* a query is parsed and executed.

## Query Execution Tree View

For QLever endpoints (`engine: QLever`), Qlue-UI can show the engine's
query execution tree **live, while the query runs**. Open it with the
`analysis` command (`Ctrl+P`), then watch each operation in the tree fill up with
runtime statistics as QLever processes it — ideal for spotting the expensive
parts of a slow query.

![The query execution tree view](https://github.com/user-attachments/assets/539900dc-0eca-4f5f-abfe-f4d580778f84)

!!! note "Direct WebSocket connection"
    Live monitoring uses a WebSocket opened directly from your browser to
    the QLever backend — it does not pass through the Qlue-UI server.
    The QLever endpoint must therefore be reachable from the user's browser.

## Parse Tree View

The Parse Tree View shows the internal representation of your SPARQL query
as the language server sees it — the full concrete syntax tree, updating
live as you type. Open it with the `parseTree` command (`Ctrl+P`).

![The parse tree view](https://github.com/user-attachments/assets/6a7eaacf-9bd2-43b0-9550-46210584a898)

This is mostly a tool for the curious and for anyone working on Qlue-ls
itself, but it is also handy for understanding why a query fails to parse.

## Completion Template Editor

The completion behavior of an endpoint is driven by its
[completion query templates](../configuration/endpoints.md#completion-query-templates).
The Completion Template Editor (`templates` command) lets you edit those
templates **live in the UI** and immediately try the resulting completions —
no backend restart, no YAML round-trips. Once a template works, persist it to
the endpoint configuration.
