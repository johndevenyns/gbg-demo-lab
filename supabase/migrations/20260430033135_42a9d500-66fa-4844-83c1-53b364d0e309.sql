INSERT INTO public.verification_type_configs (
  type_key, display_name, description, icon_name,
  is_enabled, default_resource_id,
  requires_biometric, requires_document, supports_qr_code,
  display_order, config_schema
) VALUES (
  'hosted_journey',
  'Hosted Journey',
  'Embed a hosted verification journey URL inside the demo flow',
  'Globe',
  true,
  '',
  false,
  false,
  false,
  5,
  '{}'::jsonb
);