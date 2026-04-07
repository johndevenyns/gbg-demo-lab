import { PortalConfig, DEFAULT_RETAIL_CONFIG } from '@/types/portalConfig';

interface RetailOrdersPageProps {
  accentColor: string;
  portalConfig?: PortalConfig;
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  processing: { bg: '#FEF3C7', color: '#92400E', label: 'Processing' },
  shipped: { bg: '#DBEAFE', color: '#1E40AF', label: 'Shipped' },
  delivered: { bg: '#D1FAE5', color: '#065F46', label: 'Delivered' },
  returned: { bg: '#FEE2E2', color: '#991B1B', label: 'Returned' },
};

export function RetailOrdersPage({ accentColor, portalConfig }: RetailOrdersPageProps) {
  const config = { ...DEFAULT_RETAIL_CONFIG, ...portalConfig };
  const orders = config.retailOrders || DEFAULT_RETAIL_CONFIG.retailOrders!;

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Your Orders</h1>
      <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 24px' }}>Track, return, or buy again</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {orders.map(order => {
          const st = STATUS_STYLES[order.status] || STATUS_STYLES.processing;
          return (
            <div key={order.orderId} style={{
              background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0',
              overflow: 'hidden',
            }}>
              {/* Order Header */}
              <div style={{
                padding: '14px 20px', background: '#F8FAFC', borderBottom: '1px solid #E2E8F0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px',
              }}>
                <div style={{ display: 'flex', gap: '24px', fontSize: '12px', color: '#64748B' }}>
                  <span><strong style={{ color: '#374151' }}>Order placed:</strong> {order.date}</span>
                  <span><strong style={{ color: '#374151' }}>Total:</strong> ${order.total.toFixed(2)}</span>
                  <span><strong style={{ color: '#374151' }}>Order #:</strong> {order.orderId}</span>
                </div>
                <span style={{
                  fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px',
                  background: st.bg, color: st.color,
                }}>
                  {st.label}
                </span>
              </div>

              {/* Order Items */}
              <div style={{ padding: '16px 20px' }}>
                {order.estimatedDelivery && order.status === 'shipped' && (
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#059669', margin: '0 0 12px' }}>
                    Arriving by {order.estimatedDelivery}
                  </p>
                )}
                {order.items.map((item, idx) => (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', gap: '14px',
                    padding: '8px 0',
                    borderBottom: idx < order.items.length - 1 ? '1px solid #F1F5F9' : 'none',
                  }}>
                    <div style={{
                      width: '52px', height: '52px', borderRadius: '10px', background: '#F1F5F9',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0,
                    }}>
                      {item.image}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A', margin: 0 }}>{item.name}</p>
                      <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0' }}>Qty: {item.qty} · ${item.price.toFixed(2)}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button style={{
                        padding: '6px 14px', borderRadius: '8px', border: '1px solid #E2E8F0',
                        background: 'white', color: '#374151', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                      }}>Buy Again</button>
                    </div>
                  </div>
                ))}
                {order.trackingNumber && (
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '12px 0 0' }}>
                    Tracking: <span style={{ color: accentColor, fontWeight: 500 }}>{order.trackingNumber}</span>
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}