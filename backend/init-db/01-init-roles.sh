#!/bin/bash
# Runs once, on first Postgres initialization (empty data volume), as the
# POSTGRES_USER superuser (dbadmin). Creates the two lower-privilege roles.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  -- Tier 2: schema/migration admin. Owns the app schema, runs migrations (DDL + DML).
  CREATE ROLE bankadmin WITH LOGIN PASSWORD '${BANKADMIN_PASSWORD}';
  GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO bankadmin;
  ALTER SCHEMA public OWNER TO bankadmin;

  -- Tier 3: application runtime. Data only (no schema changes), used by the live app.
  CREATE ROLE bankapp WITH LOGIN PASSWORD '${BANKAPP_PASSWORD}';
  GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO bankapp;
  GRANT USAGE ON SCHEMA public TO bankapp;

  -- Tables created by bankadmin (via migrations) auto-grant data access to bankapp.
  ALTER DEFAULT PRIVILEGES FOR ROLE bankadmin IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO bankapp;
  ALTER DEFAULT PRIVILEGES FOR ROLE bankadmin IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO bankapp;
EOSQL

echo "Roles created: bankadmin (schema/migrations), bankapp (app runtime)."