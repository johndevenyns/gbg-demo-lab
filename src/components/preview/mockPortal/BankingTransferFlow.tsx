import { useState, useMemo } from 'react';
import { PortalConfig, PortalAccount, DEFAULT_BANKING_CONFIG, PortalVerificationTrigger } from '@/types/portalConfig';

type TransferStep = 'form' | 'review' | 'success';

interface BankingTransferFlowProps {
  userName: string;
  accentColor: string;
  portalConfig?: PortalConfig;
  onTriggerVerification: (trigger: PortalVerificationTrigger, txContext?: { amount?: number; recipientName?: string; fromAccount?: string }) => void;
  onBack: () => void;
}

export function BankingTransferFlow({
  userName,
  accentColor,
  portalConfig,
  onTriggerVerification,
  onBack,
}: BankingTransferFlowProps) {
  const config = { ...DEFAULT_BANKING_CONFIG, ...portalConfig };
  const accounts = config.accounts || DEFAULT_BANKING_CONFIG.accounts!;
  const triggers = config.verificationTriggers || DEFAULT_BANKING_CONFIG.verificationTriggers!;
  const transferTrigger = triggers.find(t => t.action === 'send a transfer');

  const [step, setStep] = useState<TransferStep>('form');
  const [fromAccount, setFromAccount] = useState(0);
  const [recipientName, setRecipientName] = useState('');
  const [recipientAccount, setRecipientAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');

  const parsedAmount = parseFloat(amount) || 0;
  const requiresVerification = transferTrigger?.enabled &&
    transferTrigger.condition === 'threshold' &&
    parsedAmount >= (transferTrigger.thresholdAmount || 500);

  const canProceed = recipientName.trim() && recipientAccount.trim() && parsedAmount > 0;

  const handleReview = () => {
    if (!canProceed) return;
    setStep('review');
  };

  const handleConfirm = () => {
    if (requiresVerification && transferTrigger) {
      onTriggerVerification(transferTrigger);
    } else {
      setStep('success');
    }
  };

  // Called after verification completes successfully
  const handleVerificationComplete = () => {
    setStep('success');
  };

  const sectionStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: '16px',
    border: '1px solid #E2E8F0',
    padding: '24px',
    marginBottom: '20px',
  };

  if (step === 'success') {
    return (
      <div style={{ padding: '24px', maxWidth: '500px', margin: '0 auto' }}>
        <div style={{ ...sectionStyle, textAlign: 'center', padding: '48px 32px' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: '#ECFDF5', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', fontSize: '32px',
          }}>
            ✓
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#059669', margin: '0 0 8px' }}>
            Transfer Sent!
          </h2>
          <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 4px' }}>
            ${parsedAmount.toFixed(2)} sent to {recipientName}
          </p>
          <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 24px' }}>
            From {accounts[fromAccount]?.name} •••• {accounts[fromAccount]?.lastFour}
          </p>
          <button
            onClick={onBack}
            style={{
              padding: '12px 32px', borderRadius: '10px',
              border: 'none', background: accentColor,
              color: 'white', fontSize: '14px', fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (step === 'review') {
    return (
      <div style={{ padding: '24px', maxWidth: '500px', margin: '0 auto' }}>
        <div style={{ marginBottom: '20px' }}>
          <button onClick={() => setStep('form')} style={{
            background: 'none', border: 'none', color: accentColor,
            fontSize: '14px', fontWeight: 500, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            ← Back to form
          </button>
        </div>

        <div style={sectionStyle}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: '0 0 20px' }}>
            Review Transfer
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: '14px', color: '#64748B' }}>From</span>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>
                {accounts[fromAccount]?.name} •••• {accounts[fromAccount]?.lastFour}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: '14px', color: '#64748B' }}>To</span>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A' }}>{recipientName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: '14px', color: '#64748B' }}>Account</span>
              <span style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A', fontFamily: 'SF Mono, monospace' }}>
                •••• {recipientAccount.slice(-4)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: '14px', color: '#64748B' }}>Amount</span>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', fontFamily: 'SF Mono, monospace' }}>
                ${parsedAmount.toFixed(2)}
              </span>
            </div>
            {memo && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0' }}>
                <span style={{ fontSize: '14px', color: '#64748B' }}>Memo</span>
                <span style={{ fontSize: '14px', color: '#0F172A' }}>{memo}</span>
              </div>
            )}
          </div>

          {requiresVerification && (
            <div style={{
              marginTop: '16px', padding: '12px 16px', borderRadius: '10px',
              background: '#FEF3C7', border: '1px solid #FDE68A',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <span style={{ fontSize: '16px' }}>🔐</span>
              <p style={{ fontSize: '13px', color: '#92400E', margin: 0 }}>
                Identity verification required for transfers over ${transferTrigger?.thresholdAmount?.toLocaleString()}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button
              onClick={() => setStep('form')}
              style={{
                flex: 1, padding: '12px', borderRadius: '10px',
                border: '1px solid #E2E8F0', background: 'white',
                color: '#64748B', fontSize: '14px', fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Edit
            </button>
            <button
              onClick={handleConfirm}
              style={{
                flex: 1, padding: '12px', borderRadius: '10px',
                border: 'none', background: accentColor,
                color: 'white', fontSize: '14px', fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {requiresVerification ? 'Verify & Send' : 'Send Transfer'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Transfer Form
  return (
    <div style={{ padding: '24px', maxWidth: '500px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Send Transfer</h1>
          <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>
            Transfer funds to another account
          </p>
        </div>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: accentColor,
          fontSize: '14px', fontWeight: 500, cursor: 'pointer',
        }}>
          Cancel
        </button>
      </div>

      <div style={sectionStyle}>
        {/* From Account */}
        <label style={{ display: 'block', marginBottom: '16px' }}>
          <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
            From Account
          </span>
          <select
            value={fromAccount}
            onChange={(e) => setFromAccount(Number(e.target.value))}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: '10px',
              border: '1px solid #E2E8F0', fontSize: '14px', color: '#0F172A',
              background: 'white', cursor: 'pointer',
            }}
          >
            {accounts.map((acct, i) => (
              <option key={i} value={i}>
                {acct.name} •••• {acct.lastFour} — {acct.balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </option>
            ))}
          </select>
        </label>

        {/* Recipient Name */}
        <label style={{ display: 'block', marginBottom: '16px' }}>
          <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
            Recipient Name
          </span>
          <input
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="John Smith"
            style={{
              width: '100%', padding: '12px 14px', borderRadius: '10px',
              border: '1px solid #E2E8F0', fontSize: '14px', color: '#0F172A',
              outline: 'none',
            }}
          />
        </label>

        {/* Recipient Account */}
        <label style={{ display: 'block', marginBottom: '16px' }}>
          <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
            Recipient Account Number
          </span>
          <input
            type="text"
            value={recipientAccount}
            onChange={(e) => setRecipientAccount(e.target.value)}
            placeholder="1234567890"
            style={{
              width: '100%', padding: '12px 14px', borderRadius: '10px',
              border: '1px solid #E2E8F0', fontSize: '14px', color: '#0F172A',
              outline: 'none',
            }}
          />
        </label>

        {/* Amount */}
        <label style={{ display: 'block', marginBottom: '16px' }}>
          <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
            Amount
          </span>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
              fontSize: '14px', color: '#94A3B8', fontWeight: 500,
            }}>$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              style={{
                width: '100%', padding: '12px 14px 12px 28px', borderRadius: '10px',
                border: '1px solid #E2E8F0', fontSize: '14px', color: '#0F172A',
                outline: 'none',
              }}
            />
          </div>
          {transferTrigger?.enabled && transferTrigger.condition === 'threshold' && (
            <p style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
              Transfers over ${transferTrigger.thresholdAmount?.toLocaleString()} require identity verification
            </p>
          )}
        </label>

        {/* Memo */}
        <label style={{ display: 'block', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
            Memo <span style={{ color: '#94A3B8', fontWeight: 400 }}>(optional)</span>
          </span>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="What's this for?"
            style={{
              width: '100%', padding: '12px 14px', borderRadius: '10px',
              border: '1px solid #E2E8F0', fontSize: '14px', color: '#0F172A',
              outline: 'none',
            }}
          />
        </label>
      </div>

      <button
        onClick={handleReview}
        disabled={!canProceed}
        style={{
          width: '100%', padding: '14px', borderRadius: '10px',
          border: 'none', background: canProceed ? accentColor : '#CBD5E1',
          color: 'white', fontSize: '15px', fontWeight: 600,
          cursor: canProceed ? 'pointer' : 'not-allowed',
          opacity: canProceed ? 1 : 0.7,
        }}
      >
        Review Transfer
      </button>
    </div>
  );
}
