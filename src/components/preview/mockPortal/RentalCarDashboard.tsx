import { useState } from 'react';
import { PortalConfig, DEFAULT_RENTAL_CAR_CONFIG, RentalCarVehicle } from '@/types/portalConfig';

interface RentalCarDashboardProps {
  userName: string;
  accentColor: string;
  portalConfig?: PortalConfig;
  isNewAccount?: boolean;
  onSelectVehicle: (vehicle: RentalCarVehicle) => void;
  onNavigate: (page: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  economy: 'Economy', compact: 'Compact', midsize: 'Midsize', fullsize: 'Full-size',
  suv: 'SUV', luxury: 'Luxury', minivan: 'Minivan', truck: 'Truck',
};

export function RentalCarDashboard({ userName, accentColor, portalConfig, isNewAccount, onSelectVehicle, onNavigate }: RentalCarDashboardProps) {
  const config = { ...DEFAULT_RENTAL_CAR_CONFIG, ...portalConfig };
  const vehicles = config.rentalCarVehicles || DEFAULT_RENTAL_CAR_CONFIG.rentalCarVehicles!;
  const locations = config.rentalCarPickupLocations || DEFAULT_RENTAL_CAR_CONFIG.rentalCarPickupLocations!;
  const reservations = config.rentalCarReservations || DEFAULT_RENTAL_CAR_CONFIG.rentalCarReservations!;
  const upcomingRes = reservations.find(r => r.status === 'upcoming');

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [pickupLocation, setPickupLocation] = useState(locations[0]);
  const [pickupDate] = useState('Apr 15, 2025');
  const [dropoffDate] = useState('Apr 19, 2025');

  const categories = ['all', ...Array.from(new Set(vehicles.map(v => v.category)))];
  const filteredVehicles = selectedCategory === 'all' ? vehicles : vehicles.filter(v => v.category === selectedCategory);

  const badgeColors: Record<string, { bg: string; text: string }> = {
    'Best Value': { bg: '#DCFCE7', text: '#166534' },
    'Popular': { bg: '#DBEAFE', text: '#1E40AF' },
    'Top Rated': { bg: '#FEF3C7', text: '#92400E' },
    'Premium': { bg: '#F3E8FF', text: '#6B21A8' },
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Welcome + Upcoming reservation */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
          Welcome back, {userName.split(' ')[0]} 👋
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>
          {isNewAccount ? 'Start your first rental today!' : 'Find your perfect ride'}
        </p>
      </div>

      {/* Upcoming Reservation Card */}
      {upcomingRes && (
        <div style={{
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
          borderRadius: '16px', padding: '20px 24px', marginBottom: '24px', color: 'white',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: '12px', fontWeight: 600, opacity: 0.8, margin: 0, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Upcoming Reservation</p>
            <p style={{ fontSize: '20px', fontWeight: 700, margin: '4px 0 0' }}>{upcomingRes.vehicle.make} {upcomingRes.vehicle.model}</p>
            <p style={{ fontSize: '13px', opacity: 0.9, margin: '4px 0 0' }}>
              {upcomingRes.pickupDate} — {upcomingRes.dropoffDate} · {upcomingRes.pickupLocation}
            </p>
            <p style={{ fontSize: '12px', opacity: 0.7, margin: '4px 0 0' }}>
              Confirmation: {upcomingRes.confirmationId} · {upcomingRes.provider}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <span style={{ fontSize: '40px' }}>{upcomingRes.vehicle.image}</span>
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
        padding: '20px 24px', marginBottom: '24px',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: '0 0 16px' }}>🔍 Find a Vehicle</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '4px' }}>Pick-up Location</label>
            <select value={pickupLocation} onChange={() => {}} style={{
              width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0',
              fontSize: '13px', color: '#0F172A', background: '#FAFAFA',
            }}>
              {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '4px' }}>Pick-up Date</label>
            <input type="text" value={pickupDate} readOnly style={{
              width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0',
              fontSize: '13px', color: '#0F172A', background: '#FAFAFA',
            }} />
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '4px' }}>Drop-off Date</label>
            <input type="text" value={dropoffDate} readOnly style={{
              width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0',
              fontSize: '13px', color: '#0F172A', background: '#FAFAFA',
            }} />
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {categories.map(cat => {
          const isActive = selectedCategory === cat;
          return (
            <button key={cat} onClick={() => setSelectedCategory(cat)} style={{
              padding: '8px 16px', borderRadius: '20px', border: 'none',
              background: isActive ? accentColor : '#F1F5F9',
              color: isActive ? 'white' : '#64748B',
              fontSize: '13px', fontWeight: isActive ? 600 : 500, cursor: 'pointer',
              transition: 'all 0.2s',
            }}>
              {cat === 'all' ? 'All Vehicles' : CATEGORY_LABELS[cat] || cat}
            </button>
          );
        })}
      </div>

      {/* Vehicle Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {filteredVehicles.map(vehicle => {
          const badge = vehicle.badge ? badgeColors[vehicle.badge] : null;
          return (
            <div key={vehicle.id} style={{
              background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0',
              overflow: 'hidden', transition: 'box-shadow 0.2s, transform 0.2s', cursor: 'pointer',
            }}
              onClick={() => onSelectVehicle(vehicle)}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
            >
              {/* Vehicle Image Area */}
              <div style={{
                height: '120px', background: '#F8FAFC', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '56px', position: 'relative',
              }}>
                {vehicle.image}
                {badge && (
                  <span style={{
                    position: 'absolute', top: '10px', right: '10px', fontSize: '10px',
                    fontWeight: 700, padding: '4px 10px', borderRadius: '6px',
                    background: badge.bg, color: badge.text,
                  }}>{vehicle.badge}</span>
                )}
                <span style={{
                  position: 'absolute', bottom: '10px', left: '10px', fontSize: '10px',
                  fontWeight: 600, padding: '3px 8px', borderRadius: '4px',
                  background: 'rgba(0,0,0,0.6)', color: 'white',
                }}>{vehicle.provider}</span>
              </div>

              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <p style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </p>
                    <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0' }}>
                      {CATEGORY_LABELS[vehicle.category]} · {vehicle.transmission}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '20px', fontWeight: 800, color: accentColor, margin: 0 }}>${vehicle.pricePerDay}</p>
                    <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>/day</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: '#64748B', marginBottom: '12px' }}>
                  <span>👤 {vehicle.seats} seats</span>
                  <span>🧳 {vehicle.bags} bags</span>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  {vehicle.features.slice(0, 3).map(f => (
                    <span key={f} style={{
                      fontSize: '10px', padding: '3px 8px', borderRadius: '4px',
                      background: '#F1F5F9', color: '#64748B',
                    }}>{f}</span>
                  ))}
                </div>

                <button onClick={(e) => { e.stopPropagation(); onSelectVehicle(vehicle); }} style={{
                  width: '100%', padding: '10px', borderRadius: '10px', border: 'none',
                  background: accentColor, color: 'white', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', transition: 'opacity 0.2s',
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                  Reserve Now
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
