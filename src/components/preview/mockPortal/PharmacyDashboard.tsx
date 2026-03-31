import { useMemo } from 'react';
import { PortalConfig, DEFAULT_PHARMACY_CONFIG } from '@/types/portalConfig';

interface PharmacyDashboardProps {
  userName: string;
  accentColor: string;
  portalConfig?: PortalConfig;
  onNavigate?: (page: 'prescriptions' | 'orders' | 'settings' | 'dashboard') => void;
}

export function PharmacyDashboard({ userName, accentColor, portalConfig, onNavigate }: PharmacyDashboardProps) {
  const config = { ...DEFAULT_PHARMACY_CONFIG, ...portalConfig };
  const prescriptions = config.prescriptions || DEFAULT_PHARMACY_CONFIG.prescriptions!;
  const orders = config.orders || DEFAULT_PHARMACY_CONFIG.orders!;

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

  return (
    <div style={{ padding: '24px' }}>
      {/* Greeting + Quick Status */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1E293B', margin: 0 }}>
          {greeting}, {firstName}
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>
          Here's your pharmacy overview
        </p>
      </div>

      {/* Pickup Alert Banner */}
      {readyOrders.length > 0 && (
        <div style={{
          background: `linear-gradient(135deg, ${accentColor}12, ${accentColor}06)`,
          border: `1px solid ${accentColor}30`,
          borderRadius: '12px', padding: '16px 20px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: accentColor, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '20px',
            }}>📦</div>
            <div>
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#1E293B', margin: 0 }}>
                {readyOrders.length} order{readyOrders.length > 1 ? 's' : ''} ready for pickup!
              </p>
              <p style={{ fontSize: '13px', color: '#64748B', margin: '2px 0 0' }}>
                {readyOrders[0]?.items.join(', ')} at {readyOrders[0]?.pickupLocation || 'your store'}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate?.('orders')}
            style={{
              padding: '8px 20px', borderRadius: '8px', border: 'none',
              background: accentColor, color: 'white', fontSize: '13px',
              fontWeight: 600, cursor: 'pointer',
            }}
          >View Orders</button>
        </div>
      )}

      {/* Quick Services Grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px',
      }}>
        {[
          { icon: '💊', label: 'Refill Rx', desc: 'Refill prescriptions', page: 'prescriptions' as const },
          { icon: '📋', label: 'Transfer Rx', desc: 'From another pharmacy', page: 'prescriptions' as const },
          { icon: '💉', label: 'Vaccinations', desc: 'Schedule a shot', page: 'dashboard' as const },
          { icon: '🏥', label: 'Health Services', desc: 'Consultations & more', page: 'dashboard' as const },
        ].map(svc => (
          <button
            key={svc.label}
            onClick={() => onNavigate?.(svc.page)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '20px 12px', background: 'white', border: '1px solid #E2E8F0',
              borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', gap: '8px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span style={{ fontSize: '28px' }}>{svc.icon}</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B' }}>{svc.label}</span>
            <span style={{ fontSize: '11px', color: '#94A3B8' }}>{svc.desc}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* My Prescriptions */}
        <div style={{
          background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid #F1F5F9',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>💊</span>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1E293B', margin: 0 }}>My Prescriptions</h3>
            </div>
            <button onClick={() => onNavigate?.('prescriptions')} style={{
              background: 'none', border: 'none', color: accentColor,
              fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}>View All →</button>
          </div>
          {activePrescriptions.slice(0, 3).map((rx, i) => (
            <div key={rx.rxNumber} style={{
              padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px',
              borderBottom: i < 2 ? '1px solid #F8FAFC' : 'none',
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px',
                background: '#FEF2F2', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '16px', flexShrink: 0,
              }}>💊</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#1E293B', margin: 0 }}>{rx.name}</p>
                <p style={{ fontSize: '11px', color: '#94A3B8', margin: '2px 0 0' }}>{rx.dosage}</p>
              </div>
              {rx.refillsLeft > 0 && (
                <button style={{
                  padding: '4px 12px', fontSize: '11px', fontWeight: 600,
                  color: accentColor, background: `${accentColor}10`,
                  border: `1px solid ${accentColor}25`, borderRadius: '6px', cursor: 'pointer',
                }}>Refill</button>
              )}
            </div>
          ))}
          {pendingPrescriptions.length > 0 && (
            <div style={{
              padding: '10px 20px', background: '#FFFBEB', borderTop: '1px solid #FEF3C7',
              fontSize: '12px', color: '#92400E', display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <span>⏳</span> {pendingPrescriptions.length} prescription{pendingPrescriptions.length > 1 ? 's' : ''} pending approval
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div style={{
          background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0', overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid #F1F5F9',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>📦</span>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1E293B', margin: 0 }}>Recent Orders</h3>
            </div>
            <button onClick={() => onNavigate?.('orders')} style={{
              background: 'none', border: 'none', color: accentColor,
              fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}>View All →</button>
          </div>
          {orders.slice(0, 3).map((order, i) => {
            const statusMap: Record<string, { bg: string; text: string; label: string }> = {
              ready: { bg: '#ECFDF5', text: '#059669', label: 'Ready' },
              processing: { bg: '#FEF3C7', text: '#D97706', label: 'Processing' },
              picked_up: { bg: '#F1F5F9', text: '#64748B', label: 'Picked Up' },
              shipped: { bg: '#EFF6FF', text: '#2563EB', label: 'Shipped' },
            };
            const st = statusMap[order.status] || statusMap.processing;
            return (
              <div key={order.orderId} style={{
                padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px',
                borderBottom: i < 2 ? '1px solid #F8FAFC' : 'none',
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '8px',
                  background: st.bg, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '16px', flexShrink: 0,
                }}>
                  {order.status === 'ready' ? '✅' : order.status === 'shipped' ? '🚚' : '⏳'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: '#1E293B', margin: 0 }}>
                    {order.items.join(', ')}
                  </p>
                  <p style={{ fontSize: '11px', color: '#94A3B8', margin: '2px 0 0' }}>
                    {order.orderId} · {order.date}
                  </p>
                </div>
                <span style={{
                  fontSize: '10px', fontWeight: 600, color: st.text,
                  background: st.bg, padding: '3px 8px', borderRadius: '12px',
                }}>{st.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Health & Wellness Section */}
      <div style={{ marginTop: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1E293B', margin: '0 0 12px' }}>
          Health & Wellness
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[
            { icon: '💉', title: 'Flu Shot', desc: 'Get vaccinated today — no appointment needed', cta: 'Schedule' },
            { icon: '🩺', title: 'Health Screening', desc: 'Blood pressure, glucose & cholesterol checks', cta: 'Learn More' },
            { icon: '📱', title: 'Rx Reminders', desc: 'Never miss a dose with smart notifications', cta: 'Set Up' },
          ].map(card => (
            <div key={card.title} style={{
              background: 'white', border: '1px solid #E2E8F0', borderRadius: '12px',
              padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px',
            }}>
              <span style={{ fontSize: '28px' }}>{card.icon}</span>
              <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', margin: 0 }}>{card.title}</h4>
              <p style={{ fontSize: '12px', color: '#64748B', margin: 0, lineHeight: 1.4 }}>{card.desc}</p>
              <button style={{
                marginTop: '4px', padding: '6px 14px', borderRadius: '6px',
                border: `1px solid ${accentColor}30`, background: `${accentColor}08`,
                color: accentColor, fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', alignSelf: 'flex-start',
              }}>{card.cta}</button>
            </div>
          ))}
        </div>
      </div>

      {/* Insurance & Store Info Footer */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px',
      }}>
        <div style={{
          background: 'white', border: '1px solid #E2E8F0', borderRadius: '12px',
          padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <span style={{ fontSize: '24px' }}>🏥</span>
          <div>
            <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>Insurance</p>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', margin: '2px 0 0' }}>
              {config.insuranceProvider || 'Not set'}
            </p>
            <p style={{ fontSize: '11px', color: '#94A3B8', margin: '2px 0 0' }}>
              Member ID: {config.insuranceMemberId || '—'}
            </p>
          </div>
        </div>
        <div style={{
          background: 'white', border: '1px solid #E2E8F0', borderRadius: '12px',
          padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <span style={{ fontSize: '24px' }}>📍</span>
          <div>
            <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>Preferred Store</p>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#1E293B', margin: '2px 0 0' }}>
              {config.preferredStore || 'Not set'}
            </p>
            <p style={{ fontSize: '11px', color: '#94A3B8', margin: '2px 0 0' }}>
              Open until 10:00 PM
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
