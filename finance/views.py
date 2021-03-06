import datetime
from typing import Any, Dict, Type, Union

from django.contrib.auth.models import User
from django.db.models import Count, F, OuterRef, Q, QuerySet, Subquery
from django.shortcuts import get_object_or_404
from rest_framework import (
    exceptions,
    generics,
    mixins,
    permissions,
    serializers,
    status,
    viewsets,
)
from rest_framework.decorators import action
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.response import Response


from finance import accounts, gains, models, stock_exchanges, tasks, prices
from finance.integrations import binance_parser, degiro_parser
from finance.models import (
    AccountEvent,
    Asset,
    CurrencyExchangeRate,
    IntegrationType,
    Lot,
    Position,
    PriceHistory,
    Transaction,
    TransactionImport,
)
from finance.serializers import (
    AccountEditSerializer,
    AccountEventSerializer,
    AccountSerializer,
    AccountWithValuesSerializer,
    AddCryptoIncomeEventSerializer,
    AddTransactionKnownAssetSerializer,
    AddTransactionNewAssetSerializer,
    AssetPriceHistorySerializer,
    AssetSerializer,
    BinanceUploadSerializer,
    CorrectTransactionSerializer,
    CurrencyExchangeRateSerializer,
    CurrencyQuerySerializer,
    DegiroUploadSerializer,
    FromToDatesSerializer,
    LotSerializer,
    PositionSerializer,
    PositionWithQuantitiesSerializer,
    TransactionImportSerializer,
    AssetSearchSerializer,
    TransactionSerializer,
    SimpleTransactionImportSerializer,
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
            events_count=Count("events", distinct=True),
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
            context["to_date"] = self.query_data.get(
                "to_date", datetime.date.today() + datetime.timedelta(days=1)
            )
        return context

    def get_serializer_class(
        self,
    ) -> Type[
        Union[AccountEditSerializer, AccountWithValuesSerializer, AccountSerializer]
    ]:
        if self.action in ("create", "update"):
            return AccountEditSerializer
        if self.action == "retrieve":
            return AccountWithValuesSerializer

        return AccountSerializer

    def retrieve(self, request, pk=None):
        queryset = self.get_queryset()
        queryset = queryset.prefetch_related("positions__asset")
        account = get_object_or_404(queryset, pk=pk)
        serializer = self.get_serializer(account, context=self.get_serializer_context())
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            data=request.data, context=self.get_serializer_context()
        )
        serializer.is_valid(raise_exception=True)
        assert isinstance(self.request.user, User)
        accounts.AccountRepository().create(
            user=self.request.user, **serializer.validated_data
        )
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )

    def perform_update(self, serializer):
        account_repository = accounts.AccountRepository()
        try:
            account_repository.update(serializer)
        except accounts.CantUpdateNonEmptyAccount:
            raise serializers.ValidationError("can't update non-empty account")

    def perform_destroy(self, instance):
        account_repository = accounts.AccountRepository()
        try:
            account_repository.delete(instance)
        except accounts.CantDeleteNonEmptyAccount:
            raise serializers.ValidationError("can't delete non-empty account")


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
            .select_related("asset")
            .select_related("asset__exchange")
            .annotate(
                latest_price=Subquery(
                    PriceHistory.objects.filter(asset__positions=OuterRef("pk"))
                    .order_by("-date")
                    .values("value")[:1]
                )
            )
            .annotate(
                latest_price_date=Subquery(
                    PriceHistory.objects.filter(asset__positions=OuterRef("pk"))
                    .order_by("-date")
                    .values("date")[:1]
                )
            )
            .annotate(
                latest_exchange_rate=Subquery(
                    CurrencyExchangeRate.objects.filter(
                        from_currency=OuterRef("asset__currency"),
                        to_currency=OuterRef("account__currency"),
                        # Will get the latest rate even if it's not the same as
                        # date at which last price was recorded.
                        # This shouldn't make a big difference if both prices and exchange rates
                        # are frequently recorded, but is helpful if some is missing.
                        # date=OuterRef("latest_price_date"),
                    )
                    .order_by("-date")
                    .values("value")[:1]
                )
            )
            .order_by("id")
        )


class CurrencyExchangeRateView(generics.ListAPIView):
    model = CurrencyExchangeRate
    serializer_class = CurrencyExchangeRateSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = LimitOffsetPagination

    def get_queryset(self):

        filter = {}
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


class AssetPricesView(generics.ListAPIView):
    model = PriceHistory
    serializer_class = AssetPriceHistorySerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = LimitOffsetPagination

    def get_queryset(self):
        query = FromToDatesSerializer(data=self.request.query_params)

        if query.is_valid(raise_exception=True):
            data = query.validated_data
            self.query_data = data
            queryset = PriceHistory.objects.filter(
                asset__pk=self.kwargs["asset_pk"]
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
            .select_related("asset")
            .prefetch_related("asset__pricehistory_set")
            .select_related("asset__exchange")
            .prefetch_related("transactions")
            .prefetch_related("events")
            .prefetch_related("lots")
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
            context["to_date"] = self.query_data.get(
                "to_date", datetime.date.today() + datetime.timedelta(days=1)
            )
        return context


class TransactionsViewSet(viewsets.ModelViewSet):
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
            .select_related("position__asset")
            .select_related("position__asset__exchange")
            .prefetch_related("records__transaction_import")
            .prefetch_related("records")
            .prefetch_related("events")
            .prefetch_related("event_records")
            .prefetch_related("event_records__event")
            .prefetch_related("event_records__transaction_import")
        )

    def get_serializer_class(
        self,
    ) -> Type[
        Union[
            TransactionSerializer,
            AddTransactionKnownAssetSerializer,
            AddTransactionNewAssetSerializer,
            CorrectTransactionSerializer,
        ]
    ]:
        if self.action == "create":
            return AddTransactionKnownAssetSerializer
        elif self.action == "update":
            return CorrectTransactionSerializer
        elif self.action == "add_with_custom_asset":
            return AddTransactionNewAssetSerializer
        return TransactionSerializer

    def get_serializer_context(self) -> Dict[str, Any]:
        context: Dict[str, Any] = super().get_serializer_context()
        context["request"] = self.request
        return context

    def compute_price(self, account, to_currency, arguments):
        price_in_account_currency = (
            arguments["value_in_account_currency"] / arguments["quantity"]
        )
        from_currency = account.currency
        if from_currency == to_currency:
            raise serializers.ValidationError(
                {
                    "price": [
                        "Price required if the asset is traded in the account currency."
                    ],
                }
            )
        date = arguments["executed_at"].date()
        exchange_rate = prices.get_closest_exchange_rate(
            date, from_currency, to_currency
        )
        if exchange_rate is None:
            raise serializers.ValidationError(
                {
                    "price": [
                        "Please provide the price, no suitable exchange rate available."
                    ],
                }
            )
        return price_in_account_currency * exchange_rate.value

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            data=request.data, context=self.get_serializer_context()
        )
        serializer.is_valid(raise_exception=True)
        assert isinstance(self.request.user, User)
        account_repository = accounts.AccountRepository()
        account = account_repository.get(
            user=self.request.user, id=serializer.validated_data["account"]
        )

        arguments = serializer.validated_data.copy()
        arguments.pop("account")
        asset_id = arguments.pop("asset")
        arguments["asset_id"] = asset_id
        if (
            arguments.get("price", None) is None
            or arguments.get("local_value", None) is None
        ):
            to_currency = models.Asset.objects.get(pk=asset_id).currency
            arguments["price"] = self.compute_price(account, to_currency, arguments)
            arguments["local_value"] = arguments["price"] * arguments["quantity"]
        try:
            transaction = account_repository.add_transaction_known_asset(
                account, **arguments
            )
            asset = transaction.position.asset
            if asset.tracked:
                tasks.collect_prices.delay(asset.pk)
        except gains.SoldBeforeBought:
            raise serializers.ValidationError(
                {
                    "quantity": ["Can't sell asset before buying it."],
                }
            )
        headers = self.get_success_headers(serializer.data)
        data = serializer.data
        data["id"] = transaction.pk
        data["price"] = str(transaction.price)
        data["local_value"] = str(transaction.local_value)
        return Response(data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=False, methods=["post"])
    def add_with_custom_asset(self, request):
        serializer = self.get_serializer(
            data=request.data, context=self.get_serializer_context()
        )
        serializer.is_valid(raise_exception=True)
        assert isinstance(self.request.user, User)
        account_repository = accounts.AccountRepository()
        account = account_repository.get(
            user=self.request.user, id=serializer.validated_data["account"]
        )
        arguments = serializer.validated_data.copy()
        arguments.pop("account")

        if (
            arguments.get("price", None) is None
            or arguments.get("local_value", None) is None
        ):
            to_currency = arguments["currency"]
            arguments["price"] = self.compute_price(account, to_currency, arguments)
            arguments["local_value"] = arguments["price"] * arguments["quantity"]
        try:
            transaction = account_repository.add_transaction_custom_asset(
                account, **arguments
            )
        except gains.SoldBeforeBought:
            raise serializers.ValidationError(
                {
                    "quantity": ["Can't sell asset before buying it."],
                }
            )

        headers = self.get_success_headers(serializer.data)
        data = serializer.data
        data["id"] = transaction.pk
        data["price"] = str(transaction.price)
        data["local_value"] = str(transaction.local_value)
        return Response(data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_destroy(self, instance):
        account_repository = accounts.AccountRepository()
        try:
            account_repository.delete_transaction(instance)
        except gains.SoldBeforeBought:
            raise serializers.ValidationError(
                {
                    "quantity": ["Can't sell asset before buying it."],
                }
            )
        except accounts.CantModifyTransactionWithEvent:
            raise serializers.ValidationError(
                "Can't delete a transaction associated with an event, without deleting the event first."
            )

    def perform_update(self, serializer):
        account_repository = accounts.AccountRepository()
        try:
            account_repository.correct_transaction(
                serializer.instance, serializer.validated_data
            )
        except gains.SoldBeforeBought:
            raise serializers.ValidationError(
                {
                    "quantity": ["Can't sell asset before buying it."],
                }
            )
        except accounts.CantModifyTransactionWithEvent:
            raise serializers.ValidationError(
                "Can't update a transaction associated with an event, without deleting the event first."
            )


class AccountEventViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    model = AccountEvent
    serializer_class = AccountEventSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = LimitOffsetPagination
    basename = "account-event"

    def get_queryset(self) -> QuerySet[AccountEvent]:
        assert isinstance(self.request.user, User)
        user = self.request.user
        return (
            AccountEvent.objects.filter(account__user=user)
            .annotate(transaction_quantity=F("transaction__quantity"))
            .prefetch_related("position")
            .prefetch_related("account")
            .prefetch_related("transaction")
            .prefetch_related("event_records")
            .prefetch_related("event_records__transaction_import")
        )

    def get_serializer_class(
        self,
    ) -> Type[Union[AccountEventSerializer, AddCryptoIncomeEventSerializer]]:
        if self.action == "add_crypto_income":
            return AddCryptoIncomeEventSerializer
        return AccountEventSerializer

    def get_serializer_context(self) -> Dict[str, Any]:
        context: Dict[str, Any] = super().get_serializer_context()
        context["request"] = self.request
        return context

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            data=request.data, context=self.get_serializer_context()
        )
        serializer.is_valid(raise_exception=True)
        assert isinstance(self.request.user, User)
        account_repository = accounts.AccountRepository()
        arguments = serializer.validated_data.copy()
        if arguments["event_type"] in models.EVENT_TYPES_FOR_CRYPTO_INCOME:
            raise serializers.ValidationError(
                {
                    "event_type": "Crypto income events not supported in this API endpoint, '/add_crypto_event' instead"
                }
            )
        event, _ = account_repository.add_event(**arguments)
        headers = self.get_success_headers(serializer.data)
        data = serializer.data
        data["id"] = event.id
        return Response(data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=False, methods=["post"])
    def add_crypto_income(self, request):
        serializer = self.get_serializer(
            data=request.data, context=self.get_serializer_context()
        )
        serializer.is_valid(raise_exception=True)
        assert isinstance(self.request.user, User)
        account_repository = accounts.AccountRepository()
        arguments = serializer.validated_data.copy()
        arguments["local_value"] = -arguments["local_value"]
        arguments["value_in_account_currency"] = -arguments["value_in_account_currency"]
        event, _ = account_repository.add_crypto_income_event(**arguments)
        asset = event.transaction.position.asset
        if asset.tracked:
            tasks.collect_prices.delay(asset.pk)
        headers = self.get_success_headers(serializer.data)
        data = serializer.data
        data["id"] = event.id
        return Response(data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_destroy(self, instance):
        account_repository = accounts.AccountRepository()
        account_repository.delete_event(instance)


class AssetViewSet(
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    model = Asset
    serializer_class = AssetSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = LimitOffsetPagination
    basename = "account-event"

    def get_queryset(self) -> QuerySet[Asset]:
        assert isinstance(self.request.user, User)
        user = self.request.user
        return Asset.objects.filter(
            Q(added_by=None, tracked=True) | Q(added_by=user)
        ).select_related("exchange")

    @action(detail=False, methods=["get"])
    def search(self, request):
        serializer = AssetSearchSerializer(
            data=request.query_params, context=self.get_serializer_context()
        )
        serializer.is_valid(raise_exception=True)
        identifier = serializer.validated_data["identifier"]

        # Look for new querysets.
        stock_exchanges.search_and_create_assets(identifier)

        # Alternative form because e.g. brk.b is stored as brk-b in eod.
        alternative_identifier = identifier.replace(".", "-")
        stock_exchanges.search_and_create_assets(alternative_identifier)
        queryset = self.get_queryset().filter(
            Q(isin__iexact=identifier)
            | Q(name__icontains=identifier)
            | Q(symbol__iexact=identifier)
            | Q(symbol__iexact=alternative_identifier)
        )

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class LotViewSet(
    mixins.ListModelMixin,
    viewsets.GenericViewSet,
):
    model = Lot
    serializer_class = LotSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = LimitOffsetPagination
    basename = "lot"

    def get_queryset(self) -> QuerySet[Lot]:
        assert isinstance(self.request.user, User)
        user = self.request.user
        return Lot.objects.filter(position__account__user=user).exclude(
            sell_transaction=None
        )


class DegiroUploadViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    model = TransactionImport
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = LimitOffsetPagination

    def get_queryset(self) -> QuerySet[models.TransactionImport]:
        assert isinstance(self.request.user, User)
        queryset = models.TransactionImport.objects.filter(
            account__user=self.request.user, integration=IntegrationType.DEGIRO
        )
        return queryset

    def get_serializer_class(
        self,
    ) -> Type[Union[DegiroUploadSerializer, TransactionImportSerializer]]:
        if self.action in ("list", "retrieve"):
            return TransactionImportSerializer
        return DegiroUploadSerializer

    def get_serializer_context(self) -> Dict[str, Any]:
        context: Dict[str, Any] = super().get_serializer_context()
        context["request"] = self.request
        return context

    def create(self, request):
        serializer = self.get_serializer(
            data=request.data, context=self.get_serializer_context()
        )
        serializer.is_valid(raise_exception=True)
        assert isinstance(self.request.user, User)
        self.request.user

        arguments = serializer.validated_data.copy()
        try:
            account_repository = accounts.AccountRepository()
            account = account_repository.get(
                user=self.request.user, id=serializer.validated_data["account"]
            )
        except models.Account.DoesNotExist:
            raise exceptions.PermissionDenied(
                detail={
                    "account": "Current user doesn't have access to this account or it doesn't exist."
                }
            )
        try:
            transaction_import = degiro_parser.import_transactions_from_file(
                account,
                arguments["transaction_file"],
                import_all_assets=arguments["import_all_assets"],
            )
        except degiro_parser.CurrencyMismatch as e:
            return Response(
                status=status.HTTP_400_BAD_REQUEST, data={"account": e.args[0]}
            )
        except degiro_parser.InvalidFormat as e:
            return Response(
                status=status.HTTP_400_BAD_REQUEST, data={"transaction_file": e.args[0]}
            )

        serializer = TransactionImportSerializer(
            instance=transaction_import, context=self.get_serializer_context()
        )
        return Response(status=status.HTTP_201_CREATED, data=serializer.data)


class BinanceUploadViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    model = TransactionImport
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = LimitOffsetPagination


    def get_queryset(self) -> QuerySet[models.TransactionImport]:
        assert isinstance(self.request.user, User)
        queryset = models.TransactionImport.objects.filter(
            account__user=self.request.user, integration=IntegrationType.BINANCE_CSV
        )
        return queryset

    def get_serializer_class(
        self,
    ) -> Type[Union[BinanceUploadSerializer, TransactionImportSerializer]]:
        if self.action in ("list", "retrieve"):
            return TransactionImportSerializer
        return BinanceUploadSerializer

    def get_serializer_context(self) -> Dict[str, Any]:
        context: Dict[str, Any] = super().get_serializer_context()
        context["request"] = self.request
        return context

    def create(self, request):
        serializer = self.get_serializer(
            data=request.data, context=self.get_serializer_context()
        )
        serializer.is_valid(raise_exception=True)
        assert isinstance(self.request.user, User)
        self.request.user

        arguments = serializer.validated_data.copy()

        try:
            account_repository = accounts.AccountRepository()
            account = account_repository.get(
                user=self.request.user, id=serializer.validated_data["account"]
            )
        except models.Account.DoesNotExist:
            raise exceptions.PermissionDenied(
                detail={
                    "account": "Current user doesn't have access to this account or it doesn't exist."
                }
            )
        try:
            transaction_import = binance_parser.import_transactions_from_file(
                account, arguments["transaction_file"]
            )
        except binance_parser.InvalidFormat as e:
            return Response(
                status=status.HTTP_400_BAD_REQUEST, data={"transaction_file": e.args[0]}
            )

        serializer = TransactionImportSerializer(
            instance=transaction_import, context=self.get_serializer_context()
        )
        return Response(status=status.HTTP_201_CREATED, data=serializer.data)


class TransactionImportViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):

    model = TransactionImport
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TransactionImportSerializer
    pagination_class = LimitOffsetPagination

    def get_queryset(self) -> QuerySet[models.TransactionImport]:
        assert isinstance(self.request.user, User)
        if self.action == "list":
            queryset = models.TransactionImport.objects.filter(account__user=self.request.user)
        else:
            queryset = (
            models.TransactionImport.objects.filter(account__user=self.request.user)
            .prefetch_related("event_records__event")
            .prefetch_related("records")
            )
        return queryset

    def get_serializer_class(
        self,
    ) -> Type[Union[TransactionImportSerializer, SimpleTransactionImportSerializer]]:
        if self.action in ("list"):
            return SimpleTransactionImportSerializer
        return TransactionImportSerializer

    def perform_destroy(self, instance):
        account_repository = accounts.AccountRepository(recompute_lots=False, batch_related_changes=True)
        try:
            account_repository.delete_transaction_import(instance)
            account_repository.update_lots()
        except gains.SoldBeforeBought:
            raise serializers.ValidationError(
                {
                    "quantity": ["Can't sell asset before buying it."],
                }
            )
        except accounts.CantModifyTransactionWithEvent:
            raise serializers.ValidationError(
                "Can't delete a transaction associated with an event, without deleting the event first."
            )