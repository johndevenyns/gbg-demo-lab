import { useState } from 'react';
import { PortalConfig, DEFAULT_INSURANCE_CONFIG } from '@/types/portalConfig';

interface InsuranceDashboardProps {
  userName: string;
  accentColor: string;
  portalConfig?: PortalConfig;
  isNewAccount?: boolean;
  onNavigate: (page: string) => void;
  onFileClaim: () => void;
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

const CLAIM_STATUS: Record<string, { bg: string; text: string; label: string }> = {
  submitted: { bg: '#DBEAFE', text: '#1E40AF', label: 'Submitted' },
  under_review: { bg: '#FEF3C7', text: '#92400E', label: 'Under Review' },
  approved: { bg: '#DCFCE7', text: '#166534', label: 'Approved' },
  denied: { bg: '#FEE2E2', text: '#991B1B', label: 'Denied' },
  paid: { bg: '#F0FDF4', text: '#166534', label: 'Paid' },
};

export function InsuranceDashboard({ userName, accentColor, portalConfig, isNewAccount, onNavigate, onFileClaim }: InsuranceDashboardProps) {
  const config = { ...DEFAULT_INSURANCE_CONFIG, ...portalConfig };
  const policies = config.insurancePolicies || DEFAULT_INSURANCE_CONFIG.insurancePolicies!;
  const claims = config.insuranceClaims || DEFAULT_INSURANCE_CONFIG.insuranceClaims!;
  const activePolicies = policies.filter(p => p.status === 'active');
  const recentClaims = claims.slice(0, 3);
  const totalMonthlyPremium = activePolicies.reduce((sum, p) => sum + p.premium, 0);
  const totalCoverage = activePolicies.reduce((sum, p) => sum + p.coverageAmount, 0);

  return (
    <div style={{ padding: '24px' }}>
      {/* Welcome */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
          Welcome back, {userName.split(' ')[0]} 👋
        </h1>
        <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>
          {isNewAccount ? 'Get started by reviewing your coverage.' : 'Here\'s your coverage overview'}
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`, borderRadius: '16px', padding: '20px', color: 'white' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, opacity: 0.8, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Policies</p>
          <p style={{ fontSize: '32px', fontWeight: 800, margin: '4px 0 0' }}>{activePolicies.length}</p>
          <p style={{ fontSize: '12px', opacity: 0.7, margin: '4px 0 0' }}>across {new Set(activePolicies.map(p => p.provider)).size} providers</p>
        </div>
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '20px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Monthly Premium</p>
          <p style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', margin: '4px 0 0' }}>${totalMonthlyPremium}</p>
          <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0' }}>Next payment: {activePolicies[0]?.nextPaymentDate}</p>
        </div>
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #E2E8F0', padding: '20px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Coverage</p>
          <p style={{ fontSize: '32px', fontWeight: 800, color: '#0F172A', margin: '4px 0 0' }}>${(totalCoverage / 1000000).toFixed(1)}M</p>
          <p style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 0' }}>Combined all policies</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'File a Claim', icon: '📋', action: onFileClaim },
          { label: 'View ID Cards', icon: '🪪', action: () => onNavigate('policies') },
          { label: 'Make a Payment', icon: '💳', action: () => onNavigate('settings') },
          { label: 'Contact Agent', icon: '📞', action: () => {} },
        ].map(qa => (
          <button key={qa.label} onClick={qa.action} style={{
            flex: 1, padding: '14px 16px', borderRadius: '12px', border: '1px solid #E2E8F0',
            background: 'white', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = accentColor; e.currentTarget.style.boxShadow = `0 2px 8px ${accentColor}20`; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ fontSize: '24px', marginBottom: '6px' }}>{qa.icon}</div>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', margin: 0 }}>{qa.label}</p>
          </button>
        ))}
      </div>

      {/* Active Policies */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Your Policies</h2>
          <button onClick={() => onNavigate('policies')} style={{ background: 'none', border: 'none', color: accentColor, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>View All →</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
          {activePolicies.map(policy => {
            const status = STATUS_BADGE[policy.status];
            return (
              <div key={policy.id} style={{
                background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0',
                padding: '16px 20px', cursor: 'pointer', transition: 'box-shadow 0.2s',
              }}
                onClick={() => onNavigate('policies')}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>{policy.icon}</div>
                    <div>
                      <p style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>{POLICY_TYPE_LABELS[policy.type]} Insurance</p>
                      <p style={{ fontSize: '12px', color: '#94A3B8', margin: '1px 0 0' }}>{policy.provider} · {policy.policyNumber}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', background: status.bg, color: status.text }}>{status.label}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid #F1F5F9', fontSize: '12px' }}>
                  <span style={{ color: '#64748B' }}>Premium: <strong style={{ color: '#0F172A' }}>${policy.premium}/mo</strong></span>
                  <span style={{ color: '#64748B' }}>Coverage: <strong style={{ color: '#0F172A' }}>${policy.coverageAmount.toLocaleString()}</strong></span>
                </div>
                {policy.insuredItems && (
                  <p style={{ fontSize: '11px', color: '#94A3B8', margin: '6px 0 0' }}>{policy.insuredItems.join(' · ')}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Claims */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Recent Claims</h2>
          <button onClick={() => onNavigate('claims')} style={{ background: 'none', border: 'none', color: accentColor, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>View All →</button>
        </div>
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          {recentClaims.map((claim, idx) => {
            const status = CLAIM_STATUS[claim.status];
            return (
              <div key={claim.claimId} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px', borderBottom: idx < recentClaims.length - 1 ? '1px solid #F1F5F9' : 'none',
              }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>{claim.icon}</div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: 0 }}>{claim.description}</p>
                    <p style={{ fontSize: '12px', color: '#94A3B8', margin: '1px 0 0' }}>{claim.claimId} · {claim.dateSubmitted}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>${claim.amount.toLocaleString()}</span>
                  <span style={{ fontSize: '10px', fontWeight: 600, padding: '3px 10px', borderRadius: '6px', background: status.bg, color: status.text }}>{status.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Agent Card */}
      {config.insuranceAgentName && (
        <div style={{
          marginTop: '24px', background: 'white', borderRadius: '14px', border: '1px solid #E2E8F0',
          padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px',
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `${accentColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>👨‍💼</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', margin: 0 }}>Your Agent: {config.insuranceAgentName}</p>
            <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0' }}>{config.insuranceAgentPhone} · Policyholder since {config.insurancePolicyHolderSince}</p>
          </div>
          <button style={{
            padding: '8px 16px', borderRadius: '8px', border: `1px solid ${accentColor}30`,
            background: `${accentColor}10`, color: accentColor, fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          }}>Contact</button>
        </div>
      )}
    </div>
  );
}
