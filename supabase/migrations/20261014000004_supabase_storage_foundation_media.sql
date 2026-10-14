-- Project Rescue Foundation: Supabase Storage Integration
-- Phase 4 Migration: Private Storage Bucket 'foundation-media' & Strict Object RLS Policies

-- ==============================================================================
-- 1. CREATE PRIVATE STORAGE BUCKET 'foundation-media'
-- ==============================================================================
-- Enforces:
--  - Private access only (public = false)
--  - Supabase Free Tier 50 MB maximum per-file limit (52,428,800 bytes)
--  - Allowed MIME types: JPEG, PNG, WebP, PDF, MP4
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'foundation-media',
  'foundation-media',
  false, -- STRICTLY PRIVATE! No direct unauthenticated access permitted
  52428800, -- 50 MB per-file limit (50 * 1024 * 1024 bytes)
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'video/mp4'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'video/mp4'
  ]::text[];

-- Ensure RLS is active on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 2. HELPER FUNCTIONS FOR STORAGE PATH EXTRACTION
-- ==============================================================================
-- Storage path structure:
--   activities/{activity_id}/{media_id}_{filename}
-- or
--   {activity_id}/{media_id}_{filename}
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_activity_id_from_storage_path(object_name text)
RETURNS uuid AS $$
DECLARE
  parts text[];
  raw_id text;
BEGIN
  parts := string_to_array(object_name, '/');
  IF array_length(parts, 1) >= 2 AND parts[1] = 'activities' THEN
    raw_id := parts[2];
  ELSIF array_length(parts, 1) >= 1 THEN
    raw_id := parts[1];
  ELSE
    RETURN NULL;
  END IF;

  -- Verify UUID format safely
  IF raw_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN raw_id::uuid;
  END IF;

  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ==============================================================================
-- 3. STORAGE OBJECT ROW LEVEL SECURITY POLICIES
-- ==============================================================================

-- Drop any previous conflicting policies for foundation-media
DROP POLICY IF EXISTS "Private media read policy by activity access" ON storage.objects;
DROP POLICY IF EXISTS "Private media upload policy for staff and admins" ON storage.objects;
DROP POLICY IF EXISTS "Private media update restriction policy" ON storage.objects;
DROP POLICY IF EXISTS "Private media delete policy" ON storage.objects;

-- 3.1. SELECT (Download / Create Signed URL)
-- Caseworkers can access their own activity attachments.
-- Operations managers can access attachments within their assigned regions.
-- System administrators have organization-wide clearance.
CREATE POLICY "Private media read policy by activity access"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'foundation-media' AND (
      public.is_admin() OR
      EXISTS (
        SELECT 1 FROM public.activities a
        WHERE a.id = public.get_activity_id_from_storage_path(name)
          AND (
            a.staff_id = auth.uid() OR
            (public.is_manager() AND a.region_id = ANY(public.current_user_regions()))
          )
      )
    )
  );

-- 3.2. INSERT (Secure Upload)
-- Authenticated field caseworkers can upload evidence to their active activities.
-- System administrators can upload any necessary verification files.
CREATE POLICY "Private media upload policy for staff and admins"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'foundation-media' AND (
      public.is_admin() OR
      (
        -- Must be authenticated and file size within 50MB
        (auth.role() = 'authenticated') AND
        (
          -- Either activity already exists and user has write access
          EXISTS (
            SELECT 1 FROM public.activities a
            WHERE a.id = public.get_activity_id_from_storage_path(name)
              AND (a.staff_id = auth.uid() OR public.is_manager())
          )
          -- Or it's a new draft being uploaded prior to metadata sync
          OR (public.get_activity_id_from_storage_path(name) IS NOT NULL)
        )
      )
    )
  );

-- 3.3. UPDATE (Tamper Prevention)
-- Overwrite protection: Evidence files are immutable once submitted.
-- Only the original staff member on a draft/revision or an admin can update.
CREATE POLICY "Private media update restriction policy"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'foundation-media' AND (
      public.is_admin() OR
      EXISTS (
        SELECT 1 FROM public.activities a
        WHERE a.id = public.get_activity_id_from_storage_path(name)
          AND a.staff_id = auth.uid()
          AND a.status IN ('draft', 'revision_requested')
      )
    )
  );

-- 3.4. DELETE (Deletion Restrictions)
-- Only original staff member on a draft/revision or an admin can remove files.
CREATE POLICY "Private media delete policy"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'foundation-media' AND (
      public.is_admin() OR
      EXISTS (
        SELECT 1 FROM public.activities a
        WHERE a.id = public.get_activity_id_from_storage_path(name)
          AND a.staff_id = auth.uid()
          AND a.status IN ('draft', 'revision_requested')
      )
    )
  );

-- ==============================================================================
-- 4. MEDIA ASSETS METADATA ATTACHMENT INTEGRATION
-- ==============================================================================

-- Additional policies for public.media_assets table
DROP POLICY IF EXISTS "Staff and Admin can update media metadata" ON public.media_assets;
CREATE POLICY "Staff and Admin can update media metadata"
  ON public.media_assets FOR UPDATE
  TO authenticated
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.activities a
      WHERE a.id = media_assets.activity_id
        AND a.staff_id = auth.uid()
        AND a.status IN ('draft', 'revision_requested')
    )
  );

DROP POLICY IF EXISTS "Staff and Admin can delete media metadata" ON public.media_assets;
CREATE POLICY "Staff and Admin can delete media metadata"
  ON public.media_assets FOR DELETE
  TO authenticated
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.activities a
      WHERE a.id = media_assets.activity_id
        AND a.staff_id = auth.uid()
        AND a.status IN ('draft', 'revision_requested')
    )
  );
