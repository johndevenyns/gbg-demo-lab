import { useState, useMemo } from 'react';
import { PortalConfig, DEFAULT_BANKING_CONFIG, PortalVerificationTrigger } from '@/types/portalConfig';
import { CreditCardData } from './BankingDashboard';

type CardPageView = 'list' | 'apply' | 'activate';

interface BankingCardsPageProps {
  userName: string;
  accentColor: string;
  portalConfig?: PortalConfig;
  creditCards: CreditCardData[];
  onAddCard: (card: CreditCardData) => void;
  onActivateCard: (index: number) => void;
  onTriggerVerification: (trigger: PortalVerificationTrigger, ctx?: any) => void;
  onBack: () => void;
}

function generateCardNumber(): string {
  const groups = Array.from({ length: 4 }, () =>
    String(Math.floor(1000 + Math.random() * 9000))
  );
  return groups.join(' ');
}

function generateExpiry(): string {
  const month = String(Math.floor(1 + Math.random() * 12)).padStart(2, '0');
  const year = String(new Date().getFullYear() + 3).slice(-2);
  return `${month}/${year}`;
}

const CARD_OPTIONS = [
  {
    name: 'Everyday Cash Back',
    type: 'visa' as const,
    limit: 5000,
    perks: ['2% cash back on groceries', '1% on all other purchases', 'No annual fee'],
    gradient: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
    icon: '💳',
  },
  {
    name: 'Travel Rewards Platinum',
    type: 'visa' as const,
    limit: 15000,
    perks: ['3x points on travel & dining', 'Airport lounge access', '$200 travel credit'],
    gradient: 'linear-gradient(135deg, #6366F1, #4F46E5)',
    icon: '✈️',
  },
  {
    name: 'Business Advantage',
    type: 'mastercard' as const,
    limit: 25000,
    perks: ['3% back on business expenses', 'Employee cards at no cost', 'Quarterly reports'],
    gradient: 'linear-gradient(135deg, #0F172A, #334155)',
    icon: '💼',
  },
];

export function BankingCardsPage({
  userName,
  accentColor,
  portalConfig,
  creditCards,
  onAddCard,
  onActivateCard,
  onTriggerVerification,
  onBack,
}: BankingCardsPageProps) {
  const config = { ...DEFAULT_BANKING_CONFIG, ...portalConfig };
  const triggers = config.verificationTriggers || DEFAULT_BANKING_CONFIG.verificationTriggers!;
  const activateTrigger = triggers.find(t => t.action === 'activate a new credit card');

  const [view, setView] = useState<CardPageView>('list');
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [applyStep, setApplyStep] = useState<'select' | 'confirm' | 'approved'>('select');
  const [newCard, setNewCard] = useState<CreditCardData | null>(null);
  const [pendingActivateIdx, setPendingActivateIdx] = useState<number | null>(null);

  const handleApply = (optIdx: number) => {
    setSelectedCard(optIdx);
    setApplyStep('confirm');
  };

  const handleConfirmApply = () => {
    const opt = CARD_OPTIONS[selectedCard!];
    const card: CreditCardData = {
      cardNumber: generateCardNumber(),
      cardholderName: userName,
      expiryDate: generateExpiry(),
      cardType: opt.type,
      creditLimit: opt.limit,
      currentBalance: 0,
      isActive: false,
    };
    setNewCard(card);
    onAddCard(card);
    setApplyStep('approved');
  };

  const handleActivate = (idx: number) => {
    if (activateTrigger?.enabled) {
      setPendingActivateIdx(idx);
      onTriggerVerification(activateTrigger, { cardLast4: creditCards[idx].cardNumber.slice(-4) });
    } else {
      onActivateCard(idx);
    }
  };

  const sectionStyle: React.CSSProperties = {
    background: 'white', borderRadius: '20px', border: '1px solid #E2E8F0',
    padding: '24px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  };

  // ── Apply Flow ──
  if (view === 'apply') {
    if (applyStep === 'approved' && newCard) {
      return (
        <div style={{ padding: '28px 32px', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ ...sectionStyle, textAlign: 'center', padding: '48px 32px' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: '36px',
            }}>🎉</div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#059669', margin: '0 0 8px' }}>
              You're Approved!
            </h2>
            <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 24px' }}>
              Your new {CARD_OPTIONS[selectedCard!].name} card is ready.
            </p>

            {/* Card Preview */}
            <div style={{
              background: CARD_OPTIONS[selectedCard!].gradient,
              borderRadius: '16px', padding: '24px', color: 'white',
              textAlign: 'left', margin: '0 auto 24px', maxWidth: '380px',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
              <p style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', opacity: 0.8, margin: '0 0 20px', textTransform: 'uppercase' }}>
                {newCard.cardType === 'visa' ? 'VISA' : 'MASTERCARD'}
              </p>
              <p style={{ fontSize: '18px', fontFamily: '"SF Mono", monospace', letterSpacing: '3px', margin: '0 0 20px' }}>
                {newCard.cardNumber}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '10px', opacity: 0.6, margin: 0 }}>CARDHOLDER</p>
                  <p style={{ fontSize: '13px', fontWeight: 600, margin: '2px 0 0' }}>{newCard.cardholderName}</p>
                </div>
                <div>
                  <p style={{ fontSize: '10px', opacity: 0.6, margin: 0 }}>EXPIRES</p>
                  <p style={{ fontSize: '13px', fontWeight: 600, margin: '2px 0 0' }}>{newCard.expiryDate}</p>
                </div>
                <div>
                  <p style={{ fontSize: '10px', opacity: 0.6, margin: 0 }}>LIMIT</p>
                  <p style={{ fontSize: '13px', fontWeight: 600, margin: '2px 0 0' }}>${newCard.creditLimit.toLocaleString()}</p>
                </div>
              </div>
            </div>

            <div style={{
              background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '12px',
              padding: '14px 18px', marginBottom: '24px', textAlign: 'left',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}>
              <span style={{ fontSize: '18px' }}>🔐</span>
              <p style={{ fontSize: '13px', color: '#92400E', margin: 0 }}>
                Identity verification is required to activate your card and begin using it.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => { setView('list'); setApplyStep('select'); }} style={{
                flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0',
                background: 'white', color: '#64748B', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}>
                View My Cards
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (applyStep === 'confirm' && selectedCard !== null) {
      const opt = CARD_OPTIONS[selectedCard];
      return (
        <div style={{ padding: '28px 32px', maxWidth: '600px', margin: '0 auto' }}>
          <button onClick={() => setApplyStep('select')} style={{
            background: 'none', border: 'none', color: accentColor, fontSize: '14px', fontWeight: 500, cursor: 'pointer', marginBottom: '20px',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>← Back to cards</button>

          <div style={sectionStyle}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <span style={{ fontSize: '48px' }}>{opt.icon}</span>
              <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: '12px 0 4px' }}>
                {opt.name}
              </h2>
              <p style={{ fontSize: '14px', color: '#64748B' }}>Credit limit up to ${opt.limit.toLocaleString()}</p>
            </div>

            <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
              {opt.perks.map((perk, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0' }}>
                  <span style={{ color: '#059669', fontSize: '14px' }}>✓</span>
                  <span style={{ fontSize: '14px', color: '#334155' }}>{perk}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setApplyStep('select')} style={{
                flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0',
                background: 'white', color: '#64748B', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={handleConfirmApply} style={{
                flex: 1, padding: '14px', borderRadius: '12px', border: 'none',
                background: accentColor, color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}>Apply Now</button>
            </div>
          </div>
        </div>
      );
    }

    // Card selection
    return (
      <div style={{ padding: '28px 32px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Apply for a Credit Card</h1>
            <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>Choose the card that fits your lifestyle</p>
          </div>
          <button onClick={() => setView('list')} style={{
            background: 'none', border: 'none', color: accentColor, fontSize: '14px', fontWeight: 500, cursor: 'pointer',
          }}>Cancel</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {CARD_OPTIONS.map((opt, i) => (
            <div key={i} style={{
              ...sectionStyle, display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden', marginBottom: 0,
            }}>
              <div style={{ background: opt.gradient, padding: '28px 24px', color: 'white', textAlign: 'center' }}>
                <span style={{ fontSize: '40px' }}>{opt.icon}</span>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '12px 0 4px' }}>{opt.name}</h3>
                <p style={{ fontSize: '13px', opacity: 0.8, margin: 0 }}>Up to ${opt.limit.toLocaleString()}</p>
              </div>
              <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                {opt.perks.map((perk, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '6px 0' }}>
                    <span style={{ color: '#059669', fontSize: '12px', marginTop: '2px' }}>✓</span>
                    <span style={{ fontSize: '13px', color: '#475569' }}>{perk}</span>
                  </div>
                ))}
                <div style={{ flex: 1 }} />
                <button onClick={() => handleApply(i)} style={{
                  width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
                  background: accentColor, color: 'white', fontSize: '14px', fontWeight: 600,
                  cursor: 'pointer', marginTop: '16px',
                }}>
                  Apply Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Card List ──
  return (
    <div style={{ padding: '28px 32px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', margin: 0 }}>My Cards</h1>
          <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>
            {creditCards.length === 0 ? 'You have no credit cards yet' : `${creditCards.length} card${creditCards.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button onClick={() => { setView('apply'); setApplyStep('select'); }} style={{
          padding: '10px 20px', borderRadius: '10px', border: 'none',
          background: accentColor, color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          + Apply for Card
        </button>
      </div>

      {creditCards.length === 0 ? (
        <div style={{ ...sectionStyle, textAlign: 'center', padding: '60px 32px' }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>💳</span>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>No Credit Cards Yet</h3>
          <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 20px' }}>Apply for a card to earn rewards and build credit.</p>
          <button onClick={() => { setView('apply'); setApplyStep('select'); }} style={{
            padding: '12px 28px', borderRadius: '10px', border: 'none',
            background: accentColor, color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
          }}>
            Browse Cards
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {creditCards.map((card, i) => {
            const matchingOpt = CARD_OPTIONS.find(o => o.type === card.cardType && o.limit === card.creditLimit);
            const gradient = matchingOpt?.gradient || 'linear-gradient(135deg, #6366F1, #8B5CF6)';
            return (
              <div key={i} style={sectionStyle}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  {/* Card visual */}
                  <div style={{
                    background: gradient, borderRadius: '14px', padding: '20px',
                    color: 'white', width: '260px', flexShrink: 0, position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{ position: 'absolute', top: '-15px', right: '-15px', width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                    <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', opacity: 0.8, margin: '0 0 14px', textTransform: 'uppercase' }}>
                      {card.cardType === 'visa' ? 'VISA' : 'MASTERCARD'}
                    </p>
                    <p style={{ fontSize: '15px', fontFamily: '"SF Mono", monospace', letterSpacing: '2.5px', margin: '0 0 14px' }}>
                      {card.isActive ? card.cardNumber : '•••• •••• •••• ' + card.cardNumber.slice(-4)}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <p style={{ fontSize: '9px', opacity: 0.6, margin: 0 }}>CARDHOLDER</p>
                        <p style={{ fontSize: '11px', fontWeight: 600, margin: '1px 0 0' }}>{card.cardholderName}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '9px', opacity: 0.6, margin: 0 }}>EXP</p>
                        <p style={{ fontSize: '11px', fontWeight: 600, margin: '1px 0 0' }}>{card.expiryDate}</p>
                      </div>
                    </div>
                  </div>

                  {/* Card details */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                        {matchingOpt?.name || 'Credit Card'}
                      </h3>
                      <span style={{
                        fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px',
                        background: card.isActive ? '#ECFDF5' : '#FEF3C7',
                        color: card.isActive ? '#059669' : '#D97706',
                      }}>
                        {card.isActive ? 'Active' : 'Pending Activation'}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>Current Balance</p>
                        <p style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '2px 0 0', fontFamily: '"SF Mono", monospace' }}>
                          ${card.currentBalance.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0 }}>Credit Limit</p>
                        <p style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '2px 0 0', fontFamily: '"SF Mono", monospace' }}>
                          ${card.creditLimit.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Usage bar */}
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#64748B' }}>Available Credit</span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>
                          ${(card.creditLimit - card.currentBalance).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ height: '6px', borderRadius: '3px', background: '#F1F5F9' }}>
                        <div style={{
                          height: '100%', borderRadius: '3px',
                          background: (card.currentBalance / card.creditLimit) > 0.8 ? '#EF4444' : accentColor,
                          width: `${Math.min((card.currentBalance / card.creditLimit) * 100, 100)}%`,
                          transition: 'width 0.3s',
                        }} />
                      </div>
                    </div>

                    {!card.isActive && (
                      <button onClick={() => handleActivate(i)} style={{
                        padding: '10px 24px', borderRadius: '10px', border: 'none',
                        background: accentColor, color: 'white', fontSize: '13px', fontWeight: 600,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                      }}>
                        🔐 Activate Card
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
