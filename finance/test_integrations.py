import datetime
import decimal
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core import validators
from django.db.models import Sum
from django.test import TestCase

from finance import models, prices, testing_utils, utils, tasks, stock_exchanges, accounts
from finance.integrations import binance_parser, degiro_parser


ETH_QUANTITY = decimal.Decimal("0.1850657800")

asset_response = [
    {
        "Code": "NKE",
        "Exchange": "US",
        "Name": "NIKE Inc",
        "Type": "Common Stock",
        "Country": "USA",
        "Currency": "USD",
        "ISIN": "US6541061031",
        "previousClose": 165.67,
        "previousCloseDate": "2021-12-23",
    },
    {
        "Code": "NKE",
        "Exchange": "XETRA",
        "Name": "NIKE Inc",
        "Type": "Common Stock",
        "Country": "Germany",
        "Currency": "GBP",
        "ISIN": "US6541061031",
        "previousClose": 147.26,
        "previousCloseDate": "2021-12-23",
    },
    {
        "Code": "NKE",
        "Exchange": "XETRA",
        "Name": "NIKE Inc",
        "Type": "Common Stock",
        "Country": "Germany",
        "Currency": "EUR",
        "ISIN": "US6541061031",
        "previousClose": 147.26,
        "previousCloseDate": "2021-12-23",
    },
    {
        "Code": "NKE",
        "Exchange": "F",
        "Name": "NIKE Inc",
        "Type": "Common Stock",
        "Country": "Germany",
        "Currency": "EUR",
        "ISIN": "US6541061031",
        "previousClose": 147.16,
        "previousCloseDate": "2021-12-23",
    },
    {
        "Code": "NKE",
        "Exchange": "SN",
        "Name": "NIKE Inc",
        "Type": "Common Stock",
        "Country": "Chile",
        "Currency": "USD",
        "ISIN": "US6541061031",
        "previousClose": 169.8,
        "previousCloseDate": "2021-12-06",
    },
    # Items below are so that I will have more supported exchanges.
    {
        "Code": "NKE",
        "Exchange": "LSE",
        "Name": "NIKE Inc",
        "Type": "Common Stock",
        "Country": "Germany",
        "Currency": "EUR",
        "ISIN": "US6541061031",
        "previousClose": 147.26,
        "previousCloseDate": "2021-12-23",
    },
    {
        "Code": "NKE",
        "Exchange": "MI",
        "Name": "NIKE Inc",
        "Type": "Common Stock",
        "Country": "Germany",
        "Currency": "EUR",
        "ISIN": "US6541061031",
        "previousClose": 147.26,
        "previousCloseDate": "2021-12-23",
    },
]


SAME_ISIN_MULTIPLE_CURRENCIES_RESPONSE = [
    {
        "Code": "VWCE",
        "Exchange": "XETRA",
        "Name": "Vanguard FTSE All-World UCITS ETF USD Accumulation",
        "Type": "ETF",
        "Country": "Germany",
        "Currency": "EUR",
        "ISIN": "IE00BK5BQT80",
        "previousClose": 94.93,
        "previousCloseDate": "2022-03-10",
    },
    {
        "Code": "VWRA",
        "Exchange": "LSE",
        "Name": "Vanguard FTSE All-World UCITS ETF USD Accumulation",
        "Type": "ETF",
        "Country": "UK",
        "Currency": "USD",
        "ISIN": "IE00BK5BQT80",
        "previousClose": 104.88,
        "previousCloseDate": "2022-03-11",
    },
    {
        "Code": "VWRP",
        "Exchange": "LSE",
        "Name": "Vanguard Funds Public Limited Company - Vanguard FTSE All-World UCITS ETF",
        "Type": "ETF",
        "Country": "UK",
        "Currency": "GBP",
        "ISIN": "IE00BK5BQT80",
        "previousClose": 80.3977,
        "previousCloseDate": "2022-03-11",
    },
    {
        "Code": "VWCE",
        "Exchange": "F",
        "Name": "Vanguard FTSE All-World UCITS ETF USD Accumulation",
        "Type": "ETF",
        "Country": "Germany",
        "Currency": "EUR",
        "ISIN": "IE00BK5BQT80",
        "previousClose": 95.92,
        "previousCloseDate": "2022-03-11",
    },
    {
        "Code": "VWCE",
        "Exchange": "MI",
        "Name": "Vanguard FTSE All-World UCITS ETF USD Accumulation",
        "Type": "ETF",
        "Country": "Italy",
        "Currency": "EUR",
        "ISIN": "IE00BK5BQT80",
        "previousClose": 94.91,
        "previousCloseDate": "2022-03-10",
    },
]


def _assets_with_isin_side_effect(isin):
    response = []
    for entry in asset_response:
        cp = entry.copy()
        cp["ISIN"] = isin
        response.append(cp)
    return asset_response


def _add_dummy_exchange_rates():
    from_date = datetime.date.fromisoformat("2021-10-14")
    to_date = datetime.date.fromisoformat("2022-01-15")

    dates = utils.generate_date_intervals(from_date, to_date)
    for date in dates:
        models.CurrencyExchangeRate.objects.create(
            date=date,
            value=1.1,
            from_currency=models.Currency.EUR,
            to_currency=models.Currency.USD,
        )
        models.CurrencyExchangeRate.objects.create(
            date=date,
            value=0.9,
            from_currency=models.Currency.USD,
            to_currency=models.Currency.EUR,
        )


class TestDegiroParser(TestCase):

    # This fixture provides data about 65 different exchanges,
    # and sets up a single account for testing.
    fixtures = ["exchanges_postgres.json"]

    @patch("finance.stock_exchanges.query_asset")
    def test_importing_transactions_from_file(self, query_asset_mock):
        query_asset_mock.side_effect = _assets_with_isin_side_effect

        account_balance = decimal.Decimal("-15237.26000")
        base_num_of_transactions = 6
        account = models.Account.objects.create(
            user=User.objects.all()[0], nickname="test"
        )
        transaction_import = degiro_parser.import_transactions_from_file(
            account, "./finance/transactions_example_short.csv", True
        )
        failed_records = transaction_import.records.filter(successful=False)
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
            account, "./finance/transactions_example_short.csv", True
        )
        self.assertEqual(models.Transaction.objects.count(), base_num_of_transactions)
        self.assertEqual(models.Position.objects.count(), 36)
        account = models.Account.objects.get(nickname="test")
        total_value = models.Transaction.objects.aggregate(
            Sum("total_in_account_currency")
        )["total_in_account_currency__sum"]

        self.assertAlmostEqual(account.balance, account_balance)
        self.assertAlmostEqual(total_value, account_balance)

        fund = models.Asset.objects.get(isin="IE00BF4RFH31")
        self.assertEqual(
            fund.currency, models.Currency.EUR
        )
        self.assertTrue(fund.tracked)
        stock = models.Asset.objects.get(isin="US1912161007")
        self.assertEqual(
            stock.currency, models.Currency.USD
        )
        self.assertTrue(stock.tracked)

    @patch("finance.stock_exchanges.query_asset")
    def test_assets_with_same_isin_multiple_currencies(self, mock):
        mock.return_value = SAME_ISIN_MULTIPLE_CURRENCIES_RESPONSE

        asset = stock_exchanges.get_or_create_asset(
            isin="IE00BK5BQT80",
            exchange=stock_exchanges.ExchangeRepository().get_by_code("LSE"),
            asset_defaults={"local_currency": "GBP"},
            add_untracked_if_not_found=False,
            user=None,
        )
        self.assertEqual(asset.currency, models.Currency.GBP)

class TestDegiroTransactionImportView(testing_utils.ViewTestBase, TestCase):
    URL = "/api/integrations/degiro/transactions/"
    VIEW_NAME = "degiro-transaction-upload-list"
    DETAIL_VIEW = False
    QUERY_PARAMS = "?"
    UNAUTHENTICATED_CODE = 403

    # This fixture provides data about 65 different exchanges,
    # and sets up a single account for testing.
    fixtures = ["exchanges_postgres.json"]

    def setUp(self):
        super().setUp()

        self.account = models.Account.objects.create(
            user=self.user, currency=models.Currency.EUR, nickname="test account"
        )

    def test_cannot_upload_to_wrong_account(self):
        pass

    @patch("finance.stock_exchanges.query_asset")
    def test_can_upload_to_owned_account(self, query_asset_mock):
        query_asset_mock.side_effect = _assets_with_isin_side_effect
        response = self.client.get(self.get_url())
        self.assertEqual(response.status_code, 200)

        self.assertEqual(models.Transaction.objects.count(), 0)
        with open("./finance/transactions_example_latest.csv", "rb") as fp:
            response = self.client.post(
                self.URL, {"account": self.account.id, "transaction_file": fp}
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(models.Transaction.objects.count(), 6)

        response = self.client.get("/api/transaction-imports/")
        self.assertEqual(response.status_code, 200)

        transaction_import_id = models.TransactionImport.objects.first().id
        response = self.client.get(f"/api/transaction-imports/{transaction_import_id}/")
        self.assertEqual(response.status_code, 200)

    def test_can_upload_to_owned_account_currency_mismatch(self):
        another_account = models.Account.objects.create(
            user=self.user,
            currency=models.Currency.USD,
            nickname="other currency account",
        )
        with open("./finance/transactions_example_latest.csv", "rb") as fp:
            response = self.client.post(
                self.URL, {"account": another_account.id, "transaction_file": fp}
            )
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertTrue("account" in data)

        response = self.client.get(self.URL)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(len(data[0]["records"]), 0)
        self.assertEqual(data[0]["status"], models.ImportStatus.FAILURE.label)

    @patch("finance.stock_exchanges.query_asset")
    def test_some_assets_not_found_by_isin(self, query_asset_mock):
        # If asset is not found then the empty value is returned.
        calls = 0

        def assets_or_empty(_):
            nonlocal calls
            calls += 1
            if calls < 5:
                return asset_response
            else:
                return []

        query_asset_mock.side_effect = assets_or_empty
        response = self.client.get(self.get_url())
        self.assertEqual(response.status_code, 200)

        self.assertEqual(models.Transaction.objects.count(), 0)
        with open("./finance/transactions_example_latest.csv", "rb") as fp:
            response = self.client.post(
                self.URL,
                {
                    "account": self.account.id,
                    "transaction_file": fp,
                    "import_all_assets": False,
                },
            )

        self.assertEqual(response.status_code, 201)

        data = response.json()
        self.assertEqual(data["status"], models.ImportStatus.PARTIAL_SUCCESS.label)
        self.assertEqual(len(data["records"]), 6)

        # TODO: instead of ignoring these assets, consider adding them as untracked?
        self.assertEqual(models.Transaction.objects.count(), 4)

    @patch("finance.stock_exchanges.query_asset")
    def test_some_assets_not_found_by_isin_but_still_imported(self, query_asset_mock):
        # If asset is not found then the empty value is returned.
        calls = 0

        def assets_or_empty(_):
            nonlocal calls
            calls += 1
            if calls < 5:
                return asset_response
            else:
                return []

        query_asset_mock.side_effect = assets_or_empty
        response = self.client.get(self.get_url())
        self.assertEqual(response.status_code, 200)

        self.assertEqual(models.Transaction.objects.count(), 0)
        with open("./finance/transactions_example_latest.csv", "rb") as fp:
            response = self.client.post(
                self.URL,
                {
                    "account": self.account.id,
                    "transaction_file": fp,
                    "import_all_assets": True,
                },
            )

        self.assertEqual(response.status_code, 201)

        data = response.json()
        self.assertEqual(data["status"], models.ImportStatus.SUCCESS.label)
        self.assertEqual(len(data["records"]), 6)

        self.assertEqual(models.Transaction.objects.count(), 6)

    def test_invalid_data_format(self):
        with open("./finance/test_integrations.py", "rb") as fp:
            response = self.client.post(
                self.URL, {"account": self.account.id, "transaction_file": fp}
            )
        self.assertEqual(response.status_code, 400)

    def test_invalid_data_format_bad_columns(self):
        with open("./finance/transactions_example_latest_bad_columns.csv", "rb") as fp:
            response = self.client.post(
                self.URL, {"account": self.account.id, "transaction_file": fp}
            )
        self.assertEqual(response.status_code, 400)

        response = self.client.get(self.URL)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(len(data[0]["records"]), 0)
        self.assertEqual(data[0]["status"], models.ImportStatus.FAILURE.label)

    def test_invalid_data_format_different_column_names_but_same_format(self):
        with open("./finance/transactions_example_latest_renamed.csv", "rb") as fp:
            response = self.client.post(
                self.URL, {"account": self.account.id, "transaction_file": fp}
            )
        self.assertEqual(response.status_code, 201)

        response = self.client.get(self.URL)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(len(data[0]["records"]), 6)
        self.assertEqual(data[0]["status"], models.ImportStatus.SUCCESS.label)

    @patch("finance.stock_exchanges.query_asset")
    def test_transactions_latest_to_oldest_uploads_correctly(self, query_asset_mock):
        # This makes sure that the transactions from the file are sorted correctly
        # before being ingested.
        query_asset_mock.side_effect = _assets_with_isin_side_effect
        response = self.client.get(self.get_url())
        self.assertEqual(response.status_code, 200)

        self.assertEqual(models.Transaction.objects.count(), 0)
        with open("./finance/transactions_many_latest_first.csv", "rb") as fp:
            response = self.client.post(
                self.URL, {"account": self.account.id, "transaction_file": fp}
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(models.Transaction.objects.count(), 184)
        data = response.json()
        self.assertEqual(data["status"], models.ImportStatus.SUCCESS.label)
        self.assertEqual(len(data["records"]), 184)

    @patch("finance.stock_exchanges.query_asset")
    def test_incomplete_transaction_list_prevents_uploading(self, query_asset_mock):
        # This is a scenario when you upload the transactions out of
        # order, e.g. later transactions of selling assets you haven't bought.
        query_asset_mock.side_effect = _assets_with_isin_side_effect
        response = self.client.get(self.get_url())
        self.assertEqual(response.status_code, 200)

        self.assertEqual(models.Transaction.objects.count(), 0)
        with open("./finance/transactions_many_buying_trimmed.csv", "rb") as fp:
            response = self.client.post(
                self.URL, {"account": self.account.id, "transaction_file": fp}
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(models.Transaction.objects.count(), 122)


class TestBinanceParser(TestCase):

    # This fixture provides data about 65 different exchanges,
    # and sets up a single account for testing.
    fixtures = ["exchanges_postgres.json"]

    def setUp(self):
        patcher = patch("finance.tasks.collect_prices")
        self.real_collect_prices = tasks.collect_prices
        self.addCleanup(patcher.stop)
        self.collect_prices_mock = patcher.start()

    @patch("finance.prices.get_crypto_usd_price_at_date")
    @patch("finance.prices.are_crypto_prices_available")
    def test_importing_binance_data(self, mock, crypto_price_mock):
        mock.return_value = False
        crypto_price_mock.return_value = decimal.Decimal("100")

        account_balance = decimal.Decimal("299.16000")
        base_num_of_transactions = 8
        account = models.Account.objects.create(
            user=User.objects.all()[0], nickname="test"
        )
        account = models.Account.objects.get(nickname="test")

        _add_dummy_exchange_rates()

        transaction_import = binance_parser.import_transactions_from_file(
            account, "./finance/binance_transaction_sample.csv"
        )
        failed_records = transaction_import.records.filter(successful=False)
        self.assertEqual(len(failed_records), 0)
        self.assertEqual(models.Transaction.objects.count(), base_num_of_transactions)
        account = models.Account.objects.get(nickname="test")
        self.assertAlmostEqual(account.balance, account_balance)

        # 2 in the new account, 30 from the old fixture.
        self.assertEqual(models.Position.objects.count(), 32)

        eth = models.Asset.objects.get(name="ETH")
        self.assertEqual(eth.exchange.name, "Other / NA")
        self.assertEqual(eth.isin, "")
        self.assertEqual(eth.currency, models.Currency.USD)
        self.assertIsNone(eth.country)
        eth_position = models.Position.objects.get(asset=eth, account=account)
        self.assertEqual(eth_position.quantity, ETH_QUANTITY)

        # total_value here doesn't include value of transfers.
        expected_total_value = decimal.Decimal("-992.6400000000")
        total_value = models.Transaction.objects.aggregate(
            Sum("total_in_account_currency")
        )["total_in_account_currency__sum"]
        self.assertAlmostEqual(total_value, expected_total_value)

        # Import the same transactions again and make
        # sure that they aren't double recorded.
        account = models.Account.objects.get(nickname="test")
        transaction_import = binance_parser.import_transactions_from_file(
            account, "./finance/binance_transaction_sample.csv"
        )
        self.assertEqual(models.Transaction.objects.count(), base_num_of_transactions)
        self.assertEqual(models.Position.objects.count(), 32)
        account = models.Account.objects.get(nickname="test")
        total_value = models.Transaction.objects.aggregate(
            Sum("total_in_account_currency")
        )["total_in_account_currency__sum"]

        self.assertAlmostEqual(account.balance, account_balance)
        self.assertAlmostEqual(total_value, expected_total_value)

        self.assertEqual(models.TransactionImport.objects.count(), 2)
        transaction_import = models.TransactionImport.objects.last()
        self.assertEqual(transaction_import.event_records.count(), 4)


    @patch("finance.prices.get_crypto_usd_price_at_date")
    @patch("finance.prices.are_crypto_prices_available")
    def test_importing_binance_data_dates_slightly_offset(self, mock, crypto_price_mock):
        mock.return_value = False
        crypto_price_mock.return_value = decimal.Decimal("100")

        account_balance = decimal.Decimal("-96.8")
        base_num_of_transactions = 7
        account = models.Account.objects.create(
            user=User.objects.all()[0], nickname="test"
        )
        account = models.Account.objects.get(nickname="test")

        _add_dummy_exchange_rates()

        transaction_import = binance_parser.import_transactions_from_file(
            account, "./finance/binance_transaction_sample_dates_slight_offset.csv"
        )
        failed_records = transaction_import.records.filter(successful=False)
        self.assertEqual(len(failed_records), 0)
        self.assertEqual(models.Transaction.objects.count(), base_num_of_transactions)
        account = models.Account.objects.get(nickname="test")
        self.assertAlmostEqual(account.balance, account_balance)

        # 4 in the new account, 30 from the old fixture.
        self.assertEqual(models.Position.objects.count(), 34)

        # Import the same transactions again and make
        # sure that they aren't double recorded.
        account = models.Account.objects.get(nickname="test")
        transaction_import = binance_parser.import_transactions_from_file(
            account, "./finance/binance_transaction_sample_dates_slight_offset.csv"
        )
        self.assertEqual(models.Transaction.objects.count(), base_num_of_transactions)
        self.assertEqual(models.Position.objects.count(), 34)


    @patch("finance.prices.get_crypto_usd_price_at_date")
    @patch("finance.prices.are_crypto_prices_available")
    def test_importing_binance_data_odd_transaction_records(self, mock, crypto_price_mock):
        mock.return_value = False
        crypto_price_mock.return_value = decimal.Decimal("100")

        account = models.Account.objects.create(
            user=User.objects.all()[0], nickname="test"
        )
        account = models.Account.objects.get(nickname="test")

        _add_dummy_exchange_rates()

        with self.assertRaises(binance_parser.InvalidFormat):
            binance_parser.import_transactions_from_file(
                account, "./finance/binance_transaction_sample_odd.csv"
            )
        self.assertEqual(models.TransactionImport.objects.last().status,
                         models.ImportStatus.FAILURE)


    @patch("finance.prices.get_crypto_usd_price_at_date")
    @patch("finance.prices.are_crypto_prices_available")
    def test_importing_binance_data_mismatched_dates(self, mock, crypto_price_mock):
        mock.return_value = False
        crypto_price_mock.return_value = decimal.Decimal("100")
        account = models.Account.objects.create(
            user=User.objects.all()[0], nickname="test"
        )

        _add_dummy_exchange_rates()

        with self.assertRaises(binance_parser.InvalidFormat):
            binance_parser.import_transactions_from_file(
                account, "./finance/binance_transaction_sample_mismatched_dates.csv"
            )
        self.assertEqual(models.TransactionImport.objects.last().status,
                         models.ImportStatus.FAILURE)

    @patch("finance.prices.get_crypto_usd_price_at_date")
    @patch("finance.prices.are_crypto_prices_available")
    def test_importing_binance_data_fiat_doesnt_match_account_currency(
        self, mock, crypto_price_mock
    ):
        mock.return_value = False
        crypto_price_mock.return_value = decimal.Decimal("100")
        _add_dummy_exchange_rates()

        account_balance = decimal.Decimal("329.07600")
        base_num_of_transactions = 8
        account = models.Account.objects.create(
            user=User.objects.all()[0],
            nickname="test",
            currency=models.Currency.USD,
        )
        transaction_import = binance_parser.import_transactions_from_file(
            account, "./finance/binance_transaction_sample.csv"
        )
        failed_records = transaction_import.records.filter(successful=False)
        self.assertEqual(len(failed_records), 0)
        self.assertEqual(models.Transaction.objects.count(), base_num_of_transactions)
        account = models.Account.objects.get(nickname="test")
        self.assertAlmostEqual(account.balance, account_balance)

        # 2 in the new account, 30 from the old fixture.
        self.assertEqual(models.Position.objects.count(), 32)

        eth = models.Asset.objects.get(name="ETH")
        self.assertEqual(eth.exchange.name, "Other / NA")
        self.assertEqual(eth.isin, "")
        self.assertEqual(eth.currency, models.Currency.USD)
        self.assertIsNone(eth.country)
        eth_position = models.Position.objects.get(asset=eth, account=account)
        self.assertEqual(eth_position.quantity, ETH_QUANTITY)

        # total_value here doesn't include value of transfers.
        expected_total_value = decimal.Decimal("-1091.9040000000")
        total_value = models.Transaction.objects.aggregate(
            Sum("total_in_account_currency")
        )["total_in_account_currency__sum"]
        self.assertAlmostEqual(total_value, expected_total_value)

        # Import the same transactions again and make
        # sure that they aren't double recorded.
        transaction_import = binance_parser.import_transactions_from_file(
            account, "./finance/binance_transaction_sample.csv"
        )
        self.assertEqual(models.Transaction.objects.count(), base_num_of_transactions)
        self.assertEqual(models.Position.objects.count(), 32)
        account = models.Account.objects.get(nickname="test")
        total_value = models.Transaction.objects.aggregate(
            Sum("total_in_account_currency")
        )["total_in_account_currency__sum"]

        self.assertAlmostEqual(account.balance, account_balance)
        self.assertAlmostEqual(total_value, expected_total_value)

    @patch("finance.prices.get_crypto_usd_price_at_date")
    @patch("finance.prices.are_crypto_prices_available")
    def test_importing_binance_data_with_income(self, mock, crypto_price_mock):
        mock.return_value = False
        crypto_price_mock.return_value = decimal.Decimal("100")

        account_balance = decimal.Decimal("299.16000")
        num_of_income_events = 5
        base_num_of_transactions = 8 + num_of_income_events
        account = models.Account.objects.create(
            user=User.objects.all()[0], nickname="test"
        )
        _add_dummy_exchange_rates()

        transaction_import = binance_parser.import_transactions_from_file(
            account, "./finance/binance_transaction_sample_with_income.csv"
        )
        failed_records = transaction_import.records.filter(successful=False)
        self.assertEqual(failed_records.count(), 0)
        failed_event_records = transaction_import.event_records.filter(successful=False)
        self.assertEqual(failed_event_records.count(), 0)
        self.assertEqual(models.Transaction.objects.count(), base_num_of_transactions)
        account = models.Account.objects.get(nickname="test")

        self.assertAlmostEqual(account.balance, account_balance)

        # 2 in the new account, 30 from the old fixture.
        self.assertEqual(models.Position.objects.count(), 35)

        eth = models.Asset.objects.get(name="ETH")
        self.assertEqual(eth.exchange.name, "Other / NA")
        self.assertEqual(eth.isin, "")
        self.assertEqual(eth.currency, models.Currency.USD)
        self.assertIsNone(eth.country)
        eth_position = models.Position.objects.get(asset=eth, account=account)
        self.assertEqual(eth_position.quantity, ETH_QUANTITY)

        # Import the same transactions again and make
        # sure that they aren't double recorded.
        account = models.Account.objects.get(nickname="test")
        transaction_import = binance_parser.import_transactions_from_file(
            account, "./finance/binance_transaction_sample_with_income.csv"
        )
        self.assertEqual(models.Transaction.objects.count(), base_num_of_transactions)
        self.assertEqual(models.Position.objects.count(), 35)
        account = models.Account.objects.get(nickname="test")

        self.assertAlmostEqual(account.balance, account_balance)
        self.assertEqual(models.TransactionImport.objects.count(), 2)
        self.assertEqual(transaction_import.event_records.count(), 9)


    @patch("finance.prices.get_crypto_usd_price_at_date")
    @patch("finance.prices.are_crypto_prices_available")
    def test_importing_with_income_and_deleting_import(self, mock, crypto_price_mock):
        mock.return_value = False
        crypto_price_mock.return_value = decimal.Decimal("100")

        account_balance = decimal.Decimal("-80.0")
        num_of_income_events = 1
        base_num_of_transactions = 1 + num_of_income_events
        account = models.Account.objects.create(
            user=User.objects.all()[0], nickname="test"
        )
        _add_dummy_exchange_rates()

        first_import = binance_parser.import_transactions_from_file(
            account, "./finance/binance_transaction_sample_with_income_mini.csv"
        )
        failed_records = first_import.records.filter(successful=False)
        self.assertEqual(failed_records.count(), 0)
        failed_event_records = first_import.event_records.filter(successful=False)
        self.assertEqual(failed_event_records.count(), 0)
        self.assertEqual(models.Transaction.objects.count(), base_num_of_transactions)
        account = models.Account.objects.get(nickname="test")

        self.assertAlmostEqual(account.balance, account_balance)

        # 1 in the new account, 30 from the old fixture.
        self.assertEqual(models.Position.objects.count(), 31)

        self.assertEqual(first_import.event_records.count(), 1)

        self.assertEqual(models.TransactionImportRecord.objects.count(), 1)
        account_repository = accounts.AccountRepository(recompute_lots=False, batch_related_changes=True)

        # TODO: bring it down to something like 6.
        with self.assertNumQueries(48):
            account_repository.delete_transaction_import(first_import)
        self.assertEqual(models.Transaction.objects.count(), 0)
        self.assertEqual(models.TransactionImportRecord.objects.count(), 0)

    @patch("finance.prices.collect_prices")
    @patch("finance.prices.get_crypto_usd_price_at_date")
    @patch("finance.prices.are_crypto_prices_available")
    def test_importing_binance_data_usd_transacions(self, mock, crypto_price_mock, _):
        mock.return_value = True
        crypto_price_mock.return_value = decimal.Decimal("100")

        account_balance = decimal.Decimal("-392.64000")
        base_num_of_transactions = 4
        account = models.Account.objects.create(
            user=User.objects.all()[0],
            nickname="test",
            currency=models.Currency.USD,
        )
        account = models.Account.objects.get(nickname="test")

        _add_dummy_exchange_rates()

        transaction_import = binance_parser.import_transactions_from_file(
            account, "./finance/binance_transaction_only_usd.csv"
        )
        failed_records = transaction_import.records.filter(successful=False)
        self.assertEqual(len(failed_records), 0)
        self.assertEqual(models.Transaction.objects.count(), base_num_of_transactions)
        account = models.Account.objects.get(nickname="test")
        self.assertAlmostEqual(account.balance, account_balance)

        # 2 in the new account, 30 from the old fixture.
        self.assertEqual(models.Position.objects.count(), 32)
        self.assertEqual(
            models.Asset.objects.filter(tracked=False, added_by=None).count(), 0
        )
        self.assertEqual(
            models.Asset.objects.filter(
                asset_type=models.AssetType.CRYPTO, tracked=True, added_by=None
            ).count(),
            2,
        )

        eth = models.Asset.objects.get(name="ETH")
        self.assertEqual(eth.exchange.name, "Other / NA")
        self.assertEqual(eth.isin, "")
        self.assertEqual(eth.currency, models.Currency.USD)
        self.assertIsNone(eth.country)
        eth_position = models.Position.objects.get(asset=eth, account=account)
        self.assertEqual(eth_position.quantity, decimal.Decimal("0.0492658700"))

        expected_total_value = decimal.Decimal(account_balance)
        total_value = models.Transaction.objects.aggregate(
            Sum("total_in_account_currency")
        )["total_in_account_currency__sum"]
        self.assertAlmostEqual(total_value, expected_total_value)

        for args in self.collect_prices_mock.delay.call_args_list:
            self.real_collect_prices.run(*args[0])

        # Import the same transactions again and make
        # sure that they aren't double recorded.
        account = models.Account.objects.get(nickname="test")
        transaction_import = binance_parser.import_transactions_from_file(
            account, "./finance/binance_transaction_only_usd.csv"
        )
        self.assertEqual(models.Transaction.objects.count(), base_num_of_transactions)
        self.assertEqual(models.Position.objects.count(), 32)
        account = models.Account.objects.get(nickname="test")
        total_value = models.Transaction.objects.aggregate(
            Sum("total_in_account_currency")
        )["total_in_account_currency__sum"]

        self.assertAlmostEqual(account.balance, account_balance)
        self.assertAlmostEqual(total_value, expected_total_value)

    @patch("finance.prices.get_crypto_usd_price_at_date")
    @patch("finance.prices.are_crypto_prices_available")
    def test_importing_binance_data_with_income_bad_prices(
        self, mock, crypto_price_mock
    ):
        mock.return_value = False
        crypto_price_mock.side_effect = prices.PriceNotAvailable(
            "Price for asset in test not available :("
        )

        account_balance = decimal.Decimal("299.16000")
        base_num_of_transactions = 8
        account = models.Account.objects.create(
            user=User.objects.all()[0], nickname="test"
        )
        _add_dummy_exchange_rates()

        transaction_import = binance_parser.import_transactions_from_file(
            account, "./finance/binance_transaction_sample_with_income.csv"
        )
        failed_records = transaction_import.records.filter(successful=False)
        self.assertEqual(failed_records.count(), 0)
        self.assertEqual(models.Transaction.objects.count(), base_num_of_transactions)
        self.assertEqual(
            models.Asset.objects.filter(tracked=False, added_by=None).count(), 0
        )
        self.assertEqual(
            models.Asset.objects.filter(
                tracked=False, added_by=User.objects.all()[0]
            ).count(),
            2,
        )
        failed_event_records = transaction_import.event_records.filter(successful=False)
        self.assertEqual(failed_event_records.count(), 5)
        self.assertEqual(
            failed_event_records.first().issue_type,
            models.ImportIssueType.FAILED_TO_FETCH_PRICE,
        )
        successful_event_records = transaction_import.event_records.filter(
            successful=True
        )
        self.assertEqual(successful_event_records.count(), 4)
        self.assertAlmostEqual(account.balance, account_balance)

    def test_convert_usd_to_account_currency(self):
        _add_dummy_exchange_rates()

        date = '2021-10-14'

        account_eur = models.Account.objects.create(
            user=User.objects.all()[0], nickname="test_eur", currency=models.Currency.EUR
        )
        account_gbp = models.Account.objects.create(
            user=User.objects.all()[0], nickname="test_gbp", currency=models.Currency.GBP
        )
        value = decimal.Decimal(10)
        value_eur = binance_parser.convert_usd_to_account_currency(value, account_eur, date)

        self.assertEqual(value_eur, decimal.Decimal(9))

        # No exchange rates for GBP, sorry!
        with self.assertRaises(binance_parser.CurrencyMismatch):
            binance_parser.convert_usd_to_account_currency(value, account_gbp, date)


class TestBinanceTransactionImportView(testing_utils.ViewTestBase, TestCase):
    URL = "/api/integrations/binance/transactions/"
    VIEW_NAME = "binance-transaction-upload-list"
    DETAIL_VIEW = False
    QUERY_PARAMS = "?"
    UNAUTHENTICATED_CODE = 403

    # This fixture provides data about 65 different exchanges,
    # and sets up a single account for testing.
    fixtures = ["exchanges_postgres.json"]

    def setUp(self):
        super().setUp()

        self.account = models.Account.objects.create(
            user=self.user, currency=models.Currency.EUR, nickname="test account"
        )
        _add_dummy_exchange_rates()

    def test_cannot_upload_to_wrong_account(self):
        pass

    @patch("finance.prices.get_crypto_usd_price_at_date")
    @patch("finance.prices.are_crypto_prices_available")
    def test_can_upload_to_owned_account(self, mock, crypto_price_mock):
        mock.return_value = False
        crypto_price_mock.return_value = decimal.Decimal("100")

        response = self.client.get(self.get_url())
        self.assertEqual(response.status_code, 200)

        self.assertEqual(models.Transaction.objects.count(), 0)
        with open("./finance/binance_transaction_sample_with_income.csv", "rb") as fp:
            response = self.client.post(
                self.URL, {"account": self.account.id, "transaction_file": fp}
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(models.Transaction.objects.count(), 13)
        self.assertEqual(models.AccountEvent.objects.count(), 9)

        response = self.client.get("/api/transaction-imports/")
        self.assertEqual(response.status_code, 200)

        transaction_import_id = models.TransactionImport.objects.first().id
        response = self.client.get(f"/api/transaction-imports/{transaction_import_id}/")
        self.assertEqual(response.status_code, 200)

    @patch("finance.prices.get_crypto_usd_price_at_date")
    @patch("finance.prices.are_crypto_prices_available")
    def test_bad_files_return_errors(self, mock, crypto_price_mock):
        mock.return_value = False
        crypto_price_mock.return_value = decimal.Decimal("100")

        response = self.client.get(self.get_url())
        self.assertEqual(response.status_code, 200)

        self.assertEqual(models.Transaction.objects.count(), 0)
        with open("./finance/binance_transaction_sample_odd.csv", "rb") as fp:
            response = self.client.post(
                self.URL, {"account": self.account.id, "transaction_file": fp}
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(models.Transaction.objects.count(), 0)
        self.assertEqual(models.AccountEvent.objects.count(), 0)

        response = self.client.get("/api/transaction-imports/")
        self.assertEqual(response.status_code, 200)

        transaction_import_id = models.TransactionImport.objects.first().id
        response = self.client.get(f"/api/transaction-imports/{transaction_import_id}/")
        self.assertEqual(response.status_code, 200)