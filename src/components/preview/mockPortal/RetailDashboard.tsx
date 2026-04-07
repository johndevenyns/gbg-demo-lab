import { useMemo } from 'react';
import { PortalConfig, DEFAULT_RETAIL_CONFIG, RetailProduct } from '@/types/portalConfig';

interface RetailDashboardProps {
  userName: string;
  accentColor: string;
  portalConfig?: PortalConfig;
  isNewAccount?: boolean;
  onViewProduct?: (product: RetailProduct) => void;
  onNavigate?: (page: string) => void;
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
      <span style={{ color: '#F59E0B', letterSpacing: '-1px' }}>
        {'★'.repeat(full)}{half ? '½' : ''}{'☆'.repeat(5 - full - (half ? 1 : 0))}
      </span>
      <span style={{ color: '#94A3B8' }}>({count.toLocaleString()})</span>
    </span>
  );
}

export function RetailDashboard({ userName, accentColor, portalConfig, isNewAccount, onNavigate }: RetailDashboardProps) {
  const config = { ...DEFAULT_RETAIL_CONFIG, ...portalConfig };
  const products = isNewAccount ? [] : (config.retailProducts || DEFAULT_RETAIL_CONFIG.retailProducts!);
  const categories = config.retailCategories || DEFAULT_RETAIL_CONFIG.retailCategories!;
  const orders = isNewAccount ? [] : (config.retailOrders || DEFAULT_RETAIL_CONFIG.retailOrders!);

  const firstName = userName.split(' ')[0] || 'there';

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const recentOrder = orders[0];

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Hero Banner */}
      <div style={{
        background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
        borderRadius: '16px',
        padding: '32px 36px',
        color: 'white',
        marginBottom: '28px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '140px', height: '140px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'absolute', bottom: '-40px', right: '80px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px' }}>
          {greeting}, {firstName}
        </h1>
        <p style={{ fontSize: '14px', opacity: 0.9, margin: 0 }}>
          {isNewAccount ? 'Welcome to your new account! Start exploring deals.' : 'Check out what\'s trending today'}
        </p>
      </div>

      {/* Recent Order Tracker */}
      {recentOrder && recentOrder.status !== 'delivered' && (
        <div style={{
          background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0',
          padding: '18px 22px', marginBottom: '24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📦</div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
                Order {recentOrder.orderId} — {recentOrder.status === 'shipped' ? 'On its way!' : 'Processing'}
              </p>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>
                {recentOrder.estimatedDelivery ? `Est. delivery: ${recentOrder.estimatedDelivery}` : `Placed: ${recentOrder.date}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate?.('orders')}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              background: `${accentColor}10`, color: accentColor,
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Track Order
          </button>
        </div>
      )}

      {/* Categories Row */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Shop by Category</h2>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button key={cat} style={{
              padding: '10px 18px', borderRadius: '24px', border: '1px solid #E2E8F0',
              background: 'white', fontSize: '13px', fontWeight: 500, color: '#374151',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = `${accentColor}08`; e.currentTarget.style.borderColor = accentColor; e.currentTarget.style.color = accentColor; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#374151'; }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Recommended for You</h2>
          <button style={{ background: 'none', border: 'none', color: accentColor, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>View All</button>
        </div>
        {products.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: '36px', marginBottom: '12px' }}>🎉</p>
            <p style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: '0 0 4px' }}>Welcome to your new account!</p>
            <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>Browse our catalog and your personalized recommendations will appear here.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
            {products.map(product => (
              <div key={product.id} style={{
                background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0',
                overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{
                  height: '140px', background: '#F8FAFC', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: '48px',
                  position: 'relative',
                }}>
                  {product.image}
                  {product.badge && (
                    <span style={{
                      position: 'absolute', top: '10px', left: '10px',
                      background: product.badge === 'Sale' ? '#EF4444' : product.badge === 'New' ? '#059669' : accentColor,
                      color: 'white', fontSize: '10px', fontWeight: 700,
                      padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      {product.badge}
                    </span>
                  )}
                </div>
                <div style={{ padding: '14px 16px' }}>
                  <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.3px', fontWeight: 500 }}>
                    {product.category}
                  </p>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: '0 0 6px', lineHeight: 1.3 }}>
                    {product.name}
                  </p>
                  <StarRating rating={product.rating} count={product.reviewCount} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>
                      ${product.price.toFixed(2)}
                    </span>
                    <button style={{
                      padding: '6px 14px', borderRadius: '8px', border: 'none',
                      background: accentColor, color: 'white', fontSize: '12px',
                      fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s',
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}