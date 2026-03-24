
-- Portal Users: global end-users with shared credentials
CREATE TABLE public.portal_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  display_name TEXT,
  profile_data JSONB DEFAULT '{}'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.portal_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view portal users" ON public.portal_users FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert portal users" ON public.portal_users FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can update portal users" ON public.portal_users FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can delete portal users" ON public.portal_users FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Junction table for portal user <-> demo assignments
CREATE TABLE public.portal_user_demo_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_user_id UUID NOT NULL REFERENCES public.portal_users(id) ON DELETE CASCADE,
  demo_id UUID NOT NULL REFERENCES public.demo_environments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (portal_user_id, demo_id)
);

ALTER TABLE public.portal_user_demo_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view assignments" ON public.portal_user_demo_assignments FOR SELECT TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can insert assignments" ON public.portal_user_demo_assignments FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admins can delete assignments" ON public.portal_user_demo_assignments FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Public read for login lookups
CREATE POLICY "Public can view active portal users" ON public.portal_users FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Public can view assignments" ON public.portal_user_demo_assignments FOR SELECT TO anon USING (true);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_portal_users_updated_at
  BEFORE UPDATE ON public.portal_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
