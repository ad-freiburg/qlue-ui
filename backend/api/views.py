from api import serializer
from api.serializer import (
    QueryExampleSerializer,
    SparqlEndpointConfigurationListSerializer,
    SparqlEndpointConfigurationSerializer,
)
from rest_framework import generics, mixins, viewsets

from api.models import QueryExample, SparqlEndpointConfiguration


class SparqlEndpointConfigurationViewSet(
    mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    queryset = SparqlEndpointConfiguration.objects.exclude(sort_key="0").order_by(
        "sort_key"
    )
    serializer_class = SparqlEndpointConfigurationSerializer
    lookup_field = "slug"


class SparqlEndpointConfigurationListViewSet(generics.ListAPIView):
    """
    API that lists all available backends; see `serializer.py`.
    """

    queryset = SparqlEndpointConfiguration.objects.exclude(sort_key="0").order_by(
        "sort_key"
    )
    serializer_class = SparqlEndpointConfigurationListSerializer


class QueryExampleListViewSet(generics.ListAPIView):
    serializer_class = QueryExampleSerializer
    lookup_field = "slug"

    def get_queryset(self):
        backend_slug = self.kwargs["slug"]
        return QueryExample.objects.filter(backend__slug=backend_slug)
