-- Add columns for uploaded logo support
ALTER TABLE public.demo_environments 
ADD COLUMN IF NOT EXISTS uploaded_logo_url text,
ADD COLUMN IF NOT EXISTS use_uploaded_logo boolean DEFAULT false;

-- Create storage bucket for demo logos
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('demo-logos', 'demo-logos', true, 5242880)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to demo logos
CREATE POLICY "Public can view demo logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'demo-logos');

-- Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'demo-logos');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'demo-logos');

-- Allow authenticated users to delete logos
CREATE POLICY "Authenticated users can delete logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'demo-logos');