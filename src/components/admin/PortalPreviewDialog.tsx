import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { BankingPortalShell } from '@/components/preview/mockPortal/BankingPortalShell';
import { PharmacyPortalShell } from '@/components/preview/mockPortal/PharmacyPortalShell';
import { RetailPortalShell } from '@/components/preview/mockPortal/RetailPortalShell';
import { GamingPortalShell } from '@/components/preview/mockPortal/GamingPortalShell';
import { PortalConfig, DEFAULT_BANKING_CONFIG, DEFAULT_PHARMACY_CONFIG, DEFAULT_RETAIL_CONFIG, DEFAULT_GAMING_CONFIG } from '@/types/portalConfig';

const SUPPORTED_PORTALS = ['banking', 'pharmacy', 'retail', 'gaming'];

interface PortalPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portalType: string;
  portalConfig?: PortalConfig;
  brandingOverrides?: {
    bankName?: string;
    accentColor?: string;
    logoUrl?: string;
  };
  userNameOverride?: string;
  userEmailOverride?: string;
}

export function PortalPreviewDialog({
  open, onOpenChange, portalType, portalConfig,
  brandingOverrides, userNameOverride, userEmailOverride,
}: PortalPreviewDialogProps) {
  const [verifyAction, setVerifyAction] = useState<string | null>(null);

  if (!SUPPORTED_PORTALS.includes(portalType)) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Portal Preview</DialogTitle>
            <DialogDescription>
              The "{portalType}" portal is not yet available. Supported portals: {SUPPORTED_PORTALS.join(', ')}.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const isPharmacy = portalType === 'pharmacy';
  const isRetail = portalType === 'retail';
  const defaultConfig = isPharmacy ? DEFAULT_PHARMACY_CONFIG : isRetail ? DEFAULT_RETAIL_CONFIG : DEFAULT_BANKING_CONFIG;
  const config = { ...defaultConfig, ...portalConfig };
  const portalName = isPharmacy
    ? (brandingOverrides?.bankName || config.pharmacyName || 'Demo Pharmacy')
    : isRetail
    ? (brandingOverrides?.bankName || config.retailStoreName || 'Demo Store')
    : (brandingOverrides?.bankName || config.bankName || 'Demo Bank');
  const defaultAccent = isPharmacy ? '#DC2626' : isRetail ? '#6366F1' : '#2563EB';
  const accentColor = brandingOverrides?.accentColor || config.accentColor || defaultAccent;
  const logoUrl = brandingOverrides?.logoUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[85vh] p-0 overflow-hidden">
        <div className="h-full overflow-auto">
          {isPharmacy ? (
            <PharmacyPortalShell
              userName={userNameOverride || config.userName || 'Jane Cooper'}
              userEmail={userEmailOverride || config.userEmail || 'jane.cooper@email.com'}
              accentColor={accentColor}
              logoUrl={logoUrl}
              pharmacyName={portalName}
              portalConfig={config}
              onTriggerVerification={(action) => setVerifyAction(action)}
              onLogout={() => onOpenChange(false)}
            />
          ) : isRetail ? (
            <RetailPortalShell
              userName={userNameOverride || config.userName || 'Jane Cooper'}
              userEmail={userEmailOverride || config.userEmail || 'jane.cooper@email.com'}
              accentColor={accentColor}
              logoUrl={logoUrl}
              storeName={portalName}
              portalConfig={config}
              onTriggerVerification={(trigger) => setVerifyAction(trigger.action)}
              onLogout={() => onOpenChange(false)}
            />
          ) : (
            <BankingPortalShell
              userName={userNameOverride || config.userName || 'Jane Cooper'}
              userEmail={userEmailOverride || config.userEmail || 'jane.cooper@email.com'}
              accentColor={accentColor}
              logoUrl={logoUrl}
              bankName={portalName}
              portalConfig={config}
              onTriggerVerification={(trigger) => setVerifyAction(trigger.action)}
              onLogout={() => onOpenChange(false)}
            />
          )}
        </div>
        {verifyAction && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg text-sm">
            Verification triggered: "{verifyAction}"
            <button
              className="ml-3 underline text-xs"
              onClick={() => setVerifyAction(null)}
            >
              Dismiss
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}