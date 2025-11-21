from django.contrib import admin

from api.models import QueryExample, SparqlEndpointConfiguration


@admin.register(SparqlEndpointConfiguration)
class SparqlEndpointConfigurationAdmin(admin.ModelAdmin):
    list_display = ["name", "is_default", "is_hidden"]
    search_fields = ("name", "slug")
    fieldsets = (
        (
            "General",
            {
                "fields": (
                    "name",
                    "slug",
                    "is_default",
                    "sort_key",
                    "url",
                    "api_token",
                )
            },
        ),
        (
            "Prefix Map",
            {
                "fields": ("prefixes",),
                "classes": ["collapse"],
            },
        ),
        (
            "Completion Queries",
            {
                "fields": (
                    "subject_completion",
                    "predicate_completion_context_sensitive",
                    "predicate_completion_context_insensitive",
                    "object_completion_context_sensitive",
                    "object_completion_context_insensitive",
                ),
                "classes": ["collapse"],
            },
        ),
    )


@admin.register(QueryExample)
class QueryExampleAdmin(admin.ModelAdmin):
    list_display = ["id", "backend__name", "name"]
    search_fields = ["name"]
