DO $migration$
    DECLARE migrationId INT;
    DECLARE lastSuccessfulMigrationId INT;
BEGIN
    -- The migration ID of this file
    migrationId := 7;

    -- Get the migration ID of the last file to be successfully run
    SELECT MAX(id) INTO lastSuccessfulMigrationId
    FROM migrations;

    -- Only execute this script if its migration ID is next after the last successful migration ID
    IF migrationId - lastSuccessfulMigrationId = 1 THEN
        -- ADD SCRIPT HERE
        ALTER TABLE appledownloads
        RENAME TO apple_data;

        ALTER TABLE apple_data
        RENAME COLUMN download_count TO first_time_downloads_count;

        ALTER TABLE apple_data
        RENAME COLUMN download_date TO data_date;

        ALTER TABLE apple_data
        ADD COLUMN IF NOT EXISTS redownloads_count INTEGER;

        ALTER TABLE apple_data
        ADD COLUMN IF NOT EXISTS total_downloads_count INTEGER;

        ALTER TABLE apple_data
        ADD COLUMN IF NOT EXISTS total_device_impressions_count INTEGER;

        ALTER TABLE apple_data
        ADD COLUMN IF NOT EXISTS unique_device_impressions_count INTEGER;

        ALTER TABLE apple_data
        ADD COLUMN IF NOT EXISTS total_product_page_views_count INTEGER;

        ALTER TABLE apple_data
        ADD COLUMN IF NOT EXISTS unique_product_page_views_count INTEGER;

        ALTER TABLE apple_data
        ADD COLUMN IF NOT EXISTS updates_count INTEGER;

        ALTER TABLE apple_data
        ADD COLUMN IF NOT EXISTS conversion_rate REAL;

        ALTER TABLE apple_data
        ADD COLUMN IF NOT EXISTS installations_count INTEGER;

        ALTER TABLE apple_data
        ADD COLUMN IF NOT EXISTS sessions_count INTEGER;

        ALTER TABLE apple_data
        ADD COLUMN IF NOT EXISTS total_active_devices_count INTEGER;

        ALTER TABLE apple_data
        ADD COLUMN IF NOT EXISTS active_in_last_30_days_devices_count INTEGER;

        ALTER TABLE apple_data
        ADD COLUMN IF NOT EXISTS deletions_count INTEGER;

        -- Update the migration ID of the last file to be successfully run to the migration ID of this file
        INSERT INTO migrations (id)
        VALUES (migrationId);
    END IF;
END $migration$;

