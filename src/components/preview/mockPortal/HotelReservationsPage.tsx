import { PortalConfig, DEFAULT_HOTEL_CONFIG } from '@/types/portalConfig';

interface HotelReservationsPageProps {
  accentColor: string;
  portalConfig?: PortalConfig;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  upcoming: { bg: '#DBEAFE', text: '#1E40AF', label: 'Upcoming' },
  checked_in: { bg: '#DCFCE7', text: '#166534', label: 'Checked In' },
  completed: { bg: '#F1F5F9', text: '#64748B', label: 'Completed' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B', label: 'Cancelled' },
};

export function HotelReservationsPage({ accentColor, portalConfig }: HotelReservationsPageProps) {
  const config = { ...DEFAULT_HOTEL_CONFIG, ...portalConfig };
  const reservations = config.hotelReservations || DEFAULT_HOTEL_CONFIG.hotelReservations!;

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0 }}>My Reservations</h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>{reservations.length} stay{reservations.length !== 1 ? 's' : ''}</p>
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
                    {res.room.image}
                  </div>
                  <div>
                    <p style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      {res.room.name}
                    </p>
                    <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0' }}>
                      {res.hotelName}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', padding: '12px 0', borderTop: '1px solid #F1F5F9' }}>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', margin: 0 }}>Check-in</p>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', margin: '2px 0 0' }}>{res.checkInDate}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', margin: 0 }}>Check-out</p>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', margin: '2px 0 0' }}>{res.checkOutDate}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', margin: 0 }}>Stay</p>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', margin: '2px 0 0' }}>{res.nights} nights · {res.guests} guest{res.guests !== 1 ? 's' : ''}</p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px' }}>
                <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>Confirmation {res.confirmationId}</p>
                {res.addOns && res.addOns.length > 0 && (
                  <p style={{ fontSize: '11px', color: '#64748B', margin: 0 }}>
                    + {res.addOns.join(' · ')}
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