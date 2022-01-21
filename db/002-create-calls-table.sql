DO $migration$
    DECLARE migrationId INT;
    DECLARE lastSuccessfulMigrationId INT;
BEGIN
    -- The migration ID of this file
    migrationId := 2;

    -- Get the migration ID of the last file to be successfully run
    SELECT MAX(id) INTO lastSuccessfulMigrationId
    FROM migrations;

    -- Only execute this script if its migration ID is next after the last successful migration ID
    IF migrationId - lastSuccessfulMigrationId = 1 THEN
        -- ADD SCRIPT HERE
        CREATE TABLE IF NOT EXISTS calls (
            sid TEXT PRIMARY KEY,
            start_time timestamptz NOT NULL,
            end_time timestamptz,
            duration INTEGER NOT NULL,
            from_number TEXT NOT NULL,
            to_number TEXT NOT NULL,
            direction TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE OR REPLACE FUNCTION trigger_set_timestamp()
        RETURNS TRIGGER AS $t$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $t$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS set_calls_timestamp ON calls;

        CREATE TRIGGER set_calls_timestamp
        BEFORE UPDATE ON calls
        FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

        -- Update the migration ID of the last file to be successfully run to the migration ID of this file
        INSERT INTO migrations (id)
        VALUES (migrationId);
    END IF;
END $migration$;

