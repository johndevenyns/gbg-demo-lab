import { useState } from 'react';
import { RetailProduct, PortalVerificationTrigger } from '@/types/portalConfig';

export interface CartItem {
  product: RetailProduct;
  qty: number;
}

interface RetailCartPageProps {
  items: CartItem[];
  accentColor: string;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  onCheckout: (total: number) => void;
  onContinueShopping: () => void;
}

export function RetailCartPage({
  items, accentColor, onUpdateQty, onRemove, onCheckout, onContinueShopping,
}: RetailCartPageProps) {
  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.qty, 0);
  const shipping = subtotal > 50 ? 0 : 5.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  if (items.length === 0) {
    return (
      <div style={{ padding: '48px 24px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🛒</div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>Your cart is empty</h2>
        <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 24px' }}>Browse our products and add items to get started.</p>
        <button onClick={onContinueShopping} style={{
          padding: '12px 28px', borderRadius: '10px', border: 'none',
          background: accentColor, color: 'white', fontSize: '14px',
          fontWeight: 600, cursor: 'pointer',
        }}>
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Shopping Cart</h1>
      <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 24px' }}>{items.length} item{items.length !== 1 ? 's' : ''} in your cart</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'flex-start' }}>
        {/* Cart Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {items.map(({ product, qty }) => (
            <div key={product.id} style={{
              background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0',
              padding: '16px 20px', display: 'flex', gap: '16px', alignItems: 'center',
            }}>
              <div style={{
                width: '72px', height: '72px', borderRadius: '12px', background: '#F8FAFC',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', flexShrink: 0,
              }}>
                {product.image}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A', margin: '0 0 4px' }}>{product.name}</p>
                <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>{product.category}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button onClick={() => onUpdateQty(product.id, Math.max(0, qty - 1))} style={{
                  width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #E2E8F0',
                  background: 'white', cursor: 'pointer', fontSize: '16px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: '#64748B',
                }}>−</button>
                <span style={{ width: '32px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>{qty}</span>
                <button onClick={() => onUpdateQty(product.id, qty + 1)} style={{
                  width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #E2E8F0',
                  background: 'white', cursor: 'pointer', fontSize: '16px', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: '#64748B',
                }}>+</button>
              </div>
              <div style={{ width: '90px', textAlign: 'right' }}>
                <p style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>${(product.price * qty).toFixed(2)}</p>
                {qty > 1 && <p style={{ fontSize: '11px', color: '#94A3B8', margin: '2px 0 0' }}>${product.price.toFixed(2)} each</p>}
              </div>
              <button onClick={() => onRemove(product.id)} style={{
                background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer',
                fontSize: '18px', padding: '4px', lineHeight: 1,
              }} title="Remove">✕</button>
            </div>
          ))}
          <button onClick={onContinueShopping} style={{
            alignSelf: 'flex-start', padding: '8px 16px', borderRadius: '8px',
            border: 'none', background: 'transparent', color: accentColor,
            fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            ← Continue Shopping
          </button>
        </div>

        {/* Order Summary */}
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
          <button onClick={() => onCheckout(total)} style={{
            width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
            background: accentColor, color: 'white', fontSize: '15px',
            fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.2s',
            letterSpacing: '0.3px',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            Proceed to Checkout
          </button>
          <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '12px', color: '#94A3B8' }}>
            <span>🔒</span> Secure checkout · Free returns
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '14px', color: '#64748B' }}>{label}</span>
      <span style={{ fontSize: '14px', fontWeight: 600, color: valueColor || '#0F172A' }}>{value}</span>
    </div>
  );
}
