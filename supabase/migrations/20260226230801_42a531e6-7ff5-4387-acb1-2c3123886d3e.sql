
-- Global field configuration table
CREATE TABLE public.global_field_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  field_type TEXT NOT NULL,           -- e.g. 'first_name', 'email', 'text', 'heading'
  api_name TEXT NOT NULL DEFAULT '',  -- The name sent to the API (e.g. 'firstName')
  display_name TEXT NOT NULL,         -- Friendly label shown in the palette (e.g. 'First Name')
  is_api_field BOOLEAN NOT NULL DEFAULT true,  -- true = posted to API, false = form-only
  category TEXT NOT NULL DEFAULT 'custom',     -- personal, contact, address, identity, financial, custom, content
  placeholder TEXT DEFAULT '',
  required_by_default BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.global_field_configs ENABLE ROW LEVEL SECURITY;

-- Anyone can read (needed by form builder in preview)
CREATE POLICY "Anyone can view field configs"
  ON public.global_field_configs FOR SELECT
  USING (true);

-- Only admins can modify
CREATE POLICY "Admins can insert field configs"
  ON public.global_field_configs FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update field configs"
  ON public.global_field_configs FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete field configs"
  ON public.global_field_configs FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed with existing default fields
INSERT INTO public.global_field_configs (field_type, api_name, display_name, is_api_field, category, placeholder, required_by_default, display_order) VALUES
  ('first_name', 'firstName', 'First Name', true, 'personal', 'Enter first name', true, 1),
  ('last_name', 'lastName', 'Last Name', true, 'personal', 'Enter last name', true, 2),
  ('middle_name', 'middleName', 'Middle Name', true, 'personal', 'Enter middle name', false, 3),
  ('date_of_birth', 'dateOfBirth', 'Date of Birth', true, 'personal', 'MM/DD/YYYY', true, 4),
  ('gender', 'gender', 'Gender', true, 'personal', 'Select gender', false, 5),
  ('nationality', 'nationality', 'Nationality', true, 'personal', 'Select nationality', false, 6),
  ('email', 'email', 'Email Address', true, 'contact', 'email@example.com', true, 10),
  ('phone', 'phone', 'Phone Number', true, 'contact', '(555) 123-4567', true, 11),
  ('address_street', 'streetAddress', 'Street Address', true, 'address', '123 Main St', true, 20),
  ('apartment', 'apartment', 'Apartment / Unit', false, 'address', 'Apt, Suite, Unit', false, 21),
  ('address_city', 'city', 'City', true, 'address', 'City', true, 22),
  ('address_state', 'state', 'State', true, 'address', 'State', true, 23),
  ('address_zip', 'zipCode', 'ZIP Code', true, 'address', '12345', true, 24),
  ('ssn', 'ssn4', 'SSN (Last 4)', true, 'identity', '****', false, 30),
  ('text', 'ssn', 'Full SSN', true, 'identity', '***-**-****', false, 31),
  ('document_type', 'documentType', 'Document Type', true, 'identity', 'Select document type', false, 32),
  ('document_number', 'documentNumber', 'Document Number', true, 'identity', 'Document number', false, 33),
  ('employer', 'employer', 'Employer', true, 'financial', 'Company name', false, 40),
  ('income', 'income', 'Annual Income', true, 'financial', '$0.00', false, 41),
  ('text', 'customText', 'Custom Text Field', false, 'custom', 'Enter text', false, 50),
  ('textarea', 'customTextarea', 'Custom Text Area', false, 'custom', 'Enter details', false, 51),
  ('checkbox', 'customCheckbox', 'Custom Checkbox', false, 'custom', '', false, 52),
  ('yes_no', 'yesNoQuestion', 'Yes/No Question', false, 'custom', '', false, 53),
  ('select', 'customSelect', 'Dropdown Select', false, 'custom', 'Select an option', false, 54),
  ('heading', 'sectionHeading', 'Section Heading', false, 'content', '', false, 60),
  ('paragraph', 'textBlock', 'Text Block', false, 'content', '', false, 61),
  ('divider', 'divider', 'Divider Line', false, 'content', '', false, 62),
  ('consent_checkbox', 'consent', 'Consent Checkbox', false, 'content', '', true, 63);
