import datetime
import decimal

from django.contrib.auth.models import User
from django.test import SimpleTestCase, TestCase
from unittest.mock import patch

from finance import accounts, models, stock_exchanges, utils

DATE_FORMAT = "%Y-%m-%d %H:%M%z"


_FAKE_TRANSACTIONS = [
    ("2021-04-27 10:00Z", 3, 12.11),  # Count after the transaction: 3
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
        asset_defaults={"local_currency": "USD", "name": isin},
        import_all_assets=True,
    )


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
            (
                "2021-05-04",
                17.00 * 14.5,
            ),  # -- price missing, but last transaction price available.
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
            (
                "2021-05-04",
                17.00 * 14.5,
            ),  # -- price missing, but last transaction price available.
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

    def test_lots_based_on_transactions(self):
        transaction_costs = decimal.Decimal("-0.5")
        local_value = decimal.Decimal("-12.2")
        value_in_account_currency = decimal.Decimal("-10.5")
        total_in_account_currency = decimal.Decimal(-11)
        quantity = 10
        price = decimal.Decimal("1.22")
        order_id = "123"
        executed_at = "2021-04-27 10:00Z"
        account_repository = accounts.AccountRepository()
        account_repository.add_transaction(
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
            asset_defaults={"local_currency": "USD"},
            import_all_assets=False,
        )

        self.assertEqual(models.Lot.objects.count(), 1)
        lot = models.Lot.objects.first()
        self.assertEqual(lot.quantity, quantity)
        self.assertEqual(lot.buy_price, price)
        self.assertEqual(lot.cost_basis_account_currency, total_in_account_currency)

        executed_at = "2021-04-27 11:00Z"

        transaction, _ = account_repository.add_transaction(
            self.account,
            self.isin,
            self.exchange,
            executed_at,
            -7,
            decimal.Decimal("3.22"),
            transaction_costs,
            decimal.Decimal("22.54"),
            decimal.Decimal("20.54"),
            decimal.Decimal("20.04"),
            order_id,
            asset_defaults={"local_currency": "USD"},
            import_all_assets=False,
        )

        self.assertEqual(models.Lot.objects.count(), 2)
        lots = models.Lot.objects.order_by("id").all()

        self.assertEqual(lots[0].quantity, 7)
        self.assertEqual(lots[1].quantity, 3)

        # -11 * 0.7 + 20.04 = 12.34
        self.assertEqual(
            lots[0].realized_gain_account_currency, decimal.Decimal("12.34")
        )

        account_repository.correct_transaction(transaction, {"quantity": -5})

        self.assertEqual(models.Lot.objects.count(), 2)
        lots = models.Lot.objects.order_by("id").all()

        self.assertEqual(lots[0].quantity, 5)
        self.assertEqual(lots[1].quantity, 5)

        account_repository.delete_transaction(transaction)
        self.assertEqual(models.Lot.objects.count(), 1)
        lots = models.Lot.objects.order_by("id").all()

        self.assertEqual(lots[0].quantity, 10)
        self.assertEqual(lots[0].realized_gain_account_currency, None)


BTC_ASSET_SEARCH_RESULT = [
    {
        "Code": "BTC",
        "Exchange": "COMM",
        "Name": "Bitcoin Futures CME",
        "Type": "Futures",
        "Country": "USA",
        "Currency": "USD",
        "ISIN": None,
        "previousClose": 39545,
        "previousCloseDate": "2022-03-04",
    },
    {
        "Code": "BTC",
        "Exchange": "US",
        "Name": "ClearShares Piton Intermediate Fixed Income ETF",
        "Type": "ETF",
        "Country": "USA",
        "Currency": "USD",
        "ISIN": None,
        "previousClose": 96.7938,
        "previousCloseDate": "2022-03-03",
    },
    {
        "Code": "BTC",
        "Exchange": "CN",
        "Name": "Bluesky Digital Assets Corp",
        "Type": "Common Stock",
        "Country": "Canada",
        "Currency": "CAD",
        "ISIN": None,
        "previousClose": 0.175,
        "previousCloseDate": "2022-03-04",
    },
    {
        "Code": "BTC",
        "Exchange": "AU",
        "Name": "BTC Health Limited",
        "Type": "Common Stock",
        "Country": "Australia",
        "Currency": "AUD",
        "ISIN": "AU000000BTC7",
        "previousClose": 0.065,
        "previousCloseDate": "2022-03-03",
    },
    {
        "Code": "BTC",
        "Exchange": "PA",
        "Name": "Mélanion BTC Equities Universe UCITS ETF EUR",
        "Type": "ETF",
        "Country": "France",
        "Currency": "EUR",
        "ISIN": "FR0014002IH8",
        "previousClose": 16.11,
        "previousCloseDate": "2022-03-04",
    },
    {
        "Code": "BTC-USD",
        "Exchange": "CC",
        "Name": "Bitcoin",
        "Type": "Currency",
        "Country": "Unknown",
        "Currency": "USD",
        "ISIN": None,
        "previousClose": 39547.061,
        "previousCloseDate": "2022-03-06",
    },
    {
        "Code": "BTCB-USD",
        "Exchange": "CC",
        "Name": "Bitcoin BEP2",
        "Type": "Currency",
        "Country": "Unknown",
        "Currency": "USD",
        "ISIN": None,
        "previousClose": 39605.1059,
        "previousCloseDate": "2022-03-06",
    },
    {
        "Code": "BTCST-USD",
        "Exchange": "CC",
        "Name": "Bitcoin Standard Hashrate Token",
        "Type": "Currency",
        "Country": "Unknown",
        "Currency": "USD",
        "ISIN": None,
        "previousClose": 17.1432,
        "previousCloseDate": "2022-03-05",
    },
    {
        "Code": "BTCUP-USD",
        "Exchange": "CC",
        "Name": "BTCUP",
        "Type": "Currency",
        "Country": "Unknown",
        "Currency": "USD",
        "ISIN": None,
        "previousClose": 36.4508,
        "previousCloseDate": "2022-03-05",
    },
    {
        "Code": "BTCE",
        "Exchange": "XETRA",
        "Name": "BTCetc - Bitcoin Exchange Traded Crypto",
        "Type": "ETF",
        "Country": "Germany",
        "Currency": "EUR",
        "ISIN": "DE000A27Z304",
        "previousClose": 35.96,
        "previousCloseDate": "2022-03-04",
    },
    {
        "Code": "BTCM",
        "Exchange": "US",
        "Name": "BIT Mining Limited",
        "Type": "Common Stock",
        "Country": "USA",
        "Currency": "USD",
        "ISIN": "US0554741001",
        "previousClose": 2.71,
        "previousCloseDate": "2022-03-04",
    },
]

KO_ASSET_SEARCH_RESULT = [
    {
        "Code": "KO",
        "Exchange": "US",
        "Name": "The Coca-Cola Company",
        "Type": "Common Stock",
        "Country": "USA",
        "Currency": "USD",
        "ISIN": "US1912161007",
        "previousClose": 62.57,
        "previousCloseDate": "2022-03-04",
    },
    {
        "Code": "KO",
        "Exchange": "MX",
        "Name": "The Coca-Cola Company",
        "Type": "Common Stock",
        "Country": "Mexico",
        "Currency": "MXN",
        "ISIN": None,
        "previousClose": 1307,
        "previousCloseDate": "2022-03-04",
    },
    {
        "Code": "KO",
        "Exchange": "V",
        "Name": "Kiaro Holdings Corp",
        "Type": "Common Stock",
        "Country": "Canada",
        "Currency": "CAD",
        "ISIN": "CA49374K1003",
        "previousClose": 0.06,
        "previousCloseDate": "2022-03-04",
    },
    {
        "Code": "KOS",
        "Exchange": "VN",
        "Name": "KOS",
        "Type": "Common Stock",
        "Country": "Vietnam",
        "Currency": "VND",
        "ISIN": "VN000000KOS6",
        "previousClose": 33750,
        "previousCloseDate": "2022-03-02",
    },
    {
        "Code": "KOSDAQ",
        "Exchange": "INDX",
        "Name": "Kosdaq Composite Index",
        "Type": "INDEX",
        "Country": "Korea",
        "Currency": "KRW",
        "ISIN": None,
        "previousClose": 900.96,
        "previousCloseDate": "2022-03-04",
    },
    {
        "Code": "KOLD",
        "Exchange": "US",
        "Name": "ProShares UltraShort Bloomberg Natural Gas ",
        "Type": "ETF",
        "Country": "USA",
        "Currency": "USD",
        "ISIN": "US74347W3878",
        "previousClose": 22.45,
        "previousCloseDate": "2022-03-04",
    },
    {
        "Code": "KOTAKBANK",
        "Exchange": "NSE",
        "Name": "Kotak Mahindra Bank Limited",
        "Type": "Common Stock",
        "Country": "India",
        "Currency": "INR",
        "ISIN": "INE237A01028",
        "previousClose": 1752.15,
        "previousCloseDate": "2022-03-04",
    },
    {
        "Code": "KOZAL",
        "Exchange": "IS",
        "Name": "Koza Altin Isletmeleri A.S",
        "Type": "Common Stock",
        "Country": "Turkey",
        "Currency": "TRY",
        "ISIN": "TREKOAL00014",
        "previousClose": 128.7,
        "previousCloseDate": "2022-03-04",
    },
]

VTSAX_SEARCH_RESULTS = [
    {
        "Code": "VTSAX",
        "Exchange": "US",
        "Name": "VANGUARD TOTAL STOCK MARKET INDEX FUND ADMIRAL SHARES",
        "Type": "FUND",
        "Country": "USA",
        "Currency": "USD",
        "ISIN": "US9229087286",
        "previousClose": 102.85,
        "previousCloseDate": "2022-03-07",
    }
]

VWCE_SEARCH_RESULTS = [
    {
        "Code": "VWCE",
        "Exchange": "XETRA",
        "Name": "Vanguard FTSE All-World UCITS ETF USD Accumulation",
        "Type": "ETF",
        "Country": "Germany",
        "Currency": "EUR",
        "ISIN": "IE00BK5BQT80",
        "previousClose": 96.89,
        "previousCloseDate": "2022-03-04",
    },
    {
        "Code": "VWCE",
        "Exchange": "F",
        "Name": "Vanguard FTSE All-World UCITS ETF USD Accumulation",
        "Type": "ETF",
        "Country": "Germany",
        "Currency": "EUR",
        "ISIN": "IE00BK5BQT80",
        "previousClose": 96.62,
        "previousCloseDate": "2022-03-07",
    },
    {
        "Code": "VWCE",
        "Exchange": "MI",
        "Name": "Vanguard FTSE All-World UCITS ETF USD Accumulation",
        "Type": "ETF",
        "Country": "Italy",
        "Currency": "EUR",
        "ISIN": "IE00BK5BQT80",
        "previousClose": 96.5,
        "previousCloseDate": "2022-03-07",
    },
]

VWCE_SEARCH_BY_ISIN_RESULTS = [
    {
        "Code": "VWCE",
        "Exchange": "XETRA",
        "Name": "Vanguard FTSE All-World UCITS ETF USD Accumulation",
        "Type": "ETF",
        "Country": "Germany",
        "Currency": "EUR",
        "ISIN": "IE00BK5BQT80",
        "previousClose": 96.89,
        "previousCloseDate": "2022-03-04",
    },
    {
        "Code": "VWRA",
        "Exchange": "LSE",
        "Name": "Vanguard FTSE All-World UCITS ETF USD Accumulation",
        "Type": "ETF",
        "Country": "UK",
        "Currency": "USD",
        "ISIN": "IE00BK5BQT80",
        "previousClose": 104.66,
        "previousCloseDate": "2022-03-07",
    },
    {
        "Code": "VWRP",
        "Exchange": "LSE",
        "Name": "Vanguard Funds Public Limited Company - Vanguard FTSE All-World UCITS ETF",
        "Type": "ETF",
        "Country": "UK",
        "Currency": "GBP",
        "ISIN": "IE00BK5BQT80",
        "previousClose": 79.935,
        "previousCloseDate": "2022-03-07",
    },
    {
        "Code": "VWCE",
        "Exchange": "F",
        "Name": "Vanguard FTSE All-World UCITS ETF USD Accumulation",
        "Type": "ETF",
        "Country": "Germany",
        "Currency": "EUR",
        "ISIN": "IE00BK5BQT80",
        "previousClose": 96.62,
        "previousCloseDate": "2022-03-07",
    },
    {
        "Code": "VWCE",
        "Exchange": "MI",
        "Name": "Vanguard FTSE All-World UCITS ETF USD Accumulation",
        "Type": "ETF",
        "Country": "Italy",
        "Currency": "EUR",
        "ISIN": "IE00BK5BQT80",
        "previousClose": 96.5,
        "previousCloseDate": "2022-03-07",
    },
]

UNSUPPORTED_CURRENCY_RESULTS = [
    {
        "Code": "0002",
        "Exchange": "HK",
        "Name": "CLP Holdings Limited",
        "Type": "Common Stock",
        "Country": "Hong Kong",
        "Currency": "FFF",
        "ISIN": "HK0002007356",
        "previousClose": 76.9,
        "previousCloseDate": "2022-04-01",
    },
    {
        "Code": "CLPHF",
        "Exchange": "US",
        "Name": "CLP Holdings Limited",
        "Type": "Common Stock",
        "Country": "USA",
        "Currency": "FFF",
        "ISIN": "HK0002007356",
        "previousClose": 9.55,
        "previousCloseDate": "2022-04-01",
    },
]

UNSUPPORTED_EXCHANGE_RESULTS = [
    {
        "Code": "0002",
        "Exchange": "TA",
        "Name": "CLP Holdings Limited",
        "Type": "Common Stock",
        "Country": "Hong Kong",
        "Currency": "USD",
        "ISIN": "HK0002007356",
        "previousClose": 76.9,
        "previousCloseDate": "2022-04-01",
    },
    {
        "Code": "CLPHF",
        "Exchange": "TA",
        "Name": "CLP Holdings Limited",
        "Type": "Common Stock",
        "Country": "USD",
        "Currency": "USD",
        "ISIN": "HK0002007356",
        "previousClose": 9.55,
        "previousCloseDate": "2022-04-01",
    },
]

UNSUPPORTED_EXCHANGE_AND_CURRENCY_RESULTS = [
    {
        "Code": "ABRA",
        "Name": "Abra Information Technologies",
        "Country": "Israel",
        "Exchange": "TA",
        "Currency": "ILS",
        "Type": "Common Stock",
        "Isin": "IL0011016669",
    },
    {
        "Code": "ACCL",
        "Name": "ACCL",
        "Country": "Israel",
        "Exchange": "TA",
        "Currency": "ILS",
        "Type": "Common Stock",
        "Isin": None,
    },
    {
        "Code": "ACKR",
        "Name": "ACKR",
        "Country": "Israel",
        "Exchange": "TA",
        "Currency": "ILS",
        "Type": "Common Stock",
        "Isin": None,
    },
]


class TestAssetSearch(TestCase):
    # This fixture provides data about 65 different exchanges,
    # and sets up a single account for testing.
    fixtures = ["exchanges_postgres.json"]

    def setUp(self):
        super().setUp()
        # Create a user and an account.
        self.user = User.objects.create(username="testuser", email="test@example.com")
        self.client.force_login(self.user)
        self.isin = "US1234"
        self.account, self.exchange, self.asset = _add_dummy_account_and_asset(
            self.user, isin=self.isin
        )

    @patch("finance.stock_exchanges.query_asset")
    def test_searching_crypto_assets(self, mock):
        mock.return_value = BTC_ASSET_SEARCH_RESULT
        assets = stock_exchanges.search_and_create_assets("btc")
        self.assertTrue(
            models.Asset.objects.filter(
                symbol="BTC",
                asset_type=models.AssetType.CRYPTO,
                currency=models.Currency.USD,
            ).exists()
        )
        self.assertEqual(len(assets), 2)

    @patch("finance.stock_exchanges.query_asset")
    def test_searching_stock_assets(self, mock):
        mock.return_value = KO_ASSET_SEARCH_RESULT
        assets = stock_exchanges.search_and_create_assets("ko")
        self.assertEqual(len(assets), 1)

    @patch("finance.stock_exchanges.query_asset")
    def test_searching_fund_assets(self, mock):
        mock.return_value = VTSAX_SEARCH_RESULTS
        assets = stock_exchanges.search_and_create_assets("Vtsax")
        self.assertEqual(len(assets), 1)

    @patch("finance.stock_exchanges.query_asset")
    def test_searching_fund_assets_by_isin(self, mock):
        mock.return_value = VWCE_SEARCH_BY_ISIN_RESULTS
        assets = stock_exchanges.search_and_create_assets("IE00BK5BQT80")
        self.assertEqual(len(assets), 5)
        for asset in assets:
            self.assertEqual(asset.isin, "IE00BK5BQT80")
            self.assertEqual(asset.asset_type, models.AssetType.FUND)

    @patch("finance.stock_exchanges.query_asset")
    def test_searching_unsupported_currency(self, mock):
        mock.return_value = UNSUPPORTED_CURRENCY_RESULTS
        assets = stock_exchanges.search_and_create_assets("HK0002007356")
        self.assertEqual(len(assets), 0)
        for asset in assets:
            self.assertEqual(asset.isin, "HK0002007356")
            self.assertEqual(asset.asset_type, models.AssetType.FUND)

    @patch("finance.stock_exchanges.query_asset")
    def test_searching_unsupported_exchange(self, mock):
        mock.return_value = UNSUPPORTED_EXCHANGE_RESULTS
        assets = stock_exchanges.search_and_create_assets("HK0002007356")
        self.assertEqual(len(assets), 0)
        for asset in assets:
            self.assertEqual(asset.isin, "HK0002007356")
            self.assertEqual(asset.asset_type, models.AssetType.FUND)

    @patch("finance.stock_exchanges.query_asset")
    def test_searching_unsupported_exchange_and_currency(self, mock):
        mock.return_value = UNSUPPORTED_EXCHANGE_AND_CURRENCY_RESULTS
        assets = stock_exchanges.search_and_create_assets("IL0011016669")
        self.assertEqual(len(assets), 0)
        for asset in assets:
            self.assertEqual(asset.isin, "IL0011016669")
            self.assertEqual(asset.asset_type, models.AssetType.FUND)
