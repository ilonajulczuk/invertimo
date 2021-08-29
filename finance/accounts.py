from finance import models
from finance import exchanges
from django.contrib.auth.models import User
import decimal


class AccountRepository:
    def get(self, user: User, id: int) -> models.Account:
        return models.Account.objects.get(user=user, id=id)

    def create(
        self, nickname: str, currency: models.Currency, description: str, user: User
    ) -> models.Account:
        return models.Account.objects.create(
            user=user, nickname=nickname, description=description, currency=currency
        )

    def add_transaction(
        self,
        account,
        isin,
        exchange,
        executed_at,
        quantity,
        price,
        transaction_costs,
        local_value,
        value_in_account_currency,
        total_in_account_currency,
        order_id,
    ):
        position = self._get_or_create_position(account, isin, exchange)
        if not position:
            raise ValueError(
                f"Failed to create a position from a transaction record, isin: {isin}, exchange ref: {exchange}"
            )

        transaction, created = models.Transaction.objects.get_or_create(
            executed_at=executed_at,
            position=position,
            quantity=quantity,
            price=price,
            transaction_costs=transaction_costs,
            local_value=local_value,
            value_in_account_currency=value_in_account_currency,
            total_in_account_currency=total_in_account_currency,
            order_id=order_id,
        )
        if created:
            position.quantity += quantity
            position.save()
            account.balance += total_in_account_currency
            account.save()

        return transaction

    def add_transaction_known_asset(
        self,
        account,
        asset_id,
        executed_at,
        quantity,
        price,
        transaction_costs,
        local_value,
        value_in_account_currency,
        total_in_account_currency,
        order_id=None,
    ) -> models.Transaction:

        position = self._get_or_create_position_for_asset(account, asset_id)

        transaction, created = models.Transaction.objects.get_or_create(
            executed_at=executed_at,
            position=position,
            quantity=quantity,
            price=price,
            transaction_costs=transaction_costs,
            local_value=local_value,
            value_in_account_currency=value_in_account_currency,
            total_in_account_currency=total_in_account_currency,
            order_id=order_id,
        )
        if created:
            position.quantity += quantity
            position.save()
            account.balance += total_in_account_currency
            account.save()

        return transaction

    def add_transaction_custom_asset(
        self,
        account,
        symbol,
        currency,
        exchange,
        asset_type,
        executed_at,
        quantity,
        price,
        transaction_costs,
        local_value,
        value_in_account_currency,
        total_in_account_currency,
        order_id=None,
    ):

        exchange = exchanges.ExchangeRepository().get_by_name(exchange)
        asset, _ = models.Asset.objects.get_or_create(
            symbol=symbol,
            exchange=exchange,
            currency=currency,
            asset_type=asset_type,
            tracked=False,
            added_by=account.user,

        )
        position = self._get_or_create_position_for_asset(account, asset.pk)

        transaction, created = models.Transaction.objects.get_or_create(
            executed_at=executed_at,
            position=position,
            quantity=quantity,
            price=price,
            transaction_costs=transaction_costs,
            local_value=local_value,
            value_in_account_currency=value_in_account_currency,
            total_in_account_currency=total_in_account_currency,
            order_id=order_id,
        )

        # We know the price at the tme the asset transacted, let's add it.
        models.PriceHistory.objects.create(
            asset=asset,
            value=price,
            date=executed_at.date()
        )

        if created:
            position.quantity += quantity
            position.save()
            account.balance += total_in_account_currency
            account.save()

        return transaction

    def add_event(self, account):
        pass

    def _get_or_create_position(
        self, account: models.Account, isin: str, exchange: models.Exchange
    ):
        positions = models.Position.objects.filter(
            account=account, asset__isin=isin, asset__exchange=exchange
        )
        if positions:
            return positions[0]
        asset = exchanges.get_or_create_asset(isin, exchange)
        if asset:
            return models.Position.objects.create(account=account, asset=asset)
        else:
            return None

    def _get_or_create_position_for_asset(self, account: models.Account, asset_id: int):
        positions = models.Position.objects.filter(account=account, asset__pk=asset_id)
        if positions:
            return positions[0]
        asset = models.Asset.objects.get(pk=asset_id)
        return models.Position.objects.create(account=account, asset=asset)