// Verification Types and mDL Provider Types
// These types map to the verification_type_configs and mdl_providers database tables

export interface VerificationTypeConfig {
  id: string;
  typeKey: string; // 'docbio', 'databio', 'dataonly', 'mdl'
  displayName: string;
  description: string | null;
  iconName: string | null; // Lucide icon name
  isEnabled: boolean;
  defaultResourceId: string | null;
  requiresBiometric: boolean;
  requiresDocument: boolean;
  supportsQrCode: boolean;
  configSchema: Record<string, unknown>; // JSON schema for type-specific settings
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MdlProvider {
  id: string;
  providerKey: string; // 'mitid', 'bankid_se', etc.
  displayName: string;
  description: string | null;
  logoUrl: string | null;
  domain: string | null;
  countryCode: string | null;
  scope: string[];
  isEnabled: boolean;
  displayOrder: number;
  configOptions: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Form for creating/updating verification types
export interface VerificationTypeFormData {
  typeKey: string;
  displayName: string;
  description?: string;
  iconName?: string;
  isEnabled: boolean;
  defaultResourceId?: string;
  requiresBiometric: boolean;
  requiresDocument: boolean;
  supportsQrCode: boolean;
  displayOrder: number;
}

// Form for creating/updating mDL providers
export interface MdlProviderFormData {
  providerKey: string;
  displayName: string;
  description?: string;
  logoUrl?: string;
  domain?: string;
  countryCode?: string;
  scope: string[];
  isEnabled: boolean;
  displayOrder: number;
}

// Verification method selection mode for the unified verification step
export type VerificationMethodSelection = 'admin_preselect' | 'user_choice' | 'auto_detect';

// Icon options for user selection screen (reuses DecisionChoiceIcon from demo.ts)
export type SelectionIconType = 'document' | 'smartphone' | 'database' | 'shield' | 'user' | 'fingerprint' | 'camera' | 'id-card';

// Choice configuration for user selection screen
export interface UserSelectionChoice {
  typeKey: string; // Links to verification type (docbio, databio, etc.)
  label: string;
  description: string;
  icon: SelectionIconType;
  collapsedByDefault: boolean;
}

// User selection screen configuration
export interface UserSelectionScreen {
  title: string;
  subtitle: string;
  showDescriptions: boolean;
  choices: UserSelectionChoice[];
}

// Unified Verification Step configuration (new design)
export interface UnifiedVerificationConfig {
  // Method selection mode
  methodSelection: VerificationMethodSelection;
  
  // Enabled verification types (keys from verification_type_configs)
  enabledTypes: string[]; // e.g., ['docbio', 'databio', 'mdl']
  
  // Per-type configuration overrides
  typeConfigs: Record<string, VerificationTypeOverride>;
  
  // User selection screen settings (when methodSelection = 'user_choice')
  userSelectionScreen?: UserSelectionScreen;
  
  // Post-verification handling
  successDestination: 'default' | 'custom' | 'per_type';
  failureDestination: 'default' | 'custom' | 'per_type';
  customSuccessUrl?: string;
  customFailureUrl?: string;
  
  // Navigation buttons
  showBackButton?: boolean;
  backButtonLabel?: string;
  showNextButton?: boolean;
  nextButtonLabel?: string;
}

// Per-type configuration override (specific to a demo)
export interface VerificationTypeOverride {
  // Override the global resource ID
  resourceId?: string;
  
  // QR code settings (for types that support it)
  qrCodeEnabled?: boolean;
  qrCodeTitle?: string;
  qrCodeInstructions?: string;
  
  // mDL-specific: which providers are enabled for this demo
  enabledProviderKeys?: string[];
  
  // Status polling
  statusPollingInterval?: number; // seconds
  
  // Custom display settings
  customTitle?: string;
  customDescription?: string;
  
  // Per-type result page overrides
  useCustomResultPages?: boolean;
  customSuccessUrl?: string;
  customFailureUrl?: string;
}

// Database row types (snake_case for direct DB mapping)
export interface VerificationTypeConfigRow {
  id: string;
  type_key: string;
  display_name: string;
  description: string | null;
  icon_name: string | null;
  is_enabled: boolean;
  default_resource_id: string | null;
  requires_biometric: boolean;
  requires_document: boolean;
  supports_qr_code: boolean;
  config_schema: Record<string, unknown>;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface MdlProviderRow {
  id: string;
  provider_key: string;
  display_name: string;
  description: string | null;
  logo_url: string | null;
  domain: string | null;
  country_code: string | null;
  scope: string[];
  is_enabled: boolean;
  display_order: number;
  config_options: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Transform functions
export function transformVerificationTypeRow(row: VerificationTypeConfigRow): VerificationTypeConfig {
  return {
    id: row.id,
    typeKey: row.type_key,
    displayName: row.display_name,
    description: row.description,
    iconName: row.icon_name,
    isEnabled: row.is_enabled,
    defaultResourceId: row.default_resource_id,
    requiresBiometric: row.requires_biometric,
    requiresDocument: row.requires_document,
    supportsQrCode: row.supports_qr_code,
    configSchema: row.config_schema,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function transformMdlProviderRow(row: MdlProviderRow): MdlProvider {
  return {
    id: row.id,
    providerKey: row.provider_key,
    displayName: row.display_name,
    description: row.description,
    logoUrl: row.logo_url,
    domain: row.domain,
    countryCode: row.country_code,
    scope: row.scope || [],
    isEnabled: row.is_enabled,
    displayOrder: row.display_order,
    configOptions: row.config_options,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
