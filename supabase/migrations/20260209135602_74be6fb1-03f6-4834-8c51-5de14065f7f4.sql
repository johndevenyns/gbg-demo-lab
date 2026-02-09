
-- Create test user profiles table for reusable pass/fail test data
CREATE TABLE public.test_user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_name TEXT NOT NULL,
  profile_type TEXT NOT NULL CHECK (profile_type IN ('pass', 'fail')),
  -- Store all field values as JSONB for flexibility (keys match form field names)
  field_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.test_user_profiles ENABLE ROW LEVEL SECURITY;

-- Permissive policies (matching demo_environments pattern for admin workflow)
CREATE POLICY "Anyone can view test profiles"
  ON public.test_user_profiles FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert test profiles"
  ON public.test_user_profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update test profiles"
  ON public.test_user_profiles FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete test profiles"
  ON public.test_user_profiles FOR DELETE
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_test_user_profiles_updated_at
  BEFORE UPDATE ON public.test_user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
