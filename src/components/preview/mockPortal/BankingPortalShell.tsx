import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BankingDashboard, CreditCardData } from './BankingDashboard';
import { BankingSettings } from './BankingSettings';
import { BankingTransferFlow } from './BankingTransferFlow';
import { BankingCardsPage } from './BankingCardsPage';
import { PortalConfig, PortalBranding, DEFAULT_BANKING_CONFIG, PortalVerificationTrigger } from '@/types/portalConfig';

type PortalPage = 'dashboard' | 'cards' | 'settings' | 'transfer' | 'pay-bills';

interface NavItem {
  key: PortalPage;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { key: 'cards', label: 'Cards', icon: '💳' },
  { key: 'settings', label: 'Settings', icon: '⚙️' },
];

export interface BankingPortalShellProps {
  userName: string;
  userEmail: string;
  accentColor: string;
  logoUrl?: string;
  bankName: string;
  portalConfig?: PortalConfig;
  branding?: PortalBranding;
  isNewAccount?: boolean;
  demoId?: string;
  initialCreditCards?: CreditCardData[];
  onTriggerVerification: (trigger: PortalVerificationTrigger, txContext?: { amount?: number; recipientName?: string; fromAccount?: string }) => void;
  navCommand?: 'dashboard' | 'repeat_transfer' | null;
  onNavCommandHandled?: () => void;
  onLogout: () => void;
}

export function BankingPortalShell({
  userName, userEmail, accentColor, logoUrl, bankName,
  portalConfig, branding, isNewAccount,
  onTriggerVerification, navCommand, onNavCommandHandled, onLogout,
}: BankingPortalShellProps) {
  const config = { ...DEFAULT_BANKING_CONFIG, ...portalConfig };
  const [activePage, setActivePage] = useState<PortalPage>('dashboard');
  const [transferKey, setTransferKey] = useState(0);
  const [creditCards, setCreditCards] = useState<CreditCardData[]>([]);

  useEffect(() => {
    if (!navCommand) return;
    if (navCommand === 'dashboard') setActivePage('dashboard');
    else if (navCommand === 'repeat_transfer') {
      setTransferKey(k => k + 1);
      setActivePage('transfer');
    }
    onNavCommandHandled?.();
  }, [navCommand, onNavCommandHandled]);

  const handleTriggerVerification = useCallback((trigger: PortalVerificationTrigger, txContext?: any) => {
    onTriggerVerification(trigger, txContext);
  }, [onTriggerVerification]);

  const handleSettingsTrigger = useCallback((action: string) => {
    const triggers = config.verificationTriggers || DEFAULT_BANKING_CONFIG.verificationTriggers!;
    const trigger = triggers.find(t => t.action === action);
    if (trigger) onTriggerVerification(trigger);
  }, [config.verificationTriggers, onTriggerVerification]);

  const handleQuickAction = useCallback((actionLabel: string) => {
    if (actionLabel === 'Transfer') setActivePage('transfer');
    else if (actionLabel === 'Pay Bills') setActivePage('pay-bills');
    else if (actionLabel === 'Cards') setActivePage('cards');
  }, []);

  const handleAddCard = useCallback((card: CreditCardData) => {
    setCreditCards(prev => [...prev, card]);
  }, []);

  const handleActivateCard = useCallback((idx: number) => {
    setCreditCards(prev => prev.map((c, i) => i === idx ? { ...c, isActive: true, activatedAt: new Date().toISOString() } : c));
  }, []);

  const initials = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const sidebarBg = branding?.sidebarBg || '#0F172A';
  const sidebarText = branding?.sidebarText || '#ffffff';
  const pageBg = branding?.pageBg || '#F8FAFC';
  const brandAccent = branding?.accentColor || accentColor;
  const fontFamily = branding?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const sidebarTextMuted = `${sidebarText}88`;
  const sidebarTextFaint = `${sidebarText}40`;
  const sidebarBorder = `${sidebarText}14`;
  const navActivePage = ['transfer', 'pay-bills'].includes(activePage) ? 'dashboard' : activePage;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: pageBg, fontFamily }}>
      {/* Sidebar */}
      <aside style={{ width: '240px', background: sidebarBg, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '20px 20px 24px', borderBottom: `1px solid ${sidebarBorder}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
          {logoUrl ? (
            <img src={logoUrl} alt={bankName} style={{ height: '44px', maxWidth: '180px', objectFit: 'contain' }} />
          ) : (
            <>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: brandAccent, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: 700,
              }}>{bankName[0]?.toUpperCase()}</div>
              <span style={{ color: sidebarText, fontWeight: 600, fontSize: '15px' }}>{bankName}</span>
            </>
          )}
        </div>

        <nav style={{ padding: '12px 10px', flex: 1 }}>
          {NAV_ITEMS.map((item) => {
            const isActive = navActivePage === item.key;
            return (
              <button key={item.key} onClick={() => setActivePage(item.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  width: '100%', padding: '10px 14px', borderRadius: '10px',
                  border: 'none', cursor: 'pointer',
                  background: isActive ? `${sidebarText}18` : 'transparent',
                  color: isActive ? sidebarText : sidebarTextMuted,
                  fontSize: '14px', fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.2s', marginBottom: '4px', textAlign: 'left',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = `${sidebarText}0a`; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: '18px' }}>{item.icon}</span>
                {item.label}
                {item.key === 'cards' && creditCards.length > 0 && (
                  <span style={{
                    marginLeft: 'auto', fontSize: '11px', fontWeight: 700,
                    background: brandAccent, color: 'white',
                    padding: '1px 7px', borderRadius: '10px',
                  }}>{creditCards.length}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: '16px 14px', borderTop: `1px solid ${sidebarBorder}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: `linear-gradient(135deg, ${brandAccent}, ${brandAccent}bb)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: '13px', fontWeight: 600, flexShrink: 0,
          }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: sidebarText, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userName}</p>
            <p style={{ fontSize: '11px', color: sidebarTextFaint, margin: '1px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{userEmail}</p>
          </div>
          <button onClick={onLogout} title="Sign out"
            style={{ background: 'none', border: 'none', color: sidebarTextMuted, cursor: 'pointer', padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '6px', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(248,113,113,0.15)'; e.currentTarget.style.color = '#F87171'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = sidebarTextMuted; }}
          >↗ Logout</button>
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
              <button key={item.key} onClick={() => setActivePage(item.key)}
                style={{
                  padding: '6px 14px', borderRadius: '8px', border: 'none',
                  background: navActivePage === item.key ? `${brandAccent}10` : 'transparent',
                  color: navActivePage === item.key ? brandAccent : '#64748B',
                  fontSize: '13px', fontWeight: navActivePage === item.key ? 600 : 400, cursor: 'pointer',
                }}
              >{item.label}</button>
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
              background: `linear-gradient(135deg, ${brandAccent}, ${brandAccent}bb)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '12px', fontWeight: 600,
            }}>{initials}</div>
          </div>
        </div>

        {/* Page Content */}
        {activePage === 'dashboard' && (
          <BankingDashboard userName={userName} accentColor={brandAccent} portalConfig={config} isNewAccount={isNewAccount} onQuickAction={handleQuickAction} creditCards={creditCards} />
        )}
        {activePage === 'cards' && (
          <BankingCardsPage userName={userName} accentColor={brandAccent} portalConfig={config} creditCards={creditCards} onAddCard={handleAddCard} onActivateCard={handleActivateCard} onTriggerVerification={handleTriggerVerification} onBack={() => setActivePage('dashboard')} />
        )}
        {activePage === 'settings' && (
          <BankingSettings userName={userName} userEmail={userEmail} userPhone={config.userPhone || '(555) 867-5309'} accentColor={brandAccent} portalConfig={config} onTriggerVerification={handleSettingsTrigger} />
        )}
        {activePage === 'transfer' && (
          <BankingTransferFlow key={`transfer-${transferKey}`} userName={userName} accentColor={brandAccent} portalConfig={config} onTriggerVerification={handleTriggerVerification} onBack={() => setActivePage('dashboard')} />
        )}
        {activePage === 'pay-bills' && (
          <BankingTransferFlow key={`paybills-${transferKey}`} userName={userName} accentColor={brandAccent} portalConfig={config} onTriggerVerification={handleTriggerVerification} onBack={() => setActivePage('dashboard')} />
        )}
      </main>
    </div>
  );
}
