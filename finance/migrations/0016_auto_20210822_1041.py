# Generated by Django 3.2 on 2021-08-22 10:41

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0015_alter_asset_exchange'),
    ]

    operations = [
        migrations.AddField(
            model_name='asset',
            name='asset_type',
            field=models.IntegerField(choices=[(1, 'Stock'), (2, 'Bond'), (3, 'Fund')], default=1),
        ),
        migrations.AddField(
            model_name='asset',
            name='tracked',
            field=models.BooleanField(default=True),
            preserve_default=False,
        ),
    ]