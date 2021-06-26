import datetime
import decimal

from django.contrib.auth.models import User
from django.db.models import Sum
from django.test import SimpleTestCase, TestCase
from django.urls import reverse

from finance import accounts, degiro_parser, exchanges, models, utils

DATE_FORMAT = "%Y-%m-%d %H:%M%z"


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


def datestr_to_datetime(datestr) -> datetime.datetime:
    return datetime.datetime.strptime(datestr, DATE_FORMAT)


def _add_dummy_account_and_security(user, isin):
    account = models.Account.objects.create(
        user=user, currency=models.Currency.EURO, nickname="test account"
    )
    exchange = models.Exchange.objects.create(name="my US stocks", country="USA")
    security = models.Security.objects.create(
        isin=isin,
        symbol="MOONIES",
        name="a stock",
        currency=models.Currency.USD,
        exchange=exchange,
    )
    return account, exchange, security


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


class TestDegiroParser(TestCase):

    # This fixture provides data about 65 different exchanges,
    # and sets up a single account for testing.
    fixtures = ["exchanges_postgres.json"]

    def test_importing_single_transaction(self):
        # TODO: mock out the API call, don't call the official API
        # every time the test runs.
        account_balance = decimal.Decimal("-15237.26000")
        base_num_of_transactions = 6
        account = models.Account.objects.create(
            user=User.objects.all()[0], nickname="test"
        )
        failed_records = degiro_parser.import_transactions_from_file(
            account, "./finance/transactions_example_short.csv"
        )
        self.assertEqual(len(failed_records), 0)
        self.assertEqual(models.Transaction.objects.count(), base_num_of_transactions)
        account = models.Account.objects.get(nickname="test")
        self.assertAlmostEqual(account.balance, account_balance)

        # 6 in the new account, 30 from the old fixture.
        self.assertEqual(models.Position.objects.count(), 36)

        total_value = models.Transaction.objects.aggregate(
            Sum("total_in_account_currency")
        )["total_in_account_currency__sum"]
        self.assertAlmostEqual(total_value, account_balance)

        # Import the same transactions again and make
        # sure that they aren't double recorded.
        degiro_parser.import_transactions_from_file(
            account, "./finance/transactions_example_short.csv"
        )
        self.assertEqual(models.Transaction.objects.count(), base_num_of_transactions)
        self.assertEqual(models.Position.objects.count(), 36)
        account = models.Account.objects.get(nickname="test")
        total_value = models.Transaction.objects.aggregate(
            Sum("total_in_account_currency")
        )["total_in_account_currency__sum"]

        self.assertAlmostEqual(account.balance, account_balance)
        self.assertAlmostEqual(total_value, account_balance)


class TestUtils(TestCase):
    def test_generate_datetime_intervals_from_end(self):
        expected_dates = [
            "2021-05-05 13:00Z",
            "2021-05-05 09:00Z",
            "2021-05-05 05:00Z",
            "2021-05-05 01:00Z",
            "2021-05-04 21:00Z",
            "2021-05-04 17:00Z",
            "2021-05-04 13:00Z",
            "2021-05-04 09:00Z",
            "2021-05-04 05:00Z",
            "2021-05-04 01:00Z",
            "2021-05-03 21:00Z",
            "2021-05-03 17:00Z",
            "2021-05-03 13:00Z",
        ]
        date_format = "%Y-%m-%d %H:%M%z"
        expected_dates = [
            datetime.datetime.strptime(datestr, date_format)
            for datestr in expected_dates
        ]

        from_date = datetime.datetime.strptime("2021-05-03 12:00Z", date_format)
        to_date = datetime.datetime.strptime("2021-05-05 13:00Z", date_format)
        output_period = datetime.timedelta(hours=4)

        got = utils.generate_datetime_intervals(from_date, to_date, output_period)
        self.assertEqual(got, expected_dates)

    def test_generate_date_intervals_from_end(self):
        expected_dates = [
            "2021-05-05",
            "2021-05-04",
            "2021-05-03",
        ]
        expected_dates = [
            datetime.date.fromisoformat(datestr) for datestr in expected_dates
        ]

        from_date = datetime.date.fromisoformat("2021-05-03")
        to_date = datetime.date.fromisoformat("2021-05-05")
        output_period = datetime.timedelta(days=1)

        got = utils.generate_datetime_intervals(from_date, to_date, output_period)
        self.assertEqual(got, expected_dates)

    def test_generate_datetime_intervals_from_start(self):
        expected_dates = [
            "2021-05-03 12:00Z",
            "2021-05-03 18:00Z",
            "2021-05-04 00:00Z",
            "2021-05-04 06:00Z",
        ]
        date_format = "%Y-%m-%d %H:%M%z"
        expected_dates = [
            datetime.datetime.strptime(datestr, date_format)
            for datestr in expected_dates
        ]

        from_date = datetime.datetime.strptime("2021-05-03 12:00Z", date_format)
        to_date = datetime.datetime.strptime("2021-05-04 06:00Z", date_format)
        output_period = datetime.timedelta(hours=6)

        got = utils.generate_datetime_intervals(
            from_date, to_date, output_period, start_with_end=False
        )
        self.assertEqual(got, expected_dates)


class TestPosition(TestCase):
    def setUp(self):
        super().setUp()
        # Create a user and an account.
        self.user = User.objects.create(username="testuser", email="test@example.com")
        self.client.force_login(self.user)
        self.isin = "US1234"
        self.account, self.exchange, self.security = _add_dummy_account_and_security(
            self.user, isin=self.isin
        )

    def test_quantity_history_based_on_transactions(self):

        # Nothing special like stock splits here.
        for transaction in _FAKE_TRANSACTIONS:
            _add_transaction(
                self.account,
                self.isin,
                self.exchange,
                transaction[0],
                transaction[1],
                transaction[2],
            )

        self.assertEqual(models.Position.objects.count(), 1)
        self.assertEqual(models.Transaction.objects.count(), 8)
        position = models.Position.objects.first()
        self.assertEqual(position.quantity, 20)

        from_date = datetime.date.fromisoformat("2021-04-25")
        to_date = datetime.date.fromisoformat("2021-05-04")
        quantity_history = position.quantity_history(
            from_date=from_date,
            to_date=to_date,
        )
        expected_quantity_history = [
            ("2021-05-04", 17.00),
            ("2021-05-03", 11.00),
            ("2021-05-02", 8.00),
            ("2021-05-01", 10.00),
            ("2021-04-30", 7.00),
            ("2021-04-29", 3.00),
            ("2021-04-28", 3.00),
            ("2021-04-27", 0.00),
            ("2021-04-26", 0.00),
            ("2021-04-25", 0.00),
        ]
        expected_quantity_history = [
            (datetime.date.fromisoformat(date), value)
            for (date, value) in expected_quantity_history
        ]

        self.assertEqual(quantity_history, expected_quantity_history)

    def test_value_history(self):
        for transaction in _FAKE_TRANSACTIONS:
            _add_transaction(
                self.account,
                self.isin,
                self.exchange,
                transaction[0],
                transaction[1],
                transaction[2],
            )

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
                security=self.security,
            )
        position = models.Position.objects.first()
        self.assertEqual(position.quantity, 20)

        value_history = position.value_history(from_date, to_date)

        expected_value_history = [
            # ("2021-05-04", 17.00 * 100), -- price missing
            ("2021-05-03", 11.00 * 110),
            ("2021-05-02", 8.00 * 120),
            ("2021-05-01", 10.00 * 100),
            ("2021-04-30", 7.00 * 110),
            # ("2021-04-29", 3.00 * 120), -- price missing
            ("2021-04-28", 3.00 * 100),
            ("2021-04-27", 0.00),
            ("2021-04-26", 0.00),
            ("2021-04-25", 0.00),
        ]
        expected_value_history = [
            (datetime.date.fromisoformat(date), value)
            for (date, value) in expected_value_history
        ]
        self.assertEqual(value_history, expected_value_history)


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
        self.account, self.exchange, self.security = _add_dummy_account_and_security(
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
                security=self.security,
            )
        for i, date in enumerate(dates):
            models.CurrencyExchangeRate.objects.create(
                date=date,
                value=1 + (i % 3) / 10,
                from_currency=self.security.currency,
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
        self.account, self.exchange, self.security = _add_dummy_account_and_security(
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


class TestAccountsView(ViewTestBase, TestCase):
    URL = "/api/accounts/"
    VIEW_NAME = "api-accounts"
    DETAIL_VIEW = False
    QUERY_PARAMS = "?"
    UNAUTHENTICATED_CODE = 403

    def setUp(self):
        super().setUp()

        self.isin = "USA123"
        self.account, _, _ = _add_dummy_account_and_security(self.user, isin=self.isin)


class TestTransactionsView(ViewTestBase, TestCase):
    URL = "/api/transactions/"
    VIEW_NAME = "transaction-list"
    DETAIL_VIEW = False
    QUERY_PARAMS = "?"
    UNAUTHENTICATED_CODE = 403

    def setUp(self):
        super().setUp()

        self.isin = "USA123"
        self.account, self.exchange, self.security = _add_dummy_account_and_security(
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


class TestTransactionsDetailView(ViewTestBase, TestCase):
    URL = "/api/transactions/%s/"
    VIEW_NAME = "transaction-detail"
    DETAIL_VIEW = True
    QUERY_PARAMS = "?"
    UNAUTHENTICATED_CODE = 403

    def setUp(self):
        super().setUp()

        self.isin = "USA123"
        self.account, self.exchange, self.security = _add_dummy_account_and_security(
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
