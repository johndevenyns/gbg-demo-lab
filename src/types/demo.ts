// Demo Environment Configuration Types

export type VerificationType = 'docBio' | 'dataBio' | 'dataOnly';

export type IndustryTemplate = 'bank' | 'rental_car' | 'online_gambling' | 'healthcare' | 'insurance' | 'retail' | 'custom';

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
  
  // Feature toggles
  includeAddressVerification: boolean;
  
  // Form configuration
  formSteps: FormStep[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface FormStep {
  id: string;
  title: string;
  description?: string;
  order: number;
  fields: FormField[];
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
