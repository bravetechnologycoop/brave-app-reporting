DO $migration$
    DECLARE migrationId INT;
    DECLARE lastSuccessfulMigrationId INT;
BEGIN
    -- The migration ID of this file
    migrationId := 6;

    -- Get the migration ID of the last file to be successfully run
    SELECT MAX(id) INTO lastSuccessfulMigrationId
    FROM migrations;

    -- Only execute this script if its migration ID is next after the last successful migration ID
    IF migrationId - lastSuccessfulMigrationId = 1 THEN
        -- ADD SCRIPT HERE
        ALTER TABLE androiddownloads
        ADD COLUMN IF NOT EXISTS client TEXT;

        ALTER TABLE appledownloads
        ADD COLUMN IF NOT EXISTS client TEXT;

        ALTER TABLE calls
        ADD COLUMN IF NOT EXISTS client TEXT;

        ALTER TABLE supporterlogs
        ADD COLUMN IF NOT EXISTS client TEXT;

        UPDATE androiddownloads
        SET client = 'Brave'
        WHERE client IS NULL;

        UPDATE appledownloads
        SET client = 'Brave'
        WHERE client IS NULL;

        UPDATE calls
        SET client = 'Brave'
        WHERE client IS NULL;

        UPDATE supporterlogs
        SET client = 'Brave'
        WHERE client IS NULL;

        ALTER TABLE androiddownloads
        ALTER COLUMN client
        SET NOT NULL;

        ALTER TABLE appledownloads
        ALTER COLUMN client
        SET NOT NULL;

        ALTER TABLE calls
        ALTER COLUMN client
        SET NOT NULL;

        ALTER TABLE supporterlogs
        ALTER COLUMN client
        SET NOT NULL;

        ALTER TABLE androiddownloads
        DROP CONSTRAINT androiddownloads_pkey CASCADE,
        ADD PRIMARY KEY(client, territory, download_date);

        ALTER TABLE appledownloads
        DROP CONSTRAINT appledownloads_pkey CASCADE,
        ADD PRIMARY KEY(client, territory, download_date);

        ALTER TABLE supporterlogs
        DROP CONSTRAINT supporterlogs_pkey CASCADE,
        ADD PRIMARY KEY(client, log_timestamp);

        -- Update the migration ID of the last file to be successfully run to the migration ID of this file
        INSERT INTO migrations (id)
        VALUES (migrationId);
    END IF;
END $migration$;

