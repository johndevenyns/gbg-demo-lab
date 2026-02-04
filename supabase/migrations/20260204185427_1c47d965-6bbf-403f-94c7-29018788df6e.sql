-- Create a function to bootstrap the first admin user
-- This function can only be used when there are no existing admins
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow if no admins exist
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RAISE EXCEPTION 'Admin users already exist. Use the admin interface to add more admins.';
  END IF;
  
  -- Insert the first admin
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin');
  
  RETURN true;
END;
$$;

-- Allow the function to be called by authenticated users (but it will fail if admins exist)
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin(uuid) TO authenticated;