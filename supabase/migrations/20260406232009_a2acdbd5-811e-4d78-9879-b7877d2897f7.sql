
-- Admin audit logs
CREATE TABLE public.admin_audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  user_email text,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  entity_label text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_audit_logs_user_id ON public.admin_audit_logs(user_id);
CREATE INDEX idx_admin_audit_logs_action ON public.admin_audit_logs(action);
CREATE INDEX idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_logs FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert audit logs"
  ON public.admin_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

-- Portal activity logs
CREATE TABLE public.portal_activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_user_id uuid,
  portal_user_email text,
  demo_id uuid,
  demo_name text,
  action text NOT NULL,
  use_case_id uuid,
  use_case_title text,
  verification_type text,
  verification_result text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_portal_activity_logs_user ON public.portal_activity_logs(portal_user_id);
CREATE INDEX idx_portal_activity_logs_demo ON public.portal_activity_logs(demo_id);
CREATE INDEX idx_portal_activity_logs_action ON public.portal_activity_logs(action);
CREATE INDEX idx_portal_activity_logs_created_at ON public.portal_activity_logs(created_at DESC);

ALTER TABLE public.portal_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view portal activity logs"
  ON public.portal_activity_logs FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert portal activity logs"
  ON public.portal_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Anon can insert portal activity logs"
  ON public.portal_activity_logs FOR INSERT
  TO anon
  WITH CHECK (true);
