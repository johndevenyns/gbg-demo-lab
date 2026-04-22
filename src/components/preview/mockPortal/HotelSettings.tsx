import { useState } from 'react';
import { PortalConfig, DEFAULT_HOTEL_CONFIG } from '@/types/portalConfig';

interface HotelSettingsProps {
  userName: string;
  userEmail: string;
  userPhone: string;
  accentColor: string;
  portalConfig?: PortalConfig;
  onTriggerVerification: (action: string) => void;
}

function SettingItem({ label, value, accentColor, sensitive, onEdit }: {
  label: string; value: string; accentColor: string; sensitive?: boolean; onEdit?: () => void;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 0', borderBottom: '1px solid #F1F5F9',
    }}>
      <div>
        <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>{label}</p>
        <p style={{ fontSize: '15px', color: '#0F172A', fontWeight: 500, margin: '2px 0 0' }}>{value}</p>
      </div>
      {onEdit && (
        <button onClick={onEdit} style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '6px 14px', fontSize: '13px', fontWeight: 500,
          color: accentColor, background: `${accentColor}10`,
          border: `1px solid ${accentColor}30`, borderRadius: '8px',
          cursor: 'pointer', transition: 'all 0.2s',
        }}
          onMouseEnter={(e) => { e.currentTarget.style.background = `${accentColor}20`; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = `${accentColor}10`; }}
        >
          {sensitive && <span style={{ fontSize: '12px' }}>🔒</span>}
          Change
        </button>
      )}
    </div>
  );
}

function VerifyDialog({ open, action, accentColor, onVerify, onCancel }: {
  open: boolean; action: string; accentColor: string; onVerify: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'white', borderRadius: '16px', padding: '32px', maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: `${accentColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '24px' }}>🔐</div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>Identity Verification Required</h3>
        <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 24px', lineHeight: 1.5 }}>
          For your security, we need to verify your identity before you can {action.toLowerCase()}.
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', background: 'white', color: '#64748B', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          <button onClick={onVerify} style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: accentColor, color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Verify Identity</button>
        </div>
      </div>
    </div>
  );
}

const CARD_NAMES: Record<string, string> = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express' };

export function HotelSettings({ userName, userEmail, userPhone, accentColor, portalConfig, onTriggerVerification }: HotelSettingsProps) {
  const config = { ...DEFAULT_HOTEL_CONFIG, ...portalConfig };
  const triggers = config.verificationTriggers || DEFAULT_HOTEL_CONFIG.verificationTriggers!;
  const isTriggerEnabled = (action: string) => triggers.find(t => t.action === action)?.enabled ?? true;
  const paymentMethods = config.hotelPaymentMethods || DEFAULT_HOTEL_CONFIG.hotelPaymentMethods!;

  const [verifyDialog, setVerifyDialog] = useState<{ open: boolean; action: string }>({ open: false, action: '' });

  const handleSensitiveAction = (action: string) => setVerifyDialog({ open: true, action });
  const handleVerify = () => { const a = verifyDialog.action; setVerifyDialog({ open: false, action: '' }); onTriggerVerification(a); };

  const sectionStyle: React.CSSProperties = { background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '20px 24px', marginBottom: '20px' };
  const sectionTitleStyle: React.CSSProperties = { fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' };
  const sectionDescStyle: React.CSSProperties = { fontSize: '13px', color: '#94A3B8', margin: '0 0 12px' };

  return (
    <div style={{ padding: '24px', maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Account Settings</h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>Manage your profile, payment, and stay preferences</p>
      </div>

      {/* Profile Section */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}><span>👤</span> Personal Information</h3>
        <p style={sectionDescStyle}>Your account details</p>
        <SettingItem label="Full Name" value={userName} accentColor={accentColor}
          onEdit={isTriggerEnabled('change your name') ? () => handleSensitiveAction('change your name') : undefined} />
        <SettingItem label="Email Address" value={userEmail} accentColor={accentColor} sensitive
          onEdit={isTriggerEnabled('change your email address') ? () => handleSensitiveAction('change your email address') : undefined} />
        <SettingItem label="Phone Number" value={userPhone} accentColor={accentColor} sensitive
          onEdit={isTriggerEnabled('change your phone number') ? () => handleSensitiveAction('change your phone number') : undefined} />
      </div>

      {/* Loyalty */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}><span>🏆</span> Loyalty Program</h3>
        <p style={sectionDescStyle}>Earn points and unlock rewards on every stay</p>
        <div style={{ padding: '14px 0', borderBottom: '1px solid #F1F5F9' }}>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>Member Number</p>
          <p style={{ fontSize: '15px', color: '#0F172A', fontWeight: 500, margin: '2px 0 0' }}>
            {config.hotelLoyaltyNumber || 'HTL-9284751'}
            <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: 600, padding: '2px 10px', borderRadius: '4px', background: '#FEF3C7', color: '#92400E' }}>
              {config.hotelLoyaltyTier || 'Platinum'} Tier
            </span>
          </p>
        </div>
        <SettingItem label="Loyalty Profile" value="Preferences, room type, bed type" accentColor={accentColor}
          onEdit={isTriggerEnabled('update your loyalty profile') ? () => handleSensitiveAction('update your loyalty profile') : undefined} />
      </div>

      {/* Security */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}><span>🔐</span> Security</h3>
        <p style={sectionDescStyle}>Keep your account secure</p>
        <SettingItem label="Password" value="••••••••••" accentColor={accentColor} sensitive
          onEdit={isTriggerEnabled('change your password') ? () => handleSensitiveAction('change your password') : undefined} />
      </div>

      {/* Payment */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}><span>💳</span> Payment Methods</h3>
        <p style={sectionDescStyle}>Cards on file for your bookings</p>
        {paymentMethods.map((pm, idx) => (
          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: idx < paymentMethods.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>💳</div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
                  {CARD_NAMES[pm.type] || pm.type} •••• {pm.lastFour}
                  {pm.isDefault && <span style={{ marginLeft: '8px', fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: `${accentColor}15`, color: accentColor }}>DEFAULT</span>}
                </p>
                <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0' }}>Expires {pm.expiryDate}</p>
              </div>
            </div>
            {isTriggerEnabled('update your payment method') && (
              <button onClick={() => handleSensitiveAction('update your payment method')} style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px', fontSize: '13px', fontWeight: 500,
                color: accentColor, background: `${accentColor}10`,
                border: `1px solid ${accentColor}30`, borderRadius: '8px', cursor: 'pointer',
              }}>
                <span style={{ fontSize: '12px' }}>🔒</span>
                Update
              </button>
            )}
          </div>
        ))}
      </div>

      <VerifyDialog open={verifyDialog.open} action={verifyDialog.action} accentColor={accentColor}
        onVerify={handleVerify} onCancel={() => setVerifyDialog({ open: false, action: '' })} />
    </div>
  );
}