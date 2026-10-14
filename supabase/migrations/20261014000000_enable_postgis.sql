-- Project Rescue Foundation: Enable PostGIS & Extensions
-- Phase 1 & Phase 5: PostGIS spatial extensions for confidential field geocoding and operations

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";
