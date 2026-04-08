import { PortalConfig, DEFAULT_GAMING_CONFIG, GamingBet } from '@/types/portalConfig';

interface GamingBetsPageProps {
  accentColor: string;
  portalConfig?: PortalConfig;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  won: { bg: '#DCFCE7', text: '#16A34A', label: 'Won' },
  lost: { bg: '#FEE2E2', text: '#DC2626', label: 'Lost' },
  pending: { bg: '#FEF3C7', text: '#D97706', label: 'Pending' },
  void: { bg: '#F1F5F9', text: '#64748B', label: 'Void' },
};

export function GamingBetsPage({ accentColor, portalConfig }: GamingBetsPageProps) {
  const config = { ...DEFAULT_GAMING_CONFIG, ...portalConfig };
  const bets = config.gamingBets || DEFAULT_GAMING_CONFIG.gamingBets!;

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>My Bets</h1>
      <p style={{ fontSize: '14px', color: '#64748B', margin: '0 0 24px' }}>Your betting history and active wagers</p>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Active Bets', value: bets.filter(b => b.status === 'pending').length, icon: '🎯', color: '#D97706' },
          { label: 'Total Won', value: `$${bets.filter(b => b.status === 'won').reduce((s, b) => s + (b.payout || 0), 0).toFixed(0)}`, icon: '🏆', color: '#16A34A' },
          { label: 'Total Bets', value: bets.length, icon: '🎫', color: accentColor },
        ].map(card => (
          <div key={card.label} style={{
            background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0',
            padding: '16px 18px', textAlign: 'center',
          }}>
            <p style={{ fontSize: '20px', margin: '0 0 6px' }}>{card.icon}</p>
            <p style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: '0 0 2px', fontFamily: 'monospace' }}>{card.value}</p>
            <p style={{ fontSize: '11px', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>{card.label}</p>
          </div>
        ))}
      </div>

      {/* Bet List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {bets.map((bet, idx) => {
          const status = STATUS_STYLES[bet.status] || STATUS_STYLES.pending;
          return (
            <div key={idx} style={{
              background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0',
              padding: '16px 20px', transition: 'box-shadow 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: '0 0 2px' }}>{bet.event}</p>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>{bet.selection} · {bet.betType}</p>
                </div>
                <span style={{
                  padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                  background: status.bg, color: status.text, textTransform: 'uppercase',
                }}>{status.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px' }}>
                <span style={{ color: '#64748B' }}>Stake: <strong style={{ color: '#0F172A' }}>${bet.stake.toFixed(2)}</strong></span>
                <span style={{ color: '#64748B' }}>Odds: <strong style={{ color: '#22C55E', fontFamily: 'monospace' }}>{bet.odds}</strong></span>
                {bet.payout !== undefined && bet.status === 'won' && (
                  <span style={{ color: '#16A34A', fontWeight: 700 }}>Won: ${bet.payout.toFixed(2)}</span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#94A3B8' }}>{bet.date}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
