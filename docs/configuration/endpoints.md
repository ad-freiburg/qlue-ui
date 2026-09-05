# SPARQL Endpoints

All SPARQL endpoints that Qlue-UI offers to its users are defined in a YAML
configuration. The backend loads it at startup from the path in the
`CONFIG_PATH` environment variable (default: `config.yaml`).

If that path is a YAML file that does not exist yet, it is created on startup
as a copy of the shipped `src/api/defaults/config.yaml`, so a fresh checkout comes up
with a working set of endpoints.

## Two layouts

`CONFIG_PATH` may point to either a **single file** or a **directory** —
pick whichever fits your deployment.

=== "Single file"

    One YAML file whose top-level keys are endpoint *slugs*:

    ```yaml title="config.yaml"
    wikidata:
      name: Wikidata
      url: https://qlever.dev/api/wikidata
      default: true
      preset: [common_prefixes, qlever_default]

    dblp:
      name: DBLP
      url: https://qlever.dev/api/dblp
      preset: [common_prefixes, qlever_default]
    ```

=== "Directory"

    A directory containing one `<slug>.yaml` file per endpoint. The filename
    stem is the slug; the file content is the endpoint block directly — no
    top-level slug wrapper:

    ```yaml title="endpoints/wikidata.yaml"
    name: Wikidata
    url: https://qlever.dev/api/wikidata
    default: true
    preset: [common_prefixes, qlever_default]
    ```

    Files whose stem doesn't match the slug pattern are rejected at load.

The **slug** identifies the endpoint in URLs (e.g. the API route
`/ui-api/endpoints/wikidata/`) and in the [examples](examples.md) directory.
It must match `^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$` — lowercase
letters, digits, and inner hyphens, at most 64 characters.

!!! warning "Strict validation"
    Unknown fields are **rejected** at load instead of being silently
    dropped. This catches typos like `is_default` or `completion_templates`
    early — the backend refuses to start with an invalid configuration.

## Field reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Human-readable name shown in the endpoint selector. |
| `url` | URL | yes | The SPARQL endpoint URL queries are sent to. |
| `engine` | string | no | The SPARQL engine behind the endpoint. Setting `QLever` unlocks QLever-specific features such as the [Query Execution Tree View](../features/analysis.md) and result views for update operations. |
| `default` | bool | no | Whether this endpoint is pre-selected when the UI loads. Defaults to `false`. |
| `hidden` | bool | no | Whether this endpoint is kept out of the public endpoint list. It is not offered in the endpoint selector and not returned by `GET /endpoints/`; it can only be used by someone who knows its slug in the URL, and is then shown as the current selection. Defaults to `false`. |
| `sort_key` | string | no | Endpoints are ordered by this key in the endpoint selector (lexicographic, e.g. `A1`, `A2`, `B1`). |
| `prefix_map` | map | no | Mapping of prefix → IRI, used by the language server for completion and for automatic `PREFIX` declarations. |
| `map_view_url` | URL | no | Base URL of a [petrimaps](https://github.com/ad-freiburg/petrimaps) instance used to render geometry results on a map. |
| `query_templates` | map | no | Templates the language server uses to compute completion queries, see [below](#completion-query-templates). |
| `preset` | list | no | Names of [presets](#presets) to apply, merged left to right. |

## Presets

Most endpoint configurations share a lot of structure — the same well-known
prefixes, the same QLever completion templates. **Presets** capture that
shared structure so each endpoint only declares what is unique about it.

Two presets ship with the backend:

| Preset | Provides |
|--------|----------|
| `common_prefixes` | A large `prefix_map` of well-known prefixes (`rdf`, `rdfs`, `owl`, `foaf`, `schema`, `wd`, `wdt`, …). |
| `qlever_default` | `engine: QLever`, a `map_view_url` pointing at the public petrimaps instance, and generic completion `query_templates` tuned for QLever. |

A minimal QLever endpoint therefore needs only four lines:

```yaml
olympics:
  name: Olympics
  url: https://qlever.dev/api/olympics
  preset: [common_prefixes, qlever_default]
```

### Merge semantics

Presets are **deep-merged left to right**, then the endpoint's own fields are
merged on top. Later values win; for nested mappings the merge is per key.
That means you can apply a preset and still override individual entries:

```yaml
osm-planet:
  preset: [common_prefixes, qlever_default]
  name: OSM planet
  url: https://qlever.dev/api/osm-planet
  prefix_map:
    # merged on top of common_prefixes — adds these, keeps the rest
    osmkey: "https://www.openstreetmap.org/wiki/Key:"
    osmrel: https://www.openstreetmap.org/relation/
  query_templates:
    # replaces only this template; the other qlever_default templates remain
    subject_completion: |-
      ...
```

The resolved configuration (presets applied) is what the API serves to the
frontend; the `preset` field is kept as informational metadata.

## Completion query templates

Qlue-ls computes context-aware completions by running SPARQL queries against
the endpoint itself. The `query_templates` field holds the templates these
queries are rendered from — one per completion type, plus `hover`:

```yaml
query_templates:
  subject_completion: |-
    ...
  predicate_completion_context_sensitive: |-
    ...
  predicate_completion_context_insensitive: |-
    ...
  object_completion_context_sensitive: |-
    ...
  object_completion_context_insensitive: |-
    ...
  values_completion_context_sensitive: |-
    ...
  values_completion_context_insensitive: |-
    ...
  hover: |-
    ...
```

How to write these templates — their anatomy, the available template
variables, the [Tera](https://keats.github.io/tera/docs) templating engine,
and worked examples — is documented in the
[Qlue-ls completion queries documentation](https://docs.qlue-ls.com/05_completion_queries/).

!!! tip "Iterate live in the UI"
    You don't have to restart the backend to try out a template. Open the
    [Completion Template Editor](../features/analysis.md#completion-template-editor)
    (`templates` command, `Ctrl+P`) to edit templates live and see the
    effect immediately.

## Managing endpoints via the API

If an [`API_KEY`](../setup/docker.md#enabling-writes-with-an-api-key) is
configured, endpoints can also be created and modified at runtime — changes
are persisted back to the YAML on disk (single-file mode rewrites the file,
directory mode rewrites only the affected `<slug>.yaml`):

```bash
# create a new endpoint
curl -X POST http://localhost/ui-api/endpoints/olympics/ \
  -H 'X-Api-Key: change-me' \
  -H 'Content-Type: application/json' \
  -d '{"name": "Olympics", "url": "https://qlever.dev/api/olympics", "preset": ["common_prefixes", "qlever_default"]}'

# partially update an existing endpoint
curl -X PATCH http://localhost/ui-api/endpoints/olympics/ \
  -H 'X-Api-Key: change-me' \
  -H 'Content-Type: application/json' \
  -d '{"sort_key": "B1"}'
```

`PATCH` applies a shallow top-level merge: only the fields you send are
changed, nested objects like `query_templates` are replaced in full, and an
explicit `null` removes the endpoint's own override so the preset-supplied
value applies again.

## Checking a config before starting

Config problems are reported at startup — every problem at once, with the file
and line — and the backend refuses to start if any of them is an error.
Warnings (for example two endpoints marked `default: true`) are printed and the
backend starts anyway.

To check a file without starting the backend:

```bash
cd backend
uv run python -m api.check_config config.yaml
```

It prints the same report and exits non-zero if the config has errors, which
makes it usable as a pre-deploy or CI check. Omit the path to fall back to
`CONFIG_PATH`, or `config.yaml`. Both single-file and directory mode are
supported.
