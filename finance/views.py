import datetime

from rest_framework import status
import pytz
from django.db.models import Count, Sum, Subquery, OuterRef, QuerySet
from django.shortcuts import get_object_or_404, render
from rest_framework import exceptions, generics, permissions, viewsets, mixins
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.response import Response
from django.contrib.auth.models import User
from typing import Any, Dict
from finance import accounts, models
from finance.models import CurrencyExchangeRate, Position, PriceHistory, Transaction
from finance.serializers import (
    AccountSerializer,
    AccountEditSerializer,
    AccountWithValuesSerializer,
    CurrencyExchangeRateSerializer,
    CurrencyQuerySerializer,
    FromToDatesSerializer,
    PositionSerializer,
    PositionWithQuantitiesSerializer,
    SecurityPriceHistorySerializer,
    TransactionSerializer,
)


class AccountsViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AccountSerializer
    pagination_class = LimitOffsetPagination
    basename = "account"

    def get_queryset(self) -> QuerySet[models.Account]:
        assert isinstance(self.request.user, User)
        queryset = models.Account.objects.filter(user=self.request.user).annotate(
            positions_count=Count("positions", distinct=True),
            transactions_count=Count("positions__transactions", distinct=True),
        )
        return queryset

    def get_serializer_context(self) -> Dict[str, Any]:
        context: Dict[str, Any] = super().get_serializer_context()
        context["request"] = self.request

        query = FromToDatesSerializer(data=self.request.query_params)

        if query.is_valid(raise_exception=True):
            data = query.validated_data
            self.query_data = data
            context["from_date"] = self.query_data.get(
                "from_date",
                datetime.date.today() - datetime.timedelta(days=30),
            )
            context["to_date"] = self.query_data.get("to_date", datetime.date.today())
        return context

    def get_serializer_class(self):
        if self.action in ("create", "update"):
            return AccountEditSerializer
        if self.action == "retrieve":
            return AccountWithValuesSerializer

        return AccountSerializer

    def retrieve(self, request, pk=None):
        queryset = self.get_queryset()
        queryset = queryset.prefetch_related("positions__security")
        account = get_object_or_404(queryset, pk=pk)
        serializer = self.get_serializer(account, context=self.get_serializer_context())
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            data=request.data, context=self.get_serializer_context()
        )
        serializer.is_valid(raise_exception=True)
        accounts.AccountRepository().create(
            user=self.request.user, **serializer.validated_data
        )
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )


class PositionsView(generics.ListAPIView):
    model = Position
    serializer_class = PositionSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = LimitOffsetPagination

    def get_queryset(self):
        assert isinstance(self.request.user, User)
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
            .annotate(
                latest_exchange_rate=Subquery(
                    CurrencyExchangeRate.objects.filter(
                        from_currency=OuterRef("security__currency"),
                        to_currency=OuterRef("account__currency"),
                        date=OuterRef("latest_price_date"),
                    )
                    .order_by("-date")
                    .values("value")[:1]
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
        return (
            queryset.filter(account__user=self.request.user)
            .select_related("security")
            .prefetch_related("security__pricehistory_set")
            .select_related("security__exchange")
            .prefetch_related("transactions")
        )

    def get_serializer_context(self):
        context: Dict[str, Any] = super().get_serializer_context()
        query = FromToDatesSerializer(data=self.request.query_params)

        if query.is_valid(raise_exception=True):
            data = query.validated_data
            self.query_data = data
            context["from_date"] = self.query_data.get(
                "from_date",
                datetime.date.today() - datetime.timedelta(days=365),
            )
            context["to_date"] = self.query_data.get("to_date", datetime.date.today())
        return context


class TransactionsViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    model = Transaction
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = LimitOffsetPagination
    basename = "transaction"

    def get_queryset(self):
        assert isinstance(self.request.user, User)
        user = self.request.user
        return (
            Transaction.objects.filter(position__account__user=user)
            .select_related("position")
            .select_related("position__security")
            .select_related("position__security__exchange")
        )