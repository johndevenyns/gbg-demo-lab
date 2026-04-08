import { useMemo } from 'react';
import { PortalConfig, DEFAULT_GAMING_CONFIG, GamingEvent } from '@/types/portalConfig';

interface GamingDashboardProps {
  userName: string;
  accentColor: string;
  portalConfig?: PortalConfig;
  isNewAccount?: boolean;
  onPlaceBet?: (event: GamingEvent, betAmount: number) => void;
  onNavigate?: (page: string) => void;
}

function OddsChip({ odds, accent }: { odds: string; accent: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '4px 10px', borderRadius: '6px',
      background: '#1E293B', color: '#22C55E', fontSize: '13px', fontWeight: 700,
      fontFamily: 'monospace',
    }}>{odds}</span>
  );
}

export function GamingDashboard({ userName, accentColor, portalConfig, isNewAccount, onPlaceBet, onNavigate }: GamingDashboardProps) {
  const config = { ...DEFAULT_GAMING_CONFIG, ...portalConfig };
  const events = isNewAccount ? [] : (config.gamingEvents || DEFAULT_GAMING_CONFIG.gamingEvents!);
  const promos = config.gamingPromos || DEFAULT_GAMING_CONFIG.gamingPromos!;
  const balance = config.gamingBalance ?? DEFAULT_GAMING_CONFIG.gamingBalance!;
  const sports = ['🏈 NFL', '🏀 NBA', '⚾ MLB', '⚽ Soccer', '🏒 NHL', '🎾 Tennis', '🥊 MMA', '🏎️ NASCAR'];

  const firstName = userName.split(' ')[0] || 'there';

  const liveBadge = (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      background: '#EF4444', color: 'white', fontSize: '10px', fontWeight: 700,
      padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase',
      letterSpacing: '0.5px',
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'white', animation: 'pulse 1.5s infinite' }} />
      LIVE
    </span>
  );

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>

      {/* Balance Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#0F172A', borderRadius: '14px', padding: '18px 24px',
        marginBottom: '20px', color: 'white',
      }}>
        <div>
          <p style={{ fontSize: '12px', color: '#94A3B8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Available Balance</p>
          <p style={{ fontSize: '28px', fontWeight: 800, margin: '4px 0 0', fontFamily: 'monospace' }}>${balance.toFixed(2)}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={{
            padding: '10px 20px', borderRadius: '10px', border: 'none',
            background: '#22C55E', color: 'white', fontSize: '14px', fontWeight: 700,
            cursor: 'pointer', transition: 'opacity 0.2s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            + Deposit
          </button>
          <button
            onClick={() => onNavigate?.('wallet')}
            style={{
              padding: '10px 20px', borderRadius: '10px', border: '1px solid #334155',
              background: 'transparent', color: '#94A3B8', fontSize: '14px', fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#94A3B8'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#334155'; e.currentTarget.style.color = '#94A3B8'; }}
          >
            Withdraw
          </button>
        </div>
      </div>

      {/* Promos Carousel */}
      {promos.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
          {promos.map((promo, idx) => (
            <div key={idx} style={{
              minWidth: '280px', borderRadius: '14px', padding: '18px 20px',
              background: `linear-gradient(135deg, ${promo.bgColor || accentColor}, ${promo.bgColor || accentColor}cc)`,
              color: 'white', cursor: 'pointer', transition: 'transform 0.2s', flexShrink: 0,
            }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
            >
              <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8, margin: '0 0 6px' }}>{promo.tag}</p>
              <p style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px', lineHeight: 1.3 }}>{promo.title}</p>
              <p style={{ fontSize: '12px', opacity: 0.85, margin: 0 }}>{promo.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sports Nav */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '4px' }}>
        {sports.map(sport => (
          <button key={sport} style={{
            padding: '8px 16px', borderRadius: '20px', border: '1px solid #E2E8F0',
            background: 'white', fontSize: '13px', fontWeight: 500, color: '#374151',
            cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', flexShrink: 0,
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = accentColor; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = accentColor; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#374151'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
          >
            {sport}
          </button>
        ))}
      </div>

      {/* Featured / Live Events */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Featured Events</h2>
          {liveBadge}
        </div>

        {events.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: '36px', marginBottom: '12px' }}>🎰</p>
            <p style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A', margin: '0 0 4px' }}>Welcome to the game!</p>
            <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0 }}>Explore events and place your first bet.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {events.map(event => (
              <div key={event.id} style={{
                background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0',
                padding: '18px 22px', transition: 'all 0.2s',
              }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>{event.sportIcon}</span>
                    <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>{event.league}</span>
                    {event.isLive && liveBadge}
                  </div>
                  <span style={{ fontSize: '12px', color: '#94A3B8' }}>{event.time}</span>
                </div>

                {/* Teams */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <p style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 2px' }}>{event.teamA}</p>
                    {event.scoreA !== undefined && (
                      <p style={{ fontSize: '24px', fontWeight: 800, color: accentColor, margin: 0, fontFamily: 'monospace' }}>{event.scoreA}</p>
                    )}
                  </div>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%', background: '#F1F5F9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 700, color: '#64748B', flexShrink: 0,
                  }}>VS</div>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <p style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 2px' }}>{event.teamB}</p>
                    {event.scoreB !== undefined && (
                      <p style={{ fontSize: '24px', fontWeight: 800, color: accentColor, margin: 0, fontFamily: 'monospace' }}>{event.scoreB}</p>
                    )}
                  </div>
                </div>

                {/* Odds Row */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => onPlaceBet?.(event, 25)}
                    style={{
                      flex: 1, padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0',
                      background: '#F8FAFC', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: '4px', transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = `${accentColor}10`; e.currentTarget.style.borderColor = accentColor; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                  >
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>{event.teamA}</span>
                    <OddsChip odds={event.oddsA} accent={accentColor} />
                  </button>
                  {event.oddsDraw && (
                    <button style={{
                      flex: 1, padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0',
                      background: '#F8FAFC', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: '4px', transition: 'all 0.2s',
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = `${accentColor}10`; e.currentTarget.style.borderColor = accentColor; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                    >
                      <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>Draw</span>
                      <OddsChip odds={event.oddsDraw} accent={accentColor} />
                    </button>
                  )}
                  <button
                    onClick={() => onPlaceBet?.(event, 25)}
                    style={{
                      flex: 1, padding: '10px 12px', borderRadius: '10px', border: '1px solid #E2E8F0',
                      background: '#F8FAFC', cursor: 'pointer', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: '4px', transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = `${accentColor}10`; e.currentTarget.style.borderColor = accentColor; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                  >
                    <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>{event.teamB}</span>
                    <OddsChip odds={event.oddsB} accent={accentColor} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Bet Slip */}
      <div style={{
        background: '#0F172A', borderRadius: '14px', padding: '18px 22px',
        color: 'white', marginBottom: '28px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🎫 Bet Slip
          </h3>
          <span style={{ fontSize: '12px', color: '#94A3B8' }}>0 selections</span>
        </div>
        <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
          Select odds above to add to your bet slip
        </p>
      </div>
    </div>
  );
}
