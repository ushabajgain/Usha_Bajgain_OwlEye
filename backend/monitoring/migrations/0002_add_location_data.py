# Generated migration for location system cleanup
# Adds location_data JSONField to Incident and SOSAlert models
# Keeps legacy latitude/longitude fields for backward compatibility

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('monitoring', '0001_initial'),
    ]

    operations = [
        # Add location_data to Incident
        migrations.AddField(
            model_name='incident',
            name='location_data',
            field=models.JSONField(
                blank=True,
                null=True,
                help_text='Structured location: {country_code, country_name, location_id, display_name, lat, lng}'
            ),
        ),
        
        # Mark latitude as deprecated (nullable)
        migrations.AlterField(
            model_name='incident',
            name='latitude',
            field=models.DecimalField(
                max_digits=9,
                decimal_places=6,
                null=True,
                blank=True,
                help_text='DEPRECATED: Use location_data instead'
            ),
        ),
        
        # Mark longitude as deprecated (nullable)
        migrations.AlterField(
            model_name='incident',
            name='longitude',
            field=models.DecimalField(
                max_digits=9,
                decimal_places=6,
                null=True,
                blank=True,
                help_text='DEPRECATED: Use location_data instead'
            ),
        ),
        
        # Mark location_name as deprecated
        migrations.AlterField(
            model_name='incident',
            name='location_name',
            field=models.CharField(
                max_length=255,
                blank=True,
                null=True,
                help_text='DEPRECATED: Use location_data.display_name instead'
            ),
        ),
        
        # Add location_data to SOSAlert
        migrations.AddField(
            model_name='sosalert',
            name='location_data',
            field=models.JSONField(
                blank=True,
                null=True,
                help_text='Structured location: {country_code, country_name, location_id, display_name, lat, lng}'
            ),
        ),
        
        # Mark latitude as deprecated (nullable)
        migrations.AlterField(
            model_name='sosalert',
            name='latitude',
            field=models.DecimalField(
                max_digits=9,
                decimal_places=6,
                null=True,
                blank=True,
                help_text='DEPRECATED: Use location_data instead'
            ),
        ),
        
        # Mark longitude as deprecated (nullable)
        migrations.AlterField(
            model_name='sosalert',
            name='longitude',
            field=models.DecimalField(
                max_digits=9,
                decimal_places=6,
                null=True,
                blank=True,
                help_text='DEPRECATED: Use location_data instead'
            ),
        ),
        
        # Mark location_name as deprecated
        migrations.AlterField(
            model_name='sosalert',
            name='location_name',
            field=models.CharField(
                max_length=255,
                blank=True,
                null=True,
                help_text='DEPRECATED: Use location_data.display_name instead'
            ),
        ),
    ]
