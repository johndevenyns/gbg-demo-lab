import { PortalConfig, DEFAULT_RENTAL_CAR_CONFIG } from '@/types/portalConfig';

interface RentalCarReservationsPageProps {
  accentColor: string;
  portalConfig?: PortalConfig;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  upcoming: { bg: '#DBEAFE', text: '#1E40AF', label: 'Upcoming' },
  active: { bg: '#DCFCE7', text: '#166534', label: 'Active' },
  completed: { bg: '#F1F5F9', text: '#64748B', label: 'Completed' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B', label: 'Cancelled' },
};

export function RentalCarReservationsPage({ accentColor, portalConfig }: RentalCarReservationsPageProps) {
  const config = { ...DEFAULT_RENTAL_CAR_CONFIG, ...portalConfig };
  const reservations = config.rentalCarReservations || DEFAULT_RENTAL_CAR_CONFIG.rentalCarReservations!;

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0 }}>My Reservations</h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>{reservations.length} reservation{reservations.length !== 1 ? 's' : ''}</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {reservations.map((res) => {
          const status = STATUS_STYLES[res.status] || STATUS_STYLES.completed;
          return (
            <div key={res.confirmationId} style={{
              background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0',
              padding: '20px 24px', transition: 'box-shadow 0.2s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '12px', background: '#F8FAFC',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px',
                  }}>
                    {res.vehicle.image}
                  </div>
                  <div>
                    <p style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      {res.vehicle.make} {res.vehicle.model}
                    </p>
                    <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0' }}>
                      {res.provider} · {res.vehicle.category}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '6px',
                    background: status.bg, color: status.text,
                  }}>{status.label}</span>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '6px 0 0' }}>${res.totalCost.toFixed(2)}</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '12px 0', borderTop: '1px solid #F1F5F9' }}>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Pick-up</p>
                  <p style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500, margin: '2px 0 0' }}>{res.pickupDate}</p>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '1px 0 0' }}>{res.pickupLocation}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Drop-off</p>
                  <p style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500, margin: '2px 0 0' }}>{res.dropoffDate}</p>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '1px 0 0' }}>{res.dropoffLocation}</p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #F1F5F9' }}>
                <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>
                  Confirmation: <span style={{ fontWeight: 600, color: '#64748B' }}>{res.confirmationId}</span>
                  {res.extras && res.extras.length > 0 && (
                    <span> · Extras: {res.extras.join(', ')}</span>
                  )}
                </p>
                {res.status === 'upcoming' && (
                  <button style={{
                    padding: '6px 14px', fontSize: '12px', fontWeight: 600,
                    color: '#EF4444', background: '#FEF2F2', border: '1px solid #FECACA',
                    borderRadius: '8px', cursor: 'pointer',
                  }}>Cancel</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
