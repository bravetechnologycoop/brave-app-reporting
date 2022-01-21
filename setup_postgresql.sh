sudo PGPASSWORD=$PG_PASSWORD psql -U $PG_USER -h $PG_HOST -p $PG_PORT -d $PG_DATABASE --set=sslmode=require -c 'CREATE EXTENSION IF NOT EXISTS "pgcrypto"'
sudo PGPASSWORD=$PG_PASSWORD psql -U $PG_USER -h $PG_HOST -p $PG_PORT -d $PG_DATABASE --set=sslmode=require -f ./db/001-setup.sql

