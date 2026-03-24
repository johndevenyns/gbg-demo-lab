
-- Create invitation_templates table
CREATE TABLE public.invitation_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL DEFAULT 'You''re Invited!',
  body_html TEXT NOT NULL DEFAULT '<p>You have been invited to join {{demo_name}}.</p><p>Your registration code is: <strong>{{registration_code}}</strong></p><p><a href="{{demo_link}}">Click here to get started</a></p>',
  category TEXT DEFAULT 'general',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.invitation_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view invitation templates"
  ON public.invitation_templates FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Global admins can insert invitation templates"
  ON public.invitation_templates FOR INSERT
  TO authenticated
  WITH CHECK (is_global_admin(auth.uid()));

CREATE POLICY "Global admins can update invitation templates"
  ON public.invitation_templates FOR UPDATE
  TO authenticated
  USING (is_global_admin(auth.uid()));

CREATE POLICY "Global admins can delete invitation templates"
  ON public.invitation_templates FOR DELETE
  TO authenticated
  USING (is_global_admin(auth.uid()));

-- Add unique constraint on demo_users(demo_id, email) for upsert support
ALTER TABLE public.demo_users ADD CONSTRAINT demo_users_demo_id_email_unique UNIQUE (demo_id, email);

-- Insert a default template
INSERT INTO public.invitation_templates (name, subject, body_html, category, is_default) VALUES (
  'Standard Invitation',
  'You''re Invited to {{demo_name}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<h1 style="color: #1a1a2e;">You''re Invited!</h1>
<p>You have been invited to try <strong>{{demo_name}}</strong>.</p>
<p>Use the following registration code to get started:</p>
<div style="background: #f4f4f5; padding: 16px; border-radius: 8px; text-align: center; margin: 20px 0;">
<span style="font-size: 28px; font-weight: bold; letter-spacing: 6px; font-family: monospace;">{{registration_code}}</span>
</div>
<p><a href="{{demo_link}}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Get Started</a></p>
<p style="color: #71717a; font-size: 12px; margin-top: 30px;">This code expires in 24 hours.</p>
</div>',
  'general',
  true
);
