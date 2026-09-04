import logging
import os
import re
import shutil
from contextlib import asynccontextmanager
from importlib.resources import files
from mimetypes import guess_type
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Body, Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.datastructures import Headers
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import HTMLResponse, Response
from starlette.types import Scope

from .config_store import ConfigStore
from .database import connect
from .example_store import ExampleStore
from .models import (
    ExampleQuery,
    SharedQuery,
    Slug,
    SparqlEndpointConfiguration,
    SparqlEndpointPatch,
)
from .query_store import QueryStore

logger = logging.getLogger("uvicorn.error")

CONFIG_PATH = Path(os.getenv("CONFIG_PATH", "config.yaml")).resolve()
EXAMPLES_DIR = Path(os.getenv("EXAMPLES_DIR", "examples")).resolve()
DB_PATH = Path(os.getenv("DB_FILE", "shared-queries.db")).resolve()
FRONTEND_DIR = Path(os.getenv("FRONTEND_DIR", "frontend_dist"))
MAX_QUERY_LENGTH = 100_000  # bytes — reject unreasonably large shared queries
API_KEY = os.getenv("API_KEY")


def _normalize_base_path(raw: str) -> str:
    """Normalize BASE_PATH to a leading+trailing-slash form: "/" or "/ui/"."""
    raw = raw.strip()
    return "/" if not raw or raw == "/" else "/" + raw.strip("/") + "/"


# Sub-path the app is served under (e.g. "/ui/"). The frontend, router and static
# mount all derive from this single value so one image works under any sub-path.
BASE_PATH = _normalize_base_path(os.getenv("BASE_PATH", "/"))


class SPAStaticFiles(StaticFiles):
    """Serves static files with SPA fallback; injects the runtime <base href>."""

    def __init__(self, *args: Any, base_path: str = "/", **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        assert self.directory
        html = (Path(self.directory) / "index.html").read_text()
        self._index = re.sub(
            r'<base href="[^"]*"\s*/?>', f'<base href="{base_path}" />', html, count=1
        )

    async def get_response(self, path: str, scope: Scope) -> Response:
        if path in ("", ".", "index.html"):
            return HTMLResponse(self._index)
        try:
            response = await self._get_precompressed(path, scope)
            return response if response else await super().get_response(path, scope)
        except StarletteHTTPException as ex:
            if ex.status_code == 404:  # SPA fallback (e.g. deep links)
                return HTMLResponse(self._index)
            raise

    async def _get_precompressed(self, path: str, scope: Scope) -> Response | None:
        """Serve a build-time .br/.gz variant if one exists and the client takes it.

        The frontend build pre-compresses its assets (see frontend/scripts/compress.mjs)
        so the ~5.7 MB WASM language server is not re-compressed on every request.
        """
        assert self.directory
        accepted = Headers(scope=scope).get("accept-encoding", "")
        for encoding, suffix in (("br", ".br"), ("gzip", ".gz")):
            if encoding not in accepted:
                continue
            if not (Path(self.directory) / (path + suffix)).is_file():
                continue
            response = await super().get_response(path + suffix, scope)
            # Keep the media type of the *uncompressed* file; only the transfer differs.
            response.headers["content-type"] = (
                guess_type(path)[0] or "application/octet-stream"
            )
            response.headers["content-encoding"] = encoding
            response.headers["vary"] = "Accept-Encoding"
            return response
        return None


def require_api_key(x_api_key: str | None = Header(default=None)):
    if API_KEY is None or x_api_key != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")


# ── Stores ─────────────────────────────────────────────────────────────────
config_store = ConfigStore(CONFIG_PATH)
example_store = ExampleStore(EXAMPLES_DIR)
db = connect(DB_PATH)
query_store = QueryStore(db)


# ── Lifespan (startup / shutdown) ───────────────────────────────────────────
@asynccontextmanager
async def lifespan(_: FastAPI):
    banner = files(__package__).joinpath("banner.txt")
    if banner.is_file():
        lines = banner.read_text().splitlines()
        tagline = "SPARQL web editor"
        width = shutil.get_terminal_size(fallback=(80, 24)).columns
        # cyan banner, yellow tagline
        centered = "\n".join(line.center(width) for line in lines)
        print(f"\n\033[36m{centered}\033[0m")
        print(f"\033[33m{tagline.center(width)}\033[0m\n")
    logger.info("Base path:             %s", BASE_PATH)
    logger.info("Config path:           %s", CONFIG_PATH)
    logger.info("Examples dir:          %s", EXAMPLES_DIR)
    logger.info("Shared Query Database: %s", DB_PATH)
    logger.info("API key:               %s", "set" if API_KEY else "not set")
    config_count = await config_store.load()
    query_count = query_store.count()
    example_count = example_store.count()
    logger.info(
        f"Loaded {config_count} endpoint config{'s' if config_count > 0 else ''}."
    )
    logger.info(f"Loaded {query_count} shared querie{'s' if query_count > 0 else ''}.")
    logger.info(f"Loaded {example_count} example{'s' if example_count > 0 else ''}.")
    yield
    db.close()
    logger.info("Database connection closed")


# ── App & Routes ─────────────────────────────────────────────────────────

app = FastAPI(
    title="Qlue-UI JSON API",
    version="1.0.0",
    description="Expose SPARQL endpoint configurations, shared queries and example as JSON API.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter()


@router.get("/health")
async def health():
    """Unauthenticated health check."""
    return {"status": "ok"}


@router.get("/endpoints/", response_model_exclude_none=True)
async def list_endpoints() -> dict[str, SparqlEndpointConfiguration]:
    """Retrieve all public endpoint configurations (hidden endpoints are excluded)."""
    data = await config_store.get_all()
    return {
        slug: config for slug, config in data.items() if not config.get("hidden")
    }


@router.get("/endpoints/{slug}/", response_model_exclude_none=True)
async def get_endpoint(slug: Slug) -> SparqlEndpointConfiguration:
    """Retrieve a single SPARQL endpoint configuration by its slug."""
    data = await config_store.get_all()
    if slug not in data:
        raise HTTPException(
            status_code=404, detail=f'endpoint with slug "{slug}" not found'
        )
    return data[slug]


@router.patch("/endpoints/{slug}/", dependencies=[Depends(require_api_key)])
async def patch_endpoint(slug: Slug, patch: SparqlEndpointPatch):
    """Partially update an endpoint configuration. Only provided top-level fields
    are changed. Nested objects like `queryTemplates` are replaced in full — send
    the complete object, not individual sub-fields."""
    update_data = patch.model_dump(mode="json", exclude_unset=True)

    def apply(current: dict[str, Any]) -> dict[str, Any]:
        # `current` is the raw on-disk dict (may be partial — preset fills the
        # rest). Patch applies as a shallow top-level merge; an explicit null
        # removes the override and falls back to preset-supplied values.
        new = dict(current)
        for key, value in update_data.items():
            if value is None:
                new.pop(key, None)
            else:
                new[key] = value
        return new

    try:
        return await config_store.patch(slug, apply)
    except KeyError:
        raise HTTPException(
            status_code=404, detail=f'endpoint with slug "{slug}" not found'
        )


@router.post(
    "/endpoints/{slug}/",
    dependencies=[Depends(require_api_key)],
    status_code=201,
)
async def create_endpoint(
    slug: Slug, endpoint: SparqlEndpointConfiguration
) -> SparqlEndpointConfiguration:
    """Create a new endpoint configuration."""
    try:
        created_endpoint = await config_store.create(
            slug, endpoint.model_dump(mode="json", exclude_none=True)
        )
        logger.info(f'Created new SPARQL endpoint config "{slug}".')
        return SparqlEndpointConfiguration.model_validate(created_endpoint)
    except ValueError as e:
        logger.warning(f'Could not create SPARQL endpoint "{slug}": {e}')
        raise HTTPException(status_code=409, detail=str(e))


@router.get("/endpoints/{slug}/examples/")
async def list_examples(slug: Slug) -> list[ExampleQuery]:
    """Retrieve all example queries for an endpoint. Returns an empty list if none exist."""
    try:
        return [
            ExampleQuery(name=name, query=query, order=order)
            for name, query, order in example_store.list(slug)
        ]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid slug")


@router.put("/endpoints/{slug}/examples/", dependencies=[Depends(require_api_key)])
async def update_example(slug: Slug, example: ExampleQuery):
    """Overwrite the query of an existing example, preserving its frontmatter.
    An omitted `order` leaves the example's current position untouched; `null`
    removes it, sending the example to the end of the listing."""
    try:
        if "order" in example.model_fields_set:
            example_store.update(slug, example.name, example.query, example.order)
        else:
            example_store.update(slug, example.name, example.query)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid slug")
    except FileNotFoundError:
        raise HTTPException(
            status_code=404, detail=f'Example "{example.name}" not found'
        )


@router.post(
    "/endpoints/{slug}/examples/",
    dependencies=[Depends(require_api_key)],
    status_code=201,
)
async def create_example(slug: Slug, example: ExampleQuery):
    """Create a new example query. Returns 409 if the name is already taken."""
    try:
        example_store.create(slug, example.name, example.query, example.order)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid slug")
    except FileExistsError:
        raise HTTPException(
            status_code=409, detail=f'Example "{example.name}" already exists'
        )


@router.put(
    "/endpoints/{slug}/examples/order",
    dependencies=[Depends(require_api_key)],
    status_code=204,
)
async def reorder_examples(slug: Slug, names: list[str] = Body()):
    """Reorder an endpoint's examples: the named examples are assigned
    positions 1..n, in the given order. Examples not named are left untouched,
    so send the complete list for a fully predictable ordering."""
    try:
        example_store.reorder(slug, names)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid slug")
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=f'Example "{e.args[0]}" not found')


@router.delete(
    "/endpoints/{slug}/examples/",
    dependencies=[Depends(require_api_key)],
    status_code=204,
)
async def delete_example(slug: Slug, name: str = Body(embed=True)):
    """Delete an existing example query."""
    try:
        example_store.delete(slug, name)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid slug")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f'Example "{name}" not found')


@router.post("/shared-query/")
def share_query(
    query: str = Body(media_type="text/plain"),
) -> SharedQuery:
    """
    Store a SPARQL query and return a short ID for sharing.

    The query must be sent as a raw plain-text string in the request body
    (Content-Type: text/plain). Returns 413 if the body exceeds 100 KB.
    """
    if len(query.encode()) > MAX_QUERY_LENGTH:
        raise HTTPException(
            status_code=413,
            detail=f"Query exceeds maximum size of {MAX_QUERY_LENGTH} bytes",
        )
    short_id, creation_date = query_store.save(query)
    return SharedQuery(id=short_id, query=query, creation_date=creation_date)


@router.get("/shared-query/{short_id}")
def get_shared_query(short_id: str) -> SharedQuery:
    """Retrieve a shared query by its short ID."""
    result = query_store.get(short_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Shared query not found")
    query, creation_date = result
    return SharedQuery(id=short_id, query=query, creation_date=creation_date)


app.include_router(router, prefix=f"{BASE_PATH.rstrip('/')}/ui-api")

if FRONTEND_DIR.is_dir():
    app.mount(
        BASE_PATH.rstrip("/") or "/",
        SPAStaticFiles(directory=FRONTEND_DIR, html=True, base_path=BASE_PATH),
        name="spa",
    )
