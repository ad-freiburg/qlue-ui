# Qlue-UI

**Qlue-UI** is a modern WebUI for **SPARQL**, driven by the
[Qlue-ls](https://github.com/IoannisNezis/Qlue-ls) language server.
It does not target a single SPARQL engine, but **many**.
It's small, shiny, and ready to help you explore your RDF data effortlessly.

![The SPARQL editor](https://github.com/user-attachments/assets/8dc1ab0d-aaf1-4e74-8463-acffdebedf4c)

!!! warning "Work in progress"
    This project is the next generation of Qlever-UI, and the migration from
    the legacy version is still ongoing. The API, configuration format, and
    internal structure may change significantly between releases. The project
    will be considered stable once it reaches **version 1.0**.

## Where to go next

<div class="grid cards" markdown>

- **[Setup with Docker](setup/docker.md)**

    Get Qlue-UI running in two commands, then learn about persistence
    and environment variables.

- **[Configure SPARQL endpoints](configuration/endpoints.md)**

    Define the endpoints your users can query: names, URLs, prefix maps,
    completion query templates, and reusable presets.

- **[Set up example queries](configuration/examples.md)**

    Curate per-endpoint example queries — from plain `.rq` files on disk, via
    the API, or directly from the UI.

- **[Explore the features](features/index.md)**

    The editor, the results renderer, live query analysis, tabs, sharing, and
    everything in between.

</div>

## License

Qlue-UI is released under the
[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0).
