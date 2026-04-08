import { PortalConfig } from './portalConfig';

export interface Industry {
  id: string;
  title: string;
  description?: string;
  iconName: string;
  portalType: string;
  portalConfig?: PortalConfig;
  displayOrder: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export const PORTAL_TYPE_OPTIONS = [
  { value: 'none', label: 'No Portal', description: 'Standard form flow without a portal' },
  { value: 'banking', label: 'Banking', description: 'Online banking dashboard with accounts & transactions' },
  { value: 'pharmacy', label: 'Online Pharmacy', description: 'Pharmacy portal with prescriptions, orders & pickup' },
  { value: 'rental_car', label: 'Rental Car', description: 'Car rental portal with vehicle browsing, reservations & checkout' },
  { value: 'retail', label: 'Online Retail', description: 'Online store with products, orders & account management' },
  { value: 'gaming', label: 'Gaming', description: 'Online sportsbook & casino portal with bets & responsible gaming' },
  { value: 'insurance', label: 'Insurance', description: 'Insurance portal with policies, claims & coverage management' },
  { value: 'healthcare', label: 'Healthcare', description: 'Patient portal (coming soon)' },
] as const;

export type PortalType = typeof PORTAL_TYPE_OPTIONS[number]['value'];
