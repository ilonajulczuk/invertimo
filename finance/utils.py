import datetime
from typing import List

def generate_datetime_intervals(
    from_date: datetime.datetime,
    to_date: datetime.datetime,
    output_period: datetime.timedelta,
    start_with_end: bool = True,
) -> List[datetime.datetime]:
    dates = []
    if start_with_end:
        start_date = to_date
        end_date = from_date
        delta = -output_period
        comparison = lambda x, y: x >= y
    else:
        start_date = from_date
        end_date = to_date
        delta = output_period
        comparison = lambda x, y: x <= y

    current_date = start_date
    while comparison(current_date, end_date):
        dates.append(current_date)
        current_date += delta
    return dates


def generate_date_intervals(
    from_date: datetime.date,
    to_date: datetime.date,
    output_period: datetime.timedelta,
    start_with_end: bool = True,
) -> List[datetime.date]:
    dates = []
    if start_with_end:
        start_date = to_date
        end_date = from_date
        delta = -output_period
        comparison = lambda x, y: x >= y
    else:
        start_date = from_date
        end_date = to_date
        delta = output_period
        comparison = lambda x, y: x <= y

    current_date = start_date
    while comparison(current_date, end_date):
        dates.append(current_date)
        current_date += delta
    return dates