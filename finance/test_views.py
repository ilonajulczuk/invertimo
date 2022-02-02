import datetime
import decimal

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone


from hypothesis.extra.django import TestCase as HypothesisTestCase
from django.urls import reverse

from hypothesis import given, strategies as st

from finance import accounts, models, utils

from finance import testing_utils


_FAKE_TRANSACTIONS = [
    ("2021-04-27 10:00Z", 3, 12.11),  # Price after the transaction: 3
    ("2021-04-29 12:00Z", 4, 12.44),  # 7
    ("2021-04-30 17:00Z", 3, 14.3),  # 10
    ("2021-05-01 11:00Z", -2, 15.3),  # 8
    ("2021-05-02 12:00Z", 3, 14.2),  # 11
    ("2021-05-03 12:00Z", 3, 12.3),  # 14
    ("2021-05-03 14:00Z", 3, 14.5),  # 17
    ("2021-05-04 12:00Z", 3, 22),  # 20
]


def _add_dummy_account_and_asset(user, isin):
    account = models.Account.objects.create(
        user=user, currency=models.Currency.EUR, nickname="test account"
    )
    exchange = models.Exchange.objects.create(name="USA stocks", country="USA")
    asset = models.Asset.objects.create(
        isin=isin,
        symbol="MOONIES",
        name="a stock",
        currency=models.Currency.USD,
        exchange=exchange,
        tracked=True,
    )

    return account, exchange, asset


def _add_transaction(
    account, isin, exchange, executed_at, quantity, price, add_price_history=True
):
    transaction_costs = decimal.Decimal(0.5)
    local_value = decimal.Decimal(0.5)
    value_in_account_currency = decimal.Decimal(0.5)
    total_in_account_currency = decimal.Decimal(0.5)
    order_id = "123"
    account_repository = accounts.AccountRepository()
    transaction, _ = account_repository.add_transaction(
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
        asset_defaults={"currency": "USD", "name": isin},
        import_all_assets=True,
    )
    asset = transaction.position.asset
    if add_price_history:
        models.PriceHistory.objects.create(
            asset=asset, value=price, date=transaction.executed_at.date()
        )
        models.CurrencyExchangeRate.objects.create(
            from_currency=models.Currency.USD,
            to_currency=models.Currency.EUR,
            value=0.84,
            date="2020-02-03",
        )


class TestPositionsView(testing_utils.ViewTestBase, TestCase):
    URL = "/api/positions/"
    VIEW_NAME = "api-positions"
    DETAIL_VIEW = False
    QUERY_PARAMS = "?"
    UNAUTHENTICATED_CODE = 403

    def setUp(self):
        super().setUp()

        self.isin = "USA123"
        self.account, self.exchange, self.asset = _add_dummy_account_and_asset(
            self.user, isin=self.isin
        )
        for transaction in _FAKE_TRANSACTIONS:
            _add_transaction(
                self.account,
                self.isin,
                self.exchange,
                transaction[0],
                transaction[1],
                transaction[2],
                add_price_history=False,
            )

    def test_valid_content(self):
        from_date = datetime.date.fromisoformat("2021-04-25")
        to_date = datetime.date.fromisoformat("2021-05-04")

        dates = utils.generate_date_intervals(from_date, to_date)
        for i, date in enumerate(dates):
            # Simulate some prices missing (e.g. weekend).
            if i % 5 == 0:
                continue
            models.PriceHistory.objects.create(
                date=date,
                value=100 + (i % 3) * 10,
                asset=self.asset,
            )
        for i, date in enumerate(dates):
            models.CurrencyExchangeRate.objects.create(
                date=date,
                value=1 + (i % 3) / 10,
                from_currency=self.asset.currency,
                to_currency=self.account.currency,
            )

        response = self.client.get(self.get_url() + self.QUERY_PARAMS)

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "USA123")
        self.assertContains(response, '"latest_price":"1')
        self.assertContains(response, '"latest_exchange_rate":"1')


class TestPositionDetailView(testing_utils.ViewTestBase, TestCase):
    URL = "/api/positions/%s/"
    VIEW_NAME = "api-position"
    DETAIL_VIEW = True
    QUERY_PARAMS = "?"
    UNAUTHENTICATED_CODE = 403

    def setUp(self):
        super().setUp()
        self.isin = "123"
        self.account, self.exchange, self.asset = _add_dummy_account_and_asset(
            self.user, isin=self.isin
        )
        for transaction in _FAKE_TRANSACTIONS:
            _add_transaction(
                self.account,
                self.isin,
                self.exchange,
                transaction[0],
                transaction[1],
                transaction[2],
            )
        self.position = models.Position.objects.first()

    def get_url(self):
        return self.URL % self.position.pk

    def get_reversed_url(self):
        return reverse(self.VIEW_NAME, args=[self.position.pk])


class TestAccountsView(testing_utils.ViewTestBase, HypothesisTestCase):
    URL = "/api/accounts/"
    VIEW_NAME = "account-list"
    DETAIL_VIEW = False
    QUERY_PARAMS = "?"
    UNAUTHENTICATED_CODE = 403

    def __call__(self, result=None):
        testMethod = getattr(self, self._testMethodName)
        return TestCase.__call__(self, result)

    def setUp(self):
        super().setUp()
        self.isin = "USA123"
        self.account, _, _ = _add_dummy_account_and_asset(self.user, isin=self.isin)

    @given(
        # Non blank test, no null character, up to 200.
        nickname=st.text(
            alphabet=st.characters(min_codepoint=1, max_codepoint=1000),
            min_size=1,
            max_size=200,
        )
        .map(lambda s: s.strip())
        .filter(lambda s: len(s) > 0),
        currency=st.sampled_from(["GBP", "EUR", "USD"]),
    )
    def test_adding_account(self, nickname, currency):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse(self.VIEW_NAME),
            {
                "currency": currency,
                "nickname": nickname,
                "description": "",
            },
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(models.Account.objects.count(), 2)
        account = models.Account.objects.get(
            currency=models.currency_enum_from_string(currency),
            nickname=nickname,
        )
        self.assertEqual(account.user, self.user)

    def test_invalid_currency_fails(self):
        response = self.client.post(
            reverse(self.VIEW_NAME),
            {
                "currency": "foobar",
                "nickname": "nickname",
                "description": "",
            },
        )
        self.assertEqual(response.status_code, 400)

    def test_empty_currency_fails(self):
        response = self.client.post(
            reverse(self.VIEW_NAME),
            {
                "currency": "",
                "nickname": "nickname",
                "description": "",
            },
        )
        self.assertEqual(response.status_code, 400)

    def test_adding_account_with_the_same_nickname_twice_fails(self):
        response = self.client.post(
            reverse(self.VIEW_NAME),
            {
                "currency": "EUR",
                "nickname": "nickname",
                "description": "",
            },
        )
        self.assertEqual(response.status_code, 201)

        self.assertEqual(models.Account.objects.count(), 2)
        response = self.client.post(
            reverse(self.VIEW_NAME),
            {
                "currency": "GBP",
                "nickname": "nickname",
                "description": "",
            },
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(models.Account.objects.count(), 2)


class TestAccountDetailView(testing_utils.ViewTestBase, TestCase):
    URL = "/api/accounts/%s/"
    VIEW_NAME = "account-detail"
    DETAIL_VIEW = True
    QUERY_PARAMS = "?"
    UNAUTHENTICATED_CODE = 403

    def setUp(self):
        super().setUp()

        self.isin = "USA123"
        self.account, self.exchange, _ = _add_dummy_account_and_asset(
            self.user, isin=self.isin
        )

    def get_url(self):
        return self.URL % self.account.pk

    def get_reversed_url(self):
        return reverse(self.VIEW_NAME, args=[self.account.pk])

    def test_deleting_the_account(self):
        # Delete is only successful if there aren't any associated
        # transactions or events (because they are deleted).
        response = self.client.delete(reverse(self.VIEW_NAME, args=[self.account.pk]))
        self.assertEqual(response.status_code, 204)

    def test_deleting_the_nonempty_account(self):
        for transaction in _FAKE_TRANSACTIONS:
            _add_transaction(
                self.account,
                self.isin,
                self.exchange,
                transaction[0],
                transaction[1],
                transaction[2],
            )
        response = self.client.delete(reverse(self.VIEW_NAME, args=[self.account.pk]))
        self.assertEqual(response.status_code, 400)

    def test_update(self):
        for transaction in _FAKE_TRANSACTIONS:
            _add_transaction(
                self.account,
                self.isin,
                self.exchange,
                transaction[0],
                transaction[1],
                transaction[2],
            )

        # Changing the name or description is fine.
        new_name = "cooler account name"
        response = self.client.put(
            reverse(self.VIEW_NAME, args=[self.account.pk]),
            {
                "id": self.account.pk,
                "nickname": new_name,
                "description": "wow totally new desc",
                "currency": "EUR",  # Same as the existing one.
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.account.refresh_from_db()
        self.assertEqual(self.account.nickname, new_name)

        # Changing the currency is only allowed if there are no transactions associated.

        response = self.client.put(
            reverse(self.VIEW_NAME, args=[self.account.pk]),
            {
                "id": self.account.pk,
                "nickname": new_name,
                "description": "wow totally new desc",
                "currency": "USD",  # Different as the existing one.
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)

        for transaction in models.Transaction.objects.all():
            transaction.delete()

        response = self.client.put(
            reverse(self.VIEW_NAME, args=[self.account.pk]),
            {
                "id": self.account.pk,
                "nickname": new_name,
                "description": "wow totally new desc",
                "currency": "USD",  # Different as the existing one.
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.account.refresh_from_db()
        self.assertEqual(self.account.currency, models.Currency.USD)


class TestTransactionsView(testing_utils.ViewTestBase, TestCase):
    URL = "/api/transactions/"
    VIEW_NAME = "transaction-list"
    DETAIL_VIEW = False
    QUERY_PARAMS = "?"
    UNAUTHENTICATED_CODE = 403

    def setUp(self):
        super().setUp()

        self.isin = "USA123"
        self.account, self.exchange, self.asset = _add_dummy_account_and_asset(
            self.user, isin=self.isin
        )
        for transaction in _FAKE_TRANSACTIONS:
            _add_transaction(
                self.account,
                self.isin,
                self.exchange,
                transaction[0],
                transaction[1],
                transaction[2],
            )

    def test_add_transaction_for_known_asset(self):
        response = self.client.post(
            reverse(self.VIEW_NAME),
            {
                "executed_at": "2021-03-04T00:00:00Z",
                "account": self.account.pk,
                "asset": self.asset.pk,
                "quantity": 10,
                "price": 3.15,
                "transaction_costs": 0,
                "local_value": 123.56,
                "value_in_account_currency": 123.33,
                "total_in_account_currency": 123.33,
                "currency": "EUR",
            },
        )
        self.assertEqual(response.status_code, 201)

    def test_add_transaction_for_known_asset_that_doesnt_exist_fails(self):
        response = self.client.post(
            reverse(self.VIEW_NAME),
            {
                "executed_at": "2021-03-04T00:00:00Z",
                "account": self.account.pk,
                "asset": 999,
                "quantity": 10,
                "price": 3.15,
                "transaction_costs": 0,
                "local_value": 123.56,
                "value_in_account_currency": 123.33,
                "total_in_account_currency": 123.33,
                "currency": "EUR",
            },
        )
        self.assertEqual(response.status_code, 400)

    def test_add_transaction_for_sell_more_than_owned_fails(self):
        response = self.client.post(
            reverse(self.VIEW_NAME),
            {
                "executed_at": "2021-03-04T00:00:00Z",
                "account": self.account.pk,
                "asset": self.asset.pk,
                "quantity": 10,
                "price": 3.15,
                "transaction_costs": 0,
                "local_value": -123.56,
                "value_in_account_currency": -123.33,
                "total_in_account_currency": -123.33,
                "currency": "EUR",
            },
        )
        self.assertEqual(response.status_code, 201)

        response = self.client.post(
            reverse(self.VIEW_NAME),
            {
                "executed_at": "2021-03-05T00:00:00Z",
                "account": self.account.pk,
                "asset": self.asset.pk,
                "quantity": -100,
                "price": 3.15,
                "transaction_costs": 0,
                "local_value": 123.56,
                "value_in_account_currency": 123.33,
                "total_in_account_currency": 123.33,
                "currency": "EUR",
            },
        )
        self.assertEqual(response.status_code, 400)

    def test_add_transaction_for_known_asset_for_not_owned_account_fails(self):

        self.other_user = User.objects.create(
            username="billy", email="billy@example.com"
        )
        self.other_account, _, self.other_asset = _add_dummy_account_and_asset(
            self.other_user, isin="something"
        )

        response = self.client.post(
            reverse(self.VIEW_NAME),
            {
                "executed_at": "2021-03-04T00:00:00Z",
                "account": self.other_account.pk,
                "asset": self.other_asset.pk,
                "quantity": 10,
                "price": 3.15,
                "transaction_costs": 0,
                "local_value": 123.56,
                "value_in_account_currency": 123.33,
                "total_in_account_currency": 123.33,
            },
        )
        self.assertEqual(response.status_code, 400)

    def test_add_transaction_for_new_asset(self):
        response = self.client.post(
            reverse("transaction-add-with-custom-asset"),
            {
                "executed_at": "2021-03-04T00:00:00Z",
                "account": self.account.pk,
                "currency": "USD",
                "exchange": "USA stocks",
                "asset_type": "Stock",
                "symbol": "DIS",
                "quantity": 10,
                "price": 3.15,
                "transaction_costs": 0,
                "local_value": 123.56,
                "value_in_account_currency": 123.33,
                "total_in_account_currency": 123.33,
                "currency": "EUR",
            },
        )
        self.assertEqual(response.status_code, 201)

    def test_add_transaction_for_new_asset_na_exchange(self):
        response = self.client.post(
            reverse("transaction-add-with-custom-asset"),
            {
                "executed_at": "2021-03-04T00:00:00Z",
                "account": self.account.pk,
                "currency": "USD",
                "exchange": "Other / NA",
                "asset_type": "Stock",
                "symbol": "DIS",
                "quantity": 10,
                "price": 3.15,
                "transaction_costs": 0,
                "local_value": 123.56,
                "value_in_account_currency": 123.33,
                "total_in_account_currency": 123.33,
                "currency": "EUR",
            },
        )
        self.assertEqual(response.status_code, 201)

    def test_add_transaction_for_new_asset_bad_exchange(self):
        response = self.client.post(
            reverse("transaction-add-with-custom-asset"),
            {
                "executed_at": "2021-03-04T00:00:00Z",
                "account": self.account.pk,
                "currency": "USD",
                "exchange": "Fake exchange that doesn't exist",
                "asset_type": "Stock",
                "symbol": "DIS",
                "quantity": 10,
                "price": 3.15,
                "transaction_costs": 0,
                "local_value": 123.56,
                "value_in_account_currency": 123.33,
                "total_in_account_currency": 123.33,
                "currency": "EUR",
            },
        )
        self.assertEqual(response.status_code, 400)


class TestTransactionDetailView(testing_utils.ViewTestBase, TestCase):
    URL = "/api/transactions/%s/"
    VIEW_NAME = "transaction-detail"
    DETAIL_VIEW = True
    QUERY_PARAMS = "?"
    UNAUTHENTICATED_CODE = 403

    def setUp(self):
        super().setUp()

        self.isin = "USA123"
        self.account, self.exchange, self.asset = _add_dummy_account_and_asset(
            self.user, isin=self.isin
        )
        for transaction in _FAKE_TRANSACTIONS:
            _add_transaction(
                self.account,
                self.isin,
                self.exchange,
                transaction[0],
                transaction[1],
                transaction[2],
            )
        self.transaction = models.Transaction.objects.first()

    def get_url(self):
        return self.URL % self.transaction.pk

    def get_reversed_url(self):
        return reverse(self.VIEW_NAME, args=[self.transaction.pk])

    def test_delete_transaction(self):
        self.assertEqual(models.Position.objects.count(), 1)
        position = models.Position.objects.first()

        old_quantity = position.quantity
        old_account_balance = position.account.balance
        first_transaction = models.Transaction.objects.first()
        middle_transaction = models.Transaction.objects.all()[3]

        self.assertEqual(models.Transaction.objects.count(), 8)
        self.client.delete(reverse(self.VIEW_NAME, args=[first_transaction.pk]))

        self.assertEqual(models.Transaction.objects.count(), 7)
        position.refresh_from_db()
        self.assertEqual(position.quantity, old_quantity - first_transaction.quantity)
        self.assertEqual(
            position.account.balance,
            old_account_balance - first_transaction.total_in_account_currency,
        )
        # Delete another transaction from the middle.
        self.client.delete(reverse(self.VIEW_NAME, args=[middle_transaction.pk]))

        # Test if quantity of position has changed.
        # Test that value history has changed for the position.
        self.assertEqual(models.Transaction.objects.count(), 6)
        position.refresh_from_db()
        self.assertEqual(
            position.quantity,
            old_quantity - first_transaction.quantity - middle_transaction.quantity,
        )
        self.assertEqual(
            position.account.balance,
            old_account_balance
            - first_transaction.total_in_account_currency
            - middle_transaction.total_in_account_currency,
        )

    def test_delete_transaction_quantity_history_changes(self):
        self.assertEqual(models.Position.objects.count(), 1)
        position = models.Position.objects.first()

        old_quantity = position.quantity
        old_account_balance = position.account.balance
        first_transaction = models.Transaction.objects.first()

        old_position_response = self.client.get(
            reverse("api-position", args=[position.pk])
        )
        self.assertEqual(old_position_response.status_code, 200)
        self.assertEqual(models.Transaction.objects.count(), 8)
        self.client.delete(reverse(self.VIEW_NAME, args=[first_transaction.pk]))

        self.assertEqual(models.Transaction.objects.count(), 7)
        position.refresh_from_db()
        self.assertEqual(position.quantity, old_quantity - first_transaction.quantity)
        self.assertEqual(
            position.account.balance,
            old_account_balance - first_transaction.total_in_account_currency,
        )

        new_position_response = self.client.get(
            reverse("api-position", args=[position.pk])
        )
        self.assertEqual(new_position_response.status_code, 200)
        self.assertNotEqual(
            old_position_response.json()["quantities"],
            new_position_response.json()["quantities"],
        )

    def test_correct_transaction(self):
        # Start with a bunch of transactions.
        # Correcting transaction doesn't change number of transactions.
        # But can change Position Quantity and quantity history and the account balance.

        self.assertEqual(models.Position.objects.count(), 1)
        position = models.Position.objects.first()

        old_quantity = position.quantity
        old_account_balance = position.account.balance

        transaction = models.Transaction.objects.first()

        self.assertEqual(models.Transaction.objects.count(), 8)
        response = self.client.put(
            reverse(self.VIEW_NAME, args=[transaction.pk]),
            {
                "executed_at": "2021-03-04T00:00:00Z",
                "quantity": 12,
                "price": 5.15,
                "transaction_costs": 0,
                "local_value": 123.56,
                "value_in_account_currency": 183.33,
                "total_in_account_currency": 153.88,
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(models.Transaction.objects.count(), 8)
        position.refresh_from_db()
        corrected_transaction = models.Transaction.objects.get(pk=transaction.pk)

        self.assertEqual(
            position.quantity,
            old_quantity - transaction.quantity + corrected_transaction.quantity,
        )
        self.assertEqual(
            position.account.balance,
            old_account_balance
            - transaction.total_in_account_currency
            + corrected_transaction.total_in_account_currency,
        )

    def test_correct_transaction_sell_more_than_has(self):
        # Start with a bunch of transactions.
        # Correcting transaction doesn't change number of transactions.
        # But can change Position Quantity and quantity history and the account balance.

        self.assertEqual(models.Position.objects.count(), 1)
        position = models.Position.objects.first()

        old_quantity = position.quantity

        transaction = models.Transaction.objects.first()

        self.assertEqual(models.Transaction.objects.count(), 8)
        response = self.client.put(
            reverse(self.VIEW_NAME, args=[transaction.pk]),
            {
                "executed_at": "2021-03-04T00:00:00Z",
                "quantity": -1200,
                "price": 5.15,
                "transaction_costs": 0,
                "local_value": 123.56,
                "value_in_account_currency": 183.33,
                "total_in_account_currency": 153.88,
            },
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(models.Transaction.objects.count(), 8)

        position.refresh_from_db()
        self.assertEqual(
            position.quantity,
            old_quantity,
        )

    def test_deleting_transaction_fails_if_selling_more_than_owned(self):
        self.assertEqual(models.Position.objects.count(), 1)

        # Add transaction that sells a lot.
        _add_transaction(
            self.account,
            self.isin,
            self.exchange,
            "2022-01-27 10:00Z",
            -20,
            30,
        )
        first_transaction = models.Transaction.objects.last()
        self.assertEqual(models.Transaction.objects.count(), 9)
        response = self.client.delete(
            reverse(self.VIEW_NAME, args=[first_transaction.pk])
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json(), {"quantity": ["Can't sell asset before buying it."]}
        )
        self.assertEqual(models.Transaction.objects.count(), 9)

    def test_deleting_transaction_fails_if_transaction_has_event(self):
        self.assertEqual(models.Position.objects.count(), 1)
        first_transaction = models.Transaction.objects.last()
        event, _ = accounts.AccountRepository().add_crypto_income_event(
            self.account,
            self.isin,
            first_transaction.executed_at,
            10,
            200,
            2000,
            2100,
            models.EventType.STAKING_INTEREST,
        )
        self.assertEqual(models.Transaction.objects.count(), 9)
        response = self.client.delete(
            reverse(self.VIEW_NAME, args=[event.transaction.pk])
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(
            response.json(), ["Can't delete a transaction associated with an event, without deleting the event first."]
        )
        self.assertEqual(models.Transaction.objects.count(), 9)


def _add_account_event(account, event_type, amount, executed_at=None, position=None):
    if executed_at is None:
        executed_at = timezone.now()

    account_repository = accounts.AccountRepository()
    account_repository.add_event(
        account,
        amount=amount,
        executed_at=executed_at,
        event_type=event_type,
        position=position,
    )


_FAKE_EVENTS_CASH_TRANSFERS = (
    (models.EventType.DEPOSIT, decimal.Decimal("200")),
    (models.EventType.DEPOSIT, decimal.Decimal("500")),
    (models.EventType.WITHDRAWAL, decimal.Decimal("-350")),
)


class TestAccountEventListView(testing_utils.ViewTestBase, TestCase):
    URL = "/api/account-events/"
    VIEW_NAME = "account-event-list"
    DETAIL_VIEW = False
    QUERY_PARAMS = "?"
    UNAUTHENTICATED_CODE = 403

    def setUp(self):
        super().setUp()

        self.isin = "USA123"
        self.account, self.exchange, self.asset = _add_dummy_account_and_asset(
            self.user, isin=self.isin
        )
        for event in _FAKE_EVENTS_CASH_TRANSFERS:
            _add_account_event(self.account, event[0], event[1])

    def test_events_present(self):
        self.account.refresh_from_db()
        self.assertEqual(self.account.balance, 350)
        response = self.client.get(self.get_url())
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 3)

    def test_add_event(self):
        self.account.refresh_from_db()
        self.assertEqual(self.account.balance, 350)
        data = {
            "executed_at": "2021-03-04T00:00:00Z",
            "amount": 4.5,
            "event_type": "DEPOSIT",
            "account": self.account.pk,
            "position": "",
        }
        response = self.client.post(self.get_url(), data)
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(
            data,
            {
                "account": self.account.pk,
                "amount": "4.500000",
                "event_type": "DEPOSIT",
                "executed_at": "2021-03-04T00:00:00Z",
                "position": None,
            },
        )
        self.account.refresh_from_db()
        self.assertEqual(self.account.balance, 354.5)

    def test_add_event_to_other_user_account(self):
        self.account.refresh_from_db()
        self.assertEqual(self.account.balance, 350)
        user2 = User.objects.create(username="anotheruser", email="test2@example.com")
        self.client.force_login(user2)

        data = {
            "executed_at": "2021-03-04T00:00:00Z",
            "amount": 4.5,
            "event_type": "DEPOSIT",
            "account": self.account.pk,
            "position": "",
        }
        response = self.client.post(self.get_url(), data)
        self.assertEqual(response.status_code, 400)

        self.account.refresh_from_db()
        self.assertEqual(self.account.balance, 350)

    def test_add_withdrawal(self):
        self.account.refresh_from_db()
        self.assertEqual(self.account.balance, 350)
        data = {
            "executed_at": "2021-03-04T00:00:00Z",
            "amount": -4.5,
            "event_type": "WITHDRAWAL",
            "account": self.account.pk,
            "position": "",
        }
        response = self.client.post(self.get_url(), data)
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(
            data,
            {
                "account": self.account.pk,
                "amount": "-4.500000",
                "event_type": "WITHDRAWAL",
                "executed_at": "2021-03-04T00:00:00Z",
                "position": None,
            },
        )
        self.account.refresh_from_db()
        self.assertEqual(self.account.balance, 345.5)

    def test_add_dividend(self):
        # Test for position being set correctly.
        self.account.refresh_from_db()
        for transaction in _FAKE_TRANSACTIONS:
            _add_transaction(
                self.account,
                self.isin,
                self.exchange,
                transaction[0],
                transaction[1],
                transaction[2],
            )

        self.assertEqual(self.account.balance, 354)

        # If dividend was paid in a different currency than the account currency
        # we will need to convert currencies and for that we need to have some exchange
        # rates.
        models.CurrencyExchangeRate.objects.create(
            from_currency=models.Currency.USD,
            to_currency=models.Currency.EUR,
            date=datetime.date.fromisoformat("2021-05-03"),
            value=0.84,
        )
        position = models.Position.objects.first()
        data = {
            "executed_at": "2021-03-04T00:00:00Z",
            "amount": 4.5,
            "event_type": "DIVIDEND",
            "account": self.account.pk,
            "position": position.pk,
            "withheld_taxes": 0.2,
        }
        response = self.client.post(self.get_url(), data)
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(
            data,
            {
                "account": self.account.pk,
                "amount": "4.500000",
                "withheld_taxes": "0.200000",
                "event_type": "DIVIDEND",
                "executed_at": "2021-03-04T00:00:00Z",
                "position": position.pk,
            },
        )
        self.account.refresh_from_db()
        # If the currencies matched the balance would be: 358.3, but due to EUR to USD
        # conversion the end balance is smaller.
        self.assertEqual(self.account.balance, decimal.Decimal("357.612"))

        # Now let's test for some invalid inputs.
        data = {
            "executed_at": "2021-03-04T00:00:00Z",
            "amount": 4.5,
            "event_type": "DIVIDEND",
            "account": self.account.pk,
            "position": "",
        }
        response = self.client.post(self.get_url(), data)
        self.assertEqual(response.status_code, 400)
        self.assertTrue("position" in response.json())

        data = {
            "executed_at": "2021-03-04T00:00:00Z",
            "amount": -4.5,
            "event_type": "DIVIDEND",
            "account": self.account.pk,
            "position": position.pk,
        }
        response = self.client.post(self.get_url(), data)
        self.assertEqual(response.status_code, 400)
        self.assertTrue("amount" in response.json())


class TestAccountEventDetailView(testing_utils.ViewTestBase, TestCase):
    URL = "/api/account-events/%s/"
    VIEW_NAME = "account-event-detail"
    DETAIL_VIEW = True
    QUERY_PARAMS = "?"
    UNAUTHENTICATED_CODE = 403

    def setUp(self):
        super().setUp()

        self.isin = "USA123"
        self.account, self.exchange, self.asset = _add_dummy_account_and_asset(
            self.user, isin=self.isin
        )
        for event in _FAKE_EVENTS_CASH_TRANSFERS:
            _add_account_event(self.account, event[0], event[1])
        self.event = models.AccountEvent.objects.first()

    def get_url(self):
        return self.URL % self.event.pk

    def get_reversed_url(self):
        return reverse(self.VIEW_NAME, args=[self.event.pk])

    def test_delete_event(self):
        self.assertEqual(models.AccountEvent.objects.count(), 3)
        event = models.AccountEvent.objects.first()
        account = event.account
        old_account_balance = account.balance
        self.client.delete(reverse(self.VIEW_NAME, args=[event.pk]))

        self.assertEqual(models.AccountEvent.objects.count(), 2)
        account.refresh_from_db()
        self.assertEqual(
            account.balance,
            old_account_balance - event.amount,
        )


class TestAssetListView(testing_utils.ViewTestBase, TestCase):
    URL = "/api/assets/"
    VIEW_NAME = "asset-list"
    DETAIL_VIEW = False
    QUERY_PARAMS = "?"
    UNAUTHENTICATED_CODE = 403

    def setUp(self):
        super().setUp()

        self.isin = "USA123"
        self.account, self.exchange, self.asset = _add_dummy_account_and_asset(
            self.user, isin=self.isin
        )
        for transaction in _FAKE_TRANSACTIONS:
            _add_transaction(
                self.account,
                self.isin,
                self.exchange,
                transaction[0],
                transaction[1],
                transaction[2],
            )

        self.another_asset = models.Asset.objects.create(
            isin="USA234",
            symbol="MOONIES2",
            name="stockson",
            currency=models.Currency.USD,
            exchange=self.exchange,
            tracked=True,
        )

        self.custom_asset = models.Asset.objects.create(
            symbol="mystockson",
            currency=models.Currency.EUR,
            exchange=self.exchange,
            tracked=False,
            added_by=self.user,
        )

        user2 = User.objects.create(username="anotheruser", email="test2@example.com")

        self.custom_asset_of_another_user = models.Asset.objects.create(
            symbol="mystockson",
            currency=models.Currency.GBP,
            exchange=self.exchange,
            tracked=False,
            added_by=user2,
        )

    def test_assets_listed(self):
        response = self.client.get(self.get_url())
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 3)
        ids = [entry["id"] for entry in data]
        self.assertTrue(self.asset.id in ids)
        self.assertTrue(self.custom_asset.id in ids)
        self.assertTrue(self.another_asset.id in ids)
        self.assertFalse(self.custom_asset_of_another_user.id in ids)


class TestLotListView(testing_utils.ViewTestBase, TestCase):
    URL = "/api/lots/"
    VIEW_NAME = "lot-list"
    DETAIL_VIEW = False
    QUERY_PARAMS = "?"
    UNAUTHENTICATED_CODE = 403

    def setUp(self):
        super().setUp()

        self.isin = "USA123"
        self.account, self.exchange, self.asset = _add_dummy_account_and_asset(
            self.user, isin=self.isin
        )
        for transaction in _FAKE_TRANSACTIONS:
            _add_transaction(
                self.account,
                self.isin,
                self.exchange,
                transaction[0],
                transaction[1],
                transaction[2],
            )

    def test_lots_listed(self):
        response = self.client.get(self.get_url())
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
