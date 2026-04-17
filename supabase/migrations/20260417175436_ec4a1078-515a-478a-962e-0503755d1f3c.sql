UPDATE public.verification_type_configs
SET display_name = 'Digital ID',
    description = 'Digital identity verification via mobile wallet'
WHERE type_key = 'mdl';