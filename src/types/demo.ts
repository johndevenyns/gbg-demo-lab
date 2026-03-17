// Demo Environment Configuration Types

export type VerificationType = 'docBio' | 'dataBio' | 'dataOnly';

// Import unified verification config from new types file
import type { UnifiedVerificationConfig } from './verification';

// Stored test data for Fill Pass/Fail buttons
export interface StoredTestData {
  passData: Record<string, string>;
  failData: Record<string, string>;
  showFillPassButton?: boolean;
  showFillFailButton?: boolean;
  buttonPosition?: 'left' | 'center' | 'right';
}

export type IndustryTemplate = 'bank' | 'rental_car' | 'online_gambling' | 'healthcare' | 'insurance' | 'retail' | 'custom';

// Import form style config type
import { FormStyleConfig } from './formStyle';
import { ResultPageConfig } from '@/components/preview/ResultPage';

export interface DemoEnvironment {
  id: string;
  slug: string;
  customerName: string;
  industryTemplate: IndustryTemplate;
  industryId?: string;
  logoUrl?: string;
  uploadedLogoUrl?: string;
  useUploadedLogo?: boolean;
  
  // Verification Settings
  verificationType: VerificationType;
  returnUrl: string;
  approvedUrl?: string;
  rejectedUrl?: string;
  
  // Reference IDs
  referenceIdPrefix?: string;
  referenceId?: string;
  resourceId: string;
  resourceIdDataOnly?: string;
  resourceIdDataBio?: string;
  resourceIdDocBio?: string;
  
  // QR Code Settings
  includeQr: boolean;
  
  // Branding
  headerBgColor: string;
  headerTextColor: string;
  buttonColor: string;
  
  // Header/Footer from customer site (scraped)
  customerSiteUrl?: string;
  scrapedHeaderHtml?: string;
  scrapedFooterHtml?: string;
  scrapedCss?: string;
  
  // Separate storage for HTML vs Screenshot mirror captures
  mirrorActiveMethod?: 'html' | 'screenshot';
  mirrorHtmlHeaderHtml?: string;
  mirrorHtmlFooterHtml?: string;
  mirrorHtmlCss?: string;
  mirrorScreenshotHeaderHtml?: string;
  mirrorScreenshotFooterHtml?: string;
  mirrorScreenshotCss?: string;
  
  // CTA element selector — CSS selector of a header element that links to a use case
  headerCtaSelector?: string;
  headerCtaUseCaseId?: string;
  // Form styling
  formStyle?: FormStyleConfig;
  
  // Result page configurations
  successPageConfig?: ResultPageConfig;
  failurePageConfig?: ResultPageConfig;
  
  // Stored test data for Fill Pass / Fill Fail buttons
  storedTestData?: StoredTestData;
  
  // Feature toggles
  includeAddressVerification: boolean;
  
  // Form configuration
  formSteps: FormStep[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  createdBy?: string;
  createdByEmail?: string;
}

// Step button configuration
export interface StepButton {
  id: 'next' | 'back' | 'submit';
  enabled: boolean;
  label: string;
}

// API submission configuration per step
export interface StepApiConfig {
  enabled: boolean;
  // Fields to include in submission (empty = all fields from this step)
  includeFields?: string[];
  // Response field mappings for display
  responseDisplayFields?: string[];
}

// API response from a step submission
export interface StepApiResponse {
  stepId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

// Verification step configuration
export type VerificationStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'expired';

// mDL Provider definition
export interface MdlProvider {
  id: string;
  name: string;
  domain: string;
  logoUrl: string;
  providerKey: string; // API provider identifier (e.g., 'denmark-mitid', 'sweden-bankid')
  enabled: boolean;
}

// Available mDL providers (from the reference HTML)
export const AVAILABLE_MDL_PROVIDERS: MdlProvider[] = [
  {
    id: 'clear',
    name: 'Clear',
    domain: 'clearme.com',
    logoUrl: 'https://content.trinsic.id/connect/integrations/clear-logo.svg',
    providerKey: 'clear',
    enabled: true,
  },
  {
    id: 'la-wallet',
    name: 'LA Wallet',
    domain: 'lawallet.com',
    logoUrl: 'https://content.trinsic.id/connect/integrations/la-wallet-logo.svg',
    providerKey: 'la-wallet',
    enabled: true,
  },
  {
    id: 'mitid',
    name: 'MitID',
    domain: 'mitid.dk',
    logoUrl: 'https://content.trinsic.id/connect/integrations/mitid-logo.svg',
    providerKey: 'denmark-mitid',
    enabled: true,
  },
  {
    id: 'bankid-sweden',
    name: 'BankID Sweden',
    domain: 'nets.eu',
    logoUrl: 'https://content.trinsic.id/connect/integrations/se-bankid.svg',
    providerKey: 'sweden-bankid',
    enabled: true,
  },
  {
    id: 'bankid-norway',
    name: 'BankID Norway',
    domain: 'bankid.no',
    logoUrl: 'https://content.trinsic.id/connect/integrations/no-bankid.svg',
    providerKey: 'norway-bankid',
    enabled: true,
  },
  {
    id: 'verimi',
    name: 'Verimi',
    domain: 'verimi.de',
    logoUrl: 'https://content.trinsic.id/connect/integrations/verimi-logo.svg',
    providerKey: 'germany-verimi',
    enabled: true,
  },
  {
    id: 'itsme',
    name: 'itsme',
    domain: 'itsme.be',
    logoUrl: 'https://content.trinsic.id/connect/integrations/itsme-logo.svg',
    providerKey: 'belgium-itsme',
    enabled: true,
  },
];

export interface VerificationStepConfig {
  // QR code settings - URL comes from API response field
  qrCodeEnabled: boolean;
  qrCodeUrlField?: string; // API response field containing the QR URL
  qrCodeTitle?: string;
  qrCodeInstructions?: string;
  
  // Status display settings
  statusEnabled: boolean;
  statusField?: string; // API response field containing status
  statusPollingInterval?: number; // seconds
  
  // Mobile ID path URL placeholder
  mobileIdEnabled: boolean;
  mobileIdUrlField?: string; // API response field containing mDL URL
  mobileIdTitle?: string;
  mobileIdInstructions?: string;
  
  // mDL Provider configuration - which providers are available for selection
  mobileIdProviders?: MdlProvider[];
  
  // Completion behavior
  autoAdvanceOnComplete?: boolean;
  completionRedirectUrl?: string;
  
  // Navigation buttons
  showBackButton?: boolean;
  backButtonLabel?: string;
  showNextButton?: boolean;
  nextButtonLabel?: string;
}

// Step type enumeration
// Note: 'verification' step type is deprecated - use 'unified_verification' for new implementations
export type FormStepType = 'form' | 'verification' | 'api' | 'path' | 'verification_flow' | 'page' | 'method_selection' | 'decision' | 'unified_verification';

// Decision step choice destination types
export type DecisionDestinationType = 'verification' | 'step' | 'next';

// Icon options for decision choices
export type DecisionChoiceIcon = 'document' | 'smartphone' | 'database' | 'shield' | 'user' | 'fingerprint' | 'camera' | 'id-card';

// Decision step choice configuration
export interface DecisionChoice {
  id: string;
  label: string;
  description?: string;
  icon?: DecisionChoiceIcon;
  collapsedByDefault?: boolean;
  
  // Destination configuration
  destinationType: DecisionDestinationType;
  
  // For verification destination
  verificationType?: 'docbio' | 'databio' | 'dataonly' | 'mdl';
  
  // For mDL verification - which providers are available
  mobileIdProviders?: MdlProvider[];
  
  // For step destination - target step ID
  targetStepId?: string;
  
  // Inline branch steps - steps that execute within this branch before reaching destination
  branchSteps?: FormStep[];
  
  // Custom result pages for this choice (optional - falls back to demo's global result pages)
  customSuccessPage?: ResultPageConfig;
  customFailurePage?: ResultPageConfig;
  useCustomResultPages?: boolean;
}

// Decision Step configuration
export interface DecisionStepConfig {
  // Display settings
  title?: string;
  subtitle?: string;
  
  // Choices (up to 4)
  choices: DecisionChoice[];
  
  // Display style settings
  defaultExpanded?: boolean; // Whether choice cards start expanded or collapsed
  
  // Navigation
  showBackButton?: boolean;
  backButtonLabel?: string;
}

// API Step configuration (standalone API call step)
export interface ApiStepConfig {
  // Endpoint configuration
  endpointUrl?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  
  // Fields to include in submission (from previous steps)
  includeFields?: string[];
  
  // Response field mappings for display
  responseDisplayFields?: string[];
  
  // Auto-advance after API response
  autoAdvanceOnSuccess?: boolean;
  autoAdvanceDelay?: number; // seconds
}

// Path Step configuration (verification path decision step)
// DEPRECATED: Use VerificationFlowConfig instead
export interface PathStepConfig {
  // The verification path type
  pathType: 'docbio' | 'databio' | 'dataonly' | 'mdl';
  
  // Resource ID for this path
  resourceId?: string;
  
  // Display settings
  title?: string;
  description?: string;
  
  // Auto-advance behavior
  autoAdvance?: boolean;
}

// Verification Flow configuration (combines path selection with verification display)
export interface VerificationFlowConfig {
  // The verification path type
  pathType: 'docbio' | 'databio' | 'dataonly' | 'mdl';
  
  // Resource ID for this path (overrides the demo's default resource ID)
  resourceId?: string;
  
  // Display settings
  title?: string;
  description?: string;
  
  // QR code settings
  qrCodeEnabled: boolean;
  qrCodeTitle?: string;
  qrCodeInstructions?: string;
  
  // Status display settings
  statusEnabled: boolean;
  statusPollingInterval?: number; // seconds
  
  // Mobile ID path settings (for mDL path type)
  mobileIdEnabled: boolean;
  mobileIdTitle?: string;
  mobileIdInstructions?: string;
  mobileIdProviders?: MdlProvider[];
  
  // Completion behavior
  autoAdvanceOnComplete?: boolean;
  completionRedirectUrl?: string;
  
  // Result page settings
  successPageMode?: 'default' | 'custom';
  failurePageMode?: 'default' | 'custom';
  customSuccessPage?: ResultPageConfig;
  customFailurePage?: ResultPageConfig;
  
  // Navigation buttons
  showBackButton?: boolean;
  backButtonLabel?: string;
  showNextButton?: boolean;
  nextButtonLabel?: string;
}

// Page content element types
export type PageElementType = 'heading' | 'text' | 'qr_code' | 'url_link' | 'status_badge' | 'data_field' | 'button';

export interface PageElement {
  id: string;
  type: PageElementType;
  order: number;
  
  // Content - can reference API response fields using {{fieldName}} syntax
  content?: string;
  
  // Styling
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'muted';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  alignment?: 'left' | 'center' | 'right';
  
  // For QR code elements
  qrUrlField?: string; // API response field for QR URL
  qrSize?: number;
  
  // For URL link elements
  urlField?: string; // API response field for URL
  linkText?: string;
  openInNewTab?: boolean;
  
  // For button elements
  buttonAction?: 'next' | 'redirect' | 'copy' | 'portal';
  buttonUrl?: string;
  copyField?: string; // Field to copy to clipboard
  portalUseCaseId?: string; // Use case to navigate to portal for
}

// Page Step configuration (customizable display page)
export interface PageStepConfig {
  // Page layout
  layout?: 'centered' | 'full-width';
  
  // Content elements
  elements: PageElement[];
  
  // Auto-advance settings
  autoAdvance?: boolean;
  autoAdvanceDelay?: number; // seconds
  autoAdvanceOnField?: string; // Advance when this API response field matches a value
  autoAdvanceFieldValue?: string;
}

// Method Selection Step configuration (lets user choose between Doc Verification and mDL)
export interface MethodSelectionStepConfig {
  // Title and description
  title?: string;
  subtitle?: string;
  
  // Document Scan option
  documentScanEnabled: boolean;
  documentScanTitle?: string;
  documentScanDescription?: string;
  documentScanPath?: 'docbio' | 'databio'; // Which verification path for document scan
  
  // Mobile ID Providers option
  mobileIdEnabled: boolean;
  mobileIdProviders?: MdlProvider[];
}

export type FormStepSubmitAction = 'login' | 'register' | 'validate_code' | undefined;

export interface FormStep {
  id: string;
  title: string;
  titleAlignment?: 'left' | 'center' | 'right'; // Horizontal alignment of step title
  description?: string;
  order: number;
  // Step type - determines rendering behavior
  stepType?: FormStepType;
  // Submit action - special behavior on step submission
  submitAction?: FormStepSubmitAction;
  fields: FormField[];
  // Special elements
  addressValidationEnabled?: boolean;
  addressValidationLabel?: string; // Custom label for the loading button during address validation
  submitButton?: boolean;
  verificationPath?: 'docbio' | 'databio' | 'dataonly' | 'mdl';
  // Button configuration
  buttons?: StepButton[];
  // API configuration (for form steps with inline API calls)
  apiConfig?: StepApiConfig;
  // Verification step configuration (DEPRECATED - use verificationFlowConfig instead)
  verificationConfig?: VerificationStepConfig;
  // API step configuration (only used when stepType = 'api')
  apiStepConfig?: ApiStepConfig;
  // Path step configuration (DEPRECATED - use verificationFlowConfig instead)
  pathStepConfig?: PathStepConfig;
  // Verification flow configuration (only used when stepType = 'verification_flow')
  verificationFlowConfig?: VerificationFlowConfig;
  // Page step configuration (only used when stepType = 'page')
  pageStepConfig?: PageStepConfig;
  // Method selection step configuration (only used when stepType = 'method_selection')
  methodSelectionConfig?: MethodSelectionStepConfig;
  // Decision step configuration (only used when stepType = 'decision')
  decisionStepConfig?: DecisionStepConfig;
  // Unified verification step configuration (only used when stepType = 'unified_verification')
  unifiedVerificationConfig?: UnifiedVerificationConfig;
}

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  name: string;
  placeholder?: string;
  required: boolean;
  validation?: FieldValidation;
  order: number;
  // Content field properties
  content?: string; // For heading, paragraph - the text to display
  consentText?: string; // For consent_checkbox - the legal text
  consentRequired?: boolean; // For consent_checkbox - whether it must be checked
  questionText?: string; // For yes_no - the question text shown to the user (label is for admin display)
  checkboxText?: string; // For checkbox - the text shown next to the checkbox (label is for admin display)
}

export type FormFieldType = 
  | 'text'
  | 'email'
  | 'phone'
  | 'date'
  | 'ssn'
  | 'address_street'
  | 'address_city'
  | 'address_state'
  | 'address_zip'
  | 'address_country' // deprecated
  | 'apartment'
  | 'first_name'
  | 'last_name'
  | 'middle_name'
  | 'date_of_birth'
  | 'gender'
  | 'nationality'
  | 'document_type'
  | 'document_number'
  | 'employer'
  | 'income'
  | 'select'
  | 'checkbox'
  | 'textarea'
  | 'yes_no'
  // Account fields
  | 'password'
  | 'registration_code'
  | 'account_login_link'
  // Content elements (non-input)
  | 'heading'
  | 'paragraph'
  | 'divider'
  | 'consent_checkbox';

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  message?: string;
}

// Available fields for the form builder
export const AVAILABLE_FORM_FIELDS: Omit<FormField, 'id' | 'order'>[] = [
  { type: 'first_name', label: 'First Name', name: 'firstName', placeholder: 'Enter first name', required: true },
  { type: 'last_name', label: 'Last Name', name: 'lastName', placeholder: 'Enter last name', required: true },
  { type: 'middle_name', label: 'Middle Name', name: 'middleName', placeholder: 'Enter middle name', required: false },
  { type: 'email', label: 'Email Address', name: 'email', placeholder: 'email@example.com', required: true },
  { type: 'phone', label: 'Phone Number', name: 'phone', placeholder: '(555) 123-4567', required: true },
  { type: 'date_of_birth', label: 'Date of Birth', name: 'dateOfBirth', placeholder: 'MM/DD/YYYY', required: true },
  { type: 'ssn', label: 'SSN (Last 4)', name: 'ssn4', placeholder: '****', required: false },
  { type: 'address_street', label: 'Street Address', name: 'streetAddress', placeholder: '123 Main St', required: true },
  { type: 'apartment', label: 'Apartment / Unit', name: 'apartment', placeholder: 'Apt, Suite, Unit', required: false },
  { type: 'address_city', label: 'City', name: 'city', placeholder: 'City', required: true },
  { type: 'address_state', label: 'State', name: 'state', placeholder: 'State', required: true },
  { type: 'address_zip', label: 'ZIP Code', name: 'zipCode', placeholder: '12345', required: true },
  { type: 'text', label: 'Full SSN', name: 'ssn', placeholder: '***-**-****', required: false },
  { type: 'gender', label: 'Gender', name: 'gender', placeholder: 'Select gender', required: false },
  { type: 'nationality', label: 'Nationality', name: 'nationality', placeholder: 'Select nationality', required: false },
  { type: 'document_type', label: 'Document Type', name: 'documentType', placeholder: 'Select document type', required: false },
  { type: 'document_number', label: 'Document Number', name: 'documentNumber', placeholder: 'Document number', required: false },
  { type: 'employer', label: 'Employer', name: 'employer', placeholder: 'Company name', required: false },
  { type: 'income', label: 'Annual Income', name: 'income', placeholder: '$0.00', required: false },
  { type: 'text', label: 'Custom Text Field', name: 'customText', placeholder: 'Enter text', required: false },
  { type: 'textarea', label: 'Custom Text Area', name: 'customTextarea', placeholder: 'Enter details', required: false },
  { type: 'checkbox', label: 'Custom Checkbox', name: 'customCheckbox', required: false },
  { type: 'yes_no', label: 'Yes/No Question', name: 'yesNoQuestion', required: false },
  // Content elements
  { type: 'heading', label: 'Section Heading', name: 'sectionHeading', required: false, content: 'Section Title' },
  { type: 'paragraph', label: 'Text Block', name: 'textBlock', required: false, content: 'Add your text here...' },
  { type: 'divider', label: 'Divider Line', name: 'divider', required: false },
  { type: 'consent_checkbox', label: 'Consent Checkbox', name: 'consent', required: true, consentText: 'I agree to the Terms of Service and Privacy Policy', consentRequired: true },
];

// Industry template defaults
export const INDUSTRY_TEMPLATES: Record<IndustryTemplate, Partial<DemoEnvironment>> = {
  bank: {
    industryTemplate: 'bank',
    verificationType: 'docBio',
    headerBgColor: '#1a1a2e',
    headerTextColor: '#ffffff',
    buttonColor: '#00d4aa',
    includeAddressVerification: true,
    formSteps: [
      {
        id: 'step-1',
        title: 'Personal Information',
        order: 1,
        fields: [
          { id: 'f1', type: 'first_name', label: 'First Name', name: 'firstName', required: true, order: 1 },
          { id: 'f2', type: 'last_name', label: 'Last Name', name: 'lastName', required: true, order: 2 },
          { id: 'f3', type: 'email', label: 'Email', name: 'email', required: true, order: 3 },
          { id: 'f4', type: 'phone', label: 'Phone', name: 'phone', required: true, order: 4 },
        ]
      },
      {
        id: 'step-2',
        title: 'Identity Verification',
        order: 2,
        fields: [
          { id: 'f5', type: 'date_of_birth', label: 'Date of Birth', name: 'dateOfBirth', required: true, order: 1 },
          { id: 'f6', type: 'ssn', label: 'SSN (Last 4)', name: 'ssn4', required: true, order: 2 },
        ]
      },
      {
        id: 'step-3',
        title: 'Address',
        order: 3,
        fields: [
          { id: 'f7', type: 'address_street', label: 'Street Address', name: 'streetAddress', required: true, order: 1 },
          { id: 'f8', type: 'address_city', label: 'City', name: 'city', required: true, order: 2 },
          { id: 'f9', type: 'address_state', label: 'State', name: 'state', required: true, order: 3 },
          { id: 'f10', type: 'address_zip', label: 'ZIP Code', name: 'zipCode', required: true, order: 4 },
        ]
      }
    ]
  },
  rental_car: {
    industryTemplate: 'rental_car',
    verificationType: 'docBio',
    headerBgColor: '#ff6b00',
    headerTextColor: '#ffffff',
    buttonColor: '#1a1a1a',
    includeAddressVerification: false,
    formSteps: [
      {
        id: 'step-1',
        title: 'Driver Information',
        order: 1,
        fields: [
          { id: 'f1', type: 'first_name', label: 'First Name', name: 'firstName', required: true, order: 1 },
          { id: 'f2', type: 'last_name', label: 'Last Name', name: 'lastName', required: true, order: 2 },
          { id: 'f3', type: 'date_of_birth', label: 'Date of Birth', name: 'dateOfBirth', required: true, order: 3 },
          { id: 'f4', type: 'email', label: 'Email', name: 'email', required: true, order: 4 },
          { id: 'f5', type: 'phone', label: 'Phone', name: 'phone', required: true, order: 5 },
        ]
      },
      {
        id: 'step-2',
        title: 'License Details',
        order: 2,
        fields: [
          { id: 'f6', type: 'document_number', label: 'License Number', name: 'licenseNumber', required: true, order: 1 },
          { id: 'f7', type: 'address_state', label: 'Issuing State', name: 'issuingState', required: true, order: 2 },
        ]
      }
    ]
  },
  online_gambling: {
    industryTemplate: 'online_gambling',
    verificationType: 'dataBio',
    headerBgColor: '#1e0a3c',
    headerTextColor: '#ffd700',
    buttonColor: '#8b5cf6',
    includeAddressVerification: true,
    formSteps: [
      {
        id: 'step-1',
        title: 'Account Setup',
        order: 1,
        fields: [
          { id: 'f1', type: 'first_name', label: 'First Name', name: 'firstName', required: true, order: 1 },
          { id: 'f2', type: 'last_name', label: 'Last Name', name: 'lastName', required: true, order: 2 },
          { id: 'f3', type: 'email', label: 'Email', name: 'email', required: true, order: 3 },
          { id: 'f4', type: 'date_of_birth', label: 'Date of Birth (21+)', name: 'dateOfBirth', required: true, order: 4 },
        ]
      },
      {
        id: 'step-2',
        title: 'Verification',
        order: 2,
        fields: [
          { id: 'f5', type: 'address_street', label: 'Street Address', name: 'streetAddress', required: true, order: 1 },
          { id: 'f6', type: 'address_city', label: 'City', name: 'city', required: true, order: 2 },
          { id: 'f7', type: 'address_state', label: 'State', name: 'state', required: true, order: 3 },
          { id: 'f8', type: 'address_zip', label: 'ZIP Code', name: 'zipCode', required: true, order: 4 },
          { id: 'f9', type: 'ssn', label: 'SSN (Last 4)', name: 'ssn4', required: true, order: 5 },
        ]
      }
    ]
  },
  healthcare: {
    industryTemplate: 'healthcare',
    verificationType: 'dataOnly',
    headerBgColor: '#0f766e',
    headerTextColor: '#ffffff',
    buttonColor: '#14b8a6',
    includeAddressVerification: true,
    formSteps: [
      {
        id: 'step-1',
        title: 'Patient Information',
        order: 1,
        fields: [
          { id: 'f1', type: 'first_name', label: 'First Name', name: 'firstName', required: true, order: 1 },
          { id: 'f2', type: 'last_name', label: 'Last Name', name: 'lastName', required: true, order: 2 },
          { id: 'f3', type: 'date_of_birth', label: 'Date of Birth', name: 'dateOfBirth', required: true, order: 3 },
          { id: 'f4', type: 'email', label: 'Email', name: 'email', required: true, order: 4 },
          { id: 'f5', type: 'phone', label: 'Phone', name: 'phone', required: true, order: 5 },
        ]
      }
    ]
  },
  insurance: {
    industryTemplate: 'insurance',
    verificationType: 'dataOnly',
    headerBgColor: '#003366',
    headerTextColor: '#ffffff',
    buttonColor: '#0077cc',
    includeAddressVerification: true,
    formSteps: [
      {
        id: 'step-1',
        title: 'Applicant Information',
        order: 1,
        fields: [
          { id: 'f1', type: 'first_name', label: 'First Name', name: 'firstName', required: true, order: 1 },
          { id: 'f2', type: 'last_name', label: 'Last Name', name: 'lastName', required: true, order: 2 },
          { id: 'f3', type: 'date_of_birth', label: 'Date of Birth', name: 'dateOfBirth', required: true, order: 3 },
          { id: 'f4', type: 'email', label: 'Email', name: 'email', required: true, order: 4 },
          { id: 'f5', type: 'phone', label: 'Phone', name: 'phone', required: true, order: 5 },
        ]
      }
    ]
  },
  retail: {
    industryTemplate: 'retail',
    verificationType: 'docBio',
    headerBgColor: '#00c4cc',
    headerTextColor: '#1a1a2e',
    buttonColor: '#ff6b6b',
    includeAddressVerification: true,
    formSteps: [
      {
        id: 'step-1',
        title: 'Get Started',
        order: 1,
        fields: [
          { id: 'f1', type: 'first_name', label: 'First Name', name: 'firstName', required: true, order: 1 },
          { id: 'f2', type: 'last_name', label: 'Last Name', name: 'lastName', required: true, order: 2 },
          { id: 'f3', type: 'email', label: 'Email', name: 'email', required: true, order: 3 },
          { id: 'f4', type: 'phone', label: 'Phone', name: 'phone', required: true, order: 4 },
        ]
      },
      {
        id: 'step-2',
        title: 'Identity',
        order: 2,
        fields: [
          { id: 'f5', type: 'date_of_birth', label: 'Date of Birth', name: 'dateOfBirth', required: true, order: 1 },
          { id: 'f6', type: 'ssn', label: 'SSN (Last 4)', name: 'ssn4', required: true, order: 2 },
          { id: 'f7', type: 'address_street', label: 'Street Address', name: 'streetAddress', required: true, order: 3 },
          { id: 'f8', type: 'address_city', label: 'City', name: 'city', required: true, order: 4 },
          { id: 'f9', type: 'address_state', label: 'State', name: 'state', required: true, order: 5 },
          { id: 'f10', type: 'address_zip', label: 'ZIP Code', name: 'zipCode', required: true, order: 6 },
        ]
      }
    ]
  },
  custom: {
    industryTemplate: 'custom',
    verificationType: 'docBio',
    headerBgColor: '#1a1a2e',
    headerTextColor: '#ffffff',
    buttonColor: '#00d4aa',
    includeAddressVerification: false,
    formSteps: [
      {
        id: 'code-entry',
        title: 'Enter Your Code',
        order: 1,
        stepType: 'form',
        submitAction: 'validate_code',
        fields: [
          { id: 'f-code', type: 'registration_code', label: 'Registration Code', name: 'registrationCode', required: true, order: 1, placeholder: 'Enter your 6-digit code' },
        ],
        buttons: [
          { id: 'next', label: 'Verify Code', enabled: true },
          { id: 'back', label: 'Back', enabled: false },
        ]
      },
      {
        id: 'verify-details',
        title: 'Verify Your Details',
        order: 2,
        stepType: 'form',
        fields: [
          { id: 'f-fn', type: 'first_name', label: 'First Name', name: 'firstName', required: true, order: 1 },
          { id: 'f-ln', type: 'last_name', label: 'Last Name', name: 'lastName', required: true, order: 2 },
          { id: 'f-em', type: 'email', label: 'Email', name: 'email', required: true, order: 3 },
          { id: 'f-ph', type: 'phone', label: 'Phone', name: 'phone', required: false, order: 4 },
          { id: 'f-dob', type: 'date_of_birth', label: 'Date of Birth', name: 'dateOfBirth', required: false, order: 5 },
        ],
        buttons: [
          { id: 'next', label: 'Continue', enabled: true },
          { id: 'back', label: 'Back', enabled: true },
        ]
      },
      {
        id: 'verification',
        title: 'Identity Verification',
        order: 3,
        stepType: 'unified_verification',
        fields: [],
        unifiedVerificationConfig: {
          methodSelection: 'admin_preselect',
          enabledTypes: ['docbio'],
          typeConfigs: {},
          successDestination: 'default',
          failureDestination: 'default',
        },
        buttons: [
          { id: 'back', label: 'Back', enabled: true },
        ]
      }
    ]
  }
};
