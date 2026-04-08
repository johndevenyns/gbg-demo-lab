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

// ── Rental Car-specific types ──

export interface RentalCarVehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  category: 'economy' | 'compact' | 'midsize' | 'fullsize' | 'suv' | 'luxury' | 'minivan' | 'truck';
  image: string;          // emoji
  pricePerDay: number;
  seats: number;
  bags: number;
  transmission: 'automatic' | 'manual';
  features: string[];
  badge?: string;         // e.g. "Best Value", "Popular"
  provider: string;       // e.g. "Avis", "Hertz", "Dollar"
}

export interface RentalCarReservation {
  confirmationId: string;
  vehicle: { make: string; model: string; image: string; category: string };
  provider: string;
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: string;
  dropoffDate: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  totalCost: number;
  extras?: string[];
}

export interface RentalCarPaymentMethod {
  type: 'visa' | 'mastercard' | 'amex';
  lastFour: string;
  expiryDate: string;
  isDefault: boolean;
}

// ── Insurance-specific types ──

export interface InsurancePolicy {
  id: string;
  type: 'auto' | 'home' | 'life' | 'renters' | 'umbrella';
  policyNumber: string;
  provider: string;        // e.g. "Allstate", "Farmers", "Geico"
  status: 'active' | 'pending' | 'expired' | 'cancelled';
  premium: number;         // monthly
  deductible: number;
  coverageAmount: number;
  nextPaymentDate: string;
  renewalDate: string;
  icon: string;
  insuredItems?: string[];  // e.g. "2023 Toyota Camry", "742 Evergreen Terrace"
}

export interface InsuranceClaim {
  claimId: string;
  policyType: string;
  description: string;
  status: 'submitted' | 'under_review' | 'approved' | 'denied' | 'paid';
  dateSubmitted: string;
  amount: number;
  adjuster?: string;
  icon: string;
}

export interface InsurancePaymentMethod {
  type: 'visa' | 'mastercard' | 'amex' | 'bank_account';
  lastFour: string;
  expiryDate?: string;
  detail?: string;
  isDefault: boolean;
}

export interface InsuranceDocument {
  name: string;
  type: 'policy' | 'id_card' | 'declaration' | 'claim';
  date: string;
  policyNumber?: string;
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
  rentalCarCompanyName?: string;
  insuranceCompanyName?: string;
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

  // Rental Car dashboard content
  rentalCarVehicles?: RentalCarVehicle[];
  rentalCarReservations?: RentalCarReservation[];
  rentalCarPaymentMethods?: RentalCarPaymentMethod[];
  rentalCarPickupLocations?: string[];
  rentalCarDriverLicense?: string;
  rentalCarLoyaltyNumber?: string;
  rentalCarLoyaltyTier?: string;

  // Insurance dashboard content
  insurancePolicies?: InsurancePolicy[];
  insuranceClaims?: InsuranceClaim[];
  insurancePaymentMethods?: InsurancePaymentMethod[];
  insuranceDocuments?: InsuranceDocument[];
  insuranceAgentName?: string;
  insuranceAgentPhone?: string;
  insurancePolicyHolderSince?: string;

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
    { id: 'bank-activate-card', action: 'activate a new credit card', label: 'Activate Credit Card', enabled: true, category: 'account_action', condition: 'always', successMessage: 'Your credit card has been activated and is ready to use!', postVerificationBehavior: 'return_with_toast' },
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

export const DEFAULT_GAMING_CONFIG: PortalConfig = {
  gamingSiteName: 'Demo Sportsbook',
  accentColor: '#22C55E',
  userName: 'Jane Cooper',
  userEmail: 'jane.cooper@email.com',
  userPhone: '(555) 867-5309',
  gamingBalance: 2487.50,

  gamingPromos: [
    { tag: 'Welcome Bonus', title: 'Get up to $1,000 in Bonus Bets', description: 'New users: deposit $10+, get bonus bets matched', bgColor: '#7C3AED' },
    { tag: 'Profit Boost', title: '50% Profit Boost — NBA Playoffs', description: 'Opt in & place any NBA moneyline bet', bgColor: '#0891B2' },
    { tag: 'Refer a Friend', title: 'Get $50 for each friend', description: 'Share your link & earn when they sign up', bgColor: '#DC2626' },
  ],

  gamingEvents: [
    { id: 'g1', league: 'NBA', sportIcon: '🏀', teamA: 'Lakers', teamB: 'Celtics', oddsA: '+145', oddsB: '-170', time: 'Today 7:30 PM', isLive: true, scoreA: 54, scoreB: 61 },
    { id: 'g2', league: 'NFL', sportIcon: '🏈', teamA: 'Chiefs', teamB: '49ers', oddsA: '-110', oddsB: '-110', time: 'Sun 6:30 PM' },
    { id: 'g3', league: 'Premier League', sportIcon: '⚽', teamA: 'Arsenal', teamB: 'Man City', oddsA: '+220', oddsB: '+130', oddsDraw: '+240', time: 'Sat 12:30 PM' },
    { id: 'g4', league: 'MLB', sportIcon: '⚾', teamA: 'Yankees', teamB: 'Dodgers', oddsA: '+135', oddsB: '-155', time: 'Tomorrow 4:05 PM' },
    { id: 'g5', league: 'UFC 310', sportIcon: '🥊', teamA: 'Pantoja', teamB: 'Asakura', oddsA: '-250', oddsB: '+200', time: 'Sat 10:00 PM', isLive: false },
  ],

  gamingBets: [
    { event: 'Lakers vs Celtics', selection: 'Celtics -4.5', betType: 'Spread', odds: '-110', stake: 50, status: 'pending', date: 'Today' },
    { event: 'Chiefs vs 49ers', selection: 'Over 47.5', betType: 'Total', odds: '-105', stake: 100, status: 'pending', date: 'Today' },
    { event: 'Arsenal vs Man City', selection: 'Arsenal ML', betType: 'Moneyline', odds: '+220', stake: 25, payout: 80, status: 'won', date: 'Yesterday' },
    { event: 'Yankees vs Dodgers', selection: 'Yankees ML', betType: 'Moneyline', odds: '+150', stake: 40, status: 'lost', date: 'Mar 28' },
    { event: 'UFC 309 Main Event', selection: 'Jones by KO/TKO', betType: 'Method of Victory', odds: '+175', stake: 75, payout: 206.25, status: 'won', date: 'Mar 15' },
    { event: 'Lakers vs Warriors', selection: '3-Leg Parlay', betType: 'Parlay', odds: '+650', stake: 10, status: 'lost', date: 'Mar 10' },
  ],

  gamingPaymentMethods: [
    { type: 'visa', lastFour: '4829', detail: 'Expires 09/27', isDefault: true },
    { type: 'paypal', detail: 'jane.cooper@email.com', isDefault: false },
    { type: 'bank', lastFour: '6721', detail: 'Chase Checking ••6721', isDefault: false },
  ],

  verificationTriggers: [
    { id: 'gaming-name', action: 'change your name', label: 'Change Name', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Your name has been updated.', postVerificationBehavior: 'return_with_toast' },
    { id: 'gaming-email', action: 'change your email address', label: 'Change Email', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Your email has been updated.', postVerificationBehavior: 'return_with_toast' },
    { id: 'gaming-phone', action: 'change your phone number', label: 'Change Phone', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Your phone number has been updated.', postVerificationBehavior: 'return_with_toast' },
    { id: 'gaming-password', action: 'change your password', label: 'Change Password', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Your password has been changed.', postVerificationBehavior: 'return_with_toast' },
    { id: 'gaming-2fa', action: 'update two-factor authentication', label: 'Update 2FA', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Two-factor authentication updated.', postVerificationBehavior: 'return_with_toast' },
    { id: 'gaming-payment', action: 'update your payment method', label: 'Update Payment', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Payment method updated.', postVerificationBehavior: 'return_with_toast' },
    { id: 'gaming-deposit-limit', action: 'change your deposit limit', label: 'Change Deposit Limit', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Deposit limit updated.', postVerificationBehavior: 'return_with_toast' },
    { id: 'gaming-loss-limit', action: 'change your loss limit', label: 'Change Loss Limit', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Loss limit updated.', postVerificationBehavior: 'return_with_toast' },
    { id: 'gaming-withdraw', action: 'withdraw funds', label: 'Withdraw Funds', enabled: true, category: 'transaction', condition: 'threshold', thresholdAmount: 500, thresholdCurrency: 'USD', successMessage: 'Withdrawal initiated!', postVerificationBehavior: 'show_completion', completionTitle: 'Withdrawal Submitted', completionActions: [{ label: 'Return to Lobby', action: 'return_to_dashboard', variant: 'primary' }] },
    { id: 'gaming-wager', action: 'place a high-value wager', label: 'Place Wager', enabled: true, category: 'transaction', condition: 'threshold', thresholdAmount: 1000, thresholdCurrency: 'USD', successMessage: 'Bet placed successfully!', postVerificationBehavior: 'show_completion', completionTitle: 'Bet Confirmed', completionActions: [{ label: 'Place Another Bet', action: 'repeat', variant: 'secondary' }, { label: 'Return to Lobby', action: 'return_to_dashboard', variant: 'primary' }] },
  ],
};

export const DEFAULT_RENTAL_CAR_CONFIG: PortalConfig = {
  rentalCarCompanyName: 'Demo Rentals',
  accentColor: '#FF6B00',
  userName: 'Jane Cooper',
  userEmail: 'jane.cooper@email.com',
  userPhone: '(555) 867-5309',
  rentalCarDriverLicense: '••••4829',
  rentalCarLoyaltyNumber: 'RC-9284751',
  rentalCarLoyaltyTier: 'Gold',

  rentalCarPickupLocations: [
    'LAX Airport — Los Angeles, CA',
    'SFO Airport — San Francisco, CA',
    'JFK Airport — New York, NY',
    'ORD Airport — Chicago, IL',
    'DFW Airport — Dallas, TX',
  ],

  rentalCarVehicles: [
    { id: 'rc1', make: 'Toyota', model: 'Corolla', year: 2025, category: 'economy', image: '🚗', pricePerDay: 39, seats: 5, bags: 2, transmission: 'automatic', features: ['Bluetooth', 'Backup Camera'], provider: 'Dollar', badge: 'Best Value' },
    { id: 'rc2', make: 'Hyundai', model: 'Elantra', year: 2025, category: 'compact', image: '🚙', pricePerDay: 45, seats: 5, bags: 2, transmission: 'automatic', features: ['Apple CarPlay', 'Android Auto'], provider: 'Avis' },
    { id: 'rc3', make: 'Toyota', model: 'Camry', year: 2025, category: 'midsize', image: '🚗', pricePerDay: 55, seats: 5, bags: 3, transmission: 'automatic', features: ['Leather Seats', 'Sunroof', 'Blind Spot Monitor'], provider: 'Hertz', badge: 'Popular' },
    { id: 'rc4', make: 'Chevrolet', model: 'Malibu', year: 2025, category: 'fullsize', image: '🚘', pricePerDay: 65, seats: 5, bags: 4, transmission: 'automatic', features: ['Heated Seats', 'Wi-Fi Hotspot'], provider: 'Avis' },
    { id: 'rc5', make: 'Toyota', model: 'RAV4', year: 2025, category: 'suv', image: '🚙', pricePerDay: 75, seats: 5, bags: 4, transmission: 'automatic', features: ['AWD', 'Roof Rack', 'Lane Assist'], provider: 'Hertz', badge: 'Top Rated' },
    { id: 'rc6', make: 'BMW', model: '5 Series', year: 2025, category: 'luxury', image: '🏎️', pricePerDay: 149, seats: 5, bags: 3, transmission: 'automatic', features: ['Premium Audio', 'Heated Seats', 'Navigation', 'Parking Assist'], provider: 'Avis', badge: 'Premium' },
    { id: 'rc7', make: 'Chrysler', model: 'Pacifica', year: 2025, category: 'minivan', image: '🚐', pricePerDay: 85, seats: 7, bags: 5, transmission: 'automatic', features: ['Stow \'n Go Seats', 'Rear Entertainment'], provider: 'Dollar' },
    { id: 'rc8', make: 'Ford', model: 'F-150', year: 2025, category: 'truck', image: '🛻', pricePerDay: 95, seats: 5, bags: 3, transmission: 'automatic', features: ['4x4', 'Tow Package', 'Bed Liner'], provider: 'Hertz' },
  ],

  rentalCarReservations: [
    { confirmationId: 'RES-48291', vehicle: { make: 'Toyota', model: 'Camry', image: '🚗', category: 'midsize' }, provider: 'Hertz', pickupLocation: 'LAX Airport', dropoffLocation: 'LAX Airport', pickupDate: 'Apr 15, 2:00 PM', dropoffDate: 'Apr 19, 2:00 PM', status: 'upcoming', totalCost: 220, extras: ['GPS Navigation', 'Roadside Assistance'] },
    { confirmationId: 'RES-48102', vehicle: { make: 'BMW', model: '5 Series', image: '🏎️', category: 'luxury' }, provider: 'Avis', pickupLocation: 'SFO Airport', dropoffLocation: 'SFO Airport', pickupDate: 'Mar 20, 10:00 AM', dropoffDate: 'Mar 23, 10:00 AM', status: 'completed', totalCost: 447, extras: ['Premium Insurance'] },
    { confirmationId: 'RES-47998', vehicle: { make: 'Toyota', model: 'RAV4', image: '🚙', category: 'suv' }, provider: 'Hertz', pickupLocation: 'JFK Airport', dropoffLocation: 'JFK Airport', pickupDate: 'Mar 5, 9:00 AM', dropoffDate: 'Mar 10, 9:00 AM', status: 'completed', totalCost: 375 },
    { confirmationId: 'RES-47654', vehicle: { make: 'Hyundai', model: 'Elantra', image: '🚙', category: 'compact' }, provider: 'Avis', pickupLocation: 'ORD Airport', dropoffLocation: 'ORD Airport', pickupDate: 'Feb 14, 12:00 PM', dropoffDate: 'Feb 16, 12:00 PM', status: 'completed', totalCost: 90 },
  ],

  rentalCarPaymentMethods: [
    { type: 'visa', lastFour: '4829', expiryDate: '09/27', isDefault: true },
    { type: 'mastercard', lastFour: '7163', expiryDate: '03/26', isDefault: false },
  ],

  verificationTriggers: [
    { id: 'rental-name', action: 'change your name', label: 'Change Name', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Your name has been updated.', postVerificationBehavior: 'return_with_toast' },
    { id: 'rental-email', action: 'change your email address', label: 'Change Email', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Your email has been updated.', postVerificationBehavior: 'return_with_toast' },
    { id: 'rental-phone', action: 'change your phone number', label: 'Change Phone', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Your phone number has been updated.', postVerificationBehavior: 'return_with_toast' },
    { id: 'rental-password', action: 'change your password', label: 'Change Password', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Your password has been changed.', postVerificationBehavior: 'return_with_toast' },
    { id: 'rental-license', action: 'update your driver license', label: 'Update License', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Driver license updated.', postVerificationBehavior: 'return_with_toast' },
    { id: 'rental-payment', action: 'update your payment method', label: 'Update Payment', enabled: true, category: 'settings_change', condition: 'always', successMessage: 'Payment method updated.', postVerificationBehavior: 'return_with_toast' },
    { id: 'rental-booking', action: 'complete a rental booking', label: 'Complete Booking', enabled: true, category: 'transaction', condition: 'threshold', thresholdAmount: 200, thresholdCurrency: 'USD', successMessage: 'Reservation confirmed!', postVerificationBehavior: 'show_completion', completionTitle: 'Reservation Confirmed', completionActions: [{ label: 'Browse More Vehicles', action: 'return_to_dashboard', variant: 'secondary' }, { label: 'View Reservations', action: 'return_to_previous', variant: 'primary' }] },
  ],
};
