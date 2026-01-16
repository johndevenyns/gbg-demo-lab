-- Create enum for industry templates
CREATE TYPE public.industry_template AS ENUM ('bank', 'rental_car', 'online_gambling', 'healthcare', 'insurance', 'retail', 'custom');

-- Create enum for verification types
CREATE TYPE public.verification_type AS ENUM ('docBio', 'dataBio', 'dataOnly');

-- Create demo_environments table
CREATE TABLE public.demo_environments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    industry_template industry_template NOT NULL DEFAULT 'custom',
    verification_type verification_type NOT NULL DEFAULT 'docBio',
    return_url TEXT DEFAULT '',
    approved_url TEXT DEFAULT '',
    rejected_url TEXT DEFAULT '',
    resource_id TEXT DEFAULT '',
    resource_id_dataonly TEXT DEFAULT '',
    resource_id_databio TEXT DEFAULT '',
    resource_id_docbio TEXT DEFAULT '',
    reference_id_prefix TEXT DEFAULT '',
    logo_url TEXT DEFAULT '',
    header_bg_color TEXT DEFAULT '#1a1a2e',
    header_text_color TEXT DEFAULT '#ffffff',
    button_color TEXT DEFAULT '#6366f1',
    include_qr BOOLEAN DEFAULT true,
    include_address_verification BOOLEAN DEFAULT false,
    form_steps JSONB DEFAULT '[]'::jsonb,
    scraped_header_html TEXT DEFAULT '',
    scraped_footer_html TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.demo_environments ENABLE ROW LEVEL SECURITY;

-- For now, allow public read access to active demos (for preview)
CREATE POLICY "Anyone can view active demos"
ON public.demo_environments
FOR SELECT
USING (is_active = true);

-- Allow all operations for now (will add auth later)
CREATE POLICY "Allow all operations for demos"
ON public.demo_environments
FOR ALL
USING (true)
WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_demo_environments_updated_at
BEFORE UPDATE ON public.demo_environments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();