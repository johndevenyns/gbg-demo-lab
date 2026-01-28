-- Create table for storing custom form templates
CREATE TABLE public.form_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'custom',
  form_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  form_style JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view templates
CREATE POLICY "Anyone can view templates"
ON public.form_templates
FOR SELECT
USING (true);

-- Allow anyone to create templates
CREATE POLICY "Anyone can create templates"
ON public.form_templates
FOR INSERT
WITH CHECK (true);

-- Allow anyone to update templates
CREATE POLICY "Anyone can update templates"
ON public.form_templates
FOR UPDATE
USING (true);

-- Allow anyone to delete templates
CREATE POLICY "Anyone can delete templates"
ON public.form_templates
FOR DELETE
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_form_templates_updated_at
BEFORE UPDATE ON public.form_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();