# Generated by Django 3.2 on 2021-10-28 18:35

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0022_accountevent_withheld_taxes'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='asset',
            options={'ordering': ['-id', 'symbol']},
        ),
        migrations.CreateModel(
            name='Lot',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity', models.DecimalField(decimal_places=5, max_digits=12)),
                ('buy_date', models.DateField()),
                ('buy_price', models.DecimalField(decimal_places=5, max_digits=12)),
                ('cost_basis_account_currency', models.DecimalField(decimal_places=5, max_digits=12)),
                ('sell_date', models.DateField()),
                ('sell_price', models.DecimalField(decimal_places=5, max_digits=12, null=True)),
                ('sell_basis_account_currency', models.DecimalField(decimal_places=5, max_digits=12, null=True)),
                ('realized_gain_account_currency', models.DecimalField(decimal_places=5, max_digits=12, null=True)),
                ('buy_transaction', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='buy_lots', to='finance.transaction')),
                ('position', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='lots', to='finance.position')),
                ('sell_transaction', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='sell_lots', to='finance.transaction')),
            ],
            options={
                'ordering': ['buy_date'],
            },
        ),
    ]
