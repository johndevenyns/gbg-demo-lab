CREATE TABLE public.global_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read global settings (needed for registration code validation)
CREATE POLICY "Anyone can view global settings"
  ON public.global_settings FOR SELECT
  TO public
  USING (true);

-- Only global admins can manage settings
CREATE POLICY "Global admins can insert global settings"
  ON public.global_settings FOR INSERT
  TO authenticated
  WITH CHECK (is_global_admin(auth.uid()));

CREATE POLICY "Global admins can update global settings"
  ON public.global_settings FOR UPDATE
  TO authenticated
  USING (is_global_admin(auth.uid()));

CREATE POLICY "Global admins can delete global settings"
  ON public.global_settings FOR DELETE
  TO authenticated
  USING (is_global_admin(auth.uid()));

-- Insert the master registration code
INSERT INTO public.global_settings (key, value, description)
VALUES ('master_registration_code', '445566', 'Global master registration code that works in any demo');