import datetime
import decimal

from django.contrib.auth.models import User
from django.db.models import Sum
from django.test import SimpleTestCase, TestCase

from finance import accounts, degiro_parser, exchanges, models, utils

DATE_FORMAT = "%Y-%m-%d %H:%M%z"


def datestr_to_datetime(datestr) -> datetime.datetime:
    return datetime.datetime.strptime(datestr, DATE_FORMAT)


class TestDegiroParser(TestCase):

    # This fixture provides data about 65 different exchanges,
    # and sets up a single account for testing.
    fixtures = ["exchanges.json"]

    def test_importing_single_transaction(self):
        # TODO: mock out the API call, don't call the official API
        # every time the test runs.
        account = models.Account.objects.all()[0]
        degiro_parser.import_transactions_from_file(
            account, "./finance/transactions_example_short.csv"
        )
        self.assertEqual(models.Transaction.objects.count(), 6)
        account = models.Account.objects.all()[0]
        self.assertAlmostEqual(account.balance, decimal.Decimal("-15237.26"))

        for position in models.Position.objects.all():
            print(position.quantity)

        total_value = models.Transaction.objects.aggregate(
            Sum("value_in_account_currency")
        )["value_in_account_currency__sum"]
        self.assertAlmostEqual(total_value, decimal.Decimal("-15232.65"))

        # Import the same transactions again and make
        # sure that they aren't double recorded.
        degiro_parser.import_transactions_from_file(
            account, "./finance/transactions_example_short.csv"
        )
        self.assertEqual(models.Transaction.objects.count(), 6)
        account = models.Account.objects.all()[0]
        total_value = models.Transaction.objects.aggregate(
            Sum("value_in_account_currency")
        )["value_in_account_currency__sum"]

        self.assertAlmostEqual(account.balance, decimal.Decimal("-15237.26"))
        self.assertAlmostEqual(total_value, decimal.Decimal("-15232.65"))


class TestUtils(TestCase):
    def test_generate_intervals_from_end(self):
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

        got = utils.generate_intervals(from_date, to_date, output_period)
        self.assertEqual(got, expected_dates)

    def test_generate_intervals_from_start(self):
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

        got = utils.generate_intervals(
            from_date, to_date, output_period, start_with_end=False
        )
        self.assertEqual(got, expected_dates)


class TestPosition(TestCase):
    def setUp(self):
        super().setUp()
        # Create a user and an account.
        self.user = User.objects.create(username="testuser", email="test@example.com")
        self.client.force_login(self.user)
        self.account = models.Account.objects.create(
            user=self.user, currency=models.Currency.EURO, nickname="test account"
        )

        self.account_repository = accounts.AccountRepository()

        # Set up a dummy security.
        self.exchange = models.Exchange.objects.create(
            name="my US stocks", country="USA"
        )
        self.isin = "123"
        security = models.Security(
            isin=self.isin,
            symbol="MOONIES",
            name="a stock",
            currency=models.Currency.USD,
            exchange=self.exchange,
        )
        security.save()

    def _add_transaction(self, executed_at, quantity, price):

        transaction_costs = decimal.Decimal(0.5)
        local_value = decimal.Decimal(0.5)
        value_in_account_currency = decimal.Decimal(0.5)
        total_in_account_currency = decimal.Decimal(0.5)
        order_id = "123"
        self.account_repository.add_transaction(
            self.account,
            self.isin,
            self.exchange,
            executed_at,
            quantity,
            price,
            transaction_costs,
            local_value,
            value_in_account_currency,
            total_in_account_currency,
            order_id,
        )

    def test_quantity_history_based_on_transactions(self):

        # Nothing special like stock splits here.

        fake_transactions = [
            ("2021-04-27 10:00Z", 3, 12.11),  # Price after the transaction: 3
            ("2021-04-29 12:00Z", 4, 12.44),  # 7
            ("2021-04-30 17:00Z", 3, 14.3),  # 10
            ("2021-05-01 11:00Z", -2, 15.3),  # 8
            ("2021-05-02 12:00Z", 3, 14.2),  # 11
            ("2021-05-03 12:00Z", 3, 12.3),  # 14
            ("2021-05-03 14:00Z", 3, 14.5),  # 17
            ("2021-05-04 12:00Z", 3, 22),  # 20
        ]
        for transaction in fake_transactions:
            self._add_transaction(transaction[0], transaction[1], transaction[2])

        self.assertEqual(models.Position.objects.count(), 1)
        self.assertEqual(models.Transaction.objects.count(), 8)
        position = models.Position.objects.all()[0]
        self.assertEqual(position.quantity, 20)

        from_date = datetime.datetime.strptime("2021-04-24 17:00Z", DATE_FORMAT)
        to_date = datetime.datetime.strptime("2021-05-04 13:00Z", DATE_FORMAT)

        quantity_history = position.quantity_history(
            from_date=from_date,
            to_date=to_date,
        )
        expected_quantity_history = [
            ("2021-05-04 13:00+0000", 20.00),
            ("2021-05-03 13:00+0000", 14.00),
            ("2021-05-02 13:00+0000", 11.00),
            ("2021-05-01 13:00+0000", 8.00),
            ("2021-04-30 13:00+0000", 7.00),
            ("2021-04-29 13:00+0000", 7.00),
            ("2021-04-28 13:00+0000", 3.00),
            ("2021-04-27 13:00+0000", 3.00),
            ("2021-04-26 13:00+0000", 0.00),
            ("2021-04-25 13:00+0000", 0.00),
        ]
        expected_quantity_history = [
            (datestr_to_datetime(date), value)
            for (date, value) in expected_quantity_history
        ]

        self.assertEqual(quantity_history, expected_quantity_history)
