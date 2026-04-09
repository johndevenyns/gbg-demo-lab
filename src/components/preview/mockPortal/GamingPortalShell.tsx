import { useState, useCallback } from 'react';
import { GamingDashboard } from './GamingDashboard';
import { GamingBetsPage } from './GamingBetsPage';
import { GamingSettings } from './GamingSettings';
import { PortalConfig, PortalBranding, DEFAULT_GAMING_CONFIG, GamingEvent, PortalVerificationTrigger } from '@/types/portalConfig';
import { getReadableTextColor } from '@/lib/formStyleUtils';
import { toast } from 'sonner';

type PortalPage = 'dashboard' | 'bets' | 'wallet' | 'settings';

export interface GamingPortalShellProps {
  userName: string;
  userEmail: string;
  accentColor: string;
  logoUrl?: string;
  siteName: string;
  portalConfig?: PortalConfig;
  branding?: PortalBranding;
  isNewAccount?: boolean;
  onTriggerVerification: (trigger: PortalVerificationTrigger, txContext?: { amount?: number; recipientName?: string; fromAccount?: string }) => void;
  onLogout: () => void;
}

export function GamingPortalShell({
  userName, userEmail, accentColor, logoUrl, siteName,
  portalConfig, branding, isNewAccount, onTriggerVerification, onLogout,
}: GamingPortalShellProps) {
  const config = { ...DEFAULT_GAMING_CONFIG, ...portalConfig };
  const [activePage, setActivePage] = useState<PortalPage>('dashboard');

  const handlePlaceBet = useCallback((event: GamingEvent, betAmount: number) => {
    const triggers = config.verificationTriggers || DEFAULT_GAMING_CONFIG.verificationTriggers!;
    const betTrigger = triggers.find(t => t.id === 'gaming-wager' && t.enabled);

    if (betTrigger && betTrigger.condition === 'threshold' && betTrigger.thresholdAmount && betAmount >= betTrigger.thresholdAmount) {
      onTriggerVerification(betTrigger, { amount: betAmount });
    } else {
      toast.success(`Bet placed on ${event.teamA} vs ${event.teamB}!`);
    }
  }, [config.verificationTriggers, onTriggerVerification]);

  const handleSettingsTrigger = useCallback((action: string) => {
    const triggers = config.verificationTriggers || DEFAULT_GAMING_CONFIG.verificationTriggers!;
    const trigger = triggers.find(t => t.action === action);
    if (trigger) onTriggerVerification(trigger);
  }, [config.verificationTriggers, onTriggerVerification]);

  const initials = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const brandAccent = branding?.accentColor || accentColor;
  const headerBg = branding?.sidebarBg || '#0F172A';
  const headerText = branding?.sidebarText || '#ffffff';
  const pageBg = branding?.pageBg || '#F8FAFC';
  const fontFamily = branding?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  const navItems: { key: PortalPage; label: string; icon: string }[] = [
    { key: 'dashboard', label: 'Lobby', icon: '🎰' },
    { key: 'bets', label: 'My Bets', icon: '🎫' },
    { key: 'settings', label: 'Account', icon: '👤' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: pageBg, fontFamily }}>
      {/* Header */}
      <header style={{ background: headerBg, position: 'sticky', top: 0, zIndex: 20 }}>
        {/* Promo Bar */}
        <div style={{
          background: `linear-gradient(90deg, ${brandAccent}, #22C55E)`, color: 'white',
          fontSize: '12px', padding: '8px 24px', textAlign: 'center',
          fontWeight: 600, letterSpacing: '0.3px',
        }}>
          🎁 New users get a $1,000 bonus on first deposit · Bet responsibly
        </div>

        {/* Main Header */}
        <div style={{
          padding: '12px 24px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', maxWidth: '1200px', margin: '0 auto',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
            onClick={() => setActivePage('dashboard')}
          >
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} style={{ height: '32px', maxWidth: '160px', objectFit: 'contain' }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: `linear-gradient(135deg, ${brandAccent}, #22C55E)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: '18px',
                }}>🎲</div>
                <span style={{ fontWeight: 800, fontSize: '20px', color: headerText, letterSpacing: '-0.5px' }}>{siteName}</span>
              </div>
            )}
          </div>

          {/* Nav + Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {navItems.map(item => {
              const isActive = activePage === item.key;
              return (
                <button key={item.key} onClick={() => setActivePage(item.key)} style={{
                  padding: '8px 16px', borderRadius: '8px', border: 'none',
                  background: isActive ? `${headerText}15` : 'transparent',
                  color: isActive ? headerText : `${headerText}99`,
                  fontSize: '13px', fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer', transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = headerText; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = `${headerText}99`; }}
                >
                  <span style={{ fontSize: '14px' }}>{item.icon}</span>
                  {item.label}
                </button>
              );
            })}

            <div style={{ width: '1px', height: '24px', background: `${headerText}30`, margin: '0 8px' }} />

            {/* User */}
            <button onClick={() => setActivePage('settings')} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '6px 12px', borderRadius: '8px', border: 'none',
              background: 'transparent', cursor: 'pointer',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = `${headerText}15`; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%',
                background: `linear-gradient(135deg, ${brandAccent}, #22C55E)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: '11px', fontWeight: 700,
              }}>{initials}</div>
              <span style={{ fontSize: '13px', fontWeight: 500, color: headerText }}>{userName.split(' ')[0]}</span>
            </button>

            <button onClick={onLogout} title="Sign out" style={{
              background: 'none', border: 'none', color: '#64748B',
              cursor: 'pointer', fontSize: '16px', padding: '6px',
              borderRadius: '6px', transition: 'all 0.2s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#64748B'; }}
            >
              ↗
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {activePage === 'dashboard' && (
          <GamingDashboard
            userName={userName}
            accentColor={brandAccent}
            portalConfig={config}
            isNewAccount={isNewAccount}
            onPlaceBet={handlePlaceBet}
            onNavigate={(page) => setActivePage(page as PortalPage)}
          />
        )}
        {activePage === 'bets' && (
          <GamingBetsPage
            accentColor={brandAccent}
            portalConfig={config}
          />
        )}
        {activePage === 'wallet' && (
          <GamingBetsPage
            accentColor={brandAccent}
            portalConfig={config}
          />
        )}
        {activePage === 'settings' && (
          <GamingSettings
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
