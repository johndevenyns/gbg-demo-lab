import { useState } from 'react';
import { PortalConfig, DEFAULT_HOTEL_CONFIG, HotelRoom } from '@/types/portalConfig';

interface HotelDashboardProps {
  userName: string;
  accentColor: string;
  portalConfig?: PortalConfig;
  isNewAccount?: boolean;
  onSelectRoom: (room: HotelRoom) => void;
  onNavigate: (page: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  standard: 'Standard', deluxe: 'Deluxe', suite: 'Suite',
  executive: 'Executive', presidential: 'Presidential',
};

export function HotelDashboard({ userName, accentColor, portalConfig, isNewAccount, onSelectRoom, onNavigate }: HotelDashboardProps) {
  const config = { ...DEFAULT_HOTEL_CONFIG, ...portalConfig };
  const rooms = config.hotelRooms || DEFAULT_HOTEL_CONFIG.hotelRooms!;
  const locations = config.hotelLocations || DEFAULT_HOTEL_CONFIG.hotelLocations!;
  const reservations = config.hotelReservations || DEFAULT_HOTEL_CONFIG.hotelReservations!;
  const upcomingRes = reservations.find(r => r.status === 'upcoming');

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [destination, setDestination] = useState(locations[0]);

  const categories = ['all', ...Array.from(new Set(rooms.map(r => r.category)))];
  const filteredRooms = selectedCategory === 'all' ? rooms : rooms.filter(r => r.category === selectedCategory);

  const badgeColors: Record<string, { bg: string; text: string }> = {
    'Best Value': { bg: '#DCFCE7', text: '#166534' },
    'Most Booked': { bg: '#DBEAFE', text: '#1E40AF' },
    'Top Rated': { bg: '#FEF3C7', text: '#92400E' },
    'Premium': { bg: '#F3E8FF', text: '#6B21A8' },
    'Signature': { bg: '#FCE7F3', text: '#9D174D' },
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Welcome */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
          Welcome back, {userName.split(' ')[0]} 👋
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>
          {isNewAccount ? 'Plan your first stay with us!' : 'Find the perfect room for your next stay'}
        </p>
      </div>

      {/* Upcoming Reservation */}
      {upcomingRes && (
        <div style={{
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
          borderRadius: '16px', padding: '20px 24px', marginBottom: '24px', color: 'white',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 600, opacity: 0.85, margin: 0, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Upcoming Stay</p>
            <p style={{ fontSize: '20px', fontWeight: 700, margin: '4px 0 0' }}>{upcomingRes.room.name}</p>
            <p style={{ fontSize: '13px', opacity: 0.9, margin: '4px 0 0' }}>
              {upcomingRes.checkInDate} → {upcomingRes.checkOutDate} · {upcomingRes.nights} nights
            </p>
            <p style={{ fontSize: '12px', opacity: 0.75, margin: '4px 0 0' }}>
              {upcomingRes.hotelName} · Confirmation {upcomingRes.confirmationId}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <span style={{ fontSize: '40px' }}>{upcomingRes.room.image}</span>
            <button onClick={() => onNavigate('reservations')} style={{
              padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.4)',
              background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: '12px',
              fontWeight: 600, cursor: 'pointer', backdropFilter: 'blur(4px)',
            }}>View Details</button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div style={{
        background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0',
        padding: '16px 20px', marginBottom: '24px',
        display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '12px', alignItems: 'end',
      }}>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Destination</label>
          <select value={destination} onChange={(e) => setDestination(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px', background: 'white' }}>
            {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Check-in</label>
          <input type="text" value="Apr 15, 2025" readOnly style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px', background: '#FAFAFA' }} />
        </div>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Check-out</label>
          <input type="text" value="Apr 19, 2025" readOnly style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px', background: '#FAFAFA' }} />
        </div>
        <div>
          <label style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '4px' }}>Guests</label>
          <input type="text" value="2 adults" readOnly style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px', background: '#FAFAFA' }} />
        </div>
        <button style={{
          padding: '10px 22px', borderRadius: '10px', border: 'none',
          background: accentColor, color: 'white', fontSize: '13px', fontWeight: 700, cursor: 'pointer', height: '40px',
        }}>Search</button>
      </div>

      {/* Category filter pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {categories.map(cat => {
          const isActive = selectedCategory === cat;
          return (
            <button key={cat} onClick={() => setSelectedCategory(cat)} style={{
              padding: '8px 16px', borderRadius: '999px', fontSize: '12px', fontWeight: 600,
              border: isActive ? `1px solid ${accentColor}` : '1px solid #E2E8F0',
              background: isActive ? `${accentColor}10` : 'white',
              color: isActive ? accentColor : '#64748B', cursor: 'pointer', transition: 'all 0.2s',
            }}>
              {cat === 'all' ? 'All Rooms' : (CATEGORY_LABELS[cat] || cat)}
            </button>
          );
        })}
      </div>

      {/* Rooms grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {filteredRooms.map(room => {
          const badge = room.badge ? badgeColors[room.badge] : null;
          return (
            <div key={room.id} style={{
              background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0',
              overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column',
            }}
              onClick={() => onSelectRoom(room)}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{
                height: '140px', background: `linear-gradient(135deg, ${accentColor}15, ${accentColor}30)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '64px', position: 'relative',
              }}>
                {room.image}
                {badge && (
                  <span style={{
                    position: 'absolute', top: '12px', left: '12px',
                    fontSize: '10px', fontWeight: 700, padding: '4px 10px', borderRadius: '999px',
                    background: badge.bg, color: badge.text, letterSpacing: '0.3px',
                  }}>{room.badge}</span>
                )}
              </div>
              <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', margin: 0, letterSpacing: '0.4px' }}>
                  {CATEGORY_LABELS[room.category] || room.category} · {room.view || 'City View'}
                </p>
                <p style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '4px 0 6px' }}>{room.name}</p>
                <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                  {room.bedConfig} · Sleeps {room.maxGuests} · {room.sizeSqft} ft²
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#F59E0B' }}>★</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>{room.rating.toFixed(1)}</span>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>({room.reviewCount.toLocaleString()})</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', paddingTop: '12px' }}>
                  <div>
                    <p style={{ fontSize: '20px', fontWeight: 800, color: accentColor, margin: 0 }}>${room.pricePerNight}</p>
                    <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>per night</p>
                  </div>
                  <span style={{
                    fontSize: '12px', fontWeight: 600, color: accentColor,
                    padding: '6px 12px', borderRadius: '8px', background: `${accentColor}10`,
                  }}>Book →</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}