
from invertimo.celery import app
from celery.utils.log import get_task_logger
from finance import prices, models
from django.core.management import call_command


logger = get_task_logger(__name__)


@app.task()
def collect_prices(asset_id):
    asset = models.Asset.objects.get(pk=asset_id)
    logger.info(f"Collecting prices for asset: {asset}.")
    values = prices.collect_prices(asset)
    logger.info(f"Collected {len(values)} of prices for asset: {asset}.")


@app.task()
def fetch_prices():
    call_command("fetch_prices")