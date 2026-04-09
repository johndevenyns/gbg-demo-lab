import { useState, useCallback } from 'react';
import { InsuranceDashboard } from './InsuranceDashboard';
import { InsurancePoliciesPage } from './InsurancePoliciesPage';
import { InsuranceClaimsPage } from './InsuranceClaimsPage';
import { InsuranceSettings } from './InsuranceSettings';
import { PortalConfig, PortalBranding, DEFAULT_INSURANCE_CONFIG, PortalVerificationTrigger } from '@/types/portalConfig';
import { getReadableTextColor } from '@/lib/formStyleUtils';

type PortalPage = 'dashboard' | 'policies' | 'claims' | 'settings';

export interface InsurancePortalShellProps {
  userName: string;
  userEmail: string;
  accentColor: string;
  logoUrl?: string;
  companyName: string;
  portalConfig?: PortalConfig;
  branding?: PortalBranding;
  isNewAccount?: boolean;
  onTriggerVerification: (trigger: PortalVerificationTrigger, txContext?: { amount?: number; recipientName?: string; fromAccount?: string }) => void;
  onLogout: () => void;
}

export function InsurancePortalShell({
  userName, userEmail, accentColor, logoUrl, companyName,
  portalConfig, branding, isNewAccount, onTriggerVerification, onLogout,
}: InsurancePortalShellProps) {
  const config = { ...DEFAULT_INSURANCE_CONFIG, ...portalConfig };
  const [activePage, setActivePage] = useState<PortalPage>('dashboard');

  const handleFileClaim = useCallback(() => {
    const triggers = config.verificationTriggers || DEFAULT_INSURANCE_CONFIG.verificationTriggers!;
    const claimTrigger = triggers.find(t => t.id === 'ins-claim' && t.enabled);
    if (claimTrigger) {
      onTriggerVerification(claimTrigger, { amount: 1500 });
    }
  }, [config.verificationTriggers, onTriggerVerification]);

  const handleModifyPolicy = useCallback(() => {
    const triggers = config.verificationTriggers || DEFAULT_INSURANCE_CONFIG.verificationTriggers!;
    const trigger = triggers.find(t => t.id === 'ins-policy-change' && t.enabled);
    if (trigger) onTriggerVerification(trigger);
  }, [config.verificationTriggers, onTriggerVerification]);

  const handleSettingsTrigger = useCallback((action: string) => {
    const triggers = config.verificationTriggers || DEFAULT_INSURANCE_CONFIG.verificationTriggers!;
    const trigger = triggers.find(t => t.action === action);
    if (trigger) onTriggerVerification(trigger);
  }, [config.verificationTriggers, onTriggerVerification]);

  const initials = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const brandAccent = branding?.accentColor || accentColor;
  const headerBg = branding?.sidebarBg || '#FFFFFF';
  const headerText = getReadableTextColor(branding?.sidebarText || '#0F172A', headerBg);
  const pageBg = branding?.pageBg || '#F8FAFC';
  const fontFamily = branding?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  const navItems: { key: PortalPage; label: string; icon: string }[] = [
    { key: 'dashboard', label: 'Overview', icon: '🏠' },
    { key: 'policies', label: 'Policies', icon: '📋' },
    { key: 'claims', label: 'Claims', icon: '📝' },
    { key: 'settings', label: 'Account', icon: '👤' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: pageBg, fontFamily }}>
      {/* Header */}
      <header style={{
        background: headerBg, borderBottom: '1px solid #E2E8F0',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        {/* Promo / Info Bar */}
        <div style={{
          background: '#0F172A', color: 'white', fontSize: '12px',
          padding: '8px 24px', textAlign: 'center', fontWeight: 500,
          letterSpacing: '0.3px',
        }}>
          🛡️ Bundle & save up to 25% · Get a free quote today
        </div>

        {/* Main Header */}
        <div style={{
          padding: '14px 24px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', maxWidth: '1200px', margin: '0 auto',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
            onClick={() => setActivePage('dashboard')}
          >
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} style={{ height: '32px', maxWidth: '160px', objectFit: 'contain' }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: `linear-gradient(135deg, ${brandAccent}, ${brandAccent}cc)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: '16px', fontWeight: 800,
                }}>🛡️</div>
                <span style={{ fontWeight: 700, fontSize: '20px', color: headerText, letterSpacing: '-0.5px' }}>{companyName}</span>
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div style={{ flex: 1, maxWidth: '480px', margin: '0 32px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search policies, claims, coverage..."
              style={{
                width: '100%', padding: '10px 16px 10px 40px',
                border: '2px solid #E2E8F0', borderRadius: '12px',
                fontSize: '14px', outline: 'none', background: '#FAFAFA',
              }}
              readOnly
              onFocus={(e) => { e.currentTarget.style.borderColor = brandAccent; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
            />
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', color: '#94A3B8' }}>🔍</span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setActivePage('settings')}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 14px', borderRadius: '10px', border: 'none',
                background: 'transparent', cursor: 'pointer', transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#F1F5F9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: `linear-gradient(135deg, ${brandAccent}, ${brandAccent}bb)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '12px', fontWeight: 600,
              }}>{initials}</div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: headerText }}>{userName.split(' ')[0]}</span>
            </button>
            <button onClick={onLogout} title="Sign out" style={{
              background: 'none', border: 'none', color: '#94A3B8',
              cursor: 'pointer', fontSize: '18px', padding: '8px',
              borderRadius: '8px', transition: 'all 0.2s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.background = '#FEF2F2'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#94A3B8'; e.currentTarget.style.background = 'none'; }}
            >
              ↗
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav style={{
          display: 'flex', gap: '0', maxWidth: '1200px', margin: '0 auto',
          padding: '0 24px', borderTop: '1px solid #F3F4F6',
        }}>
          {navItems.map(item => {
            const isActive = activePage === item.key;
            return (
              <button key={item.key} onClick={() => setActivePage(item.key)} style={{
                padding: '10px 22px', border: 'none', cursor: 'pointer',
                background: 'transparent', fontSize: '14px',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? brandAccent : '#64748B',
                borderBottom: isActive ? `2px solid ${brandAccent}` : '2px solid transparent',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = brandAccent; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = '#64748B'; }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {activePage === 'dashboard' && (
          <InsuranceDashboard
            userName={userName}
            accentColor={brandAccent}
            portalConfig={config}
            isNewAccount={isNewAccount}
            onNavigate={(page) => setActivePage(page as PortalPage)}
            onFileClaim={handleFileClaim}
          />
        )}
        {activePage === 'policies' && (
          <InsurancePoliciesPage
            accentColor={brandAccent}
            portalConfig={config}
            onModifyPolicy={handleModifyPolicy}
          />
        )}
        {activePage === 'claims' && (
          <InsuranceClaimsPage
            accentColor={brandAccent}
            portalConfig={config}
            onFileClaim={handleFileClaim}
          />
        )}
        {activePage === 'settings' && (
          <InsuranceSettings
            userName={userName}
            userEmail={userEmail}
            userPhone={config.userPhone || '(555) 867-5309'}
            accentColor={brandAccent}
            portalConfig={config}
            onTriggerVerification={handleSettingsTrigger}
          />
        )}
      </main>
    </div>
  );
}
