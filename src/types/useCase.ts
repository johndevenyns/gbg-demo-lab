// Use Case types for pre-form customer journey experiences

export type UseCaseEntryMethod = 'direct_selection' | 'access_code' | 'mock_login' | 'qr_code';

// Page content for the full-page mock experience
export interface UseCasePageContent {
  heroTitle?: string;
  heroSubtitle?: string;
  heroImageUrl?: string;
  bodyHtml?: string;
  ctaLabel?: string;
  ctaDescription?: string;
  // Mock login fields
  mockLoginTitle?: string;
  mockLoginFields?: { label: string; placeholder: string; type: 'text' | 'email' | 'password' }[];
  // Product details for retail / prescription
  productName?: string;
  productDescription?: string;
  productImageUrl?: string;
  productPrice?: string;
  // Custom styling
  accentColor?: string;
}

export interface DemoUseCase {
  id: string;
  demoId: string;
  title: string;
  description?: string;
  iconName: string;
  displayOrder: number;
  entryMethod: UseCaseEntryMethod;
  accessCode?: string;
  pageContent: UseCasePageContent;
  formStepOverrides?: Record<string, unknown>;
  isEnabled: boolean;
  industryTemplate?: string;
  createdAt: string;
  updatedAt: string;
}

// Template definitions for seeding use cases per industry
export interface UseCaseTemplate {
  title: string;
  description: string;
  iconName: string;
  entryMethod: UseCaseEntryMethod;
  industryTemplate: string;
  pageContent: UseCasePageContent;
}

// Prescription ordering template (healthcare)
export const HEALTHCARE_USE_CASE_TEMPLATES: UseCaseTemplate[] = [
  {
    title: 'Order a Prescription',
    description: 'Patient needs to verify identity before ordering or refilling a prescription online.',
    iconName: 'Pill',
    entryMethod: 'direct_selection',
    industryTemplate: 'healthcare',
    pageContent: {
      heroTitle: 'Online Prescription Services',
      heroSubtitle: 'Order or refill your prescriptions from the comfort of home.',
      ctaLabel: 'Verify Identity to Continue',
      ctaDescription: 'For your safety, we need to verify your identity before processing your prescription.',
      productName: 'Prescription Refill',
      productDescription: 'Select your medication and verify your identity to complete the order.',
    },
  },
  {
    title: 'Telehealth Consultation',
    description: 'Patient verifies identity before a virtual doctor visit.',
    iconName: 'Video',
    entryMethod: 'direct_selection',
    industryTemplate: 'healthcare',
    pageContent: {
      heroTitle: 'Virtual Health Visit',
      heroSubtitle: 'Connect with a licensed provider from anywhere.',
      ctaLabel: 'Verify Identity to Start',
      ctaDescription: 'Identity verification is required before your consultation begins.',
    },
  },
];

// Car rental templates
export const RENTAL_CAR_USE_CASE_TEMPLATES: UseCaseTemplate[] = [
  {
    title: 'Rent a Vehicle',
    description: 'Customer rents a car and must verify their identity and license.',
    iconName: 'Car',
    entryMethod: 'direct_selection',
    industryTemplate: 'rental_car',
    pageContent: {
      heroTitle: 'Vehicle Rental',
      heroSubtitle: 'Choose your vehicle and hit the road.',
      ctaLabel: 'Verify Identity to Book',
      ctaDescription: 'We need to confirm your identity and valid driver\'s license.',
      productName: 'Standard Sedan',
      productDescription: 'Comfortable mid-size sedan, great for city and highway driving.',
      productPrice: '$49/day',
    },
  },
  {
    title: 'Premium Upgrade',
    description: 'Customer upgrades to a luxury or specialty vehicle.',
    iconName: 'Crown',
    entryMethod: 'access_code',
    industryTemplate: 'rental_car',
    pageContent: {
      heroTitle: 'Premium Vehicle Experience',
      heroSubtitle: 'Unlock exclusive vehicles with your upgrade code.',
      ctaLabel: 'Verify & Unlock',
      ctaDescription: 'Enter your upgrade code and verify identity to access premium vehicles.',
    },
  },
];

// Bank templates
export const BANK_USE_CASE_TEMPLATES: UseCaseTemplate[] = [
  {
    title: 'Open Checking Account',
    description: 'New customer opens a checking account.',
    iconName: 'Landmark',
    entryMethod: 'direct_selection',
    industryTemplate: 'bank',
    pageContent: {
      heroTitle: 'Checking Accounts',
      heroSubtitle: 'Everyday banking made simple with no monthly fees.',
      ctaLabel: 'Verify Identity to Open Account',
      ctaDescription: 'Federal regulations require identity verification for new accounts.',
      productName: 'Everyday Checking',
      productDescription: 'No minimum balance, free online banking, and mobile deposits.',
    },
  },
  {
    title: 'Apply for Credit Card',
    description: 'Customer applies for a new credit card.',
    iconName: 'CreditCard',
    entryMethod: 'direct_selection',
    industryTemplate: 'bank',
    pageContent: {
      heroTitle: 'Credit Cards',
      heroSubtitle: 'Earn rewards on every purchase.',
      ctaLabel: 'Verify Identity to Apply',
      ctaDescription: 'We\'ll need to verify your identity as part of the application.',
      productName: 'Rewards Credit Card',
      productDescription: '2% cash back on all purchases, no annual fee.',
    },
  },
  {
    title: 'Online Banking Login',
    description: 'Existing customer logs into their account portal.',
    iconName: 'LogIn',
    entryMethod: 'mock_login',
    industryTemplate: 'bank',
    pageContent: {
      heroTitle: 'Welcome Back',
      heroSubtitle: 'Sign in to manage your accounts.',
      mockLoginTitle: 'Online Banking Login',
      mockLoginFields: [
        { label: 'Username', placeholder: 'Enter your username', type: 'text' },
        { label: 'Password', placeholder: 'Enter your password', type: 'password' },
      ],
      ctaLabel: 'Additional Verification Required',
      ctaDescription: 'For security, we need to verify your identity for this transaction.',
    },
  },
];

// Retail templates
export const RETAIL_USE_CASE_TEMPLATES: UseCaseTemplate[] = [
  {
    title: 'High-Value Purchase',
    description: 'Customer makes a large purchase requiring identity verification.',
    iconName: 'ShoppingBag',
    entryMethod: 'direct_selection',
    industryTemplate: 'retail',
    pageContent: {
      heroTitle: 'Complete Your Order',
      heroSubtitle: 'One more step before we ship your items.',
      ctaLabel: 'Verify Identity to Place Order',
      ctaDescription: 'Orders over $500 require identity verification for fraud prevention.',
      productName: 'Premium Electronics Bundle',
      productDescription: 'Latest laptop with accessories and extended warranty.',
      productPrice: '$1,299.99',
    },
  },
  {
    title: 'Age-Restricted Purchase',
    description: 'Customer buys an age-restricted product (alcohol, tobacco).',
    iconName: 'ShieldCheck',
    entryMethod: 'direct_selection',
    industryTemplate: 'retail',
    pageContent: {
      heroTitle: 'Age Verification Required',
      heroSubtitle: 'This product requires proof of age before purchase.',
      ctaLabel: 'Verify Age to Continue',
      ctaDescription: 'We are legally required to verify your age for this purchase.',
    },
  },
];

// All templates grouped by industry
export const ALL_USE_CASE_TEMPLATES: Record<string, UseCaseTemplate[]> = {
  healthcare: HEALTHCARE_USE_CASE_TEMPLATES,
  rental_car: RENTAL_CAR_USE_CASE_TEMPLATES,
  bank: BANK_USE_CASE_TEMPLATES,
  retail: RETAIL_USE_CASE_TEMPLATES,
};
