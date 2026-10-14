-- Project Rescue Foundation: Row Level Security (RLS) & Role-Based Access Control
-- Phase 1 & 8: Strict Cross-User & Cross-Region PostgreSQL Access Restrictions

-- Helper functions for RLS evaluation
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_user_regions()
RETURNS TEXT[] AS $$
  SELECT assigned_regions FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'system_admin' AND status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'operations_manager' AND status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reporting_expectations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_records ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Managers can view profiles in their supervised regions"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    public.is_manager() AND
    assigned_regions && public.current_user_regions()
  );

CREATE POLICY "Admins can view and manage all profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 2. Regions Policies
CREATE POLICY "Authenticated users can view assigned regions"
  ON public.regions FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR
    id = ANY(public.current_user_regions())
  );

CREATE POLICY "Admins can manage regions"
  ON public.regions FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. Reporting Expectations Policies
CREATE POLICY "Users can view reporting expectations for their regions"
  ON public.reporting_expectations FOR SELECT
  TO authenticated
  USING (
    public.is_admin() OR
    region_id = ANY(public.current_user_regions())
  );

CREATE POLICY "Managers and Admins can update reporting expectations"
  ON public.reporting_expectations FOR ALL
  TO authenticated
  USING (public.is_admin() OR (public.is_manager() AND region_id = ANY(public.current_user_regions())))
  WITH CHECK (public.is_admin() OR (public.is_manager() AND region_id = ANY(public.current_user_regions())));

-- 4. Activities Policies
-- Staff can view only their own activities; Managers can view activities in assigned regions; Admins can view all
CREATE POLICY "Staff view own activities"
  ON public.activities FOR SELECT
  TO authenticated
  USING (
    staff_id = auth.uid() OR
    (public.is_manager() AND region_id = ANY(public.current_user_regions())) OR
    public.is_admin()
  );

-- Staff can insert activities if assigned to the region and staff_id matches their uid
CREATE POLICY "Staff insert activities"
  ON public.activities FOR INSERT
  TO authenticated
  WITH CHECK (
    (staff_id = auth.uid() AND region_id = ANY(public.current_user_regions())) OR
    public.is_admin()
  );

-- Staff can update their own drafts or revision-requested activities
CREATE POLICY "Staff update own pending activities"
  ON public.activities FOR UPDATE
  TO authenticated
  USING (
    (staff_id = auth.uid() AND status IN ('draft', 'pending_sync', 'revision_requested')) OR
    (public.is_manager() AND region_id = ANY(public.current_user_regions())) OR
    public.is_admin()
  )
  WITH CHECK (
    (staff_id = auth.uid() AND status IN ('draft', 'pending_sync', 'submitted')) OR
    (public.is_manager() AND region_id = ANY(public.current_user_regions())) OR
    public.is_admin()
  );

-- 5. Activity Locations Policies
CREATE POLICY "Access location if user can access activity"
  ON public.activity_locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.activities a 
      WHERE a.id = activity_locations.activity_id
    )
  );

CREATE POLICY "Insert location for permitted activity"
  ON public.activity_locations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.activities a 
      WHERE a.id = activity_locations.activity_id AND (a.staff_id = auth.uid() OR public.is_admin())
    )
  );

CREATE POLICY "Update location for permitted activity"
  ON public.activity_locations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.activities a 
      WHERE a.id = activity_locations.activity_id AND (a.staff_id = auth.uid() OR public.is_admin())
    )
  );

-- 6. Media Assets Policies
CREATE POLICY "Access media if activity accessible"
  ON public.media_assets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.activities a 
      WHERE a.id = media_assets.activity_id
    )
  );

CREATE POLICY "Insert media for permitted activity"
  ON public.media_assets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.activities a 
      WHERE a.id = media_assets.activity_id AND (a.staff_id = auth.uid() OR public.is_admin())
    )
  );

-- 7. Feedback Messages Policies
CREATE POLICY "Read feedback on accessible activities"
  ON public.feedback_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.activities a 
      WHERE a.id = feedback_messages.activity_id AND (
        a.staff_id = auth.uid() OR
        (public.is_manager() AND a.region_id = ANY(public.current_user_regions())) OR
        public.is_admin()
      )
    )
  );

CREATE POLICY "Managers and Admins can create feedback"
  ON public.feedback_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_manager() OR public.is_admin()
  );

CREATE POLICY "Staff can acknowledge feedback on their activities"
  ON public.feedback_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.activities a 
      WHERE a.id = feedback_messages.activity_id AND a.staff_id = auth.uid()
    ) OR public.is_manager() OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.activities a 
      WHERE a.id = feedback_messages.activity_id AND a.staff_id = auth.uid()
    ) OR public.is_manager() OR public.is_admin()
  );

-- 8. Audit Records Policies
CREATE POLICY "Admins can view audit logs"
  ON public.audit_records FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Authenticated users can append audit logs"
  ON public.audit_records FOR INSERT
  TO authenticated
  WITH CHECK (true);
