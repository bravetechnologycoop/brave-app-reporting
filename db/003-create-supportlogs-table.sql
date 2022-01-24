DO $migration$
    DECLARE migrationId INT;
    DECLARE lastSuccessfulMigrationId INT;
BEGIN
    -- The migration ID of this file
    migrationId := 3;

    -- Get the migration ID of the last file to be successfully run
    SELECT MAX(id) INTO lastSuccessfulMigrationId
    FROM migrations;

    -- Only execute this script if its migration ID is next after the last successful migration ID
    IF migrationId - lastSuccessfulMigrationId = 1 THEN
        -- ADD SCRIPT HERE
        CREATE TABLE IF NOT EXISTS supporterlogs (
            log_timestamp timestamptz,
            supporter_email TEXT,
            supporter_name TEXT,
            call_date DATE,
            call_type TEXT,
            call_duration TEXT,
            call_challenges TEXT,
            call_screenshots TEXT,
            caller_type TEXT,
            rescue_started BOOLEAN,
            rescue_outcome TEXT,
            caller_used TEXT,
            caller_administration_route TEXT,
            caller_location_us TEXT,
            caller_location_ca TEXT,
            caller_feedback TEXT,
            supporter_emotional_difficulty_rating INTEGER,
            supporter_energy_rating INTEGER,
            supporter_feedback TEXT,
            supporter_requests_followup BOOLEAN,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now(),
            PRIMARY KEY(log_timestamp, supporter_email)
        );

        CREATE OR REPLACE FUNCTION trigger_set_timestamp()
        RETURNS TRIGGER AS $t$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $t$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS set_supporterlogs_timestamp ON calls;

        CREATE TRIGGER set_supporterlogs_timestamp
        BEFORE UPDATE ON supporterlogs
        FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

        -- Update the migration ID of the last file to be successfully run to the migration ID of this file
        INSERT INTO migrations (id)
        VALUES (migrationId);
    END IF;
END $migration$;

