# Generated by Django 3.2 on 2021-12-27 16:50

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0026_transactionimport_transactionimportrecord'),
    ]

    operations = [
        migrations.AddField(
            model_name='transactionimport',
            name='account',
            field=models.ForeignKey(default=1, on_delete=django.db.models.deletion.CASCADE, to='finance.account'),
            preserve_default=False,
        ),
    ]
