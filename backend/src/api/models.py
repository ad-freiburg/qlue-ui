from datetime import date
from typing import Annotated, Any

from fastapi import Path as PathParam
from pydantic import (
    AnyUrl,
    BaseModel,
    ConfigDict,
    Field,
    RootModel,
    ValidationError,
    field_validator,
)
from pydantic.alias_generators import to_camel

SLUG_PATTERN = r"^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$"
Slug = Annotated[str, PathParam(pattern=SLUG_PATTERN)]


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class StrictCamelModel(CamelModel):
    """Config-schema variant that rejects unknown fields instead of silently
    dropping them — catches typos like `is_default` or `completion_templates`."""

    model_config = ConfigDict(extra="forbid")


class Query_Templates(StrictCamelModel):
    subject_completion: str | None = None
    predicate_completion_context_sensitive: str | None = None
    predicate_completion_context_insensitive: str | None = None
    object_completion_context_sensitive: str | None = None
    object_completion_context_insensitive: str | None = None
    values_completion_context_sensitive: str | None = None
    values_completion_context_insensitive: str | None = None
    hover: str | None = None


class SparqlEndpointConfiguration(StrictCamelModel):
    """Fully resolved endpoint configuration as returned by the API. `preset` is
    informational metadata showing which preset names were applied during load."""

    preset: list[str] = Field(default_factory=list)
    name: str
    url: str
    engine: str | None = None
    default: bool = False
    hidden: bool | None = None
    sort_key: str | None = None
    prefix_map: dict[str, AnyUrl] = Field(default_factory=dict)
    map_view_url: str | None = None
    query_templates: Query_Templates | None = None

    @field_validator("url")
    @classmethod
    def _validate_url(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Endpoint url must not be empty")
        return v


class AppConfig(RootModel[dict[str, SparqlEndpointConfiguration]]):
    pass


def validate_config(data: dict[str, Any]) -> dict[str, Any]:
    """Validate and return the normalized dict. Raises ValueError on failure."""
    try:
        config = AppConfig.model_validate(data)
        return config.model_dump(mode="json", exclude_none=True)
    except ValidationError as exc:
        raise ValueError(f"Schema validation failed:\n{exc}") from exc


class SparqlEndpointPatch(StrictCamelModel):
    preset: list[str] | None = None
    name: str | None = None
    url: str | None = None
    engine: str | None = None
    default: bool | None = None
    hidden: bool | None = None
    sort_key: str | None = None
    prefix_map: dict[str, AnyUrl] | None = None
    map_view_url: str | None = None
    query_templates: Query_Templates | None = None

    @field_validator("url")
    @classmethod
    def _validate_url(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Endpoint url must not be empty")
        return v


class ExampleQuery(BaseModel):
    name: str
    query: str
    order: int | None = None

    @field_validator("name")
    @classmethod
    def _validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Example name must not be empty")
        if "\n" in v or "\r" in v:
            raise ValueError("Example name must not contain line breaks")
        return v


class SharedQuery(CamelModel):
    id: str
    query: str
    creation_date: date
