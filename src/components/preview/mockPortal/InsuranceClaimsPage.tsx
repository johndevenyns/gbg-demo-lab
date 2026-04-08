import { PortalConfig, DEFAULT_INSURANCE_CONFIG } from '@/types/portalConfig';

interface InsuranceClaimsPageProps {
  accentColor: string;
  portalConfig?: PortalConfig;
  onFileClaim: () => void;
}

const CLAIM_STATUS: Record<string, { bg: string; text: string; label: string }> = {
  submitted: { bg: '#DBEAFE', text: '#1E40AF', label: 'Submitted' },
  under_review: { bg: '#FEF3C7', text: '#92400E', label: 'Under Review' },
  approved: { bg: '#DCFCE7', text: '#166534', label: 'Approved' },
  denied: { bg: '#FEE2E2', text: '#991B1B', label: 'Denied' },
  paid: { bg: '#F0FDF4', text: '#166534', label: 'Paid' },
};

export function InsuranceClaimsPage({ accentColor, portalConfig, onFileClaim }: InsuranceClaimsPageProps) {
  const config = { ...DEFAULT_INSURANCE_CONFIG, ...portalConfig };
  const claims = config.insuranceClaims || DEFAULT_INSURANCE_CONFIG.insuranceClaims!;

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0 }}>My Claims</h1>
          <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>{claims.length} claim{claims.length !== 1 ? 's' : ''} on file</p>
        </div>
        <button onClick={onFileClaim} style={{
          padding: '10px 20px', borderRadius: '10px', border: 'none',
          background: accentColor, color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          📋 File New Claim
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {claims.map(claim => {
          const status = CLAIM_STATUS[claim.status];
          return (
            <div key={claim.claimId} style={{
              background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0',
              padding: '20px 24px', transition: 'box-shadow 0.2s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '12px', background: '#F8FAFC',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
                  }}>{claim.icon}</div>
                  <div>
                    <p style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 }}>{claim.description}</p>
                    <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0' }}>
                      {claim.claimId} · {claim.policyType} · Submitted {claim.dateSubmitted}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '6px', background: status.bg, color: status.text }}>{status.label}</span>
                  <p style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '6px 0 0' }}>${claim.amount.toLocaleString()}</p>
                </div>
              </div>

              {/* Progress bar for active claims */}
              {(claim.status === 'submitted' || claim.status === 'under_review' || claim.status === 'approved') && (
                <div style={{ paddingTop: '12px', borderTop: '1px solid #F1F5F9' }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                    {['Submitted', 'Under Review', 'Decision', 'Payment'].map((step, i) => {
                      const stepMap: Record<string, number> = { submitted: 0, under_review: 1, approved: 2, paid: 3 };
                      const currentStep = stepMap[claim.status] ?? 0;
                      const isComplete = i <= currentStep;
                      return (
                        <div key={step} style={{
                          flex: 1, height: '4px', borderRadius: '2px',
                          background: isComplete ? accentColor : '#E2E8F0',
                          transition: 'background 0.3s',
                        }} />
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94A3B8' }}>
                    <span>Submitted</span><span>Review</span><span>Decision</span><span>Payment</span>
                  </div>
                </div>
              )}

              {claim.adjuster && (
                <p style={{ fontSize: '12px', color: '#64748B', margin: '10px 0 0', paddingTop: '10px', borderTop: '1px solid #F1F5F9' }}>
                  Adjuster: <strong>{claim.adjuster}</strong>
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
