# Generated by Django 3.2 on 2021-04-27 15:08

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0003_auto_20210427_1419'),
    ]

    operations = [
        migrations.AlterField(
            model_name='transaction',
            name='transaction_costs',
            field=models.DecimalField(decimal_places=5, max_digits=12, null=True),
        ),
    ]
