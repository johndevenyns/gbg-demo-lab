-- Add customer_site_url column to demo_environments
ALTER TABLE public.demo_environments 
ADD COLUMN IF NOT EXISTS customer_site_url TEXT;