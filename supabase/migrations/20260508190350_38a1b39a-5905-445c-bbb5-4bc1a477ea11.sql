
ALTER TABLE public.demo_environments DROP COLUMN IF EXISTS verification_api_key;

CREATE TABLE public.demo_verification_api_keys (
  demo_id uuid PRIMARY KEY,
  api_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_verification_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view demo api keys"
  ON public.demo_verification_api_keys FOR SELECT
  TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert demo api keys"
  ON public.demo_verification_api_keys FOR INSERT
  TO authenticated WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update demo api keys"
  ON public.demo_verification_api_keys FOR UPDATE
  TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete demo api keys"
  ON public.demo_verification_api_keys FOR DELETE
  TO authenticated USING (is_admin(auth.uid()));

CREATE TRIGGER update_demo_verification_api_keys_updated_at
  BEFORE UPDATE ON public.demo_verification_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
