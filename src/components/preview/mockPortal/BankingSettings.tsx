import { useState } from 'react';
import { PortalConfig, DEFAULT_BANKING_CONFIG } from '@/types/portalConfig';

interface BankingSettingsProps {
  userName: string;
  userEmail: string;
  userPhone: string;
  accentColor: string;
  portalConfig?: PortalConfig;
  onTriggerVerification: (action: string) => void;
}

interface SettingItemProps {
  label: string;
  value: string;
  sensitive?: boolean;
  accentColor: string;
  onEdit?: () => void;
}

function SettingItem({ label, value, sensitive, accentColor, onEdit }: SettingItemProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 0',
      borderBottom: '1px solid #F1F5F9',
    }}>
      <div>
        <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>{label}</p>
        <p style={{ fontSize: '15px', color: '#0F172A', fontWeight: 500, margin: '2px 0 0' }}>{value}</p>
      </div>
      {onEdit && (
        <button
          onClick={onEdit}
          style={{
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

interface ToggleSettingProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  accentColor: string;
}

function ToggleSetting({ label, description, checked, onChange, accentColor }: ToggleSettingProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 0',
      borderBottom: '1px solid #F1F5F9',
    }}>
      <div>
        <p style={{ fontSize: '15px', color: '#0F172A', fontWeight: 500, margin: 0 }}>{label}</p>
        <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0' }}>{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: '44px', height: '24px', borderRadius: '12px',
          background: checked ? accentColor : '#CBD5E1',
          border: 'none', cursor: 'pointer', position: 'relative',
          transition: 'background 0.2s', flexShrink: 0,
        }}
      >
        <div style={{
          width: '20px', height: '20px', borderRadius: '50%',
          background: 'white', position: 'absolute', top: '2px',
          left: checked ? '22px' : '2px',
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </button>
    </div>
  );
}

// Verification confirmation dialog
function VerifyDialog({
  open,
  action,
  accentColor,
  onVerify,
  onCancel,
}: {
  open: boolean;
  action: string;
  accentColor: string;
  onVerify: () => void;
  onCancel: () => void;
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
          For your security, we need to verify your identity before you can {action.toLowerCase()}.
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '12px', borderRadius: '10px',
              border: '1px solid #E2E8F0', background: 'white',
              color: '#64748B', fontSize: '14px', fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onVerify}
            style={{
              flex: 1, padding: '12px', borderRadius: '10px',
              border: 'none', background: accentColor,
              color: 'white', fontSize: '14px', fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Verify Identity
          </button>
        </div>
      </div>
    </div>
  );
}

export function BankingSettings({ userName, userEmail, userPhone, accentColor, portalConfig, onTriggerVerification }: BankingSettingsProps) {
  const config = { ...DEFAULT_BANKING_CONFIG, ...portalConfig };
  const triggers = config.verificationTriggers || DEFAULT_BANKING_CONFIG.verificationTriggers!;
  const isTriggerEnabled = (action: string) => triggers.find(t => t.action === action)?.enabled ?? true;
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [transactionAlerts, setTransactionAlerts] = useState(true);

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
    background: 'white',
    borderRadius: '16px',
    border: '1px solid #E2E8F0',
    padding: '20px 24px',
    marginBottom: '20px',
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
          Manage your account preferences and security
        </p>
      </div>

      {/* Profile Section */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>
          <span>👤</span> Profile Information
        </h3>
        <p style={sectionDescStyle}>Your personal details</p>
        <SettingItem label="Full Name" value={userName} accentColor={accentColor} onEdit={() => handleSensitiveAction('change your name')} />
        <SettingItem label="Email Address" value={userEmail} accentColor={accentColor} sensitive onEdit={() => handleSensitiveAction('change your email address')} />
        <SettingItem
          label="Phone Number"
          value={userPhone}
          accentColor={accentColor}
          sensitive
          onEdit={() => handleSensitiveAction('change your phone number')}
        />
        <div style={{ padding: '14px 0' }}>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>Member Since</p>
          <p style={{ fontSize: '15px', color: '#0F172A', fontWeight: 500, margin: '2px 0 0' }}>January 2023</p>
        </div>
      </div>

      {/* Security Section */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>
          <span>🔒</span> Security
        </h3>
        <p style={sectionDescStyle}>Protect your account</p>
        <SettingItem label="Password" value="••••••••••" accentColor={accentColor} sensitive onEdit={() => handleSensitiveAction('change your password')} />
        <SettingItem label="Two-Factor Authentication" value="Enabled via SMS" accentColor={accentColor} sensitive onEdit={() => handleSensitiveAction('update two-factor authentication')} />
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 0',
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

      {/* Notification Preferences */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>
          <span>🔔</span> Notifications
        </h3>
        <p style={sectionDescStyle}>Choose how you want to be notified</p>
        <ToggleSetting
          label="SMS Notifications"
          description="Receive text messages for account updates"
          checked={smsNotifications}
          onChange={setSmsNotifications}
          accentColor={accentColor}
        />
        <ToggleSetting
          label="Email Notifications"
          description="Receive email updates and statements"
          checked={emailNotifications}
          onChange={setEmailNotifications}
          accentColor={accentColor}
        />
        <ToggleSetting
          label="Push Notifications"
          description="Get instant push notifications on your device"
          checked={pushNotifications}
          onChange={setPushNotifications}
          accentColor={accentColor}
        />
      </div>

      {/* Alert Preferences */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>
          <span>⚠️</span> Alerts
        </h3>
        <p style={sectionDescStyle}>Real-time alerts for your account activity</p>
        <ToggleSetting
          label="Login Alerts"
          description="Notify me when someone logs into my account"
          checked={loginAlerts}
          onChange={setLoginAlerts}
          accentColor={accentColor}
        />
        <ToggleSetting
          label="Transaction Alerts"
          description="Notify me for transactions over $100"
          checked={transactionAlerts}
          onChange={setTransactionAlerts}
          accentColor={accentColor}
        />
      </div>

      {/* Danger Zone */}
      <div style={{ ...sectionStyle, borderColor: '#FEE2E2' }}>
        <h3 style={{ ...sectionTitleStyle, color: '#DC2626' }}>
          <span>⚠️</span> Danger Zone
        </h3>
        <p style={sectionDescStyle}>Irreversible actions</p>
        <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
          <button style={{
            padding: '10px 20px', borderRadius: '10px', border: '1px solid #FCA5A5',
            background: '#FEF2F2', color: '#DC2626', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer',
          }}>
            Close Account
          </button>
          <button style={{
            padding: '10px 20px', borderRadius: '10px', border: '1px solid #E2E8F0',
            background: 'white', color: '#64748B', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer',
          }}>
            Export Data
          </button>
        </div>
      </div>

      {/* Verify Dialog */}
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
