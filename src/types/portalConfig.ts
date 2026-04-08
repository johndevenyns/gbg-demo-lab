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

/** What happens after successful step-up verification */
export type PostVerificationBehavior = 'show_completion' | 'return_with_toast';

export interface CompletionAction {
  label: string;
  action: 'repeat' | 'return_to_dashboard' | 'return_to_previous';
  variant?: 'primary' | 'secondary';
}

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
  /** Controls post-verification UX. Defaults: transactions → 'show_completion', settings → 'return_with_toast' */
  postVerificationBehavior?: PostVerificationBehavior;
  /** Title shown on completion screen (show_completion only) */
  completionTitle?: string;
  /** Buttons on completion screen */
  completionActions?: CompletionAction[];
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

// ── Gaming-specific types ──

export interface GamingEvent {
  id: string;
  league: string;
  sportIcon: string;
  teamA: string;
  teamB: string;
  oddsA: string;
  oddsB: string;
  oddsDraw?: string;
  time: string;
  isLive?: boolean;
  scoreA?: number;
  scoreB?: number;
}

export interface GamingBet {
  event: string;
  selection: string;
  betType: string;
  odds: string;
  stake: number;
  payout?: number;
  status: 'pending' | 'won' | 'lost' | 'void';
  date: string;
}

export interface GamingPromo {
  tag: string;
  title: string;
  description: string;
  bgColor?: string;
}

export interface GamingPaymentMethod {
  type: string;
  lastFour?: string;
  detail: string;
  isDefault: boolean;
}

// ── Retail-specific types ──

export interface RetailProduct {
  id: string;
  name: string;
  price: number;
  image: string;        // emoji or URL
  category: string;
  rating: number;
  reviewCount: number;
  badge?: string;        // e.g. "Best Seller", "Sale"
}

export interface RetailOrderItem {
  name: string;
  qty: number;
  price: number;
  image: string;
}

export interface RetailOrder {
  orderId: string;
  items: RetailOrderItem[];
  status: 'processing' | 'shipped' | 'delivered' | 'returned';
  date: string;
  total: number;
  trackingNumber?: string;
  estimatedDelivery?: string;
}

export interface RetailPaymentMethod {
  type: 'visa' | 'mastercard' | 'amex';
  lastFour: string;
  expiryDate: string;
  isDefault: boolean;
}

export interface RetailAddress {
  label: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
}

export interface PortalConfig {
  // Branding (shared)
  bankName?: string;       // also used as generic "portal name"
  pharmacyName?: string;
  retailStoreName?: string;
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

  // Retail dashboard content
  retailProducts?: RetailProduct[];
  retailOrders?: RetailOrder[];
  retailPaymentMethods?: RetailPaymentMethod[];
  retailAddresses?: RetailAddress[];
  retailCategories?: string[];

  // Gaming dashboard content
  gamingSiteName?: string;
  gamingBalance?: number;
  gamingEvents?: GamingEvent[];
  gamingBets?: GamingBet[];
  gamingPromos?: GamingPromo[];
  gamingPaymentMethods?: GamingPaymentMethod[];

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
    { id: 'bank-name', action: 'change your name', label: 'Change Name', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Your name has been updated successfully.', postVerificationBehavior: 'return_with_toast' },
    { id: 'bank-email', action: 'change your email address', label: 'Change Email', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Your email address has been updated.', postVerificationBehavior: 'return_with_toast' },
    { id: 'bank-phone', action: 'change your phone number', label: 'Change Phone', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Your phone number has been updated.', postVerificationBehavior: 'return_with_toast' },
    { id: 'bank-password', action: 'change your password', label: 'Change Password', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Your password has been changed.', postVerificationBehavior: 'return_with_toast' },
    { id: 'bank-2fa', action: 'update two-factor authentication', label: 'Update 2FA', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Two-factor authentication updated.', postVerificationBehavior: 'return_with_toast' },
    { id: 'bank-transfer', action: 'send a transfer', label: 'Send Transfer', enabled: true, category: 'transaction', condition: 'threshold', thresholdAmount: 500, thresholdCurrency: 'USD', successMessage: 'Transfer sent successfully!', postVerificationBehavior: 'show_completion', completionTitle: 'Transfer Complete', completionActions: [{ label: 'Send Another', action: 'repeat', variant: 'secondary' }, { label: 'Return to Dashboard', action: 'return_to_dashboard', variant: 'primary' }] },
    { id: 'bank-payment', action: 'pay a bill', label: 'Pay Bill', enabled: true, category: 'transaction', condition: 'threshold', thresholdAmount: 1000, thresholdCurrency: 'USD', successMessage: 'Payment submitted successfully!', postVerificationBehavior: 'show_completion', completionTitle: 'Payment Complete', completionActions: [{ label: 'Pay Another', action: 'repeat', variant: 'secondary' }, { label: 'Return to Dashboard', action: 'return_to_dashboard', variant: 'primary' }] },
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
    { id: 'pharm-name', action: 'change your name', label: 'Change Name', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Your name has been updated.', postVerificationBehavior: 'return_with_toast' },
    { id: 'pharm-email', action: 'change your email address', label: 'Change Email', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Your email has been updated.', postVerificationBehavior: 'return_with_toast' },
    { id: 'pharm-phone', action: 'change your phone number', label: 'Change Phone', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Your phone number has been updated.', postVerificationBehavior: 'return_with_toast' },
    { id: 'pharm-password', action: 'change your password', label: 'Change Password', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Your password has been changed.', postVerificationBehavior: 'return_with_toast' },
    { id: 'pharm-2fa', action: 'update two-factor authentication', label: 'Update 2FA', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Two-factor authentication updated.', postVerificationBehavior: 'return_with_toast' },
    { id: 'pharm-insurance', action: 'update your insurance information', label: 'Update Insurance', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Insurance information updated.', postVerificationBehavior: 'return_with_toast' },
    { id: 'pharm-pickup', action: 'add a new authorized pickup person', label: 'Add Pickup Person', enabled: true, category: 'account_action', condition: 'always', successMessage: 'Authorized pickup person added.', postVerificationBehavior: 'return_with_toast' },
  ],
};

export const DEFAULT_RETAIL_CONFIG: PortalConfig = {
  retailStoreName: 'Demo Store',
  accentColor: '#6366F1',
  userName: 'Jane Cooper',
  userEmail: 'jane.cooper@email.com',
  userPhone: '(555) 867-5309',

  retailCategories: ['Electronics', 'Home & Kitchen', 'Clothing', 'Sports & Outdoors', 'Books', 'Beauty'],

  retailProducts: [
    { id: 'p1', name: 'Wireless Noise-Canceling Headphones', price: 249.99, image: '🎧', category: 'Electronics', rating: 4.7, reviewCount: 2341, badge: 'Best Seller' },
    { id: 'p2', name: 'Smart Home Speaker', price: 89.99, image: '📻', category: 'Electronics', rating: 4.5, reviewCount: 1892 },
    { id: 'p3', name: 'Ergonomic Office Chair', price: 399.00, image: '🪑', category: 'Home & Kitchen', rating: 4.6, reviewCount: 876, badge: 'Top Rated' },
    { id: 'p4', name: 'Stainless Steel Water Bottle', price: 24.99, image: '🧴', category: 'Sports & Outdoors', rating: 4.8, reviewCount: 5421 },
    { id: 'p5', name: 'Organic Cotton T-Shirt', price: 34.99, image: '👕', category: 'Clothing', rating: 4.3, reviewCount: 723 },
    { id: 'p6', name: 'Portable Bluetooth Speaker', price: 59.99, image: '🔊', category: 'Electronics', rating: 4.4, reviewCount: 1456, badge: 'Sale' },
    { id: 'p7', name: 'Cast Iron Skillet Set', price: 79.99, image: '🍳', category: 'Home & Kitchen', rating: 4.9, reviewCount: 3102 },
    { id: 'p8', name: 'Running Shoes — Ultralight', price: 129.99, image: '👟', category: 'Sports & Outdoors', rating: 4.6, reviewCount: 2087, badge: 'New' },
  ],

  retailOrders: [
    { orderId: 'ORD-90412', items: [{ name: 'Wireless Headphones', qty: 1, price: 249.99, image: '🎧' }], status: 'shipped', date: 'Apr 5', total: 249.99, trackingNumber: '1Z999AA10123456784', estimatedDelivery: 'Apr 9' },
    { orderId: 'ORD-90398', items: [{ name: 'Ergonomic Chair', qty: 1, price: 399.00, image: '🪑' }, { name: 'Water Bottle', qty: 2, price: 24.99, image: '🧴' }], status: 'delivered', date: 'Mar 28', total: 448.98 },
    { orderId: 'ORD-90287', items: [{ name: 'Bluetooth Speaker', qty: 1, price: 59.99, image: '🔊' }], status: 'delivered', date: 'Mar 15', total: 59.99 },
    { orderId: 'ORD-90104', items: [{ name: 'Cotton T-Shirt', qty: 3, price: 34.99, image: '👕' }], status: 'delivered', date: 'Feb 22', total: 104.97 },
  ],

  retailPaymentMethods: [
    { type: 'visa', lastFour: '4829', expiryDate: '09/27', isDefault: true },
    { type: 'mastercard', lastFour: '7163', expiryDate: '03/26', isDefault: false },
  ],

  retailAddresses: [
    { label: 'Home', line1: '742 Evergreen Terrace', city: 'Springfield', state: 'IL', zip: '62704', isDefault: true },
    { label: 'Work', line1: '100 Industrial Way', line2: 'Suite 400', city: 'Springfield', state: 'IL', zip: '62701', isDefault: false },
  ],

  verificationTriggers: [
    { id: 'retail-name', action: 'change your name', label: 'Change Name', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Your name has been updated.', postVerificationBehavior: 'return_with_toast' },
    { id: 'retail-email', action: 'change your email address', label: 'Change Email', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Your email has been updated.', postVerificationBehavior: 'return_with_toast' },
    { id: 'retail-phone', action: 'change your phone number', label: 'Change Phone', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Your phone number has been updated.', postVerificationBehavior: 'return_with_toast' },
    { id: 'retail-password', action: 'change your password', label: 'Change Password', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Your password has been changed.', postVerificationBehavior: 'return_with_toast' },
    { id: 'retail-payment', action: 'update your payment method', label: 'Update Payment', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Payment method updated.', postVerificationBehavior: 'return_with_toast' },
    { id: 'retail-address', action: 'update your shipping address', label: 'Update Address', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Shipping address updated.', postVerificationBehavior: 'return_with_toast' },
    { id: 'retail-purchase', action: 'complete a purchase', label: 'Complete Purchase', enabled: true, category: 'transaction', condition: 'threshold', thresholdAmount: 200, thresholdCurrency: 'USD', successMessage: 'Order placed successfully!', postVerificationBehavior: 'show_completion', completionTitle: 'Order Confirmed', completionActions: [{ label: 'Continue Shopping', action: 'return_to_dashboard', variant: 'primary' }] },
  ],
};
