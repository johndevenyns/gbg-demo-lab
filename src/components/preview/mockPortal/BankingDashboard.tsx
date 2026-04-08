import { useMemo } from 'react';
import { PortalConfig, DEFAULT_BANKING_CONFIG } from '@/types/portalConfig';

interface BankingDashboardProps {
  userName: string;
  accentColor: string;
  portalConfig?: PortalConfig;
  isNewAccount?: boolean;
  onQuickAction?: (actionLabel: string) => void;
  creditCards?: CreditCardData[];
}

export interface CreditCardData {
  cardNumber: string;
  cardholderName: string;
  expiryDate: string;
  cardType: 'visa' | 'mastercard';
  creditLimit: number;
  currentBalance: number;
  isActive: boolean;
  activatedAt?: string;
}

export function BankingDashboard({ userName, accentColor, portalConfig, isNewAccount, onQuickAction, creditCards }: BankingDashboardProps) {
  const config = { ...DEFAULT_BANKING_CONFIG, ...portalConfig };

  const accounts = isNewAccount
    ? (config.accounts || DEFAULT_BANKING_CONFIG.accounts!).map(acct => ({ ...acct, balance: 0 }))
    : config.accounts || DEFAULT_BANKING_CONFIG.accounts!;
  const transactions = isNewAccount ? [] : (config.transactions || DEFAULT_BANKING_CONFIG.transactions!);
  const quickActions = config.quickActions || DEFAULT_BANKING_CONFIG.quickActions!;

  const isLightAccent = useMemo(() => {
    const hex = accentColor.replace('#', '');
    if (hex.length < 6) return false;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55;
  }, [accentColor]);

  const primaryCardTextColor = isLightAccent ? '#0F172A' : '#FFFFFF';

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = userName.split(' ')[0] || 'there';
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  // Spending breakdown mock
  const spendingCategories = [
    { label: 'Food & Dining', amount: 342.21, color: '#F59E0B', percent: 35 },
    { label: 'Transportation', amount: 187.50, color: '#3B82F6', percent: 19 },
    { label: 'Entertainment', amount: 142.97, color: '#8B5CF6', percent: 15 },
    { label: 'Utilities', amount: 285.60, color: '#10B981', percent: 29 },
  ];

  const activeCards = creditCards?.filter(c => c.isActive) || [];

  return (
    <div style={{ padding: '28px 32px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Greeting + Total */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.5px' }}>
            {greeting}, {firstName}
          </h1>
          <p style={{ fontSize: '14px', color: '#64748B', marginTop: '6px' }}>
            {isNewAccount ? 'Welcome to your new account' : "Here's your financial snapshot"}
          </p>
        </div>
        {!isNewAccount && (
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '12px', color: '#94A3B8', margin: '0 0 2px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Total Balance</p>
            <p style={{ fontSize: '28px', fontWeight: 800, color: '#0F172A', margin: 0, fontFamily: '"SF Mono", "Fira Code", monospace' }}>
              {totalBalance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </p>
          </div>
        )}
      </div>

      {/* Account Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {accounts.map((acct, i) => (
          <div key={i} style={{
            background: acct.variant === 'primary'
              ? `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`
              : 'linear-gradient(135deg, #1E293B, #334155)',
            borderRadius: '20px',
            padding: '24px',
            color: acct.variant === 'primary' ? primaryCardTextColor : 'white',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: acct.variant === 'primary'
              ? `0 8px 32px ${accentColor}30`
              : '0 8px 32px rgba(0,0,0,0.15)',
          }}>
            <div style={{
              position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px',
              borderRadius: '50%', background: 'rgba(255,255,255,0.08)',
            }} />
            <div style={{
              position: 'absolute', bottom: '-20px', left: '-20px', width: '80px', height: '80px',
              borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
            }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', opacity: 0.8, margin: 0, letterSpacing: '0.5px', textTransform: 'uppercase', fontWeight: 600 }}>
                {acct.name}
              </p>
              {acct.apy && (
                <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.15)', padding: '3px 8px', borderRadius: '20px', fontWeight: 600 }}>
                  {acct.apy} APY
                </span>
              )}
            </div>
            <p style={{ fontSize: '30px', fontWeight: 800, margin: '0 0 8px', fontFamily: '"SF Mono", "Fira Code", monospace', letterSpacing: '-0.5px' }}>
              {acct.balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </p>
            <p style={{ fontSize: '13px', opacity: 0.6, margin: 0, fontFamily: '"SF Mono", "Fira Code", monospace' }}>
              •••• •••• •••• {acct.lastFour}
            </p>
          </div>
        ))}
      </div>

      {/* Credit Cards mini-display */}
      {activeCards.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Credit Cards</h3>
            <button
              onClick={() => onQuickAction?.('Cards')}
              style={{ background: 'none', border: 'none', color: accentColor, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
            >
              Manage →
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
            {activeCards.slice(0, 2).map((card, i) => (
              <div key={i} style={{
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                borderRadius: '16px',
                padding: '20px',
                color: 'white',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: '-15px', right: '-15px', width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px', opacity: 0.8 }}>
                    {card.cardType === 'visa' ? 'VISA' : 'MASTERCARD'}
                  </span>
                  <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                    Active
                  </span>
                </div>
                <p style={{ fontSize: '14px', fontFamily: '"SF Mono", monospace', margin: '0 0 8px', letterSpacing: '2px' }}>
                  •••• •••• •••• {card.cardNumber.slice(-4)}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div>
                    <p style={{ fontSize: '11px', opacity: 0.7, margin: 0 }}>Balance</p>
                    <p style={{ fontSize: '18px', fontWeight: 700, margin: '2px 0 0', fontFamily: '"SF Mono", monospace' }}>
                      ${card.currentBalance.toLocaleString()}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '11px', opacity: 0.7, margin: 0 }}>Limit</p>
                    <p style={{ fontSize: '13px', fontWeight: 600, margin: '2px 0 0' }}>
                      ${card.creditLimit.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => onQuickAction?.(action.label)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '12px 20px', background: 'white', border: '1px solid #E2E8F0',
              borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
              fontSize: '13px', fontWeight: 600, color: '#374151',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)';
              e.currentTarget.style.borderColor = accentColor;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
              e.currentTarget.style.borderColor = '#E2E8F0';
            }}
          >
            <span style={{ fontSize: '20px' }}>{action.icon}</span>
            {action.label}
          </button>
        ))}
      </div>

      {/* Two-column: Transactions + Spending */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
        {/* Recent Transactions */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{
            padding: '18px 22px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Recent Transactions</h3>
            <button style={{ background: 'none', border: 'none', color: accentColor, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
              View All
            </button>
          </div>

          {transactions.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: '40px', marginBottom: '12px' }}>🎉</p>
              <p style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: '0 0 4px' }}>Welcome!</p>
              <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>Transactions will appear here.</p>
            </div>
          ) : transactions.slice(0, 8).map((tx, i) => (
            <div
              key={tx.merchant + i}
              style={{
                padding: '14px 22px',
                display: 'flex', alignItems: 'center', gap: '14px',
                borderBottom: i < Math.min(transactions.length, 8) - 1 ? '1px solid #F8FAFC' : 'none',
                transition: 'background-color 0.15s', cursor: 'pointer',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <div style={{
                width: '42px', height: '42px', borderRadius: '12px',
                background: '#F1F5F9', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '18px', flexShrink: 0,
              }}>
                {tx.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {tx.merchant}
                </p>
                <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0' }}>{tx.date}</p>
              </div>
              <p style={{
                fontSize: '14px', fontWeight: 600,
                color: tx.amount >= 0 ? '#059669' : '#0F172A',
                margin: 0, fontFamily: '"SF Mono", monospace', flexShrink: 0,
              }}>
                {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
              </p>
            </div>
          ))}
        </div>

        {/* Spending Insights */}
        {!isNewAccount && (
          <div style={{
            background: 'white',
            borderRadius: '20px',
            border: '1px solid #E2E8F0',
            padding: '22px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            alignSelf: 'start',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>Monthly Spending</h3>
            <p style={{ fontSize: '12px', color: '#94A3B8', margin: '0 0 20px' }}>This month's breakdown</p>

            {/* Mini bar chart */}
            <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '20px', gap: '2px' }}>
              {spendingCategories.map((cat) => (
                <div key={cat.label} style={{ flex: cat.percent, background: cat.color, borderRadius: '4px' }} />
              ))}
            </div>

            {spendingCategories.map((cat) => (
              <div key={cat.label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid #F8FAFC',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: cat.color }} />
                  <span style={{ fontSize: '13px', color: '#475569', fontWeight: 500 }}>{cat.label}</span>
                </div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', fontFamily: '"SF Mono", monospace' }}>
                  ${cat.amount.toFixed(2)}
                </span>
              </div>
            ))}

            <div style={{
              marginTop: '16px', padding: '14px', borderRadius: '12px',
              background: `${accentColor}08`, border: `1px solid ${accentColor}15`,
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 2px' }}>Total Spent</p>
              <p style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0, fontFamily: '"SF Mono", monospace' }}>
                ${spendingCategories.reduce((s, c) => s + c.amount, 0).toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Offers & Products */}
      {!isNewAccount && (
        <div style={{ marginTop: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Explore Products & Offers</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            {[
              { icon: '🏠', title: 'Home Mortgage', desc: 'Rates as low as 6.25% APR', tag: 'Popular' },
              { icon: '🔄', title: 'Refinance Mortgage', desc: 'Lower your monthly payment', tag: 'Save' },
              { icon: '🚗', title: 'Auto Loan', desc: 'New & used, from 4.49% APR', tag: null },
              { icon: '🎓', title: 'Student Loan Refi', desc: 'Consolidate & save', tag: null },
              { icon: '💰', title: 'Personal Loan', desc: 'Up to $50K, fixed rates', tag: 'Fast' },
              { icon: '🏦', title: 'Home Equity Line', desc: 'Tap into your equity', tag: null },
              { icon: '📈', title: 'Investment Account', desc: 'Stocks, ETFs & more', tag: 'New' },
              { icon: '🛡️', title: 'Life Insurance', desc: 'Protect what matters', tag: null },
            ].map((offer) => (
              <div
                key={offer.title}
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
                  e.currentTarget.style.borderColor = accentColor;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                  e.currentTarget.style.borderColor = '#E2E8F0';
                }}
              >
                {offer.tag && (
                  <span style={{
                    position: 'absolute', top: '12px', right: '12px',
                    fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                    background: `${accentColor}15`, color: accentColor,
                    padding: '2px 8px', borderRadius: '6px', letterSpacing: '0.5px',
                  }}>{offer.tag}</span>
                )}
                <span style={{ fontSize: '28px', display: 'block', marginBottom: '12px' }}>{offer.icon}</span>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>{offer.title}</p>
                <p style={{ fontSize: '12px', color: '#64748B', margin: '0 0 12px', lineHeight: 1.4 }}>{offer.desc}</p>
                <span style={{
                  fontSize: '12px', fontWeight: 600, color: accentColor, cursor: 'pointer',
                }}>Learn More →</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
