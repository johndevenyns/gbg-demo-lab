import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BankingDashboard, CreditCardData } from './BankingDashboard';
import { BankingSettings } from './BankingSettings';
import { BankingTransferFlow } from './BankingTransferFlow';
import { BankingCardsPage } from './BankingCardsPage';
import { PortalConfig, PortalBranding, DEFAULT_BANKING_CONFIG, PortalVerificationTrigger } from '@/types/portalConfig';
import { getReadableTextColor } from '@/lib/formStyleUtils';

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
  portalConfig, branding, isNewAccount, demoId, initialCreditCards,
  onTriggerVerification, navCommand, onNavCommandHandled, onLogout,
}: BankingPortalShellProps) {
  const config = { ...DEFAULT_BANKING_CONFIG, ...portalConfig };
  const [activePage, setActivePage] = useState<PortalPage>('dashboard');
  const [transferKey, setTransferKey] = useState(0);
  const [creditCards, setCreditCards] = useState<CreditCardData[]>(initialCreditCards || []);
  const savingRef = useRef(false);

  // Persist credit cards to portal_users.profile_data whenever they change
  useEffect(() => {
    if (!demoId || !userEmail || savingRef.current) return;
    if (creditCards.length === 0 && (!initialCreditCards || initialCreditCards.length === 0)) return;
    const saveCards = async () => {
      savingRef.current = true;
      try {
        const { data: users } = await supabase
          .from('portal_users')
          .select('id, profile_data')
          .eq('email', userEmail.toLowerCase())
          .eq('is_active', true)
          .limit(1);
        if (users && users.length > 0) {
          const user = users[0];
          const existingData = (user.profile_data && typeof user.profile_data === 'object' && !Array.isArray(user.profile_data))
            ? user.profile_data as Record<string, unknown>
            : {};
          await supabase
            .from('portal_users')
            .update({
              profile_data: { ...existingData, creditCards } as any,
            })
            .eq('id', user.id);
        }
      } catch (err) {
        console.error('Failed to persist credit cards:', err);
      } finally {
        savingRef.current = false;
      }
    };
    saveCards();
  }, [creditCards, demoId, userEmail, initialCreditCards]);

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
  const pageBg = branding?.pageBg || '#F8FAFC';
  const brandAccent = branding?.accentColor || accentColor;
  const headerBg = branding?.sidebarBg || '#FFFFFF';
  const headerText = getReadableTextColor(branding?.sidebarText || '#1E293B', headerBg);
  const fontFamily = branding?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const navActivePage = ['transfer', 'pay-bills'].includes(activePage) ? 'dashboard' : activePage;

  const navItems: { key: PortalPage; label: string }[] = [
    { key: 'dashboard', label: 'Home' },
    { key: 'cards', label: 'Cards' },
    { key: 'settings', label: 'Account' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: pageBg, fontFamily }}>
      {/* Header */}
      <header style={{
        background: headerBg, borderBottom: '1px solid #E2E8F0',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        {/* Top utility bar */}
        <div style={{
          background: '#0F172A', color: 'white', fontSize: '12px',
          padding: '8px 24px', textAlign: 'center', fontWeight: 500,
          letterSpacing: '0.3px',
        }}>
          Secure banking · FDIC insured · 24/7 customer support
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
              <img src={logoUrl} alt={bankName} style={{ height: '32px', maxWidth: '160px', objectFit: 'contain' }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: `linear-gradient(135deg, ${brandAccent}, ${brandAccent}cc)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: '16px', fontWeight: 800,
                }}>
                  {bankName[0]?.toUpperCase()}
                </div>
                <span style={{ fontWeight: 700, fontSize: '20px', color: headerText, letterSpacing: '-0.5px' }}>{bankName}</span>
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div style={{ flex: 1, maxWidth: '400px', margin: '0 24px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search accounts, transactions..."
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
              background: 'none', border: '1px solid #E5E7EB', color: '#6B7280',
              cursor: 'pointer', fontSize: '12px', padding: '6px 12px',
              borderRadius: '6px', transition: 'all 0.2s', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: '4px',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.borderColor = '#FECACA'; e.currentTarget.style.background = '#FEF2F2'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = 'none'; }}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Navigation tabs */}
        <nav style={{
          display: 'flex', gap: '0', maxWidth: '1200px', margin: '0 auto',
          padding: '0 24px', borderTop: '1px solid #F3F4F6',
        }}>
          {navItems.map(item => {
            const isActive = navActivePage === item.key;
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
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = brandAccent; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = '#6B7280'; }}
              >
                {item.label}
                {item.key === 'cards' && creditCards.length > 0 && (
                  <span style={{
                    fontSize: '11px', fontWeight: 700,
                    background: brandAccent, color: 'white',
                    padding: '1px 7px', borderRadius: '10px',
                  }}>{creditCards.length}</span>
                )}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Page Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto' }}>
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
