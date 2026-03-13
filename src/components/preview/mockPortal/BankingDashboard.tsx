import { useMemo } from 'react';

interface Transaction {
  id: string;
  merchant: string;
  amount: number;
  date: string;
  category: 'groceries' | 'income' | 'entertainment' | 'transport' | 'dining' | 'utilities' | 'shopping' | 'health';
  icon: string;
}

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', merchant: 'Whole Foods Market', amount: -82.47, date: 'Today', category: 'groceries', icon: '🛒' },
  { id: '2', merchant: 'Direct Deposit — Payroll', amount: 4250.00, date: 'Yesterday', category: 'income', icon: '💰' },
  { id: '3', merchant: 'Netflix', amount: -15.99, date: 'Mar 11', category: 'entertainment', icon: '🎬' },
  { id: '4', merchant: 'Uber', amount: -24.30, date: 'Mar 10', category: 'transport', icon: '🚗' },
  { id: '5', merchant: 'Starbucks', amount: -6.45, date: 'Mar 10', category: 'dining', icon: '☕' },
  { id: '6', merchant: 'Electric Company', amount: -142.80, date: 'Mar 9', category: 'utilities', icon: '⚡' },
  { id: '7', merchant: 'Amazon', amount: -67.23, date: 'Mar 8', category: 'shopping', icon: '📦' },
  { id: '8', merchant: 'CVS Pharmacy', amount: -32.10, date: 'Mar 7', category: 'health', icon: '💊' },
  { id: '9', merchant: 'Venmo Transfer', amount: 150.00, date: 'Mar 6', category: 'income', icon: '💸' },
  { id: '10', merchant: 'Spotify', amount: -10.99, date: 'Mar 5', category: 'entertainment', icon: '🎵' },
];

const QUICK_ACTIONS = [
  { label: 'Transfer', icon: '↗️', color: '#0D9488' },
  { label: 'Pay Bills', icon: '📄', color: '#6366F1' },
  { label: 'Deposit', icon: '📥', color: '#059669' },
  { label: 'More', icon: '⋯', color: '#64748B' },
];

interface BankingDashboardProps {
  userName: string;
  accentColor: string;
}

export function BankingDashboard({ userName, accentColor }: BankingDashboardProps) {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const firstName = userName.split(' ')[0] || 'there';

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      {/* Greeting */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
          {greeting}, {firstName}
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>
          Here's your financial overview
        </p>
      </div>

      {/* Account Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {/* Checking Account */}
        <div style={{
          background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`,
          borderRadius: '16px',
          padding: '24px',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px',
            borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
          }} />
          <div style={{
            position: 'absolute', bottom: '-30px', right: '30px', width: '60px', height: '60px',
            borderRadius: '50%', background: 'rgba(255,255,255,0.07)',
          }} />
          <p style={{ fontSize: '13px', opacity: 0.85, margin: 0, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            Checking Account
          </p>
          <p style={{ fontSize: '32px', fontWeight: 700, margin: '8px 0 4px', fontFamily: 'SF Mono, monospace' }}>
            $12,458.32
          </p>
          <p style={{ fontSize: '12px', opacity: 0.7, margin: 0 }}>
            •••• •••• •••• 4829
          </p>
        </div>

        {/* Savings Account */}
        <div style={{
          background: 'linear-gradient(135deg, #1E293B, #334155)',
          borderRadius: '16px',
          padding: '24px',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px',
            borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
          }} />
          <p style={{ fontSize: '13px', opacity: 0.85, margin: 0, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            Savings Account
          </p>
          <p style={{ fontSize: '32px', fontWeight: 700, margin: '8px 0 4px', fontFamily: 'SF Mono, monospace' }}>
            $45,891.00
          </p>
          <p style={{ fontSize: '12px', opacity: 0.7, margin: 0 }}>
            •••• •••• •••• 7163 · 4.25% APY
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', justifyContent: 'center' }}>
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
              padding: '16px 20px', background: 'white', border: '1px solid #E2E8F0',
              borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
              minWidth: '80px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span style={{ fontSize: '24px' }}>{action.icon}</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>{action.label}</span>
          </button>
        ))}
      </div>

      {/* Recent Transactions */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: 0 }}>
            Recent Transactions
          </h3>
          <button style={{
            background: 'none', border: 'none', color: accentColor,
            fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          }}>
            View All
          </button>
        </div>

        {MOCK_TRANSACTIONS.map((tx, i) => (
          <div
            key={tx.id}
            style={{
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              borderBottom: i < MOCK_TRANSACTIONS.length - 1 ? '1px solid #F8FAFC' : 'none',
              transition: 'background-color 0.15s',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: '#F1F5F9', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '18px', flexShrink: 0,
            }}>
              {tx.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {tx.merchant}
              </p>
              <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0' }}>
                {tx.date}
              </p>
            </div>
            <p style={{
              fontSize: '14px',
              fontWeight: 600,
              color: tx.amount >= 0 ? '#059669' : '#0F172A',
              margin: 0,
              fontFamily: 'SF Mono, monospace',
              flexShrink: 0,
            }}>
              {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
