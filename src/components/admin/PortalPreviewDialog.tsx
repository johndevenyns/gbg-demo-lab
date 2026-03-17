import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { BankingPortalShell } from '@/components/preview/mockPortal/BankingPortalShell';
import { PortalConfig, DEFAULT_BANKING_CONFIG } from '@/types/portalConfig';

interface PortalPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portalType: string;
  portalConfig?: PortalConfig;
  /** Override branding for demo-level preview */
  brandingOverrides?: {
    bankName?: string;
    accentColor?: string;
    logoUrl?: string;
  };
  /** Override the user name displayed in the portal */
  userNameOverride?: string;
  /** Override the user email displayed in the portal */
  userEmailOverride?: string;
}

export function PortalPreviewDialog({
  open,
  onOpenChange,
  portalType,
  portalConfig,
  brandingOverrides,
  userNameOverride,
  userEmailOverride,
}: PortalPreviewDialogProps) {
  const [verifyAction, setVerifyAction] = useState<string | null>(null);

  if (portalType !== 'banking') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Portal Preview</DialogTitle>
            <DialogDescription>
              The "{portalType}" portal is not yet available. Only the Banking portal is implemented.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const config = { ...DEFAULT_BANKING_CONFIG, ...portalConfig };
  const bankName = brandingOverrides?.bankName || config.bankName || 'Demo Bank';
  const accentColor = brandingOverrides?.accentColor || config.accentColor || '#2563EB';
  const logoUrl = brandingOverrides?.logoUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[85vh] p-0 overflow-hidden">
        <div className="h-full overflow-auto">
          <BankingPortalShell
            userName={config.userName || 'Jane Cooper'}
            userEmail={config.userEmail || 'jane.cooper@email.com'}
            accentColor={accentColor}
            logoUrl={logoUrl}
            bankName={bankName}
            portalConfig={config}
            onTriggerVerification={(action) => setVerifyAction(action)}
            onLogout={() => onOpenChange(false)}
          />
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
