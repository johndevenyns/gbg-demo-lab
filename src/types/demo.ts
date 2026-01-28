// Demo Environment Configuration Types

export type VerificationType = 'docBio' | 'dataBio' | 'dataOnly';

export type IndustryTemplate = 'bank' | 'rental_car' | 'online_gambling' | 'healthcare' | 'insurance' | 'retail' | 'custom';

// Import form style config type
import { FormStyleConfig } from './formStyle';

export interface DemoEnvironment {
  id: string;
  slug: string;
  customerName: string;
  industryTemplate: IndustryTemplate;
  logoUrl?: string;
  
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
  
  // Form styling
  formStyle?: FormStyleConfig;
  
  // Feature toggles
  includeAddressVerification: boolean;
  
  // Form configuration
  formSteps: FormStep[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
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
  
  // Completion behavior
  autoAdvanceOnComplete?: boolean;
  completionRedirectUrl?: string;
}

// Step type enumeration
export type FormStepType = 'form' | 'verification' | 'api' | 'path' | 'page';

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
  buttonAction?: 'next' | 'redirect' | 'copy';
  buttonUrl?: string;
  copyField?: string; // Field to copy to clipboard
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

export interface FormStep {
  id: string;
  title: string;
  description?: string;
  order: number;
  // Step type - determines rendering behavior
  stepType?: FormStepType;
  fields: FormField[];
  // Special elements
  addressValidationEnabled?: boolean;
  submitButton?: boolean;
  verificationPath?: 'docbio' | 'databio' | 'dataonly' | 'mdl';
  // Button configuration
  buttons?: StepButton[];
  // API configuration (for form steps with inline API calls)
  apiConfig?: StepApiConfig;
  // Verification step configuration (only used when stepType = 'verification')
  verificationConfig?: VerificationStepConfig;
  // API step configuration (only used when stepType = 'api')
  apiStepConfig?: ApiStepConfig;
  // Path step configuration (only used when stepType = 'path')
  pathStepConfig?: PathStepConfig;
  // Page step configuration (only used when stepType = 'page')
  pageStepConfig?: PageStepConfig;
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
  | 'address_country'
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
  | 'textarea';

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
  { type: 'ssn', label: 'SSN (Last 4)', name: 'ssn', placeholder: '****', required: false },
  { type: 'address_street', label: 'Street Address', name: 'addressStreet', placeholder: '123 Main St', required: true },
  { type: 'address_city', label: 'City', name: 'addressCity', placeholder: 'City', required: true },
  { type: 'address_state', label: 'State', name: 'addressState', placeholder: 'State', required: true },
  { type: 'address_zip', label: 'ZIP Code', name: 'addressZip', placeholder: '12345', required: true },
  { type: 'address_country', label: 'Country', name: 'addressCountry', placeholder: 'Country', required: true },
  { type: 'gender', label: 'Gender', name: 'gender', placeholder: 'Select gender', required: false },
  { type: 'nationality', label: 'Nationality', name: 'nationality', placeholder: 'Select nationality', required: false },
  { type: 'document_type', label: 'Document Type', name: 'documentType', placeholder: 'Select document type', required: false },
  { type: 'document_number', label: 'Document Number', name: 'documentNumber', placeholder: 'Document number', required: false },
  { type: 'employer', label: 'Employer', name: 'employer', placeholder: 'Company name', required: false },
  { type: 'income', label: 'Annual Income', name: 'income', placeholder: '$0.00', required: false },
  { type: 'text', label: 'Custom Text Field', name: 'customText', placeholder: 'Enter text', required: false },
  { type: 'textarea', label: 'Custom Text Area', name: 'customTextarea', placeholder: 'Enter details', required: false },
  { type: 'checkbox', label: 'Custom Checkbox', name: 'customCheckbox', required: false },
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
          { id: 'f6', type: 'ssn', label: 'SSN (Last 4)', name: 'ssn', required: true, order: 2 },
        ]
      },
      {
        id: 'step-3',
        title: 'Address',
        order: 3,
        fields: [
          { id: 'f7', type: 'address_street', label: 'Street Address', name: 'addressStreet', required: true, order: 1 },
          { id: 'f8', type: 'address_city', label: 'City', name: 'addressCity', required: true, order: 2 },
          { id: 'f9', type: 'address_state', label: 'State', name: 'addressState', required: true, order: 3 },
          { id: 'f10', type: 'address_zip', label: 'ZIP Code', name: 'addressZip', required: true, order: 4 },
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
          { id: 'f5', type: 'address_street', label: 'Street Address', name: 'addressStreet', required: true, order: 1 },
          { id: 'f6', type: 'address_city', label: 'City', name: 'addressCity', required: true, order: 2 },
          { id: 'f7', type: 'address_state', label: 'State', name: 'addressState', required: true, order: 3 },
          { id: 'f8', type: 'address_zip', label: 'ZIP Code', name: 'addressZip', required: true, order: 4 },
          { id: 'f9', type: 'ssn', label: 'SSN (Last 4)', name: 'ssn', required: true, order: 5 },
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
          { id: 'f6', type: 'ssn', label: 'SSN (Last 4)', name: 'ssn', required: true, order: 2 },
          { id: 'f7', type: 'address_street', label: 'Street Address', name: 'addressStreet', required: true, order: 3 },
          { id: 'f8', type: 'address_city', label: 'City', name: 'addressCity', required: true, order: 4 },
          { id: 'f9', type: 'address_state', label: 'State', name: 'addressState', required: true, order: 5 },
          { id: 'f10', type: 'address_zip', label: 'ZIP Code', name: 'addressZip', required: true, order: 6 },
        ]
      }
    ]
  },
  custom: {
    industryTemplate: 'custom',
    verificationType: 'docBio',
    headerBgColor: '#1a1a2e',
    headerTextColor: '#ffffff',
    buttonColor: '#6366f1',
    includeAddressVerification: false,
    formSteps: [
      {
        id: 'step-1',
        title: 'Step 1',
        order: 1,
        fields: []
      }
    ]
  }
};
