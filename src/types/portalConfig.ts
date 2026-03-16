// Portal configuration types — stored in industries.portal_config

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

export interface PortalVerificationTrigger {
  action: string;
  label: string;
  enabled: boolean;
}

export interface PortalConfig {
  // Branding
  bankName?: string;
  accentColor?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;

  // Dashboard content
  accounts?: PortalAccount[];
  transactions?: PortalTransaction[];
  quickActions?: PortalQuickAction[];

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
    { action: 'change your name', label: 'Change Name', enabled: true },
    { action: 'change your email address', label: 'Change Email', enabled: true },
    { action: 'change your phone number', label: 'Change Phone', enabled: true },
    { action: 'change your password', label: 'Change Password', enabled: true },
    { action: 'update two-factor authentication', label: 'Update 2FA', enabled: true },
  ],
};
