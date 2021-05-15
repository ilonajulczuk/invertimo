import datetime

import pytz
from django.db.models import Count, Sum, Subquery, OuterRef
from django.shortcuts import get_object_or_404, render
from rest_framework import exceptions, generics, permissions, viewsets
from rest_framework.pagination import LimitOffsetPagination

from finance import accounts, models
from finance.models import CurrencyExchangeRate, Position, PriceHistory
from finance.serializers import (
    AccountSerializer,
    CurrencyExchangeRateSerializer,
    CurrencyQuerySerializer,
    FromToDatesSerializer,
    PositionSerializer,
    PositionWithQuantitiesSerializer,
    SecurityPriceHistorySerializer,
)


class AccountsView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AccountSerializer
    pagination_class = LimitOffsetPagination

    def get_queryset(self):

        queryset = models.Account.objects.filter(user=self.request.user)
        queryset = queryset.annotate(
            positions_count=Count("positions", distinct=True),
            transactions_count=Count("positions__transactions", distinct=True),
        )
        return queryset


class PositionsView(generics.ListAPIView):
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
            .annotate(
                latest_price=Subquery(
                    PriceHistory.objects.filter(security__positions=OuterRef("pk"))
                    .order_by("-date")
                    .values("value")[:1]
                )
            )
            .annotate(
                latest_price_date=Subquery(
                    PriceHistory.objects.filter(security__positions=OuterRef("pk"))
                    .order_by("-date")
                    .values("date")[:1]
                )
            )
        )


class CurrencyExchangeRateView(generics.ListAPIView):
    model = CurrencyExchangeRate
    serializer_class = CurrencyExchangeRateSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = LimitOffsetPagination

    def get_queryset(self):

        filter = {}
        from_currency = self.request.query_params.get("from_currency", None)
        to_currency = self.request.query_params.get("to_currency", None)

        query = CurrencyQuerySerializer(data=self.request.query_params)

        if query.is_valid(raise_exception=True):
            data = query.validated_data
            self.query_data = data
            filter["from_currency"] = self.query_data["from_currency"]
            filter["to_currency"] = self.query_data["to_currency"]

            queryset = CurrencyExchangeRate.objects.filter(**filter)
            if "from_date" in self.query_data:
                queryset = queryset.filter(date__gte=self.query_data["from_date"])
            if "to_date" in self.query_data:
                queryset = queryset.filter(date__lte=self.query_data["to_date"])

            return queryset


class SecurityPricesView(generics.ListAPIView):
    model = PriceHistory
    serializer_class = SecurityPriceHistorySerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = LimitOffsetPagination

    def get_queryset(self):
        query = FromToDatesSerializer(data=self.request.query_params)

        if query.is_valid(raise_exception=True):
            data = query.validated_data
            self.query_data = data
            queryset = PriceHistory.objects.filter(
                security__pk=self.kwargs["security_pk"]
            ).order_by("-date")
            if "from_date" in self.query_data:
                queryset = queryset.filter(date__gte=self.query_data["from_date"])
            if "to_date" in self.query_data:
                queryset = queryset.filter(date__lte=self.query_data["to_date"])

            return queryset


class PositionView(generics.RetrieveAPIView):
    model = Position
    serializer_class = PositionWithQuantitiesSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = LimitOffsetPagination
    queryset = Position.objects.all()

    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset.filter(account__user=self.request.user)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        query = FromToDatesSerializer(data=self.request.query_params)

        if query.is_valid(raise_exception=True):
            data = query.validated_data
            self.query_data = data
            context["from_date"] = self.query_data.get(
                "from_data",
                datetime.datetime.now(tz=pytz.UTC) - datetime.timedelta(days=365),
            )
            context["to_date"] = self.query_data.get(
                "to", datetime.datetime.now(tz=pytz.UTC)
            )
        return context
