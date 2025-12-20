# Qlue-UI

**Qlue-UI** is modern WebUI for **SPARQL**, driven by [Qlue-ls](https://github.com/IoannisNezis/Qlue-ls).  
It does not tarket a single, but **many** SPARQL engines.  
It’s small, shiny, and ready to help you explore your RDF data effortlessly.  

---

<img width="1489" height="761" alt="20251220_13h30m32s_grim" src="https://github.com/user-attachments/assets/2a6ae687-0548-435f-a18a-1d4d767d5167" />

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
