# Generated by Django 3.2 on 2022-01-30 17:43

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0033_eventimportrecord'),
    ]

    operations = [
        migrations.AlterField(
            model_name='eventimportrecord',
            name='event',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='event_records', to='finance.accountevent'),
        ),
        migrations.AlterField(
            model_name='eventimportrecord',
            name='issue_type',
            field=models.IntegerField(choices=[(1, 'UNKNOWN_FAILURE'), (2, 'SOLD_BEFORE_BOUGHT'), (3, 'BAD_FORMAT'), (4, 'FAILED_TO_FETCH_PRICE')], null=True),
        ),
        migrations.AlterField(
            model_name='transactionimportrecord',
            name='issue_type',
            field=models.IntegerField(choices=[(1, 'UNKNOWN_FAILURE'), (2, 'SOLD_BEFORE_BOUGHT'), (3, 'BAD_FORMAT'), (4, 'FAILED_TO_FETCH_PRICE')], null=True),
        ),
    ]
