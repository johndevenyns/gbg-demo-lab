-- Add created_by column to track which admin created the demo
ALTER TABLE public.demo_environments
ADD COLUMN created_by uuid REFERENCES auth.users(id);

-- Add created_by_email for display purposes (denormalized for easy lookup)
ALTER TABLE public.demo_environments
ADD COLUMN created_by_email text;