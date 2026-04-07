import { useState, useCallback, useMemo } from 'react';
import { RetailDashboard } from './RetailDashboard';
import { RetailOrdersPage } from './RetailOrdersPage';
import { RetailSettings } from './RetailSettings';
import { RetailCartPage, CartItem } from './RetailCartPage';
import { PortalConfig, PortalBranding, DEFAULT_RETAIL_CONFIG, RetailProduct, PortalVerificationTrigger } from '@/types/portalConfig';
import { toast } from 'sonner';

type PortalPage = 'dashboard' | 'orders' | 'settings' | 'cart';

export interface RetailPortalShellProps {
  userName: string;
  userEmail: string;
  accentColor: string;
  logoUrl?: string;
  storeName: string;
  portalConfig?: PortalConfig;
  branding?: PortalBranding;
  isNewAccount?: boolean;
  onTriggerVerification: (trigger: PortalVerificationTrigger, txContext?: { amount?: number; recipientName?: string; fromAccount?: string }) => void;
  onLogout: () => void;
}

export function RetailPortalShell({
  userName, userEmail, accentColor, logoUrl, storeName,
  portalConfig, branding, isNewAccount, onTriggerVerification, onLogout,
}: RetailPortalShellProps) {
  const config = { ...DEFAULT_RETAIL_CONFIG, ...portalConfig };
  const [activePage, setActivePage] = useState<PortalPage>('dashboard');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const cartCount = cartItems.reduce((sum, i) => sum + i.qty, 0);

  const handleAddToCart = useCallback((product: RetailProduct) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { product, qty: 1 }];
    });
    toast.success(`${product.name} added to cart`);
  }, []);

  const handleUpdateQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setCartItems(prev => prev.filter(i => i.product.id !== productId));
    } else {
      setCartItems(prev => prev.map(i => i.product.id === productId ? { ...i, qty } : i));
    }
  }, []);

  const handleRemove = useCallback((productId: string) => {
    setCartItems(prev => prev.filter(i => i.product.id !== productId));
  }, []);

  const handleCheckout = useCallback((total: number) => {
    const triggers = config.verificationTriggers || DEFAULT_RETAIL_CONFIG.verificationTriggers!;
    const purchaseTrigger = triggers.find(t => t.id === 'retail-purchase' && t.enabled);

    if (purchaseTrigger && purchaseTrigger.condition === 'threshold' && purchaseTrigger.thresholdAmount && total >= purchaseTrigger.thresholdAmount) {
      onTriggerVerification(purchaseTrigger, { amount: total });
    } else {
      // Under threshold — just show order confirmation
      toast.success('Order placed successfully!');
      setCartItems([]);
      setActivePage('orders');
    }
  }, [config.verificationTriggers, onTriggerVerification]);

  const handleTriggerVerification = useCallback((trigger: PortalVerificationTrigger, txContext?: { amount?: number }) => {
    onTriggerVerification(trigger, txContext);
  }, [onTriggerVerification]);

  // String-based handler for settings page
  const handleSettingsTrigger = useCallback((action: string) => {
    const triggers = config.verificationTriggers || DEFAULT_RETAIL_CONFIG.verificationTriggers!;
    const trigger = triggers.find(t => t.action === action);
    if (trigger) {
      onTriggerVerification(trigger);
    }
  }, [config.verificationTriggers, onTriggerVerification]);

  const initials = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  const brandAccent = branding?.accentColor || accentColor;
  const headerBg = branding?.sidebarBg || '#FFFFFF';
  const headerText = branding?.sidebarText || '#0F172A';
  const pageBg = branding?.pageBg || '#F8FAFC';
  const fontFamily = branding?.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  const navItems: { key: PortalPage; label: string; icon: string }[] = [
    { key: 'dashboard', label: 'Shop', icon: '🏠' },
    { key: 'orders', label: 'Orders', icon: '📦' },
    { key: 'settings', label: 'Account', icon: '👤' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: pageBg, fontFamily }}>
      {/* Header */}
      <header style={{
        background: headerBg, borderBottom: '1px solid #E2E8F0',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        {/* Promo Bar */}
        <div style={{
          background: '#0F172A', color: 'white', fontSize: '12px',
          padding: '8px 24px', textAlign: 'center', fontWeight: 500,
          letterSpacing: '0.3px',
        }}>
          Free shipping on orders over $50 · Easy 30-day returns
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
              <img src={logoUrl} alt={storeName} style={{ height: '32px', maxWidth: '160px', objectFit: 'contain' }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: `linear-gradient(135deg, ${brandAccent}, ${brandAccent}cc)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: '16px', fontWeight: 800,
                }}>
                  {storeName[0]?.toUpperCase()}
                </div>
                <span style={{ fontWeight: 700, fontSize: '20px', color: headerText, letterSpacing: '-0.5px' }}>{storeName}</span>
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div style={{ flex: 1, maxWidth: '480px', margin: '0 32px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search products, brands, and more..."
              style={{
                width: '100%', padding: '10px 16px 10px 40px',
                border: '2px solid #E2E8F0', borderRadius: '12px',
                fontSize: '14px', outline: 'none', background: '#FAFAFA',
                transition: 'border-color 0.2s',
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
            <button
              onClick={() => setActivePage('cart')}
              style={{
                position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '40px', height: '40px', borderRadius: '10px', border: 'none',
                background: activePage === 'cart' ? '#F1F5F9' : 'transparent', cursor: 'pointer', fontSize: '20px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#F1F5F9'; }}
              onMouseLeave={(e) => { if (activePage !== 'cart') e.currentTarget.style.background = 'transparent'; }}
            >
              🛒
              {cartCount > 0 && (
                <span style={{
                  position: 'absolute', top: '4px', right: '4px',
                  minWidth: '18px', height: '18px', borderRadius: '50%',
                  background: '#EF4444', color: 'white', fontSize: '10px',
                  fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px',
                }}>{cartCount}</span>
              )}
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
          <RetailDashboard
            userName={userName}
            accentColor={brandAccent}
            portalConfig={config}
            isNewAccount={isNewAccount}
            onAddToCart={handleAddToCart}
            onNavigate={(page) => setActivePage(page as PortalPage)}
          />
        )}
        {activePage === 'orders' && (
          <RetailOrdersPage
            accentColor={brandAccent}
            portalConfig={config}
          />
        )}
        {activePage === 'cart' && (
          <RetailCartPage
            items={cartItems}
            accentColor={brandAccent}
            portalConfig={config}
            onUpdateQty={handleUpdateQty}
            onRemove={handleRemove}
            onPlaceOrder={handleCheckout}
            onContinueShopping={() => setActivePage('dashboard')}
          />
        )}
        {activePage === 'settings' && (
          <RetailSettings
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
