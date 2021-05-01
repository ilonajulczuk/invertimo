from django.shortcuts import render
from rest_framework import generics, permissions, viewsets
from finance.models import Position
from finance.serializers import PositionSerializer

from rest_framework.pagination import LimitOffsetPagination

# Create your views here.


class PositionView(generics.ListAPIView):
    model = Position
    serializer_class = PositionSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = LimitOffsetPagination

    def get_queryset(self):
        user = self.request.user
        return (
            Position.objects.filter(account__user=user)
            .select_related("security")
            .select_related("security__exchange")
        )
