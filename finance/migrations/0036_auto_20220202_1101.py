# Generated by Django 3.2 on 2022-02-02 11:01

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0035_auto_20220130_1802'),
    ]

    operations = [
        migrations.AlterField(
            model_name='transactionimportrecord',
            name='transaction',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='records', to='finance.transaction'),
        ),
        migrations.AlterField(
            model_name='transactionimportrecord',
            name='transaction_import',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='transaction_records', to='finance.transactionimport'),
        ),
    ]
