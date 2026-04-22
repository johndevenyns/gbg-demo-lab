import { useState } from 'react';
import { HotelRoom, DEFAULT_HOTEL_CONFIG, PortalConfig } from '@/types/portalConfig';

type CheckoutStep = 'details' | 'addons' | 'payment' | 'review';

interface HotelCheckoutPageProps {
  room: HotelRoom;
  accentColor: string;
  portalConfig?: PortalConfig;
  onPlaceOrder: (total: number) => void;
  onBack: () => void;
}

const STEP_LABELS: { key: CheckoutStep; label: string }[] = [
  { key: 'details', label: 'Stay Details' },
  { key: 'addons', label: 'Add-ons' },
  { key: 'payment', label: 'Payment' },
  { key: 'review', label: 'Review' },
];

const ADDONS = [
  { id: 'breakfast', label: 'Breakfast Package', price: 28, icon: '🥐', perGuest: true },
  { id: 'parking', label: 'Valet Parking', price: 45, icon: '🚙', perGuest: false },
  { id: 'spa', label: 'Spa Credit ($50/day)', price: 50, icon: '💆', perGuest: false },
  { id: 'late_checkout', label: 'Late Checkout (4 PM)', price: 35, icon: '🕓', perGuest: false, oneTime: true },
  { id: 'airport', label: 'Airport Transfer', price: 75, icon: '🚖', perGuest: false, oneTime: true },
  { id: 'crib', label: 'Crib / Rollaway Bed', price: 20, icon: '🛏️', perGuest: false },
];

const CARD_NAMES: Record<string, string> = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express' };

export function HotelCheckoutPage({ room, accentColor, portalConfig, onPlaceOrder, onBack }: HotelCheckoutPageProps) {
  const config = { ...DEFAULT_HOTEL_CONFIG, ...portalConfig };
  const locations = config.hotelLocations || DEFAULT_HOTEL_CONFIG.hotelLocations!;
  const paymentMethods = config.hotelPaymentMethods || DEFAULT_HOTEL_CONFIG.hotelPaymentMethods!;
  const triggers = config.verificationTriggers || DEFAULT_HOTEL_CONFIG.verificationTriggers!;
  const bookingTrigger = triggers.find(t => t.id === 'hotel-booking' && t.enabled);

  const [step, setStep] = useState<CheckoutStep>('details');
  const [destination, setDestination] = useState(locations[0]);
  const [guests, setGuests] = useState(2);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [selectedPaymentIdx, setSelectedPaymentIdx] = useState(paymentMethods.findIndex(p => p.isDefault) ?? 0);

  const nights = 4;
  const roomCost = room.pricePerNight * nights;
  const addonCost = selectedAddons.reduce((sum, id) => {
    const addon = ADDONS.find(a => a.id === id);
    if (!addon) return sum;
    if (addon.oneTime) return sum + addon.price;
    const multiplier = addon.perGuest ? guests * nights : nights;
    return sum + addon.price * multiplier;
  }, 0);
  const resortFee = 35 * nights;
  const taxRate = 0.142;
  const tax = +((roomCost + addonCost + resortFee) * taxRate).toFixed(2);
  const total = +(roomCost + addonCost + resortFee + tax).toFixed(2);

  const requiresVerification = bookingTrigger && bookingTrigger.condition === 'threshold' && bookingTrigger.thresholdAmount && total >= bookingTrigger.thresholdAmount;

  const selectedPayment = paymentMethods[selectedPaymentIdx] || paymentMethods[0];
  const stepIndex = STEP_LABELS.findIndex(s => s.key === step);

  const toggleAddon = (id: string) => {
    setSelectedAddons(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]);
  };

  const renderStepper = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0', marginBottom: '28px', flexWrap: 'wrap' }}>
      {STEP_LABELS.map((s, i) => {
        const isActive = i === stepIndex;
        const isComplete = i < stepIndex;
        return (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: isComplete ? '#059669' : isActive ? accentColor : '#E2E8F0',
                color: isComplete || isActive ? 'white' : '#94A3B8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700,
              }}>
                {isComplete ? '✓' : i + 1}
              </div>
              <span style={{ fontSize: '13px', fontWeight: isActive ? 600 : 400, color: isActive ? '#0F172A' : isComplete ? '#059669' : '#94A3B8' }}>{s.label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && <div style={{ width: '40px', height: '2px', margin: '0 12px', background: isComplete ? '#059669' : '#E2E8F0' }} />}
          </div>
        );
      })}
    </div>
  );

  const sectionStyle: React.CSSProperties = { background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '20px 24px', marginBottom: '16px' };

  // Room summary card (shown on all steps)
  const roomSummary = (
    <div style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '16px', background: '#F8FAFC', borderRadius: '12px', marginBottom: '20px' }}>
      <div style={{ fontSize: '40px' }}>{room.image}</div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>{room.name}</p>
        <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0' }}>{room.bedConfig} · Sleeps {room.maxGuests} · {room.view || 'City View'}</p>
      </div>
      <div style={{ textAlign: 'right' }}>
        <p style={{ fontSize: '18px', fontWeight: 800, color: accentColor, margin: 0 }}>${room.pricePerNight}</p>
        <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>/night</p>
      </div>
    </div>
  );

  // ── Stay Details Step ──
  if (step === 'details') {
    return (
      <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: accentColor, fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginBottom: '16px' }}>← Back to rooms</button>
        {renderStepper()}
        {roomSummary}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }}>Stay Details</h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '4px' }}>Hotel / Destination</label>
              <select value={destination} onChange={(e) => setDestination(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px' }}>
                {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '4px' }}>Check-in</label>
                <input type="text" value="Apr 15, 2025 · 3:00 PM" readOnly style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px', background: '#FAFAFA' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '4px' }}>Check-out</label>
                <input type="text" value="Apr 19, 2025 · 11:00 AM" readOnly style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px', background: '#FAFAFA' }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '4px' }}>Guests</label>
              <select value={guests} onChange={(e) => setGuests(parseInt(e.target.value))} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px' }}>
                {Array.from({ length: room.maxGuests }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n}>{n} guest{n !== 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>📅 {nights} night stay</p>
          </div>
        </div>
        <button onClick={() => setStep('addons')} style={{
          width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
          background: accentColor, color: 'white', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
        }}>Choose Add-ons</button>
      </div>
    );
  }

  // ── Add-ons Step ──
  if (step === 'addons') {
    return (
      <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
        <button onClick={() => setStep('details')} style={{ background: 'none', border: 'none', color: accentColor, fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginBottom: '16px' }}>← Back to Stay Details</button>
        {renderStepper()}
        {roomSummary}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Enhance Your Stay</h2>
          <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 16px' }}>Optional add-ons for a better experience</p>
          {ADDONS.map(addon => {
            const isSelected = selectedAddons.includes(addon.id);
            const lineTotal = addon.oneTime ? addon.price : addon.price * (addon.perGuest ? guests * nights : nights);
            const subtitle = addon.oneTime ? 'one-time' : addon.perGuest ? `$${addon.price}/guest/night` : `$${addon.price}/night`;
            return (
              <label key={addon.id} style={{
                display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px',
                borderRadius: '12px', border: `2px solid ${isSelected ? accentColor : '#E2E8F0'}`,
                background: isSelected ? `${accentColor}06` : 'white',
                cursor: 'pointer', marginBottom: '10px', transition: 'all 0.2s',
              }}>
                <input type="checkbox" checked={isSelected} onChange={() => toggleAddon(addon.id)} style={{ accentColor }} />
                <span style={{ fontSize: '20px' }}>{addon.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: 0 }}>{addon.label}</p>
                  <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>{subtitle}</p>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>${lineTotal.toFixed(2)}</span>
              </label>
            );
          })}
        </div>
        <button onClick={() => setStep('payment')} style={{
          width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
          background: accentColor, color: 'white', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
        }}>Continue to Payment</button>
      </div>
    );
  }

  // ── Payment Step ──
  if (step === 'payment') {
    return (
      <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
        <button onClick={() => setStep('addons')} style={{ background: 'none', border: 'none', color: accentColor, fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginBottom: '16px' }}>← Back to Add-ons</button>
        {renderStepper()}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Choose Payment Method</h2>
          <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 16px' }}>Select how you'd like to pay</p>
          {paymentMethods.map((pm, idx) => (
            <label key={idx} style={{
              display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px',
              borderRadius: '12px', border: `2px solid ${selectedPaymentIdx === idx ? accentColor : '#E2E8F0'}`,
              background: selectedPaymentIdx === idx ? `${accentColor}06` : 'white',
              cursor: 'pointer', marginBottom: '10px', transition: 'all 0.2s',
            }}>
              <input type="radio" name="payment" checked={selectedPaymentIdx === idx} onChange={() => setSelectedPaymentIdx(idx)} style={{ accentColor }} />
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>💳</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {CARD_NAMES[pm.type] || pm.type} •••• {pm.lastFour}
                  {pm.isDefault && <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: `${accentColor}15`, color: accentColor }}>DEFAULT</span>}
                </p>
                <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0' }}>Expires {pm.expiryDate}</p>
              </div>
            </label>
          ))}
        </div>
        <button onClick={() => setStep('review')} style={{
          width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
          background: accentColor, color: 'white', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
        }}>Review Booking</button>
      </div>
    );
  }

  // ── Review Step ──
  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      <button onClick={() => setStep('payment')} style={{ background: 'none', border: 'none', color: accentColor, fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginBottom: '16px' }}>← Back to Payment</button>
      {renderStepper()}
      {roomSummary}

      {/* Stay summary */}
      <div style={sectionStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', margin: 0 }}>Check-in</p>
            <p style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500, margin: '2px 0 0' }}>Apr 15, 2025 · 3:00 PM</p>
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', margin: 0 }}>Check-out</p>
            <p style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500, margin: '2px 0 0' }}>Apr 19, 2025 · 11:00 AM</p>
          </div>
          <div style={{ gridColumn: '1 / -1', paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
            <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>📍 {destination}</p>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>👤 {guests} guest{guests !== 1 ? 's' : ''} · {nights} nights</p>
          </div>
        </div>
      </div>

      {/* Add-ons summary */}
      {selectedAddons.length > 0 && (
        <div style={sectionStyle}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>Add-ons</h3>
          {selectedAddons.map(id => {
            const addon = ADDONS.find(a => a.id === id)!;
            const lineTotal = addon.oneTime ? addon.price : addon.price * (addon.perGuest ? guests * nights : nights);
            return (
              <div key={id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px' }}>
                <span style={{ color: '#64748B' }}>{addon.icon} {addon.label}</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>${lineTotal.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Payment */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '6px' }}>💳 Payment</h3>
            <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>{CARD_NAMES[selectedPayment.type]} •••• {selectedPayment.lastFour}</p>
          </div>
          <button onClick={() => setStep('payment')} style={{ fontSize: '12px', fontWeight: 600, color: accentColor, background: 'none', border: 'none', cursor: 'pointer' }}>Change</button>
        </div>
      </div>

      {/* Cost breakdown */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px' }}>
          <span style={{ color: '#64748B' }}>Room ({nights} nights × ${room.pricePerNight}/night)</span>
          <span style={{ fontWeight: 600, color: '#0F172A' }}>${roomCost.toFixed(2)}</span>
        </div>
        {addonCost > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px' }}>
            <span style={{ color: '#64748B' }}>Add-ons</span>
            <span style={{ fontWeight: 600, color: '#0F172A' }}>${addonCost.toFixed(2)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px' }}>
          <span style={{ color: '#64748B' }}>Resort Fee ({nights} × $35)</span>
          <span style={{ fontWeight: 600, color: '#0F172A' }}>${resortFee.toFixed(2)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px' }}>
          <span style={{ color: '#64748B' }}>Taxes & Fees</span>
          <span style={{ fontWeight: 600, color: '#0F172A' }}>${tax.toFixed(2)}</span>
        </div>
        <div style={{ borderTop: '2px solid #F1F5F9', paddingTop: '12px', marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>Total</span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A' }}>${total.toFixed(2)}</span>
        </div>
      </div>

      {requiresVerification && (
        <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#FEF3C7', border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span style={{ fontSize: '16px' }}>🔐</span>
          <p style={{ fontSize: '13px', color: '#92400E', margin: 0 }}>Identity verification required for bookings over ${bookingTrigger?.thresholdAmount?.toLocaleString()}</p>
        </div>
      )}

      <button onClick={() => onPlaceOrder(total)} style={{
        width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
        background: accentColor, color: 'white', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
      }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
      >
        {requiresVerification ? '🔐 Verify & Confirm Booking' : 'Confirm Booking'}
      </button>
    </div>
  );
}