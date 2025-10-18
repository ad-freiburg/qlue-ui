from api.serializer import (
    SparqlEndpointConfigurationListSerializer,
    SparqlEndpointConfigurationSerializer,
)
from rest_framework import generics, mixins, viewsets

from api.models import SparqlEndpointConfiguration


class SparqlEndpointConfigurationViewSet(
    mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    queryset = SparqlEndpointConfiguration.objects.exclude(sort_key="0").order_by(
        "sort_key"
    )
    lookup_field = "slug"
    serializer_class = SparqlEndpointConfigurationSerializer


class SparqlEndpointConfigurationListViewSet(generics.ListAPIView):
    """
    API that lists all available backends; see `serializer.py`.
    """

    queryset = SparqlEndpointConfiguration.objects.exclude(sort_key="0").order_by(
        "sort_key"
    )
    serializer_class = SparqlEndpointConfigurationListSerializer
