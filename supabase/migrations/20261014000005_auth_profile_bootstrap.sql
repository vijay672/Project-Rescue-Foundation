-- Let new authenticated users create only their own least-privileged profile.
-- Elevated roles remain administrator-assigned and cannot come from OAuth metadata.
CREATE POLICY "Users can create their own field staff profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid() AND
    email = (SELECT email FROM auth.users WHERE id = auth.uid()) AND
    role = 'field_staff' AND
    status = 'active'
  );
