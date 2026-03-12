
-- Create demo_users table for per-demo user accounts
CREATE TABLE public.demo_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_id uuid NOT NULL REFERENCES public.demo_environments(id) ON DELETE CASCADE,
  email text NOT NULL,
  password text NOT NULL,
  registration_code text,
  registration_code_expires_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (demo_id, email)
);

-- Enable RLS
ALTER TABLE public.demo_users ENABLE ROW LEVEL SECURITY;

-- Admins can manage all demo users
CREATE POLICY "Admins can view all demo users"
  ON public.demo_users FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert demo users"
  ON public.demo_users FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update demo users"
  ON public.demo_users FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete demo users"
  ON public.demo_users FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Public can check credentials for login (scoped by demo_id) - needed for demo login flow
CREATE POLICY "Public can read demo users for login"
  ON public.demo_users FOR SELECT
  TO anon
  USING (is_active = true);
