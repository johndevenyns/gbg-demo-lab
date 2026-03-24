import { useState, useCallback, useMemo } from 'react';
import { DemoFlowRenderer } from '@/components/preview/DemoFlowRenderer';
import { FormStep } from '@/types/demo';
import { FormStyleConfig } from '@/types/formStyle';
import { PortalVerificationTrigger } from '@/types/portalConfig';

interface StepUpVerificationModalProps {
  open: boolean;
  trigger: PortalVerificationTrigger | null;
  /** Custom form steps from use case — if not provided, falls back to default unified verification */
  customSteps?: FormStep[] | null;
  /** Pre-populated user data (first/last name) to send with the verification API call */
  userData?: { firstName?: string; lastName?: string; email?: string };
  // Demo branding props
  buttonColor: string;
  formStyle?: FormStyleConfig;
  customerName?: string;
  logoUrl?: string;
  headerBgColor?: string;
  headerTextColor?: string;
  resourceId?: string;
  resourceIdDocBio?: string;
  resourceIdDataBio?: string;
  resourceIdDataOnly?: string;
  demoId?: string;
  includeQr?: boolean;
  accentColor: string;
  onComplete: (success: boolean) => void;
  onCancel: () => void;
}

export function StepUpVerificationModal({
  open,
  trigger,
  customSteps,
  userData,
  buttonColor,
  formStyle,
  customerName,
  logoUrl,
  headerBgColor,
  headerTextColor,
  resourceId,
  resourceIdDocBio,
  resourceIdDataBio,
  resourceIdDataOnly,
  demoId,
  includeQr,
  accentColor,
  onComplete,
  onCancel,
}: StepUpVerificationModalProps) {
  const [showSuccess, setShowSuccess] = useState(false);

  // Build initial form data from user profile for the verification API
  const initialFormData = useMemo(() => {
    const data: Record<string, string> = {};
    if (userData?.firstName) data.firstName = userData.firstName;
    if (userData?.lastName) data.lastName = userData.lastName;
    if (userData?.email) data.email = userData.email;
    return Object.keys(data).length > 0 ? data : undefined;
  }, [userData]);

  if (!open || !trigger) return null;

  // Build default verification steps if no custom steps provided
  const steps: FormStep[] = customSteps || [{
    id: 'stepup-verify',
    title: 'Identity Verification',
    description: `Verify your identity to ${trigger.action}`,
    order: 1,
    stepType: 'unified_verification' as const,
    fields: [],
    unifiedVerificationConfig: {
      methodSelection: 'admin_preselect' as const,
      enabledTypes: [trigger.verificationType || 'docbio'],
      typeConfigs: {},
      successDestination: 'default' as const,
      failureDestination: 'default' as const,
    },
  }];

  const handleComplete = (success: boolean) => {
    if (success && trigger.successMessage) {
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onComplete(true);
      }, 2500);
    } else {
      onComplete(success);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'white', borderRadius: '16px',
        maxWidth: '540px', width: '92%', maxHeight: '85vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              background: `${accentColor}15`, display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: '20px',
            }}>
              🔐
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Identity Verification Required
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0' }}>
                Verify to {trigger.action}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            style={{
              background: 'none', border: 'none', fontSize: '20px',
              color: '#94A3B8', cursor: 'pointer', padding: '4px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {showSuccess ? (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: '#ECFDF5', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', fontSize: '28px',
              }}>
                ✓
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#059669', margin: '0 0 8px' }}>
                Verified Successfully
              </h3>
              <p style={{ fontSize: '14px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                {trigger.successMessage}
              </p>
            </div>
          ) : (
            <DemoFlowRenderer
              steps={steps}
              buttonColor={buttonColor}
              formStyle={formStyle}
              customerName={customerName}
              logoUrl={logoUrl}
              headerBgColor={headerBgColor}
              headerTextColor={headerTextColor}
              resourceId={resourceId}
              resourceIdDocBio={resourceIdDocBio}
              resourceIdDataBio={resourceIdDataBio}
              resourceIdDataOnly={resourceIdDataOnly}
              demoId={demoId}
              includeQr={includeQr}
              initialFormData={initialFormData}
              onComplete={handleComplete}
            />
          )}
        </div>

        {/* Footer cancel button */}
        {!showSuccess && (
          <div style={{ padding: '12px 24px 20px', borderTop: '1px solid #F1F5F9' }}>
            <button
              onClick={onCancel}
              style={{
                width: '100%', padding: '10px',
                background: 'transparent', border: '1px solid #E2E8F0',
                borderRadius: '10px', color: '#64748B', cursor: 'pointer',
                fontSize: '14px', fontWeight: 500,
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
