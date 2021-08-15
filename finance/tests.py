import datetime
import decimal

from django.contrib.auth.models import User
from django.db.models import Sum
from django.test import SimpleTestCase, TestCase

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


def _add_dummy_account_and_asset(user, isin):
    account = models.Account.objects.create(
        user=user, currency=models.Currency.EUR, nickname="test account"
    )
    exchange = models.Exchange.objects.create(name="my US stocks", country="USA")
    asset = models.Asset.objects.create(
        isin=isin,
        symbol="MOONIES",
        name="a stock",
        currency=models.Currency.USD,
        exchange=exchange,
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


class TestUtils(SimpleTestCase):
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
        self.account, self.exchange, self.asset = _add_dummy_account_and_asset(
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
                asset=self.asset,
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

    def test_value_history_with_price_history_old_values_missing(self):
        for transaction in _FAKE_TRANSACTIONS:
            _add_transaction(
                self.account,
                self.isin,
                self.exchange,
                transaction[0],
                transaction[1],
                transaction[2],
            )

        from_date = datetime.date.fromisoformat("2021-04-20")
        to_date = datetime.date.fromisoformat("2021-05-04")

        dates = utils.generate_date_intervals(from_date, to_date)
        for i, date in enumerate(dates):
            # Simulate some prices missing (e.g. weekend).
            # Plus drop some oldest values...
            if i % 5 == 0 or i > 11:
                continue
            models.PriceHistory.objects.create(
                date=date,
                value=100 + (i % 3) * 10,
                asset=self.asset,
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
            # ("2021-04-24", 0.00), -- price missing
            ("2021-04-23", 0.00),
            ("2021-04-22", 0.00),
            ("2021-04-21", 0.00),
            ("2021-04-20", 0.00),
        ]
        expected_value_history = [
            (datetime.date.fromisoformat(date), value)
            for (date, value) in expected_value_history
        ]
        self.assertEqual(value_history, expected_value_history)