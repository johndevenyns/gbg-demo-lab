import { useState, useCallback, useMemo } from 'react';
import { DemoFlowRenderer } from '@/components/preview/DemoFlowRenderer';
import { FormStep } from '@/types/demo';
import { FormStyleConfig } from '@/types/formStyle';
import { PortalVerificationTrigger, CompletionAction } from '@/types/portalConfig';

export type PostVerificationAction = 'repeat' | 'return_to_dashboard' | 'return_to_previous';

interface StepUpVerificationModalProps {
  open: boolean;
  trigger: PortalVerificationTrigger | null;
  /** Custom form steps from use case — if not provided, falls back to default unified verification */
  customSteps?: FormStep[] | null;
  /** Pre-populated user data (first/last name) to send with the verification API call */
  userData?: { firstName?: string; lastName?: string; email?: string };
  /** Extra context to display on the completion screen (e.g. transfer amount, recipient) */
  transactionContext?: { amount?: number; recipientName?: string; fromAccount?: string };
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
  /** Called with success/failure + optional action the user chose */
  onComplete: (success: boolean, action?: PostVerificationAction) => void;
  onCancel: () => void;
}

export function StepUpVerificationModal({
  open,
  trigger,
  customSteps,
  userData,
  transactionContext,
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
  const [showCompletion, setShowCompletion] = useState(false);

  // Build initial form data from user profile for the verification API
  const initialFormData = useMemo(() => {
    const data: Record<string, string> = {};
    if (userData?.firstName) data.firstName = userData.firstName;
    if (userData?.lastName) data.lastName = userData.lastName;
    if (userData?.email) data.email = userData.email;
    return Object.keys(data).length > 0 ? data : undefined;
  }, [userData]);

  if (!open || !trigger) return null;

  const behavior = trigger.postVerificationBehavior ||
    (trigger.category === 'transaction' ? 'show_completion' : 'return_with_toast');

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
    if (!success) {
      onComplete(false);
      return;
    }

    if (behavior === 'return_with_toast') {
      // Close modal immediately — parent shows toast & reflects change
      onComplete(true, 'return_to_previous');
    } else {
      // show_completion — display rich completion screen
      setShowCompletion(true);
    }
  };

  const handleCompletionAction = (action: PostVerificationAction) => {
    setShowCompletion(false);
    onComplete(true, action);
  };

  const completionTitle = trigger.completionTitle || 'Success';
  const completionMessage = trigger.successMessage || 'Completed successfully.';
  const completionActions: CompletionAction[] = trigger.completionActions || [
    { label: 'Return to Dashboard', action: 'return_to_dashboard', variant: 'primary' },
  ];

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
        {/* Header — hide during completion */}
        {!showCompletion && (
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
        )}

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {showCompletion ? (
            <CompletionScreen
              title={completionTitle}
              message={completionMessage}
              actions={completionActions}
              accentColor={accentColor}
              transactionContext={transactionContext}
              onAction={handleCompletionAction}
            />
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

        {/* Footer cancel button — only during verification */}
        {!showCompletion && (
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

/** Rich completion screen shown after successful verification for transactions */
function CompletionScreen({
  title,
  message,
  actions,
  accentColor,
  transactionContext,
  onAction,
}: {
  title: string;
  message: string;
  actions: CompletionAction[];
  accentColor: string;
  transactionContext?: { amount?: number; recipientName?: string; fromAccount?: string };
  onAction: (action: PostVerificationAction) => void;
}) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 16px' }}>
      {/* Success icon */}
      <div style={{
        width: '72px', height: '72px', borderRadius: '50%',
        background: '#ECFDF5', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px', fontSize: '32px',
      }}>
        ✓
      </div>

      <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#059669', margin: '0 0 8px' }}>
        {title}
      </h2>

      <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 4px', lineHeight: 1.5 }}>
        {message}
      </p>

      {/* Transaction details if available */}
      {transactionContext && transactionContext.amount != null && (
        <div style={{
          margin: '16px auto', padding: '16px 20px', borderRadius: '12px',
          background: '#F8FAFC', border: '1px solid #E2E8F0',
          maxWidth: '320px',
        }}>
          <p style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px', fontFamily: 'SF Mono, monospace' }}>
            ${transactionContext.amount.toFixed(2)}
          </p>
          {transactionContext.recipientName && (
            <p style={{ fontSize: '13px', color: '#64748B', margin: '0 0 2px' }}>
              Sent to {transactionContext.recipientName}
            </p>
          )}
          {transactionContext.fromAccount && (
            <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>
              From {transactionContext.fromAccount}
            </p>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'center' }}>
        {actions.map((act, i) => (
          <button
            key={i}
            onClick={() => onAction(act.action)}
            style={{
              flex: 1, maxWidth: '200px',
              padding: '12px 20px', borderRadius: '10px',
              border: act.variant === 'primary' ? 'none' : '1px solid #E2E8F0',
              background: act.variant === 'primary' ? accentColor : 'white',
              color: act.variant === 'primary' ? 'white' : '#64748B',
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {act.label}
          </button>
        ))}
      </div>
    </div>
  );
}
