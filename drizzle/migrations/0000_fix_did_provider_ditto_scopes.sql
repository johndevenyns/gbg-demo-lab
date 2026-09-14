-- Align did_providers with the scopes Ditto/GBG Go actually accepts.
UPDATE public.did_providers SET scope = ARRAY['sweden-bankid'] WHERE provider_key = 'bankid_se';
UPDATE public.did_providers SET scope = ARRAY['norway-bankid'] WHERE provider_key = 'bankid_no';
UPDATE public.did_providers SET scope = ARRAY['denmark-mitid'] WHERE provider_key = 'mitid';
UPDATE public.did_providers SET scope = ARRAY['clear'] WHERE provider_key = 'clear';
UPDATE public.did_providers SET scope = ARRAY['la-wallet'] WHERE provider_key = 'la_wallet';
UPDATE public.did_providers SET scope = ARRAY['italy-spid'] WHERE provider_key = 'spid';
-- Not currently supported upstream: no launch URL is ever issued for these scopes.
UPDATE public.did_providers SET is_enabled = false, scope = ARRAY[]::text[] WHERE provider_key IN ('verimi', 'itsme');