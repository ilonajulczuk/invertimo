from finance import models
from finance import exchanges
from django.contrib.auth.models import User
import decimal


class AccountRepository:
    def get(self, user, id):
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

    def add_transaction_known_asset(self, account, asset_id, executed_at,
        quantity,
        price,
        transaction_costs,
        local_value,
        value_in_account_currency,
        total_in_account_currency,
        order_id):

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

    def add_tranaction_custom_asset(self, account, asset_details, executed_at,
        quantity,
        price,
        transaction_costs,
        local_value,
        value_in_account_currency,
        total_in_account_currency,
        order_id):
        pass

    def add_event(self, account):
        pass

    def _get_or_create_position(
        self, account: models.Account, isin: str, exchange: models.Exchange
    ):
        positions = models.Position.objects.filter(
            account=account, security__isin=isin, security__exchange=exchange
        )
        if positions:
            return positions[0]
        security = exchanges.get_or_create_security(isin, exchange)
        if security:
            return models.Position.objects.create(account=account, security=security)
        else:
            return None

    def _get_or_create_position_for_asset(
        self, account: models.Account, asset_id: int
    ):
        positions = models.Position.objects.filter(
            account=account, security__pk=asset_id
        )
        if positions:
            return positions[0]
        security = models.Security.objects.get(pk=asset_id)
        return models.Position.objects.create(account=account, security=security)