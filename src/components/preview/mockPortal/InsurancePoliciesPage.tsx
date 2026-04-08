import { PortalConfig, DEFAULT_INSURANCE_CONFIG } from '@/types/portalConfig';

interface InsurancePoliciesPageProps {
  accentColor: string;
  portalConfig?: PortalConfig;
  onModifyPolicy: () => void;
}

const POLICY_TYPE_LABELS: Record<string, string> = {
  auto: 'Auto', home: 'Homeowners', life: 'Life', renters: 'Renters', umbrella: 'Umbrella',
};

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: '#DCFCE7', text: '#166534', label: 'Active' },
  pending: { bg: '#FEF3C7', text: '#92400E', label: 'Pending' },
  expired: { bg: '#F1F5F9', text: '#64748B', label: 'Expired' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B', label: 'Cancelled' },
};

export function InsurancePoliciesPage({ accentColor, portalConfig, onModifyPolicy }: InsurancePoliciesPageProps) {
  const config = { ...DEFAULT_INSURANCE_CONFIG, ...portalConfig };
  const policies = config.insurancePolicies || DEFAULT_INSURANCE_CONFIG.insurancePolicies!;
  const documents = config.insuranceDocuments || DEFAULT_INSURANCE_CONFIG.insuranceDocuments!;

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0 }}>My Policies</h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>{policies.length} policies on file</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
        {policies.map(policy => {
          const status = STATUS_BADGE[policy.status];
          return (
            <div key={policy.id} style={{
              background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '20px 24px',
              transition: 'box-shadow 0.2s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '12px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>{policy.icon}</div>
                  <div>
                    <p style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', margin: 0 }}>{POLICY_TYPE_LABELS[policy.type]} Insurance</p>
                    <p style={{ fontSize: '13px', color: '#94A3B8', margin: '2px 0 0' }}>{policy.provider} · Policy #{policy.policyNumber}</p>
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '6px', background: status.bg, color: status.text }}>{status.label}</span>
              </div>

              {/* Coverage Details */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', padding: '14px 0', borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9' }}>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', margin: 0, textTransform: 'uppercase' }}>Monthly Premium</p>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '2px 0 0' }}>${policy.premium}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', margin: 0, textTransform: 'uppercase' }}>Deductible</p>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '2px 0 0' }}>${policy.deductible.toLocaleString()}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', margin: 0, textTransform: 'uppercase' }}>Coverage</p>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '2px 0 0' }}>${policy.coverageAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', margin: 0, textTransform: 'uppercase' }}>Renewal Date</p>
                  <p style={{ fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: '2px 0 0' }}>{policy.renewalDate}</p>
                </div>
              </div>

              {/* Insured Items & Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px' }}>
                <div>
                  {policy.insuredItems && (
                    <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                      Insured: {policy.insuredItems.join(' · ')}
                    </p>
                  )}
                  <p style={{ fontSize: '12px', color: '#94A3B8', margin: '2px 0 0' }}>Next payment: {policy.nextPaymentDate}</p>
                </div>
                {policy.status === 'active' && (
                  <button onClick={onModifyPolicy} style={{
                    padding: '6px 14px', fontSize: '13px', fontWeight: 500,
                    color: accentColor, background: `${accentColor}10`,
                    border: `1px solid ${accentColor}30`, borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = `${accentColor}20`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = `${accentColor}10`; }}
                  >
                    🔒 Modify Policy
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Documents */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: '0 0 12px' }}>Documents</h2>
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          {documents.map((doc, idx) => (
            <div key={idx} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 20px', borderBottom: idx < documents.length - 1 ? '1px solid #F1F5F9' : 'none',
            }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '18px' }}>📄</span>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#0F172A', margin: 0 }}>{doc.name}</p>
                  <p style={{ fontSize: '12px', color: '#94A3B8', margin: '1px 0 0' }}>{doc.date}{doc.policyNumber ? ` · ${doc.policyNumber}` : ''}</p>
                </div>
              </div>
              <button style={{
                padding: '4px 12px', fontSize: '12px', fontWeight: 600,
                color: accentColor, background: 'none', border: `1px solid ${accentColor}30`,
                borderRadius: '6px', cursor: 'pointer',
              }}>Download</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
