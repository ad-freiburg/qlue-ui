# Example Queries

Each SPARQL endpoint can ship a set of curated **example queries**. Users
browse them from the UI (the *Examples* button, or the `examples` command)
and load them into the editor with a click — a great way to showcase what a
dataset can do.

There are two ways to manage examples: plain files on disk, or directly
from the UI.

## Examples on disk

Examples live on the filesystem, in the directory named by the
`EXAMPLES_DIR` environment variable (default: `examples`). Each endpoint
[slug](endpoints.md#two-layouts) has its own sub-directory containing `.rq`
files:

```
examples/
├── wikidata/
│   ├── example-001.rq
│   ├── example-002.rq
│   └── ...
├── dblp/
│   ├── example-001.rq
│   └── ...
├── imdb/
│   └── ...
└── osm-planet/
    └── ...
```

If that directory does not exist yet, it is created on startup as a copy of
the shipped `examples.default/`, so a fresh checkout comes up with examples
for the default endpoints.

The image ships with examples for the default endpoints; mount your own
directory to replace them:

```yaml title="docker-compose.yaml"
services:
  ui:
    # ...
    volumes:
      - ./examples:/app/examples
```

### File format

An example file is a plain SPARQL query, optionally preceded by a
frontmatter comment that carries its display name:

```sparql title="examples/wikidata/example-001.rq"
#+ title: German cities with more than 100k inhabitants

PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
SELECT ?city ?population WHERE {
  ?city wdt:P31/wdt:P279* wd:Q515 ;
        wdt:P17 wd:Q183 ;
        wdt:P1082 ?population .
  FILTER (?population > 100000)
}
```

The frontmatter is YAML behind a `#+ ` prefix: stripping `#+ ` from each
leading line yields a valid YAML mapping, and the `title` key holds the
display name. Because it is YAML, names with special characters are quoted
automatically — they are not constrained by what your filesystem allows.

You can drop in your own `.rq` files with arbitrary filenames; a file without
a `title` falls back to its filename as the display name. Files created
through the API use OS-safe, enumerated names (`example-001.rq`,
`example-002.rq`, …).

## Managing examples from the UI

With an [`API_KEY`](../setup/docker.md#enabling-writes-with-an-api-key)
configured, you can curate examples without leaving the browser. Open the
command palette with `Ctrl+P` and use:

| Command | Action |
|---------|--------|
| `examples` | Browse the example queries of the active endpoint. |
| `createExample "<name>"` | Save the current editor content as a new example for the active endpoint. |
| `updateExample` | Overwrite the currently loaded example with the editor content. |

The first write prompts for the API key, which is sent as the `X-Api-Key`
header. Changes are persisted to the `.rq` files on disk — so make sure the
examples directory is mounted writable.
