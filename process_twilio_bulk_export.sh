#!/bin/bash

# References:
#   https://www.twilio.com/docs/usage/bulkexport
#   https://www.twilio.com/docs/voice/changes-availability-call-and-conference-logs
#   https://www.twilio.com/docs/usage/bulkexport/export-custom-job

set -e
original_dir=$(pwd)
cd $(dirname "$0")

if [[ $EUID > 0 ]]; then
    echo "This script needs sudo privileges to run correctly."
    cd $original_dir
    exit 1
elif [[ ! -n "$5" ]]; then
    echo ""
    echo "Usage: $0 path_to_.env_file date-in-yyyy-MM-dd-format client_name twilio_sid twilio_token"
    echo "" 
    echo "Example: $0 ./../.env 2022-01-31 Brave abc123 xyz789"
    echo ""
    cd $original_dir
    exit 1
else
    while IFS="=" read -r name value; do
        if [[ "$name" == "PG_USER" ]]; then
            PG_USER="$value"
        elif [[ "$name" == "PG_DATABASE" ]]; then
            PG_DATABASE="$value"
        elif [[ "$name" == "PG_PASSWORD" ]]; then
            PG_PASSWORD="$value"
        elif [[ "$name" == "PG_HOST" ]]; then
            PG_HOST="$value"
        elif [[ "$name" == "PG_PORT" ]]; then
            PG_PORT="$value"
        fi
    done < $1

    # Get the one-time use URL from Twilio for the day's calls
    redirectToWithQuotes=$(curl -X GET "https://bulkexports.twilio.com/v1/Exports/Calls/Days/$2" -u $4:$5 | jq '.redirect_to')

    # Strip leading and trailing quotes
    redirectTo=${redirectToWithQuotes:1:-1}

    # Temporarily store the gzipped file in the current directory
    curl -X GET $redirectTo > temp_encodedCalls.json.gz

    # Unzip the gzipped file in the current directory (this also removes the gzipped version of it, leaving just the json file)
    gunzip -c temp_encodedCalls.json.gz > temp_encodedCalls.json

    # Upsert these values into the DB
    count=0
    while IFS="\n", read -r line; do
        sid=$(jq -r '.sid' <<< "$line")
        start_time=$(jq -r '.start_time' <<< "$line")
        end_time=$(jq -r '.end_time' <<< "$line")
        duration=$(jq -r '.duration' <<< "$line")
        from_number=$(jq -r '.from' <<< "$line")
        to_number=$(jq -r '.to' <<< "$line")
        direction=$(jq -r '.direction' <<< "$line")
        status=$(jq -r '.status' <<< "$line")

        sql="INSERT INTO calls (sid, start_time, end_time, duration, from_number, to_number, direction, status, client) VALUES ('$sid', '$start_time', '$end_time', $duration, '$from_number', '$to_number', '$direction', '$status', '$3') ON CONFLICT (sid) DO UPDATE SET start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time, duration = EXCLUDED.duration, from_number = EXCLUDED.from_number, to_number = EXCLUDED.to_number, direction = EXCLUDED.direction, status = EXCLUDED.status, client = EXCLUDED.client;"

        sudo PGPASSWORD=$PG_PASSWORD psql -U $PG_USER -h $PG_HOST -p $PG_PORT -d $PG_DATABASE --set=sslmode=require -c "$sql"
        ((count=count+1))
    done < temp_encodedCalls.json
    echo "Upserted $count calls"

    # Removed temporarily-created files
    rm temp_encodedCalls*

    cd $original_dir
fi
