-- Project Rescue Foundation: Database Indexes, Spatial GiST, Functions & Dashboard Views
-- Phase 1, 2, 5, 6: Performance Optimization, PostGIS Spatial Indexing, Idempotent Sync, Analytics

-- ==============================================================================
-- 1. INDEXES & CONSTRAINTS
-- ==============================================================================

-- Spatial GiST index for PostGIS fast geographic querying and bounding box searches
CREATE INDEX IF NOT EXISTS idx_activity_locations_gist 
  ON public.activity_locations USING GIST (coordinates);

CREATE INDEX IF NOT EXISTS idx_regions_center_gist 
  ON public.regions USING GIST (center);

-- Composite and lookup indexes
CREATE INDEX IF NOT EXISTS idx_activities_staff_created 
  ON public.activities (staff_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activities_region_status 
  ON public.activities (region_id, status);

CREATE INDEX IF NOT EXISTS idx_activities_idempotency 
  ON public.activities (idempotency_key);

CREATE INDEX IF NOT EXISTS idx_activities_captured_at 
  ON public.activities (client_captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_activity 
  ON public.media_assets (activity_id, status);

CREATE INDEX IF NOT EXISTS idx_media_sha256 
  ON public.media_assets (sha256_hash);

CREATE INDEX IF NOT EXISTS idx_feedback_activity 
  ON public.feedback_messages (activity_id, status);

CREATE INDEX IF NOT EXISTS idx_feedback_author 
  ON public.feedback_messages (author_id);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp 
  ON public.audit_records (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_resource 
  ON public.audit_records (resource_type, resource_id);

-- ==============================================================================
-- 2. IDEMPOTENT SYNC RPC FUNCTION
-- ==============================================================================
-- Atomic creation or update of an activity from offline client queue
CREATE OR REPLACE FUNCTION public.sync_activity_idempotent(
  p_id UUID,
  p_idempotency_key VARCHAR,
  p_staff_id UUID,
  p_staff_name VARCHAR,
  p_region_id TEXT,
  p_region_name VARCHAR,
  p_title VARCHAR,
  p_narrative TEXT,
  p_category VARCHAR,
  p_client_captured_at TIMESTAMPTZ,
  p_tags TEXT[],
  p_latitude DOUBLE PRECISION DEFAULT NULL,
  p_longitude DOUBLE PRECISION DEFAULT NULL,
  p_accuracy DOUBLE PRECISION DEFAULT NULL,
  p_address_approx TEXT DEFAULT NULL,
  p_area VARCHAR DEFAULT NULL,
  p_city VARCHAR DEFAULT NULL,
  p_district VARCHAR DEFAULT NULL,
  p_state VARCHAR DEFAULT NULL,
  p_country VARCHAR DEFAULT NULL,
  p_geocode_status VARCHAR DEFAULT 'pending'
)
RETURNS JSONB AS $$
DECLARE
  v_existing_id UUID;
  v_result JSONB;
BEGIN
  -- Check for existing activity by idempotency key
  SELECT id INTO v_existing_id FROM public.activities WHERE idempotency_key = p_idempotency_key;

  IF v_existing_id IS NOT NULL THEN
    -- Return existing activity info without duplicating
    SELECT json_build_object(
      'id', id,
      'is_duplicate', true,
      'status', status,
      'updated_at', updated_at
    )::JSONB INTO v_result
    FROM public.activities WHERE id = v_existing_id;
    RETURN v_result;
  END IF;

  -- Insert new activity
  INSERT INTO public.activities (
    id,
    idempotency_key,
    staff_id,
    staff_name,
    region_id,
    region_name,
    title,
    narrative,
    category,
    client_captured_at,
    server_received_at,
    status,
    version,
    tags
  ) VALUES (
    p_id,
    p_idempotency_key,
    p_staff_id,
    p_staff_name,
    p_region_id,
    p_region_name,
    p_title,
    p_narrative,
    p_category,
    p_client_captured_at,
    now(),
    'submitted',
    1,
    p_tags
  );

  -- Insert GPS location if provided
  IF p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN
    INSERT INTO public.activity_locations (
      activity_id,
      coordinates,
      latitude,
      longitude,
      accuracy,
      captured_at,
      source,
      is_verified,
      formatted_address,
      area,
      city,
      district,
      state,
      country,
      geocode_status
    ) VALUES (
      p_id,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      p_latitude,
      p_longitude,
      COALESCE(p_accuracy, 10.0),
      p_client_captured_at,
      'gps',
      true,
      p_address_approx,
      p_area,
      p_city,
      p_district,
      p_state,
      p_country,
      p_geocode_status
    )
    ON CONFLICT (activity_id) DO UPDATE SET
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      coordinates = EXCLUDED.coordinates,
      formatted_address = COALESCE(EXCLUDED.formatted_address, public.activity_locations.formatted_address),
      area = COALESCE(EXCLUDED.area, public.activity_locations.area),
      city = COALESCE(EXCLUDED.city, public.activity_locations.city),
      district = COALESCE(EXCLUDED.district, public.activity_locations.district),
      state = COALESCE(EXCLUDED.state, public.activity_locations.state),
      country = COALESCE(EXCLUDED.country, public.activity_locations.country);
  END IF;

  SELECT json_build_object(
    'id', p_id,
    'is_duplicate', false,
    'status', 'submitted',
    'created_at', now()
  )::JSONB INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 3. MANAGER DASHBOARD ANALYTICS RPC FUNCTION
-- ==============================================================================
-- Computes real compliance metrics, weekly submissions, daily trends from actual Supabase tables
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(p_region_id TEXT DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_today_start TIMESTAMPTZ := date_trunc('day', now());
  v_week_start TIMESTAMPTZ := date_trunc('week', now());
  v_submitted_today INT;
  v_submitted_week INT;
  v_expected_weekly INT;
  v_pending_review INT;
  v_revision_requested INT;
  v_unack_feedback INT;
  v_active_deployments INT;
  v_compliance_rate NUMERIC;
  v_regional_breakdown JSONB;
  v_daily_trend JSONB;
BEGIN
  -- Total submitted today
  SELECT COUNT(*) INTO v_submitted_today
  FROM public.activities
  WHERE client_captured_at >= v_today_start
    AND (p_region_id IS NULL OR region_id = p_region_id);

  -- Total submitted this week
  SELECT COUNT(*) INTO v_submitted_week
  FROM public.activities
  WHERE client_captured_at >= v_week_start
    AND (p_region_id IS NULL OR region_id = p_region_id);

  -- Expected weekly reports
  SELECT COALESCE(SUM(expected_weekly_reports), 0) INTO v_expected_weekly
  FROM public.regions
  WHERE (p_region_id IS NULL OR id = p_region_id);

  -- Pending review count
  SELECT COUNT(*) INTO v_pending_review
  FROM public.activities
  WHERE status IN ('submitted', 'under_review')
    AND (p_region_id IS NULL OR region_id = p_region_id);

  -- Revision requested count
  SELECT COUNT(*) INTO v_revision_requested
  FROM public.activities
  WHERE status = 'revision_requested'
    AND (p_region_id IS NULL OR region_id = p_region_id);

  -- Unacknowledged feedback count
  SELECT COUNT(*) INTO v_unack_feedback
  FROM public.feedback_messages f
  JOIN public.activities a ON a.id = f.activity_id
  WHERE f.status = 'open'
    AND (p_region_id IS NULL OR a.region_id = p_region_id);

  -- Active staff deployments
  SELECT COALESCE(SUM(active_staff_count), 0) INTO v_active_deployments
  FROM public.regions
  WHERE (p_region_id IS NULL OR id = p_region_id);

  -- Calculate compliance rate
  IF v_expected_weekly > 0 THEN
    v_compliance_rate := ROUND((v_submitted_week::numeric / v_expected_weekly::numeric) * 100, 1);
  ELSE
    v_compliance_rate := 0;
  END IF;

  -- Regional breakdown array
  SELECT jsonb_agg(
    json_build_object(
      'regionId', r.id,
      'regionName', r.name,
      'submittedCount', COALESCE(act.cnt, 0),
      'expectedCount', r.expected_weekly_reports,
      'compliancePct', CASE 
        WHEN r.expected_weekly_reports > 0 
        THEN ROUND((COALESCE(act.cnt, 0)::numeric / r.expected_weekly_reports::numeric) * 100, 1)
        ELSE 0 
      END
    )
  ) INTO v_regional_breakdown
  FROM public.regions r
  LEFT JOIN (
    SELECT region_id, COUNT(*) AS cnt
    FROM public.activities
    WHERE client_captured_at >= v_week_start
    GROUP BY region_id
  ) act ON act.region_id = r.id
  WHERE (p_region_id IS NULL OR r.id = p_region_id);

  -- 7-Day daily trend
  SELECT jsonb_agg(
    json_build_object(
      'date', to_char(d.day, 'YYYY-MM-DD'),
      'count', COALESCE(daily.cnt, 0)
    )
  ) INTO v_daily_trend
  FROM (
    SELECT generate_series(
      date_trunc('day', now() - INTERVAL '6 days'),
      date_trunc('day', now()),
      INTERVAL '1 day'
    )::date AS day
  ) d
  LEFT JOIN (
    SELECT client_captured_at::date AS day, COUNT(*) AS cnt
    FROM public.activities
    WHERE client_captured_at >= date_trunc('day', now() - INTERVAL '6 days')
      AND (p_region_id IS NULL OR region_id = p_region_id)
    GROUP BY client_captured_at::date
  ) daily ON daily.day = d.day;

  RETURN json_build_object(
    'totalSubmittedToday', v_submitted_today,
    'totalThisWeek', v_submitted_week,
    'expectedWeeklyReports', v_expected_weekly,
    'complianceRate', v_compliance_rate,
    'pendingReviewCount', v_pending_review,
    'revisionRequestedCount', v_revision_requested,
    'activeDeployments', v_active_deployments,
    'unacknowledgedFeedbackCount', v_unack_feedback,
    'regionalBreakdown', COALESCE(v_regional_breakdown, '[]'::jsonb),
    'dailyTrend', COALESCE(v_daily_trend, '[]'::jsonb)
  )::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
