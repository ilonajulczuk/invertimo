# Generated by Django 3.2 on 2021-08-15 16:56

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0014_auto_20210815_1653'),
    ]

    operations = [
        migrations.AlterField(
            model_name='asset',
            name='exchange',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='assets', to='finance.exchange'),
        ),
    ]