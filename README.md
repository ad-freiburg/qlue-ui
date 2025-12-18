# Qlue-UI

**Qlue-UI** is modern WebUI for **SPARQL**, driven by [Qlue-ls](https://github.com/IoannisNezis/Qlue-ls).  
It does not tarket a single, but **many** SPARQL engines.  
It’s small, shiny, and ready to help you explore your RDF data effortlessly.  

---

<img width="1801" height="847" alt="20251218_01h48m35s_grim" src="https://github.com/user-attachments/assets/83557510-c0e5-4d4d-9d44-accc69ee67d9" />


## Features

- Modern, lightweight WebUI for QLever with many language capabilities
    - completion
    - formatting
    - diagnostics
    - code actions
    - hover
- Easy deployment with Docker
- Clean separation of API and frontend

---

## Quick Start

Follow these steps to get Qlue-UI up and running:

### 1. Prepare the environment

```bash
cp db.sqlite3.dist db.sqlite3
cp .env.dist .env
```

Then open .env and update the values according to your setup.

### 2. Change ownership of the db

```bash
chown 1000 db.sqlite3
```

### 2. Build and run with Docker

```bash
docker compose build
docker compose up
```

Qlue-ui is now availiable under <http://localhost:8080>

## License

[MIT License](https://mit-license.org/)
