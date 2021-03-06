# Generated by Django 3.2 on 2021-04-27 14:19

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0002_auto_20210426_1145'),
    ]

    operations = [
        migrations.AlterField(
            model_name='account',
            name='currency',
            field=models.IntegerField(choices=[(1, 'EUR'), (2, 'GBP'), (3, 'USD'), (4, 'GBX')], default=1),
        ),
        migrations.AlterField(
            model_name='security',
            name='currency',
            field=models.IntegerField(choices=[(1, 'EUR'), (2, 'GBP'), (3, 'USD'), (4, 'GBX')], default=3),
        ),
    ]
