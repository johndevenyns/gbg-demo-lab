// Portal configuration types — stored in industries.portal_config

/** Branding colors inherited from the customer website */
export interface PortalBranding {
  sidebarBg: string;       // from headerBgColor
  sidebarText: string;     // from headerTextColor
  accentColor: string;     // from buttonColor
  pageBg?: string;         // from contentAreaBgColor
  fontFamily?: string;     // from formStyle font
}

export interface PortalAccount {
  name: string;
  balance: number;
  lastFour: string;
  apy?: string;
  variant: 'primary' | 'secondary';
}

export interface PortalTransaction {
  merchant: string;
  amount: number;
  date: string;
  icon: string;
}

export interface PortalQuickAction {
  label: string;
  icon: string;
  color: string;
}

export type TriggerCategory = 'settings_change' | 'transaction' | 'account_action';
export type TriggerCondition = 'always' | 'threshold';

export interface PortalVerificationTrigger {
  id: string;
  action: string;
  label: string;
  enabled: boolean;
  category: TriggerCategory;
  condition: TriggerCondition;
  thresholdAmount?: number;          // for transaction triggers
  thresholdCurrency?: string;        // e.g. 'USD'
  verificationType?: string | null;  // null = use demo default
  useCaseId?: string | null;         // reference to a step-up use case / form template
  successMessage?: string;           // shown after successful verification
}

// ── Pharmacy-specific types ──

export interface PharmacyPrescription {
  name: string;
  dosage: string;
  prescriber: string;
  refillsLeft: number;
  nextRefillDate: string;
  status: 'active' | 'expired' | 'pending';
  rxNumber: string;
  icon: string;
}

export interface PharmacyOrder {
  orderId: string;
  items: string[];
  status: 'processing' | 'ready' | 'picked_up' | 'shipped';
  date: string;
  pickupLocation?: string;
  estimatedReady?: string;
}

export interface PortalConfig {
  // Branding (shared)
  bankName?: string;       // also used as generic "portal name"
  pharmacyName?: string;
  accentColor?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;

  // Banking dashboard content
  accounts?: PortalAccount[];
  transactions?: PortalTransaction[];
  quickActions?: PortalQuickAction[];

  // Pharmacy dashboard content
  prescriptions?: PharmacyPrescription[];
  orders?: PharmacyOrder[];
  pharmacyQuickActions?: PortalQuickAction[];
  insuranceProvider?: string;
  insuranceMemberId?: string;
  preferredStore?: string;

  // Settings — which actions trigger IDV
  verificationTriggers?: PortalVerificationTrigger[];
}

export const DEFAULT_BANKING_CONFIG: PortalConfig = {
  bankName: 'Demo Bank',
  accentColor: '#2563EB',
  userName: 'Jane Cooper',
  userEmail: 'jane.cooper@email.com',
  userPhone: '(555) 867-5309',

  accounts: [
    { name: 'Checking Account', balance: 12458.32, lastFour: '4829', variant: 'primary' },
    { name: 'Savings Account', balance: 45891.00, lastFour: '7163', apy: '4.25%', variant: 'secondary' },
  ],

  transactions: [
    { merchant: 'Whole Foods Market', amount: -82.47, date: 'Today', icon: '🛒' },
    { merchant: 'Direct Deposit — Payroll', amount: 4250.00, date: 'Yesterday', icon: '💰' },
    { merchant: 'Netflix', amount: -15.99, date: 'Mar 11', icon: '🎬' },
    { merchant: 'Uber', amount: -24.30, date: 'Mar 10', icon: '🚗' },
    { merchant: 'Starbucks', amount: -6.45, date: 'Mar 10', icon: '☕' },
    { merchant: 'Electric Company', amount: -142.80, date: 'Mar 9', icon: '⚡' },
    { merchant: 'Amazon', amount: -67.23, date: 'Mar 8', icon: '📦' },
    { merchant: 'CVS Pharmacy', amount: -32.10, date: 'Mar 7', icon: '💊' },
    { merchant: 'Venmo Transfer', amount: 150.00, date: 'Mar 6', icon: '💸' },
    { merchant: 'Spotify', amount: -10.99, date: 'Mar 5', icon: '🎵' },
  ],

  quickActions: [
    { label: 'Transfer', icon: '↗️', color: '#0D9488' },
    { label: 'Pay Bills', icon: '📄', color: '#6366F1' },
    { label: 'Deposit', icon: '📥', color: '#059669' },
    { label: 'More', icon: '⋯', color: '#64748B' },
  ],

  verificationTriggers: [
    { id: 'bank-name', action: 'change your name', label: 'Change Name', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Your name has been updated successfully.' },
    { id: 'bank-email', action: 'change your email address', label: 'Change Email', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Your email address has been updated.' },
    { id: 'bank-phone', action: 'change your phone number', label: 'Change Phone', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Your phone number has been updated.' },
    { id: 'bank-password', action: 'change your password', label: 'Change Password', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Your password has been changed.' },
    { id: 'bank-2fa', action: 'update two-factor authentication', label: 'Update 2FA', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Two-factor authentication updated.' },
    { id: 'bank-transfer', action: 'send a transfer', label: 'Send Transfer', enabled: true, category: 'transaction', condition: 'threshold', thresholdAmount: 500, thresholdCurrency: 'USD', successMessage: 'Transfer sent successfully!' },
    { id: 'bank-payment', action: 'pay a bill', label: 'Pay Bill', enabled: true, category: 'transaction', condition: 'threshold', thresholdAmount: 1000, thresholdCurrency: 'USD', successMessage: 'Payment submitted successfully!' },
  ],
};

export const DEFAULT_PHARMACY_CONFIG: PortalConfig = {
  pharmacyName: 'Demo Pharmacy',
  accentColor: '#DC2626',
  userName: 'Jane Cooper',
  userEmail: 'jane.cooper@email.com',
  userPhone: '(555) 867-5309',
  insuranceProvider: 'BlueCross BlueShield',
  insuranceMemberId: 'BCB-9284751',
  preferredStore: '1234 Main St, Anytown, USA',

  prescriptions: [
    { name: 'Lisinopril', dosage: '10mg · 1 tablet daily', prescriber: 'Dr. Sarah Chen', refillsLeft: 3, nextRefillDate: 'Mar 28', status: 'active', rxNumber: 'RX-7849231', icon: '💊' },
    { name: 'Metformin', dosage: '500mg · 2 tablets daily', prescriber: 'Dr. Sarah Chen', refillsLeft: 5, nextRefillDate: 'Apr 2', status: 'active', rxNumber: 'RX-7849232', icon: '💊' },
    { name: 'Atorvastatin', dosage: '20mg · 1 tablet at bedtime', prescriber: 'Dr. James Park', refillsLeft: 1, nextRefillDate: 'Mar 22', status: 'active', rxNumber: 'RX-6512098', icon: '💊' },
    { name: 'Amoxicillin', dosage: '500mg · 3x daily for 10 days', prescriber: 'Dr. Sarah Chen', refillsLeft: 0, nextRefillDate: '—', status: 'expired', rxNumber: 'RX-5928374', icon: '🧪' },
    { name: 'Omeprazole', dosage: '20mg · 1 capsule daily', prescriber: 'Dr. James Park', refillsLeft: 2, nextRefillDate: 'Pending approval', status: 'pending', rxNumber: 'RX-8103947', icon: '💊' },
  ],

  orders: [
    { orderId: 'ORD-48291', items: ['Lisinopril 10mg', 'Metformin 500mg'], status: 'ready', date: 'Today', pickupLocation: '1234 Main St', estimatedReady: 'Ready now' },
    { orderId: 'ORD-48285', items: ['Atorvastatin 20mg'], status: 'processing', date: 'Today', pickupLocation: '1234 Main St', estimatedReady: '~2:30 PM' },
    { orderId: 'ORD-48102', items: ['Amoxicillin 500mg', 'Ibuprofen 200mg'], status: 'picked_up', date: 'Mar 10' },
    { orderId: 'ORD-47998', items: ['Omeprazole 20mg'], status: 'shipped', date: 'Mar 8' },
  ],

  pharmacyQuickActions: [
    { label: 'Refill Rx', icon: '💊', color: '#DC2626' },
    { label: 'Transfer Rx', icon: '↗️', color: '#7C3AED' },
    { label: 'Find Store', icon: '📍', color: '#059669' },
    { label: 'Chat', icon: '💬', color: '#2563EB' },
  ],

  verificationTriggers: [
    { action: 'change your name', label: 'Change Name', enabled: true },
    { action: 'change your email address', label: 'Change Email', enabled: true },
    { action: 'change your phone number', label: 'Change Phone', enabled: true },
    { action: 'change your password', label: 'Change Password', enabled: true },
    { action: 'update two-factor authentication', label: 'Update 2FA', enabled: true },
    { action: 'update your insurance information', label: 'Update Insurance', enabled: true },
    { action: 'add a new authorized pickup person', label: 'Add Pickup Person', enabled: true },
  ],
};
