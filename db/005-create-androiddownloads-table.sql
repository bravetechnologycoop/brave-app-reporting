DO $migration$
    DECLARE migrationId INT;
    DECLARE lastSuccessfulMigrationId INT;
BEGIN
    -- The migration ID of this file
    migrationId := 5;

    -- Get the migration ID of the last file to be successfully run
    SELECT MAX(id) INTO lastSuccessfulMigrationId
    FROM migrations;

    -- Only execute this script if its migration ID is next after the last successful migration ID
    IF migrationId - lastSuccessfulMigrationId = 1 THEN
        -- ADD SCRIPT HERE
        CREATE TABLE IF NOT EXISTS androiddownloads (
            territory text NOT NULL,
            download_date DATE NOT NULL,
            download_count INTEGER NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            PRIMARY KEY (territory, download_date)
        );

        CREATE OR REPLACE FUNCTION trigger_set_timestamp()
        RETURNS TRIGGER AS $t$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $t$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS set_androiddownloads_timestamp ON calls;

        CREATE TRIGGER set_androiddownloads_timestamp
        BEFORE UPDATE ON androiddownloads
        FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

        -- Update the migration ID of the last file to be successfully run to the migration ID of this file
        INSERT INTO migrations (id)
        VALUES (migrationId);
    END IF;
END $migration$;

