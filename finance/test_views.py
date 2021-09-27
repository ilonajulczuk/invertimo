import datetime
import decimal

from django.contrib.auth.models import User
from django.db.models import Sum
from django.test import SimpleTestCase, TestCase

from hypothesis.extra.django import TestCase as HypothesisTestCase, TransactionTestCase
from django.urls import reverse

from hypothesis import example, given, strategies as st

from finance import accounts, models, utils

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


def _add_transaction(account, isin, exchange, executed_at, quantity, price):
    transaction_costs = decimal.Decimal(0.5)
    local_value = decimal.Decimal(0.5)
    value_in_account_currency = decimal.Decimal(0.5)
    total_in_account_currency = decimal.Decimal(0.5)
    order_id = "123"
    account_repository = accounts.AccountRepository()
    account_repository.add_transaction(
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
    )


class ViewTestBase:
    """ViewTestVase is meant to be used as a base class with the django.test.TestCase

    It offers basic tests for views, so that they don't have to be reimplemented each time.
    It doesn't inherit from TestCase because we don't want those tests to run, we only want them
    to be run in the child classes.
    """

    URL = None
    VIEW_NAME = None
    DETAIL_VIEW = False
    QUERY_PARAMS = "?"
    # Change to None if the view is fine to access while not authenticated.
    UNAUTHENTICATED_CODE = 302  # Redirect by default.

    def setUp(self):
        self.user = User.objects.create(username="testuser", email="test@example.com")
        self.client.force_login(self.user)

    def get_url(self):
        return self.URL

    def get_reversed_url(self):
        return reverse(self.VIEW_NAME)

    def test_url_exists(self):
        response = self.client.get(self.get_url() + self.QUERY_PARAMS)
        self.assertEqual(response.status_code, 200)

    def test_view_accessible_by_name(self):
        response = self.client.get(self.get_reversed_url() + self.QUERY_PARAMS)
        self.assertEqual(response.status_code, 200)

    def test_cant_access_without_logging_in(self):
        self.client.logout()
        response = self.client.get(self.get_reversed_url() + self.QUERY_PARAMS)
        # If UNAUTHENTICATE_CODE is overriden to None, it means that it shouldn't
        # be disallowed.
        if self.UNAUTHENTICATED_CODE:
            self.assertEquals(response.status_code, self.UNAUTHENTICATED_CODE)

    def test_cant_access_objects_of_other_users(self):
        if self.DETAIL_VIEW:
            user2 = User.objects.create(
                username="anotheruser", email="test2@example.com"
            )
            self.client.force_login(user2)
            response = self.client.get(self.get_reversed_url() + self.QUERY_PARAMS)
            self.assertEquals(response.status_code, 404)


class TestPositionsView(ViewTestBase, TestCase):
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


class TestPositionDetailView(ViewTestBase, TestCase):
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


class TestAccountsView(ViewTestBase, HypothesisTestCase):
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


class TestDetailAccountsView(ViewTestBase, TestCase):
    URL = "/api/accounts/%s/"
    VIEW_NAME = "account-detail"
    DETAIL_VIEW = True
    QUERY_PARAMS = "?"
    UNAUTHENTICATED_CODE = 403

    def setUp(self):
        super().setUp()

        self.isin = "USA123"
        self.account, _, _ = _add_dummy_account_and_asset(self.user, isin=self.isin)

    def get_url(self):
        return self.URL % self.account.pk

    def get_reversed_url(self):
        return reverse(self.VIEW_NAME, args=[self.account.pk])


class TestTransactionsView(ViewTestBase, TestCase):
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
                "asset_type": "stock",
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
                "asset_type": "stock",
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
                "asset_type": "stock",
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


class TestTransactionDetailView(ViewTestBase, TestCase):
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

    def test_correct_transaction(self):
        # Start with a bunch of transactions.
        # Correcting transaction doesn't change number of transactions.
        # But can change Position Quantity and quantity history and the account balance.

        self.assertEqual(models.Position.objects.count(), 1)
        position = models.Position.objects.first()

        old_quantity = position.quantity
        old_account_balance = position.account.balance

        transaction = models.Transaction.objects.first()
        middle_transaction = models.Transaction.objects.all()[3]

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

        self.assertEqual(position.quantity, old_quantity - transaction.quantity + corrected_transaction.quantity)
        self.assertEqual(
            position.account.balance,
            old_account_balance - transaction.total_in_account_currency + corrected_transaction.total_in_account_currency,
        )