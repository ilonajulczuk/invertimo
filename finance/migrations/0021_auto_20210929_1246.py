# Generated by Django 3.2 on 2021-09-29 12:46

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0020_accountevent_event_type'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='account',
            options={'ordering': ['-id']},
        ),
        migrations.AlterModelOptions(
            name='accountevent',
            options={'ordering': ['-executed_at']},
        ),
        migrations.AddField(
            model_name='accountevent',
            name='amount',
            field=models.DecimalField(decimal_places=6, default=0, max_digits=18),
            preserve_default=False,
        ),
    ]
