# Results

Run a query with `Ctrl+Enter` (or the run button) and the results appear
below the editor. Qlue-UI renders a result view for **any** SPARQL
operation — `SELECT`, `ASK`, `CONSTRUCT`, `DESCRIBE`, and even update
operations on QLever endpoints.

![The results renderer](https://github.com/user-attachments/assets/44ea5142-4231-44c2-b079-b44dc04ced8d)

## The results table

`SELECT` results are rendered as a paginated table. Each cell is displayed
intelligently:

- **IRIs** are shortened to prefixed names using the endpoint's
  [prefix map](../configuration/endpoints.md#field-reference) and link to
  the full IRI.
- **Literals** show their datatype and language tag as small annotations.
- **Images** referenced by IRI are loaded and displayed inline.

All of this is configurable in the settings panel — see
[Settings → Results](../configuration/settings.md#results) for each option.

## Map view

If the active endpoint defines a
[`map_view_url`](../configuration/endpoints.md#field-reference) (a
[petrimaps](https://github.com/ad-freiburg/petrimaps) instance), queries that
produce geometries can be opened on an interactive map with a single click.
The `qlever_default` preset configures the public instance at
`https://qlever.dev/petrimaps/`.

## Update operations

For QLever endpoints (`engine: QLever`), update operations such as `INSERT`
and `DELETE` are supported and get their own result view reporting what
changed.
