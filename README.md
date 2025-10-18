# Qlue-UI

**Qlue-UI** is the successor of **QLever-UI**, a sleek and modern WebUI for the SPARQL engine [QLever](https://github.com/ad-freiburg/QLever). It’s small, shiny, and ready to help you explore your RDF data effortlessly.  

---

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

### 2. Build and run with Docker

```bash
docker compose build
docker compose up
```

This will start two containers:
- API: listens on **port 8000**
- Frontend: listens on **port 80**

### 3. Optional: Reverse Proxy

If you’re running Qlue-UI behind a reverse proxy, you may need to:
 - Update the ports in docker-compose.yml to match your proxy setup
 - Choose URLs carefully to avoid collisions
 - Configure your reverse proxy to forward traffic to the correct container ports
 - Make sure the API and frontend URLs do not conflict with other services or adjust your reverse proxy rules accordingly.

## License

[MIT License](https://mit-license.org/)
