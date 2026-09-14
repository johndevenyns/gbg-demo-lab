-- Ensure the fail profile also carries a password value
UPDATE public.test_user_profiles
SET field_data = field_data || jsonb_build_object('password', 'password')
WHERE profile_type = 'fail'
  AND coalesce(field_data->>'password', '') = '';

-- Backfill demo-level stored test data with the password from global profiles
UPDATE public.demo_environments d
SET stored_test_data = jsonb_set(
      jsonb_set(
        coalesce(d.stored_test_data, '{}'::jsonb),
        '{passData}',
        coalesce(d.stored_test_data->'passData', '{}'::jsonb)
          || jsonb_build_object('password', coalesce(
               (SELECT field_data->>'password' FROM public.test_user_profiles WHERE profile_type = 'pass' AND coalesce(field_data->>'password','') <> '' LIMIT 1),
               'password')),
        true
      ),
      '{failData}',
      coalesce(d.stored_test_data->'failData', '{}'::jsonb)
        || jsonb_build_object('password', coalesce(
             (SELECT field_data->>'password' FROM public.test_user_profiles WHERE profile_type = 'fail' AND coalesce(field_data->>'password','') <> '' LIMIT 1),
             'password')),
      true
    )
WHERE coalesce(d.stored_test_data->'passData'->>'password', '') = ''
   OR coalesce(d.stored_test_data->'failData'->>'password', '') = '';