import { useState } from 'react';
import { RentalCarVehicle, RentalCarPaymentMethod, DEFAULT_RENTAL_CAR_CONFIG, PortalConfig } from '@/types/portalConfig';

type CheckoutStep = 'details' | 'extras' | 'payment' | 'review';

interface RentalCarCheckoutPageProps {
  vehicle: RentalCarVehicle;
  accentColor: string;
  portalConfig?: PortalConfig;
  onPlaceOrder: (total: number) => void;
  onBack: () => void;
}

const STEP_LABELS: { key: CheckoutStep; label: string }[] = [
  { key: 'details', label: 'Trip Details' },
  { key: 'extras', label: 'Extras' },
  { key: 'payment', label: 'Payment' },
  { key: 'review', label: 'Review' },
];

const EXTRAS = [
  { id: 'gps', label: 'GPS Navigation', price: 10, icon: '📍' },
  { id: 'insurance', label: 'Premium Insurance', price: 25, icon: '🛡️' },
  { id: 'child_seat', label: 'Child Car Seat', price: 12, icon: '👶' },
  { id: 'roadside', label: 'Roadside Assistance', price: 8, icon: '🔧' },
  { id: 'prepaid_fuel', label: 'Prepaid Fuel', price: 45, icon: '⛽' },
  { id: 'additional_driver', label: 'Additional Driver', price: 15, icon: '👤' },
];

const CARD_NAMES: Record<string, string> = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express' };

export function RentalCarCheckoutPage({ vehicle, accentColor, portalConfig, onPlaceOrder, onBack }: RentalCarCheckoutPageProps) {
  const config = { ...DEFAULT_RENTAL_CAR_CONFIG, ...portalConfig };
  const locations = config.rentalCarPickupLocations || DEFAULT_RENTAL_CAR_CONFIG.rentalCarPickupLocations!;
  const paymentMethods = config.rentalCarPaymentMethods || DEFAULT_RENTAL_CAR_CONFIG.rentalCarPaymentMethods!;
  const triggers = config.verificationTriggers || DEFAULT_RENTAL_CAR_CONFIG.verificationTriggers!;
  const bookingTrigger = triggers.find(t => t.id === 'rental-booking' && t.enabled);

  const [step, setStep] = useState<CheckoutStep>('details');
  const [pickupLocation, setPickupLocation] = useState(locations[0]);
  const [dropoffLocation, setDropoffLocation] = useState(locations[0]);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [selectedPaymentIdx, setSelectedPaymentIdx] = useState(paymentMethods.findIndex(p => p.isDefault) ?? 0);

  const rentalDays = 4;
  const vehicleCost = vehicle.pricePerDay * rentalDays;
  const extrasCost = selectedExtras.reduce((sum, id) => {
    const extra = EXTRAS.find(e => e.id === id);
    return sum + (extra ? extra.price * rentalDays : 0);
  }, 0);
  const tax = +((vehicleCost + extrasCost) * 0.08).toFixed(2);
  const total = +(vehicleCost + extrasCost + tax).toFixed(2);

  const requiresVerification = bookingTrigger && bookingTrigger.condition === 'threshold' && bookingTrigger.thresholdAmount && total >= bookingTrigger.thresholdAmount;

  const selectedPayment = paymentMethods[selectedPaymentIdx] || paymentMethods[0];
  const stepIndex = STEP_LABELS.findIndex(s => s.key === step);

  const toggleExtra = (id: string) => {
    setSelectedExtras(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
  };

  const renderStepper = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0', marginBottom: '28px' }}>
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

  // Vehicle summary card (shown on all steps)
  const vehicleSummary = (
    <div style={{ display: 'flex', gap: '14px', alignItems: 'center', padding: '16px', background: '#F8FAFC', borderRadius: '12px', marginBottom: '20px' }}>
      <div style={{ fontSize: '40px' }}>{vehicle.image}</div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>{vehicle.year} {vehicle.make} {vehicle.model}</p>
        <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0' }}>{vehicle.provider} · {vehicle.category} · {vehicle.seats} seats · {vehicle.bags} bags</p>
      </div>
      <div style={{ textAlign: 'right' }}>
        <p style={{ fontSize: '18px', fontWeight: 800, color: accentColor, margin: 0 }}>${vehicle.pricePerDay}</p>
        <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>/day</p>
      </div>
    </div>
  );

  // ── Trip Details Step ──
  if (step === 'details') {
    return (
      <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: accentColor, fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginBottom: '16px' }}>← Back to vehicles</button>
        {renderStepper()}
        {vehicleSummary}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }}>Trip Details</h2>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '4px' }}>Pick-up Location</label>
              <select value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px' }}>
                {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '4px' }}>Drop-off Location</label>
              <select value={dropoffLocation} onChange={(e) => setDropoffLocation(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px' }}>
                {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '4px' }}>Pick-up Date</label>
                <input type="text" value="Apr 15, 2025 · 2:00 PM" readOnly style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px', background: '#FAFAFA' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', display: 'block', marginBottom: '4px' }}>Drop-off Date</label>
                <input type="text" value="Apr 19, 2025 · 2:00 PM" readOnly style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '13px', background: '#FAFAFA' }} />
              </div>
            </div>
            <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>📅 {rentalDays} day rental</p>
          </div>
        </div>
        <button onClick={() => setStep('extras')} style={{
          width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
          background: accentColor, color: 'white', fontSize: '15px', fontWeight: 700, cursor: 'pointer',
        }}>Choose Extras</button>
      </div>
    );
  }

  // ── Extras Step ──
  if (step === 'extras') {
    return (
      <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
        <button onClick={() => setStep('details')} style={{ background: 'none', border: 'none', color: accentColor, fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginBottom: '16px' }}>← Back to Trip Details</button>
        {renderStepper()}
        {vehicleSummary}
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Add-ons & Extras</h2>
          <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 16px' }}>Enhance your rental experience</p>
          {EXTRAS.map(extra => {
            const isSelected = selectedExtras.includes(extra.id);
            return (
              <label key={extra.id} style={{
                display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px',
                borderRadius: '12px', border: `2px solid ${isSelected ? accentColor : '#E2E8F0'}`,
                background: isSelected ? `${accentColor}06` : 'white',
                cursor: 'pointer', marginBottom: '10px', transition: 'all 0.2s',
              }}>
                <input type="checkbox" checked={isSelected} onChange={() => toggleExtra(extra.id)} style={{ accentColor }} />
                <span style={{ fontSize: '20px' }}>{extra.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: 0 }}>{extra.label}</p>
                  <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>${extra.price}/day</p>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>${(extra.price * rentalDays).toFixed(2)}</span>
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
        <button onClick={() => setStep('extras')} style={{ background: 'none', border: 'none', color: accentColor, fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginBottom: '16px' }}>← Back to Extras</button>
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
      {vehicleSummary}

      {/* Trip summary */}
      <div style={sectionStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', margin: 0 }}>Pick-up</p>
            <p style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500, margin: '2px 0 0' }}>Apr 15, 2025 · 2:00 PM</p>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '1px 0 0' }}>{pickupLocation}</p>
          </div>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', margin: 0 }}>Drop-off</p>
            <p style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500, margin: '2px 0 0' }}>Apr 19, 2025 · 2:00 PM</p>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '1px 0 0' }}>{dropoffLocation}</p>
          </div>
        </div>
      </div>

      {/* Extras summary */}
      {selectedExtras.length > 0 && (
        <div style={sectionStyle}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>Extras</h3>
          {selectedExtras.map(id => {
            const extra = EXTRAS.find(e => e.id === id)!;
            return (
              <div key={id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px' }}>
                <span style={{ color: '#64748B' }}>{extra.icon} {extra.label} × {rentalDays} days</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>${(extra.price * rentalDays).toFixed(2)}</span>
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
          <span style={{ color: '#64748B' }}>Vehicle ({rentalDays} days × ${vehicle.pricePerDay}/day)</span>
          <span style={{ fontWeight: 600, color: '#0F172A' }}>${vehicleCost.toFixed(2)}</span>
        </div>
        {extrasCost > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '14px' }}>
            <span style={{ color: '#64748B' }}>Extras</span>
            <span style={{ fontWeight: 600, color: '#0F172A' }}>${extrasCost.toFixed(2)}</span>
          </div>
        )}
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
      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', color: '#94A3B8' }}>
        <span>🔒</span> Secure booking · Free cancellation up to 24 hours before pick-up
      </div>
    </div>
  );
}
