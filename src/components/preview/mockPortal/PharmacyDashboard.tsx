import { useMemo } from 'react';
import { PortalConfig, DEFAULT_PHARMACY_CONFIG } from '@/types/portalConfig';

interface PharmacyDashboardProps {
  userName: string;
  accentColor: string;
  portalConfig?: PortalConfig;
}

export function PharmacyDashboard({ userName, accentColor, portalConfig }: PharmacyDashboardProps) {
  const config = { ...DEFAULT_PHARMACY_CONFIG, ...portalConfig };
  const prescriptions = config.prescriptions || DEFAULT_PHARMACY_CONFIG.prescriptions!;
  const orders = config.orders || DEFAULT_PHARMACY_CONFIG.orders!;
  const quickActions = config.pharmacyQuickActions || DEFAULT_PHARMACY_CONFIG.pharmacyQuickActions!;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = userName.split(' ')[0] || 'there';
  const readyOrders = orders.filter(o => o.status === 'ready');
  const activePrescriptions = prescriptions.filter(p => p.status === 'active');
  const pendingPrescriptions = prescriptions.filter(p => p.status === 'pending');

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    ready: { bg: '#ECFDF5', text: '#059669', label: 'Ready for Pickup' },
    processing: { bg: '#FEF3C7', text: '#D97706', label: 'Processing' },
    picked_up: { bg: '#F1F5F9', text: '#64748B', label: 'Picked Up' },
    shipped: { bg: '#EFF6FF', text: '#2563EB', label: 'Shipped' },
  };

  const rxStatusColors: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: '#ECFDF5', text: '#059669', label: 'Active' },
    expired: { bg: '#FEF2F2', text: '#DC2626', label: 'Expired' },
    pending: { bg: '#FEF3C7', text: '#D97706', label: 'Pending' },
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Greeting */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
          {greeting}, {firstName}
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>
          Your health & prescriptions at a glance
        </p>
      </div>

      {/* Status Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <div style={{
          background: readyOrders.length > 0 ? `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)` : '#F1F5F9',
          borderRadius: '16px', padding: '20px', color: readyOrders.length > 0 ? 'white' : '#0F172A',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-15px', right: '-15px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <p style={{ fontSize: '12px', opacity: 0.85, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ready for Pickup</p>
          <p style={{ fontSize: '36px', fontWeight: 700, margin: '4px 0 0' }}>{readyOrders.length}</p>
        </div>
        <div style={{
          background: 'white', borderRadius: '16px', padding: '20px',
          border: '1px solid #E2E8F0',
        }}>
          <p style={{ fontSize: '12px', color: '#64748B', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Rx</p>
          <p style={{ fontSize: '36px', fontWeight: 700, color: '#0F172A', margin: '4px 0 0' }}>{activePrescriptions.length}</p>
        </div>
        <div style={{
          background: 'white', borderRadius: '16px', padding: '20px',
          border: '1px solid #E2E8F0',
        }}>
          <p style={{ fontSize: '12px', color: '#64748B', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending</p>
          <p style={{ fontSize: '36px', fontWeight: 700, color: '#D97706', margin: '4px 0 0' }}>{pendingPrescriptions.length}</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', justifyContent: 'center' }}>
        {quickActions.map((action) => (
          <button
            key={action.label}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
              padding: '16px 20px', background: 'white', border: '1px solid #E2E8F0',
              borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', minWidth: '80px',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <span style={{ fontSize: '24px' }}>{action.icon}</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>{action.label}</span>
          </button>
        ))}
      </div>

      {/* Orders */}
      {orders.length > 0 && (
        <div style={{
          background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0',
          overflow: 'hidden', marginBottom: '24px',
        }}>
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid #F1F5F9',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: 0 }}>Recent Orders</h3>
            <button style={{ background: 'none', border: 'none', color: accentColor, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              View All
            </button>
          </div>
          {orders.map((order, i) => {
            const st = statusColors[order.status] || statusColors.processing;
            return (
              <div key={order.orderId} style={{
                padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '14px',
                borderBottom: i < orders.length - 1 ? '1px solid #F8FAFC' : 'none',
                cursor: 'pointer', transition: 'background-color 0.15s',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px', background: st.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0,
                }}>
                  {order.status === 'ready' ? '✅' : order.status === 'processing' ? '⏳' : order.status === 'shipped' ? '📦' : '✓'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A', margin: 0 }}>
                    {order.items.join(', ')}
                  </p>
                  <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0' }}>
                    {order.orderId} · {order.date}
                    {order.estimatedReady && ` · ${order.estimatedReady}`}
                  </p>
                </div>
                <span style={{
                  fontSize: '11px', fontWeight: 600, color: st.text, background: st.bg,
                  padding: '4px 10px', borderRadius: '20px', flexShrink: 0,
                }}>
                  {st.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Prescriptions */}
      <div style={{
        background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #F1F5F9',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: 0 }}>My Prescriptions</h3>
          <button style={{ background: 'none', border: 'none', color: accentColor, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            View All
          </button>
        </div>
        {prescriptions.map((rx, i) => {
          const st = rxStatusColors[rx.status] || rxStatusColors.active;
          return (
            <div key={rx.rxNumber} style={{
              padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '14px',
              borderBottom: i < prescriptions.length - 1 ? '1px solid #F8FAFC' : 'none',
              cursor: 'pointer', transition: 'background-color 0.15s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px', background: '#FEF2F2',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0,
              }}>
                {rx.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: 0 }}>{rx.name}</p>
                  <span style={{
                    fontSize: '10px', fontWeight: 600, color: st.text, background: st.bg,
                    padding: '2px 8px', borderRadius: '20px',
                  }}>
                    {st.label}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>{rx.dosage}</p>
                <p style={{ fontSize: '11px', color: '#94A3B8', margin: '2px 0 0' }}>
                  {rx.prescriber} · {rx.rxNumber} · {rx.refillsLeft} refill{rx.refillsLeft !== 1 ? 's' : ''} left
                  {rx.status === 'active' && ` · Next: ${rx.nextRefillDate}`}
                </p>
              </div>
              {rx.status === 'active' && rx.refillsLeft > 0 && (
                <button style={{
                  padding: '6px 14px', fontSize: '12px', fontWeight: 600,
                  color: accentColor, background: `${accentColor}10`,
                  border: `1px solid ${accentColor}30`, borderRadius: '8px',
                  cursor: 'pointer', flexShrink: 0,
                }}>
                  Refill
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
