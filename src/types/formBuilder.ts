// Form Builder Types - Extended for conditional branching and templates

import { FormStep, FormField, VerificationType } from './demo';

// Verification path condition types
export type PathCondition = 
  | 'always' 
  | 'mobile_detected' 
  | 'document_available' 
  | 'high_risk_score'
  | 'user_preference';

export interface VerificationPath {
  id: string;
  name: string;
  type: VerificationType;
  description: string;
  condition: PathCondition;
  priority: number; // Lower = higher priority
  resourceIdField: 'resourceId' | 'resourceIdDataOnly' | 'resourceIdDataBio' | 'resourceIdDocBio';
}

export const VERIFICATION_PATHS: VerificationPath[] = [
  {
    id: 'docbio',
    name: 'Document + Biometric',
    type: 'docBio',
    description: 'Full verification with ID scan and selfie match',
    condition: 'always',
    priority: 3,
    resourceIdField: 'resourceIdDocBio',
  },
  {
    id: 'databio',
    name: 'Data + Biometric',
    type: 'dataBio',
    description: 'Existing data verified with selfie capture',
    condition: 'document_available',
    priority: 2,
    resourceIdField: 'resourceIdDataBio',
  },
  {
    id: 'dataonly',
    name: 'Data Only',
    type: 'dataOnly',
    description: 'Backend verification without user interaction',
    condition: 'always',
    priority: 4,
    resourceIdField: 'resourceIdDataOnly',
  },
  {
    id: 'mdl',
    name: 'Mobile Driver\'s License',
    type: 'dataBio',
    description: 'Mobile credential verification (iOS/Android)',
    condition: 'mobile_detected',
    priority: 1,
    resourceIdField: 'resourceIdDataBio',
  },
];

// Form template types
export type FormTemplateCategory = 'industry' | 'minimal';

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: FormTemplateCategory;
  verificationType: VerificationType;
  steps: FormStep[];
  icon?: string;
}

// Minimal templates
export const MINIMAL_TEMPLATES: FormTemplate[] = [
  {
    id: 'quick-verify',
    name: 'Quick Verify',
    description: 'Single step with basic info - fastest path to verification',
    category: 'minimal',
    verificationType: 'docBio',
    steps: [
      {
        id: 'step-1',
        title: 'Get Started',
        description: 'Enter your basic info to begin verification',
        order: 1,
        fields: [
          { id: 'f1', type: 'first_name', label: 'First Name', name: 'firstName', required: true, order: 1 },
          { id: 'f2', type: 'last_name', label: 'Last Name', name: 'lastName', required: true, order: 2 },
          { id: 'f3', type: 'email', label: 'Email', name: 'email', required: true, order: 3 },
        ]
      }
    ]
  },
  {
    id: 'standard',
    name: 'Standard',
    description: 'Two steps: personal info + identity details',
    category: 'minimal',
    verificationType: 'dataBio',
    steps: [
      {
        id: 'step-1',
        title: 'Personal Information',
        description: 'Tell us about yourself',
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
        title: 'Identity Details',
        description: 'Help us verify your identity',
        order: 2,
        fields: [
          { id: 'f5', type: 'date_of_birth', label: 'Date of Birth', name: 'dateOfBirth', required: true, order: 1 },
          { id: 'f6', type: 'ssn', label: 'SSN (Last 4)', name: 'ssn', required: false, order: 2 },
        ]
      }
    ]
  },
  {
    id: 'full-kyc',
    name: 'Full KYC',
    description: 'Complete know-your-customer flow with address verification',
    category: 'minimal',
    verificationType: 'dataBio',
    steps: [
      {
        id: 'step-1',
        title: 'Contact Information',
        description: 'How can we reach you?',
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
        description: 'We need to verify your identity',
        order: 2,
        fields: [
          { id: 'f5', type: 'date_of_birth', label: 'Date of Birth', name: 'dateOfBirth', required: true, order: 1 },
          { id: 'f6', type: 'ssn', label: 'SSN (Last 4)', name: 'ssn', required: true, order: 2 },
        ]
      },
      {
        id: 'step-3',
        title: 'Address',
        description: 'Where do you live?',
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
];

// Drag and drop types
export interface DragItem {
  type: 'field' | 'step';
  id: string;
  sourceStepId?: string;
  field?: Omit<FormField, 'id' | 'order'>;
}

export interface DropResult {
  stepId: string;
  index: number;
}

// Branching rule types
export interface BranchingRule {
  id: string;
  name: string;
  conditions: BranchCondition[];
  targetPath: string; // VerificationPath id
}

export interface BranchCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'exists' | 'is_mobile';
  value?: string;
}

// Form builder state
export interface FormBuilderState {
  steps: FormStep[];
  enabledPaths: string[]; // VerificationPath ids
  branchingRules: BranchingRule[];
  successUrl: string;
  failureUrl: string;
}
