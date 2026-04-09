import { useState, useCallback } from 'react';
import { PharmacyDashboard } from './PharmacyDashboard';
import { PharmacyPrescriptionsPage } from './PharmacyPrescriptionsPage';
import { PharmacyOrdersPage } from './PharmacyOrdersPage';
import { PharmacySettings } from './PharmacySettings';
import { PortalConfig, PortalBranding, DEFAULT_PHARMACY_CONFIG } from '@/types/portalConfig';

type PortalPage = 'dashboard' | 'prescriptions' | 'orders' | 'settings';

export interface PharmacyPortalShellProps {
  userName: string;
  userEmail: string;
  accentColor: string;
  logoUrl?: string;
  pharmacyName: string;
  portalConfig?: PortalConfig;
  branding?: PortalBranding;
  onTriggerVerification: (action: string) => void;
  onLogout: () => void;
}

export function PharmacyPortalShell({
  userName, userEmail, accentColor, logoUrl, pharmacyName,
  portalConfig, branding, onTriggerVerification, onLogout,
}: PharmacyPortalShellProps) {
  const config = { ...DEFAULT_PHARMACY_CONFIG, ...portalConfig };
  const [activePage, setActivePage] = useState<PortalPage>('dashboard');

  const handleTriggerVerification = useCallback((action: string) => {
    onTriggerVerification(action);
  }, [onTriggerVerification]);

  const initials = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const brandAccent = branding?.accentColor || accentColor;
  const headerBg = branding?.sidebarBg || '#FFFFFF';
  const headerText = getReadableTextColor(branding?.sidebarText || '#1E293B', headerBg);
  const pageBg = branding?.pageBg || '#F1F5F9';
  const fontFamily = branding?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  const navItems: { key: PortalPage; label: string }[] = [
    { key: 'dashboard', label: 'Home' },
    { key: 'prescriptions', label: 'Prescriptions' },
    { key: 'orders', label: 'Orders' },
    { key: 'settings', label: 'Account' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: pageBg, fontFamily }}>
      {/* Pharmacy Top Header Bar */}
      <header style={{
        background: headerBg, borderBottom: '1px solid #E2E8F0',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        {/* Top utility bar */}
        <div style={{
          background: brandAccent, color: 'white', fontSize: '12px',
          padding: '6px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>Free delivery on orders $35+ | Same-day pickup available</span>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ cursor: 'pointer' }}>📍 Find a Store</span>
            <span style={{ cursor: 'pointer' }}>💬 Help</span>
          </div>
        </div>

        {/* Main header */}
        <div style={{
          padding: '12px 24px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', maxWidth: '1200px', margin: '0 auto',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
            onClick={() => setActivePage('dashboard')}
          >
            {logoUrl ? (
              <img src={logoUrl} alt={pharmacyName} style={{ height: '32px', maxWidth: '160px', objectFit: 'contain' }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: brandAccent, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: 'white', fontSize: '16px', fontWeight: 700,
                }}>
                  ℞
                </div>
                <span style={{ fontWeight: 700, fontSize: '18px', color: headerText }}>{pharmacyName}</span>
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div style={{
            flex: 1, maxWidth: '400px', margin: '0 24px',
            position: 'relative',
          }}>
            <input
              type="text"
              placeholder="Search prescriptions, health products..."
              style={{
                width: '100%', padding: '8px 16px 8px 36px',
                border: '1px solid #D1D5DB', borderRadius: '24px',
                fontSize: '13px', outline: 'none', background: '#F9FAFB',
              }}
              readOnly
            />
            <span style={{
              position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
              fontSize: '14px', color: '#9CA3AF',
            }}>🔍</span>
          </div>

          {/* User actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
              color: headerText, fontSize: '11px',
            }}>
              <span style={{ fontSize: '20px' }}>🔔</span>
              Alerts
            </button>
            <div
              onClick={() => setActivePage('settings')}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                padding: '6px 12px', borderRadius: '8px', transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#F1F5F9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: `linear-gradient(135deg, ${brandAccent}, ${brandAccent}cc)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '12px', fontWeight: 600,
              }}>{initials}</div>
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: headerText, margin: 0 }}>{userName.split(' ')[0]}</p>
                <p style={{ fontSize: '10px', color: '#6B7280', margin: 0 }}>My Account</p>
              </div>
            </div>
            <button onClick={onLogout} title="Sign out" style={{
              background: 'none', border: 'none', color: '#9CA3AF',
              cursor: 'pointer', fontSize: '18px', padding: '4px',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#9CA3AF'; }}
            >
              ↗
            </button>
          </div>
        </div>

        {/* Navigation tabs */}
        <nav style={{
          display: 'flex', gap: '0', maxWidth: '1200px', margin: '0 auto',
          padding: '0 24px', borderTop: '1px solid #F3F4F6',
        }}>
          {navItems.map(item => {
            const isActive = activePage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActivePage(item.key)}
                style={{
                  padding: '10px 20px', border: 'none', cursor: 'pointer',
                  background: 'transparent', fontSize: '14px',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? brandAccent : '#6B7280',
                  borderBottom: isActive ? `2px solid ${brandAccent}` : '2px solid transparent',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = brandAccent; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = '#6B7280'; }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Page Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {activePage === 'dashboard' && (
          <PharmacyDashboard
            userName={userName}
            accentColor={brandAccent}
            portalConfig={config}
            onNavigate={setActivePage}
          />
        )}
        {activePage === 'prescriptions' && (
          <PharmacyPrescriptionsPage
            accentColor={brandAccent}
            portalConfig={config}
          />
        )}
        {activePage === 'orders' && (
          <PharmacyOrdersPage
            accentColor={brandAccent}
            portalConfig={config}
          />
        )}
        {activePage === 'settings' && (
          <PharmacySettings
            userName={userName}
            userEmail={userEmail}
            userPhone={config.userPhone || '(555) 867-5309'}
            accentColor={brandAccent}
            portalConfig={config}
            onTriggerVerification={handleTriggerVerification}
          />
        )}
      </main>
    </div>
  );
}
