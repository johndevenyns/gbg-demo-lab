
-- Admin-level resource ID overrides per verification type
CREATE TABLE public.admin_resource_ids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  type_key text NOT NULL,
  resource_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (admin_user_id, type_key)
);

-- Enable RLS
ALTER TABLE public.admin_resource_ids ENABLE ROW LEVEL SECURITY;

-- Admins can view all admin resource IDs
CREATE POLICY "Admins can view all admin resource ids"
  ON public.admin_resource_ids
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage their own resource IDs
CREATE POLICY "Admins can insert own resource ids"
  ON public.admin_resource_ids
  FOR INSERT
  WITH CHECK (auth.uid() = admin_user_id AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update own resource ids"
  ON public.admin_resource_ids
  FOR UPDATE
  USING (auth.uid() = admin_user_id AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete own resource ids"
  ON public.admin_resource_ids
  FOR DELETE
  USING (auth.uid() = admin_user_id AND has_role(auth.uid(), 'admin'::app_role));

-- Anyone can read admin resource IDs for resolution (needed by preview/embed)
CREATE POLICY "Anyone can read admin resource ids for resolution"
  ON public.admin_resource_ids
  FOR SELECT
  USING (true);

-- Timestamp trigger
CREATE TRIGGER update_admin_resource_ids_updated_at
  BEFORE UPDATE ON public.admin_resource_ids
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
