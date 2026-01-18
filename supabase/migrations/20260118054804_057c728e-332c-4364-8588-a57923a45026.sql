-- Add scraped_css column to store CSS extracted from customer websites
ALTER TABLE public.demo_environments
ADD COLUMN scraped_css text;