import { useState } from 'react';
import { RetailProduct, RetailPaymentMethod, RetailAddress, PortalVerificationTrigger, DEFAULT_RETAIL_CONFIG, PortalConfig } from '@/types/portalConfig';

export interface CartItem {
  product: RetailProduct;
  qty: number;
}

type CheckoutStep = 'cart' | 'shipping' | 'payment' | 'review';

interface RetailCartPageProps {
  items: CartItem[];
  accentColor: string;
  portalConfig?: PortalConfig;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  onPlaceOrder: (total: number) => void;
  onContinueShopping: () => void;
}

const STEP_LABELS: { key: CheckoutStep; label: string }[] = [
  { key: 'cart', label: 'Cart' },
  { key: 'shipping', label: 'Shipping' },
  { key: 'payment', label: 'Payment' },
  { key: 'review', label: 'Review' },
];

export function RetailCartPage({
  items, accentColor, portalConfig, onUpdateQty, onRemove, onPlaceOrder, onContinueShopping,
}: RetailCartPageProps) {
  const config = { ...DEFAULT_RETAIL_CONFIG, ...portalConfig };
  const addresses = config.retailAddresses || DEFAULT_RETAIL_CONFIG.retailAddresses!;
  const paymentMethods = config.retailPaymentMethods || DEFAULT_RETAIL_CONFIG.retailPaymentMethods!;
  const triggers = config.verificationTriggers || DEFAULT_RETAIL_CONFIG.verificationTriggers!;
  const purchaseTrigger = triggers.find(t => t.id === 'retail-purchase' && t.enabled);

  const [step, setStep] = useState<CheckoutStep>('cart');
  const [selectedAddressIdx, setSelectedAddressIdx] = useState(addresses.findIndex(a => a.isDefault) ?? 0);
  const [selectedPaymentIdx, setSelectedPaymentIdx] = useState(paymentMethods.findIndex(p => p.isDefault) ?? 0);

  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.qty, 0);
  const shipping = subtotal > 50 ? 0 : 5.99;
  const tax = +(subtotal * 0.08).toFixed(2);
  const total = +(subtotal + shipping + tax).toFixed(2);

  const requiresVerification = purchaseTrigger &&
    purchaseTrigger.condition === 'threshold' &&
    purchaseTrigger.thresholdAmount &&
    total >= purchaseTrigger.thresholdAmount;

  const selectedAddress = addresses[selectedAddressIdx] || addresses[0];
  const selectedPayment = paymentMethods[selectedPaymentIdx] || paymentMethods[0];

  const CARD_NAMES: Record<string, string> = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express' };

  // ── Empty cart ──
  if (items.length === 0) {
    return (
      <div style={{ padding: '48px 24px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🛒</div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>Your cart is empty</h2>
        <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 24px' }}>Browse our products and add items to get started.</p>
        <button onClick={onContinueShopping} style={{
          padding: '12px 28px', borderRadius: '10px', border: 'none',
          background: accentColor, color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
        }}>Continue Shopping</button>
      </div>
    );
  }

  // ── Stepper ──
  const stepIndex = STEP_LABELS.findIndex(s => s.key === step);
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
                fontSize: '12px', fontWeight: 700, transition: 'all 0.3s',
              }}>
                {isComplete ? '✓' : i + 1}
              </div>
              <span style={{
                fontSize: '13px', fontWeight: isActive ? 600 : 400,
                color: isActive ? '#0F172A' : isComplete ? '#059669' : '#94A3B8',
              }}>{s.label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div style={{
                width: '40px', height: '2px', margin: '0 12px',
                background: isComplete ? '#059669' : '#E2E8F0',
                borderRadius: '1px', transition: 'background 0.3s',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );

  const sectionStyle: React.CSSProperties = {
    background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '20px 24px', marginBottom: '16px',
  };

  // ── Cart Step ──
  if (step === 'cart') {
    return (
      <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Shopping Cart</h1>
        <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 24px' }}>{items.length} item{items.length !== 1 ? 's' : ''}</p>
        {renderStepper()}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'flex-start' }}>
          {/* Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {items.map(({ product, qty }) => (
              <div key={product.id} style={{
                background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0',
                padding: '16px 20px', display: 'flex', gap: '16px', alignItems: 'center',
              }}>
                <div style={{
                  width: '72px', height: '72px', borderRadius: '12px', background: '#F8FAFC',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', flexShrink: 0,
                }}>{product.image}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: '0 0 4px' }}>{product.name}</p>
                  <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>{product.category}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <QtyButton label="−" onClick={() => onUpdateQty(product.id, Math.max(0, qty - 1))} />
                  <span style={{ width: '32px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{qty}</span>
                  <QtyButton label="+" onClick={() => onUpdateQty(product.id, qty + 1)} />
                </div>
                <div style={{ width: '90px', textAlign: 'right' }}>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>${(product.price * qty).toFixed(2)}</p>
                  {qty > 1 && <p style={{ fontSize: '11px', color: '#94A3B8', margin: '2px 0 0' }}>${product.price.toFixed(2)} ea</p>}
                </div>
                <button onClick={() => onRemove(product.id)} style={{
                  background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '18px', padding: '4px', lineHeight: 1,
                }} title="Remove">✕</button>
              </div>
            ))}
            <button onClick={onContinueShopping} style={{
              alignSelf: 'flex-start', padding: '8px 16px', borderRadius: '8px', border: 'none',
              background: 'transparent', color: accentColor, fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}>← Continue Shopping</button>
          </div>
          {/* Summary */}
          <OrderSummary subtotal={subtotal} shipping={shipping} tax={tax} total={total} accentColor={accentColor}
            buttonLabel="Proceed to Shipping" onAction={() => setStep('shipping')} />
        </div>
      </div>
    );
  }

  // ── Shipping Step ──
  if (step === 'shipping') {
    return (
      <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
        {renderStepper()}
        <BackLink label="Back to Cart" onClick={() => setStep('cart')} color={accentColor} />
        <div style={sectionStyle}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Choose Shipping Address</h2>
          <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 16px' }}>Select where you'd like your order delivered</p>
          {addresses.map((addr, idx) => (
            <label key={idx} style={{
              display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '14px 16px',
              borderRadius: '12px', border: `2px solid ${selectedAddressIdx === idx ? accentColor : '#E2E8F0'}`,
              background: selectedAddressIdx === idx ? `${accentColor}06` : 'white',
              cursor: 'pointer', marginBottom: '10px', transition: 'all 0.2s',
            }}>
              <input type="radio" name="address" checked={selectedAddressIdx === idx} onChange={() => setSelectedAddressIdx(idx)}
                style={{ marginTop: '3px', accentColor }} />
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {addr.label}
                  {addr.isDefault && <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', background: `${accentColor}15`, color: accentColor }}>DEFAULT</span>}
                </p>
                <p style={{ fontSize: '13px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
                  {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />{addr.city}, {addr.state} {addr.zip}
                </p>
              </div>
            </label>
          ))}
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
        {renderStepper()}
        <BackLink label="Back to Shipping" onClick={() => setStep('shipping')} color={accentColor} />
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
              <input type="radio" name="payment" checked={selectedPaymentIdx === idx} onChange={() => setSelectedPaymentIdx(idx)}
                style={{ accentColor }} />
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                💳
              </div>
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
        }}>Review Order</button>
      </div>
    );
  }

  // ── Review Step ──
  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      {renderStepper()}
      <BackLink label="Back to Payment" onClick={() => setStep('payment')} color={accentColor} />

      {/* Items Summary */}
      <div style={sectionStyle}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>📦</span> Items ({items.length})
        </h3>
        {items.map(({ product, qty }) => (
          <div key={product.id} style={{
            display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0',
            borderBottom: '1px solid #F1F5F9',
          }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
              {product.image}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#0F172A', margin: 0 }}>{product.name}</p>
              <p style={{ fontSize: '11px', color: '#94A3B8', margin: 0 }}>Qty: {qty}</p>
            </div>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>${(product.price * qty).toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Shipping */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📍</span> Shipping to
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
              {selectedAddress.label} — {selectedAddress.line1}{selectedAddress.line2 ? `, ${selectedAddress.line2}` : ''}, {selectedAddress.city}, {selectedAddress.state} {selectedAddress.zip}
            </p>
          </div>
          <button onClick={() => setStep('shipping')} style={{
            fontSize: '12px', fontWeight: 600, color: accentColor, background: 'none', border: 'none', cursor: 'pointer',
          }}>Change</button>
        </div>
      </div>

      {/* Payment */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>💳</span> Payment
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
              {CARD_NAMES[selectedPayment.type] || selectedPayment.type} •••• {selectedPayment.lastFour}
            </p>
          </div>
          <button onClick={() => setStep('payment')} style={{
            fontSize: '12px', fontWeight: 600, color: accentColor, background: 'none', border: 'none', cursor: 'pointer',
          }}>Change</button>
        </div>
      </div>

      {/* Totals */}
      <div style={sectionStyle}>
        <SummaryRow label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
        <SummaryRow label="Shipping" value={shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`} valueColor={shipping === 0 ? '#059669' : undefined} />
        <SummaryRow label="Est. Tax" value={`$${tax.toFixed(2)}`} />
        <div style={{
          borderTop: '2px solid #F1F5F9', paddingTop: '12px', marginTop: '12px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>Total</span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A' }}>${total.toFixed(2)}</span>
        </div>
      </div>

      {/* Verification notice */}
      {requiresVerification && (
        <div style={{
          padding: '12px 16px', borderRadius: '10px', background: '#FEF3C7', border: '1px solid #FDE68A',
          display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px',
        }}>
          <span style={{ fontSize: '16px' }}>🔐</span>
          <p style={{ fontSize: '13px', color: '#92400E', margin: 0 }}>
            Identity verification required for orders over ${purchaseTrigger?.thresholdAmount?.toLocaleString()}
          </p>
        </div>
      )}

      <button onClick={() => onPlaceOrder(total)} style={{
        width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
        background: accentColor, color: 'white', fontSize: '15px', fontWeight: 700,
        cursor: 'pointer', transition: 'opacity 0.2s', letterSpacing: '0.3px',
      }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
      >
        {requiresVerification ? '🔐 Verify & Place Order' : 'Place Order'}
      </button>
      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', color: '#94A3B8' }}>
        <span>🔒</span> Secure checkout · Free returns within 30 days
      </div>
    </div>
  );
}

// ── Shared sub-components ──

function QtyButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #E2E8F0',
      background: 'white', cursor: 'pointer', fontSize: '16px', display: 'flex',
      alignItems: 'center', justifyContent: 'center', color: '#64748B',
    }}>{label}</button>
  );
}

function BackLink({ label, onClick, color }: { label: string; onClick: () => void; color: string }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <button onClick={onClick} style={{
        background: 'none', border: 'none', color, fontSize: '14px', fontWeight: 500,
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
      }}>← {label}</button>
    </div>
  );
}

function SummaryRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
      <span style={{ fontSize: '14px', color: '#64748B' }}>{label}</span>
      <span style={{ fontSize: '14px', fontWeight: 600, color: valueColor || '#0F172A' }}>{value}</span>
    </div>
  );
}

function OrderSummary({ subtotal, shipping, tax, total, accentColor, buttonLabel, onAction }: {
  subtotal: number; shipping: number; tax: number; total: number; accentColor: string; buttonLabel: string; onAction: () => void;
}) {
  return (
    <div style={{
      background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0',
      padding: '24px', position: 'sticky', top: '140px',
    }}>
      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px' }}>Order Summary</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        <SummaryRow label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
        <SummaryRow label="Shipping" value={shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`} valueColor={shipping === 0 ? '#059669' : undefined} />
        <SummaryRow label="Est. Tax" value={`$${tax.toFixed(2)}`} />
      </div>
      <div style={{
        borderTop: '2px solid #F1F5F9', paddingTop: '12px', marginBottom: '20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A' }}>Total</span>
        <span style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A' }}>${total.toFixed(2)}</span>
      </div>
      <button onClick={onAction} style={{
        width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
        background: accentColor, color: 'white', fontSize: '15px', fontWeight: 700,
        cursor: 'pointer', transition: 'opacity 0.2s',
      }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
      >{buttonLabel}</button>
      <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', color: '#94A3B8' }}>
        <span>🔒</span> Secure checkout · Free returns
      </div>
    </div>
  );
}
