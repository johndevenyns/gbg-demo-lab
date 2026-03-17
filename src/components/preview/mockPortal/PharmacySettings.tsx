import { useState } from 'react';
import { PortalConfig, DEFAULT_PHARMACY_CONFIG } from '@/types/portalConfig';

interface PharmacySettingsProps {
  userName: string;
  userEmail: string;
  userPhone: string;
  accentColor: string;
  portalConfig?: PortalConfig;
  onTriggerVerification: (action: string) => void;
}

function SettingItem({ label, value, sensitive, accentColor, onEdit }: {
  label: string; value: string; sensitive?: boolean; accentColor: string; onEdit?: () => void;
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

function ToggleSetting({ label, description, checked, onChange, accentColor }: {
  label: string; description: string; checked: boolean; onChange: (val: boolean) => void; accentColor: string;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 0', borderBottom: '1px solid #F1F5F9',
    }}>
      <div>
        <p style={{ fontSize: '15px', color: '#0F172A', fontWeight: 500, margin: 0 }}>{label}</p>
        <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0' }}>{description}</p>
      </div>
      <button onClick={() => onChange(!checked)} style={{
        width: '44px', height: '24px', borderRadius: '12px',
        background: checked ? accentColor : '#CBD5E1',
        border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}>
        <div style={{
          width: '20px', height: '20px', borderRadius: '50%', background: 'white',
          position: 'absolute', top: '2px', left: checked ? '22px' : '2px',
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </button>
    </div>
  );
}

function VerifyDialog({ open, action, accentColor, onVerify, onCancel }: {
  open: boolean; action: string; accentColor: string; onVerify: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'white', borderRadius: '16px', padding: '32px',
        maxWidth: '400px', width: '90%', textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: `${accentColor}15`, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', fontSize: '24px',
        }}>
          🔐
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>
          Identity Verification Required
        </h3>
        <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 24px', lineHeight: 1.5 }}>
          For your security and HIPAA compliance, we need to verify your identity before you can {action.toLowerCase()}.
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '12px', borderRadius: '10px',
            border: '1px solid #E2E8F0', background: 'white',
            color: '#64748B', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={onVerify} style={{
            flex: 1, padding: '12px', borderRadius: '10px',
            border: 'none', background: accentColor,
            color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
          }}>Verify Identity</button>
        </div>
      </div>
    </div>
  );
}

export function PharmacySettings({ userName, userEmail, userPhone, accentColor, portalConfig, onTriggerVerification }: PharmacySettingsProps) {
  const config = { ...DEFAULT_PHARMACY_CONFIG, ...portalConfig };
  const triggers = config.verificationTriggers || DEFAULT_PHARMACY_CONFIG.verificationTriggers!;
  const isTriggerEnabled = (action: string) => triggers.find(t => t.action === action)?.enabled ?? true;

  const [refillReminders, setRefillReminders] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [healthAlerts, setHealthAlerts] = useState(true);
  const [autoRefill, setAutoRefill] = useState(false);

  const [verifyDialog, setVerifyDialog] = useState<{ open: boolean; action: string }>({ open: false, action: '' });

  const handleSensitiveAction = (action: string) => {
    setVerifyDialog({ open: true, action });
  };

  const handleVerify = () => {
    const action = verifyDialog.action;
    setVerifyDialog({ open: false, action: '' });
    onTriggerVerification(action);
  };

  const sectionStyle: React.CSSProperties = {
    background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0',
    padding: '20px 24px', marginBottom: '20px',
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '16px', fontWeight: 600, color: '#0F172A',
    margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px',
  };

  const sectionDescStyle: React.CSSProperties = {
    fontSize: '13px', color: '#94A3B8', margin: '0 0 12px',
  };

  return (
    <div style={{ padding: '24px', maxWidth: '700px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Settings</h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>
          Manage your account, prescriptions, and security
        </p>
      </div>

      {/* Profile */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}><span>👤</span> Profile Information</h3>
        <p style={sectionDescStyle}>Your personal details</p>
        <SettingItem label="Full Name" value={userName} accentColor={accentColor}
          onEdit={isTriggerEnabled('change your name') ? () => handleSensitiveAction('change your name') : undefined} />
        <SettingItem label="Email Address" value={userEmail} accentColor={accentColor} sensitive
          onEdit={isTriggerEnabled('change your email address') ? () => handleSensitiveAction('change your email address') : undefined} />
        <SettingItem label="Phone Number" value={userPhone} accentColor={accentColor} sensitive
          onEdit={isTriggerEnabled('change your phone number') ? () => handleSensitiveAction('change your phone number') : undefined} />
        <div style={{ padding: '14px 0' }}>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>Member Since</p>
          <p style={{ fontSize: '15px', color: '#0F172A', fontWeight: 500, margin: '2px 0 0' }}>January 2023</p>
        </div>
      </div>

      {/* Insurance */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}><span>🏥</span> Insurance Information</h3>
        <p style={sectionDescStyle}>Your prescription coverage details</p>
        <SettingItem label="Insurance Provider" value={config.insuranceProvider || 'Not set'} accentColor={accentColor}
          onEdit={isTriggerEnabled('update your insurance information') ? () => handleSensitiveAction('update your insurance information') : undefined} />
        <SettingItem label="Member ID" value={config.insuranceMemberId || '—'} accentColor={accentColor} sensitive />
        <SettingItem label="Preferred Store" value={config.preferredStore || '—'} accentColor={accentColor} />
      </div>

      {/* Security */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}><span>🔒</span> Security</h3>
        <p style={sectionDescStyle}>Protect your account and health data</p>
        <SettingItem label="Password" value="••••••••••" accentColor={accentColor} sensitive
          onEdit={isTriggerEnabled('change your password') ? () => handleSensitiveAction('change your password') : undefined} />
        <SettingItem label="Two-Factor Authentication" value="Enabled via SMS" accentColor={accentColor} sensitive
          onEdit={isTriggerEnabled('update two-factor authentication') ? () => handleSensitiveAction('update two-factor authentication') : undefined} />
        <SettingItem label="Authorized Pickup Persons" value="2 people authorized" accentColor={accentColor}
          onEdit={isTriggerEnabled('add a new authorized pickup person') ? () => handleSensitiveAction('add a new authorized pickup person') : undefined} />
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0',
        }}>
          <div>
            <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>Last Sign-in</p>
            <p style={{ fontSize: '15px', color: '#0F172A', fontWeight: 500, margin: '2px 0 0' }}>
              Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <span style={{ fontSize: '12px', color: '#059669', background: '#ECFDF5', padding: '4px 10px', borderRadius: '20px', fontWeight: 500 }}>
            Active
          </span>
        </div>
      </div>

      {/* Prescription Preferences */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}><span>💊</span> Prescription Preferences</h3>
        <p style={sectionDescStyle}>Manage how your prescriptions are handled</p>
        <ToggleSetting label="Auto-Refill" description="Automatically refill eligible prescriptions" checked={autoRefill} onChange={setAutoRefill} accentColor={accentColor} />
        <ToggleSetting label="Refill Reminders" description="Get notified when a refill is due" checked={refillReminders} onChange={setRefillReminders} accentColor={accentColor} />
        <ToggleSetting label="Order Status Updates" description="Notifications when your order is ready" checked={orderUpdates} onChange={setOrderUpdates} accentColor={accentColor} />
        <ToggleSetting label="Health Alerts" description="Drug interaction and recall notifications" checked={healthAlerts} onChange={setHealthAlerts} accentColor={accentColor} />
      </div>

      {/* Danger Zone */}
      <div style={{ ...sectionStyle, borderColor: '#FEE2E2' }}>
        <h3 style={{ ...sectionTitleStyle, color: '#DC2626' }}><span>⚠️</span> Danger Zone</h3>
        <p style={sectionDescStyle}>Irreversible actions</p>
        <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
          <button style={{
            padding: '10px 20px', borderRadius: '10px', border: '1px solid #FCA5A5',
            background: '#FEF2F2', color: '#DC2626', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          }}>Close Account</button>
          <button style={{
            padding: '10px 20px', borderRadius: '10px', border: '1px solid #E2E8F0',
            background: 'white', color: '#64748B', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          }}>Export Health Records</button>
        </div>
      </div>

      <VerifyDialog
        open={verifyDialog.open}
        action={verifyDialog.action}
        accentColor={accentColor}
        onVerify={handleVerify}
        onCancel={() => setVerifyDialog({ open: false, action: '' })}
      />
    </div>
  );
}
