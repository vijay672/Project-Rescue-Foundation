-- Project Rescue Foundation: Core Database Schema
-- Phase 1 & 2: Profiles, Regions, Activities, GPS/PostGIS locations, Media, Feedback, Reporting Expectations, Audit Logs

-- User Roles Enum
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('field_staff', 'operations_manager', 'system_admin');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Activity Status Enum
DO $$ BEGIN
  CREATE TYPE activity_status AS ENUM (
    'draft', 
    'pending_sync', 
    'submitted', 
    'under_review', 
    'revision_requested', 
    'approved'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Feedback Type Enum
DO $$ BEGIN
  CREATE TYPE feedback_type AS ENUM (
    'commendation', 
    'improvement_suggestion', 
    'revision_request', 
    'operational_guidance', 
    'follow_up_required'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Media Status Enum
DO $$ BEGIN
  CREATE TYPE media_status AS ENUM (
    'quarantined', 
    'scanning', 
    'clean', 
    'derivative_ready', 
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 1. Regions Table
CREATE TABLE IF NOT EXISTS public.regions (
  id TEXT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  country VARCHAR(255) NOT NULL,
  center GEOGRAPHY(Point, 4326),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  active_staff_count INTEGER DEFAULT 0,
  expected_weekly_reports INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Profiles Table (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'field_staff',
  assigned_regions TEXT[] NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  device_info TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Reporting Expectations Table
CREATE TABLE IF NOT EXISTS public.reporting_expectations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id TEXT NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  weekly_target INTEGER NOT NULL DEFAULT 30,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(region_id, effective_date)
);

-- 4. Activities Table
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  staff_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  staff_name VARCHAR(255) NOT NULL,
  region_id TEXT NOT NULL REFERENCES public.regions(id) ON DELETE RESTRICT,
  region_name VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  narrative TEXT NOT NULL,
  category VARCHAR(64) NOT NULL,
  client_captured_at TIMESTAMPTZ NOT NULL,
  server_received_at TIMESTAMPTZ DEFAULT now(),
  status activity_status NOT NULL DEFAULT 'submitted',
  version INTEGER NOT NULL DEFAULT 1,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Activity Locations Table (PostGIS Spatial Integration)
CREATE TABLE IF NOT EXISTS public.activity_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE UNIQUE,
  coordinates GEOGRAPHY(Point, 4326) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'gps',
  is_verified BOOLEAN NOT NULL DEFAULT true,
  formatted_address TEXT,
  area VARCHAR(255),
  neighborhood VARCHAR(255),
  city VARCHAR(255),
  district VARCHAR(255),
  state VARCHAR(255),
  postal_code VARCHAR(64),
  country VARCHAR(255),
  geocode_provider VARCHAR(64) DEFAULT 'backend_osm',
  geocode_status VARCHAR(32) DEFAULT 'pending' CHECK (geocode_status IN ('resolved', 'pending', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Media Metadata Table (Cloudflare R2 private bucket references)
CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  mime_type VARCHAR(128) NOT NULL,
  size_bytes BIGINT NOT NULL,
  sha256_hash VARCHAR(64) NOT NULL,
  storage_key VARCHAR(512) NOT NULL,
  status media_status NOT NULL DEFAULT 'quarantined',
  processing_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Feedback Messages Table
CREATE TABLE IF NOT EXISTS public.feedback_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  author_name VARCHAR(255) NOT NULL,
  author_role user_role NOT NULL,
  type feedback_type NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  revision_completed_at TIMESTAMPTZ,
  status VARCHAR(32) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Audit Records Table
CREATE TABLE IF NOT EXISTS public.audit_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT now(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name VARCHAR(255) NOT NULL,
  actor_role VARCHAR(64) NOT NULL,
  action VARCHAR(128) NOT NULL,
  resource_type VARCHAR(64) NOT NULL,
  resource_id VARCHAR(128) NOT NULL,
  region_id TEXT REFERENCES public.regions(id) ON DELETE SET NULL,
  ip_address VARCHAR(64) NOT NULL DEFAULT '0.0.0.0',
  user_agent TEXT NOT NULL DEFAULT 'Unknown',
  status VARCHAR(32) NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'denied', 'error')),
  details TEXT
);
