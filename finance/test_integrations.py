import datetime
import decimal
from unittest.mock import patch

from django.contrib.auth.models import User
from django.db.models import Sum
from django.test import TestCase

from finance import models, prices, testing_utils, utils
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
            account, "./finance/binance_transaction_sample.csv"
        )
        self.assertEqual(models.Transaction.objects.count(), base_num_of_transactions)
        self.assertEqual(models.Position.objects.count(), 35)
        account = models.Account.objects.get(nickname="test")

        self.assertAlmostEqual(account.balance, account_balance)
        self.assertEqual(models.TransactionImport.objects.count(), 2)
        transaction_import = models.TransactionImport.objects.last()
        self.assertEqual(transaction_import.event_records.count(), 9)

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
