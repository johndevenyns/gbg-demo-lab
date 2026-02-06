-- Create table for global verification type configurations (managed by site admin)
CREATE TABLE public.verification_type_configs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    type_key TEXT NOT NULL UNIQUE, -- 'docbio', 'databio', 'dataonly', 'mdl'
    display_name TEXT NOT NULL,
    description TEXT,
    icon_name TEXT, -- Lucide icon name
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    default_resource_id TEXT, -- Global default, can be overridden per-demo
    requires_biometric BOOLEAN NOT NULL DEFAULT false,
    requires_document BOOLEAN NOT NULL DEFAULT false,
    supports_qr_code BOOLEAN NOT NULL DEFAULT true,
    config_schema JSONB DEFAULT '{}'::jsonb, -- Schema for type-specific settings
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for mDL providers (managed by site admin)
CREATE TABLE public.mdl_providers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    provider_key TEXT NOT NULL UNIQUE, -- 'mitid', 'bankid_se', etc.
    display_name TEXT NOT NULL,
    description TEXT,
    logo_url TEXT,
    domain TEXT, -- e.g., 'mitid.dk'
    country_code TEXT, -- e.g., 'DK', 'SE', 'NO'
    scope TEXT[], -- Array of scopes/permissions
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    config_options JSONB DEFAULT '{}'::jsonb, -- Provider-specific config
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.verification_type_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mdl_providers ENABLE ROW LEVEL SECURITY;

-- RLS policies for verification_type_configs
CREATE POLICY "Anyone can view enabled verification types"
ON public.verification_type_configs
FOR SELECT
USING (is_enabled = true);

CREATE POLICY "Admins can manage verification types"
ON public.verification_type_configs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for mdl_providers
CREATE POLICY "Anyone can view enabled providers"
ON public.mdl_providers
FOR SELECT
USING (is_enabled = true);

CREATE POLICY "Admins can manage providers"
ON public.mdl_providers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default verification types
INSERT INTO public.verification_type_configs (type_key, display_name, description, icon_name, requires_biometric, requires_document, supports_qr_code, display_order) VALUES
('docbio', 'Document + Biometric', 'Full verification with ID scan and selfie match', 'FileText', true, true, true, 1),
('databio', 'Data + Biometric', 'Existing data verified with selfie capture', 'UserCheck', true, false, true, 2),
('dataonly', 'Data Only', 'Backend verification without user interaction', 'Database', false, false, false, 3),
('mdl', 'Mobile Driver''s License', 'Mobile credential verification via digital wallet', 'Smartphone', false, false, false, 4);

-- Insert default mDL providers (from existing AVAILABLE_MDL_PROVIDERS)
INSERT INTO public.mdl_providers (provider_key, display_name, description, logo_url, domain, country_code, scope, display_order) VALUES
('mitid', 'MitID', 'Danish national digital identity', 'https://www.mitid.dk/media/e5qply4l/mitid_markup_vertical_white.svg', 'mitid.dk', 'DK', ARRAY['identity', 'age_verification'], 1),
('bankid_se', 'BankID Sweden', 'Swedish electronic identification', 'https://www.bankid.com/assets/bankid/logo/BankID_logo.svg', 'bankid.com', 'SE', ARRAY['identity', 'signing'], 2),
('bankid_no', 'BankID Norway', 'Norwegian electronic identification', 'https://www.bankid.no/images/BankID_logo.svg', 'bankid.no', 'NO', ARRAY['identity', 'signing'], 3),
('verimi', 'Verimi', 'German identity platform', 'https://verimi.de/assets/images/verimi-logo.svg', 'verimi.de', 'DE', ARRAY['identity', 'age_verification'], 4),
('itsme', 'itsme', 'Belgian/Dutch digital identity', 'https://www.itsme-id.com/assets/images/itsme-logo.svg', 'itsme-id.com', 'BE', ARRAY['identity', 'signing'], 5),
('clear', 'CLEAR', 'US biometric identity verification', 'https://www.clearme.com/assets/images/clear-logo.svg', 'clearme.com', 'US', ARRAY['identity', 'travel'], 6),
('la_wallet', 'LA Wallet', 'Louisiana digital driver license', 'https://lawallet.com/assets/images/la-wallet-logo.svg', 'lawallet.com', 'US', ARRAY['drivers_license', 'age_verification'], 7);

-- Create trigger for updated_at
CREATE TRIGGER update_verification_type_configs_updated_at
BEFORE UPDATE ON public.verification_type_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mdl_providers_updated_at
BEFORE UPDATE ON public.mdl_providers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();