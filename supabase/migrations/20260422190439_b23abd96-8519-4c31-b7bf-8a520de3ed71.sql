INSERT INTO public.portal_types (type_key, display_name, description, icon_name, display_order, is_enabled)
VALUES ('hotel', 'Hotel Management', 'Hotel booking portal with room reservations & checkout', 'Hotel', 60, true)
ON CONFLICT (type_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  icon_name = EXCLUDED.icon_name;