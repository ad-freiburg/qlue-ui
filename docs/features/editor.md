# Editor

The heart of Qlue-UI is a [Monaco](https://microsoft.github.io/monaco-editor/)
editor connected to the [Qlue-ls](https://github.com/IoannisNezis/Qlue-ls)
SPARQL language server. The language server runs as WebAssembly in your
browser, so all editor intelligence is instant and works without a dedicated
language-server backend.

![The SPARQL editor](https://github.com/user-attachments/assets/8dc1ab0d-aaf1-4e74-8463-acffdebedf4c)

## Completion

Completion goes far beyond keywords. Qlue-ls runs
[completion queries](../configuration/endpoints.md#completion-query-templates)
against the active endpoint to suggest actual entities from the dataset:

- **Subjects** — start typing a name (e.g. `Albert`) and get matching
  entities, ranked by relevance, with labels and aliases.
- **Predicates** — suggestions are *context-sensitive*: with a concrete
  subject in place, only predicates that actually occur on it are offered.
- **Objects** — likewise filtered by the subject and predicate of the
  triple being completed.
- **Variables, keywords, and snippets** — e.g. the `SELECT` snippet, with
  tab stops you can jump through.

How completion behaves is tunable in the settings panel — see
[Settings → Completion](../configuration/settings.md#editor-completion) for every option and
what it does.

## Formatting

Press `Ctrl+F` to format the document. The formatter is highly
configurable — every option is documented with before/after examples in
[Settings → Formatting](../configuration/settings.md#editor-formatting).

## Diagnostics & code actions

The language server continuously checks your query and underlines problems —
syntax errors, undeclared or unused prefixes, and more. Many diagnostics come
with a **code action** that fixes them in one click.

## Prefix management

Qlue-UI knows the prefix map of the active endpoint
(see [`prefix_map`](../configuration/endpoints.md#field-reference)) and can
take care of `PREFIX` declarations for you:

- **Add missing** *(default: on)* — using a prefixed name like `wdt:P31`
  automatically inserts the matching `PREFIX` declaration.
- **Remove unused** *(default: off)* — declarations no longer referenced in
  the query are removed.

Both behaviors can be toggled in the settings panel.

## Hover

Hover over a token to get information about it — what a keyword does, or
what an entity is.

## Editing conveniences

- **Proper SPARQL indentation** — the editor understands `.` and `;` and
  indents continuation lines accordingly.
- **Automatic line breaks** *(opt-in)* — automatically start a new line
  after typing `.` or `;`.
- **Jump to position** — press `Tab` / `Shift+Tab` to jump between relevant
  positions in the query (such as snippet tab stops).
