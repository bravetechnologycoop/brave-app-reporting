# brave-app-reporting

Scripts to help with Brave App reporting

# Running the main script

1. Copy the `.env.example` file, rename the copy to `.env`, and update it to have the values you need

1. Copy the `clients.json.example` file, rename the copy to `clients.json`, and update it to have the values you need

   - `name` - Human-readable name for the whitelabel client
   - `twilioSid` - Get from Twilio --> Accounts --> Brave App - Production --> View Subaccounts --> [Name of the subaccount for the whitelabel client] --> Account Info --> Account SID (example: `ACec68cccba2aa5443c2b171336fe86a70`)
   - `twilioToken` - Get from Twilio --> Accounts --> Brave App - Production --> View Subaccounts --> [Name of the subaccount for the whitelabel client] --> Account Info --> Auth Token (example: `c8f0a844ca87d7c436e76dfcc53cd62e`)
   - `googleCloudStorageBucket` - Get from Google Play Console --> Download reports --> Statistics --> choose the whitelabel client's app --> Installs --> Copy Cloud Storage URI and take just the bucket part of it (example: `pubsite_prod_rev_12345678901234567890`)
   - `googleCloudStorageFilePrefix` - Get from Google Play Console --> Download reports --> Statistics --> choose the whitelabel client's app --> Installs --> Inspect one of the download links to get the path and name of the CSV file. Start with the word after the bucket name (no forward slash) and end just before the date (example: `stats/installs/installs_com.package.name_`)

1. Run `npm ci`

1. Run `npm start`

# Running the script to import Twilio calls from their bulk export

1. Run the Twilio Bulk Export process for calls for the dates that you need (reference: https://www.twilio.com/docs/usage/bulkexport/export-custom-job)

   ```
   curl -X POST https://bulkexports.twilio.com/v1/Exports/Calls/Jobs \
   --data-urlencode "Email=theresa@brave.coop" \
   --data-urlencode "StartDay=2020-12-01" \
   --data-urlencode "EndDay=2020-12-31" \
   --data-urlencode "FriendlyName=Dec2020" \
   -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN
   ```

1. Wait until you receive an email saying that a particular day is finished exporting

1. Within 7 days of the completed export, run `sudo ./process_twilio_bulk_export.sh ./.env YYYY-MM-DD clientName twilioSid twilioToken` where
   - `YYYY-MM-DD` are is the date that you want to import
   - `clientName` is one of the valid whitelabel client names (e.g. `Brave`)
   - `twilioSid` is the SID of the Twilio SubAccount used by the whitelabel client
   - `twilioToken` is the Token of the Twilio SubAcccount used by the whitelabel client

# Interacting with the Managed Database

## Connecting to a database

The PostgreSQL DB connection parameters are required for the application to open a connection to the database. We primarily use the following databases, although you are free to create new ones for development purposes

| Environment | User    | Database Name |
| ----------- | ------- | ------------- |
| Production  | doadmin | default       |

To access a database shell

1. Log in to Digital Ocean

1. Navigate to Databases --> brave-app-reporting-db

1. In the Connection Details box:

   1. In the "Connection parameters" dropdown, select "Flags"

   1. In the "User" dropdown, select the user for your desired deployment environment

   1. In the "Database/Pool" dropdown, select the database name for your desired deployment
      environment, click the 'Copy' button below, and paste the result into your terminal to access the shell

## Adding a new Database migration script

This strategy assumes that each migration script in the `db` directory has a unique positive integer migration ID, and that each script's migration ID is exactly one greater than the previous script's migration ID. Otherwise, the scripts will not run.

1. Copy `db/000-template` and name it with the desired migration ID (padded with zeros) followed by a short description of what it does e.g. `005-newColumn.sql`

2. Update the file with its migration ID by replacing `ADD MIGRATION ID HERE` and the new migration scripts by adding it to the section `-- ADD SCRIPT HERE`.

## Deploying the migration scripts to production

1. Run the following command

   ```
   ./setup_postgresql.sh <your db's password> <your db's user> <your db's host> <your db's name> <your db's port>
   ```

## Deploying the migration scripts to a local database

1. Run the following command

   ```
   sudo PG_PORT=<your db's port> PG_HOST=<your db's host> PG_PASSWORD=<your db's password> PG_USER=<your db's user> PG_DATABASE=<your db name> ./setup_postgresql_local.sh
   ```

## Viewing which migration scripts have been run and when

1. Copy the "Flag" connection details from Digital Ocean for the DB you want to check

1. Run
   ```postgres
   SELECT *
   FROM migrations
   ORDER BY id;
   ```
