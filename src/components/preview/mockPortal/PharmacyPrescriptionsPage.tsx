import { useState } from 'react';
import { PortalConfig, DEFAULT_PHARMACY_CONFIG, PharmacyPrescription } from '@/types/portalConfig';

interface PharmacyPrescriptionsPageProps {
  accentColor: string;
  portalConfig?: PortalConfig;
}

type FilterTab = 'all' | 'active' | 'pending' | 'expired';

export function PharmacyPrescriptionsPage({ accentColor, portalConfig }: PharmacyPrescriptionsPageProps) {
  const config = { ...DEFAULT_PHARMACY_CONFIG, ...portalConfig };
  const prescriptions = config.prescriptions || DEFAULT_PHARMACY_CONFIG.prescriptions!;
  const [filter, setFilter] = useState<FilterTab>('all');

  const filtered = filter === 'all'
    ? prescriptions
    : prescriptions.filter(p => p.status === filter);

  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: '#ECFDF5', text: '#059669', label: 'Active' },
    expired: { bg: '#FEF2F2', text: '#DC2626', label: 'Expired' },
    pending: { bg: '#FEF3C7', text: '#D97706', label: 'Pending' },
  };

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: prescriptions.length },
    { key: 'active', label: 'Active', count: prescriptions.filter(p => p.status === 'active').length },
    { key: 'pending', label: 'Pending', count: prescriptions.filter(p => p.status === 'pending').length },
    { key: 'expired', label: 'Expired', count: prescriptions.filter(p => p.status === 'expired').length },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1E293B', margin: 0 }}>My Prescriptions</h1>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            Manage and refill your medications
          </p>
        </div>
        <button style={{
          padding: '8px 20px', borderRadius: '8px', border: 'none',
          background: accentColor, color: 'white', fontSize: '13px',
          fontWeight: 600, cursor: 'pointer',
        }}>+ Transfer Rx</button>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '16px',
        background: '#F1F5F9', borderRadius: '10px', padding: '4px',
        width: 'fit-content',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            style={{
              padding: '6px 16px', borderRadius: '8px', border: 'none',
              background: filter === tab.key ? 'white' : 'transparent',
              color: filter === tab.key ? '#1E293B' : '#64748B',
              fontSize: '13px', fontWeight: filter === tab.key ? 600 : 400,
              cursor: 'pointer', boxShadow: filter === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            {tab.label} <span style={{ color: '#94A3B8', fontSize: '11px' }}>({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Prescription Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filtered.map(rx => {
          const st = statusColors[rx.status] || statusColors.active;
          return (
            <div key={rx.rxNumber} style={{
              background: 'white', border: '1px solid #E2E8F0', borderRadius: '12px',
              padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px',
              cursor: 'pointer', transition: 'box-shadow 0.2s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
            >
              {/* Rx Icon */}
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: '#FEF2F2', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '22px', flexShrink: 0,
              }}>{rx.icon}</div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: '#1E293B', margin: 0 }}>{rx.name}</p>
                  <span style={{
                    fontSize: '10px', fontWeight: 600, color: st.text, background: st.bg,
                    padding: '2px 8px', borderRadius: '10px',
                  }}>{st.label}</span>
                </div>
                <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>{rx.dosage}</p>
                <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>Rx# {rx.rxNumber}</span>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>Dr. {rx.prescriber.replace('Dr. ', '')}</span>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>{rx.refillsLeft} refill{rx.refillsLeft !== 1 ? 's' : ''} left</span>
                  {rx.status === 'active' && rx.nextRefillDate && (
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>Next: {rx.nextRefillDate}</span>
                  )}
                </div>
              </div>

              {/* Action */}
              {rx.status === 'active' && rx.refillsLeft > 0 && (
                <button style={{
                  padding: '8px 20px', fontSize: '13px', fontWeight: 600,
                  color: 'white', background: accentColor,
                  border: 'none', borderRadius: '8px', cursor: 'pointer', flexShrink: 0,
                }}>Refill</button>
              )}
              {rx.status === 'expired' && (
                <span style={{ fontSize: '12px', color: '#DC2626', fontWeight: 500 }}>Expired</span>
              )}
              {rx.status === 'pending' && (
                <span style={{ fontSize: '12px', color: '#D97706', fontWeight: 500 }}>Awaiting Approval</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
