DO $migration$
    DECLARE migrationId INT;
    DECLARE lastSuccessfulMigrationId INT;
BEGIN
    -- The migration ID of this file
    migrationId := 1;

    -- Table to store the current migration state of the DB
    CREATE TABLE IF NOT EXISTS migrations (
        id INT PRIMARY KEY,
        created_at timestamptz NOT NULL DEFAULT NOW()
    );

    -- Get the migration ID of the last file to be successfully run
    SELECT MAX(id) INTO lastSuccessfulMigrationId
    FROM migrations;

    -- Only execute this script if its migration ID is next after the last successful migration ID
    IF lastSuccessfulMigrationId IS NULL THEN
        -- ADD SCRIPT HERE
        CREATE EXTENSION IF NOT EXISTS pgcrypto;

        -- Update the migration ID of the last file to be successfully run to the migration ID of this file
        INSERT INTO migrations (id)
        VALUES (migrationId);
    END IF;
END $migration$;
