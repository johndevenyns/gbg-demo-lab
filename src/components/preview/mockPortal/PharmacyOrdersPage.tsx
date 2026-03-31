import { PortalConfig, DEFAULT_PHARMACY_CONFIG } from '@/types/portalConfig';

interface PharmacyOrdersPageProps {
  accentColor: string;
  portalConfig?: PortalConfig;
}

export function PharmacyOrdersPage({ accentColor, portalConfig }: PharmacyOrdersPageProps) {
  const config = { ...DEFAULT_PHARMACY_CONFIG, ...portalConfig };
  const orders = config.orders || DEFAULT_PHARMACY_CONFIG.orders!;

  const statusMap: Record<string, { bg: string; text: string; label: string; icon: string; step: number }> = {
    processing: { bg: '#FEF3C7', text: '#D97706', label: 'Processing', icon: '⏳', step: 1 },
    ready: { bg: '#ECFDF5', text: '#059669', label: 'Ready for Pickup', icon: '✅', step: 2 },
    shipped: { bg: '#EFF6FF', text: '#2563EB', label: 'Shipped', icon: '🚚', step: 2 },
    picked_up: { bg: '#F1F5F9', text: '#64748B', label: 'Picked Up', icon: '✓', step: 3 },
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1E293B', margin: 0 }}>My Orders</h1>
        <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
          Track your prescription orders and pickup status
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {orders.map(order => {
          const st = statusMap[order.status] || statusMap.processing;
          return (
            <div key={order.orderId} style={{
              background: 'white', border: '1px solid #E2E8F0', borderRadius: '12px',
              overflow: 'hidden',
            }}>
              {/* Order header */}
              <div style={{
                padding: '16px 20px', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', borderBottom: '1px solid #F1F5F9',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '10px',
                    background: st.bg, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '18px',
                  }}>{st.icon}</div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', margin: 0 }}>
                      Order {order.orderId}
                    </p>
                    <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0' }}>
                      Placed {order.date}
                    </p>
                  </div>
                </div>
                <span style={{
                  fontSize: '11px', fontWeight: 600, color: st.text,
                  background: st.bg, padding: '4px 12px', borderRadius: '12px',
                }}>{st.label}</span>
              </div>

              {/* Items */}
              <div style={{ padding: '12px 20px' }}>
                {order.items.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '6px 0',
                  }}>
                    <span style={{ fontSize: '14px' }}>💊</span>
                    <span style={{ fontSize: '13px', color: '#374151' }}>{item}</span>
                  </div>
                ))}
              </div>

              {/* Progress bar for active orders */}
              {(order.status === 'processing' || order.status === 'ready') && (
                <div style={{ padding: '0 20px 16px' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px',
                  }}>
                    {['Submitted', 'Preparing', 'Ready'].map((step, i) => {
                      const isComplete = i < st.step;
                      const isCurrent = i === st.step;
                      return (
                        <div key={step} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <div style={{
                            height: '4px', width: '100%', borderRadius: '2px',
                            background: isComplete ? accentColor : isCurrent ? `${accentColor}40` : '#E2E8F0',
                          }} />
                          <span style={{
                            fontSize: '10px', color: isComplete ? accentColor : '#94A3B8',
                            fontWeight: isComplete ? 600 : 400,
                          }}>{step}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Footer info */}
              {(order.pickupLocation || order.estimatedReady) && (
                <div style={{
                  padding: '10px 20px', background: '#F8FAFC',
                  borderTop: '1px solid #F1F5F9', fontSize: '12px', color: '#64748B',
                  display: 'flex', gap: '16px',
                }}>
                  {order.pickupLocation && (
                    <span>📍 {order.pickupLocation}</span>
                  )}
                  {order.estimatedReady && (
                    <span>🕐 {order.estimatedReady}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
