import { useState, useCallback } from 'react';
import { PharmacyDashboard } from './PharmacyDashboard';
import { PharmacySettings } from './PharmacySettings';
import { PortalConfig, DEFAULT_PHARMACY_CONFIG } from '@/types/portalConfig';

type PortalPage = 'dashboard' | 'prescriptions' | 'settings';

interface NavItem {
  key: PortalPage;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { key: 'prescriptions', label: 'Prescriptions', icon: '💊' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
];

export interface PharmacyPortalShellProps {
  userName: string;
  userEmail: string;
  accentColor: string;
  logoUrl?: string;
  pharmacyName: string;
  portalConfig?: PortalConfig;
  onTriggerVerification: (action: string) => void;
  onLogout: () => void;
}

export function PharmacyPortalShell({
  userName,
  userEmail,
  accentColor,
  logoUrl,
  pharmacyName,
  portalConfig,
  onTriggerVerification,
  onLogout,
}: PharmacyPortalShellProps) {
  const config = { ...DEFAULT_PHARMACY_CONFIG, ...portalConfig };
  const [activePage, setActivePage] = useState<PortalPage>('dashboard');

  const handleTriggerVerification = useCallback((action: string) => {
    onTriggerVerification(action);
  }, [onTriggerVerification]);

  const initials = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div style={{
      display: 'flex', minHeight: '100vh', background: '#F8FAFC',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Sidebar */}
      <aside style={{
        width: '240px', background: '#0F172A',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        {/* Logo / Name */}
        <div style={{
          padding: '20px 20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          {logoUrl ? (
            <img src={logoUrl} alt={pharmacyName} style={{ height: '28px', maxWidth: '140px', objectFit: 'contain' }} />
          ) : (
            <>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: accentColor, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: 700,
              }}>
                {pharmacyName[0]?.toUpperCase()}
              </div>
              <span style={{ color: 'white', fontWeight: 600, fontSize: '15px' }}>{pharmacyName}</span>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ padding: '12px 10px', flex: 1 }}>
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActivePage(item.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  border: 'none', cursor: 'pointer',
                  background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: isActive ? 'white' : 'rgba(255,255,255,0.55)',
                  fontSize: '14px', fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.2s', marginBottom: '4px', textAlign: 'left',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = isActive ? 'rgba(255,255,255,0.1)' : 'transparent'; }}
              >
                <span style={{ fontSize: '18px' }}>{item.icon}</span>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div style={{
          padding: '16px 14px', borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: '13px', fontWeight: 600, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'white', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {userName}
            </p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', margin: '1px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {userEmail}
            </p>
          </div>
          <button onClick={onLogout} title="Sign out" style={{
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
            cursor: 'pointer', padding: '4px', fontSize: '16px',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#F87171'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
          >
            ↗
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, overflowY: 'auto', minHeight: '100vh' }}>
        {/* Top Bar */}
        <div style={{
          padding: '14px 24px', background: 'white', borderBottom: '1px solid #E2E8F0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {NAV_ITEMS.map(item => (
              <button key={item.key} onClick={() => setActivePage(item.key)} style={{
                padding: '6px 14px', borderRadius: '8px', border: 'none',
                background: activePage === item.key ? `${accentColor}10` : 'transparent',
                color: activePage === item.key ? accentColor : '#64748B',
                fontSize: '13px', fontWeight: activePage === item.key ? 600 : 400, cursor: 'pointer',
              }}>
                {item.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: '#F1F5F9', border: 'none', cursor: 'pointer',
              fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>🔔</button>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '12px', fontWeight: 600,
            }}>{initials}</div>
          </div>
        </div>

        {/* Page Content */}
        {(activePage === 'dashboard' || activePage === 'prescriptions') && (
          <PharmacyDashboard userName={userName} accentColor={accentColor} portalConfig={config} />
        )}
        {activePage === 'settings' && (
          <PharmacySettings
            userName={userName}
            userEmail={userEmail}
            userPhone={config.userPhone || '(555) 867-5309'}
            accentColor={accentColor}
            portalConfig={config}
            onTriggerVerification={handleTriggerVerification}
          />
        )}
      </main>
    </div>
  );
}
