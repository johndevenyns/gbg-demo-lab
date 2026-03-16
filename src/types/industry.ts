export interface Industry {
  id: string;
  title: string;
  description?: string;
  iconName: string;
  portalType: string;
  displayOrder: number;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export const PORTAL_TYPE_OPTIONS = [
  { value: 'none', label: 'No Portal', description: 'Standard form flow without a portal' },
  { value: 'banking', label: 'Banking', description: 'Online banking dashboard with accounts & transactions' },
  { value: 'rental_car', label: 'Rental Car', description: 'Car rental management portal (coming soon)' },
  { value: 'retail', label: 'Retail', description: 'Retail account / loyalty portal (coming soon)' },
  { value: 'insurance', label: 'Insurance', description: 'Insurance policy management portal (coming soon)' },
  { value: 'healthcare', label: 'Healthcare', description: 'Patient portal (coming soon)' },
] as const;

export type PortalType = typeof PORTAL_TYPE_OPTIONS[number]['value'];
