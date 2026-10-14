-- Project Rescue Foundation: Baseline Seed Data
-- Regions, Expectations, Seed Activities, GPS Locations

-- Insert Operational Regions
INSERT INTO public.regions (id, code, name, country, center, latitude, longitude, active_staff_count, expected_weekly_reports)
VALUES
  (
    'reg-east-africa',
    'AF-EA-01',
    'Eastern Rift & Northern Corridor',
    'Kenya / Uganda Cross-Border',
    ST_SetSRID(ST_MakePoint(36.8219, -1.2921), 4326)::geography,
    -1.2921,
    36.8219,
    8,
    40
  ),
  (
    'reg-se-asia',
    'AP-SE-02',
    'Mekong River Transit Basin',
    'Thailand / Cambodia Transit',
    ST_SetSRID(ST_MakePoint(100.5018, 13.7563), 4326)::geography,
    13.7563,
    100.5018,
    6,
    30
  ),
  (
    'reg-latam',
    'LA-NW-03',
    'Andean Humanitarian Corridor',
    'Colombia / Ecuador Transit',
    ST_SetSRID(ST_MakePoint(-74.0721, 4.7110), 4326)::geography,
    4.7110,
    -74.0721,
    5,
    25
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  country = EXCLUDED.country,
  center = EXCLUDED.center,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  active_staff_count = EXCLUDED.active_staff_count,
  expected_weekly_reports = EXCLUDED.expected_weekly_reports;

-- Insert Reporting Expectations
INSERT INTO public.reporting_expectations (region_id, weekly_target, effective_date)
VALUES
  ('reg-east-africa', 40, CURRENT_DATE),
  ('reg-se-asia', 30, CURRENT_DATE),
  ('reg-latam', 25, CURRENT_DATE)
ON CONFLICT (region_id, effective_date) DO NOTHING;
