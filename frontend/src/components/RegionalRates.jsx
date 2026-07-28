import React from 'react';

function RegionalRates({ bolidolar }) {
  if (!bolidolar || !bolidolar.cities) return null;
  const { santaCruz, laPaz, cochabamba } = bolidolar.cities;
  
  if (!santaCruz && !laPaz && !cochabamba) return null; // No data

  return (
    <div style={{ marginBottom: '40px', background: '#0b0f19', padding: '32px 24px', borderRadius: '16px', border: '1px solid var(--card-border)', textAlign: 'center' }}>
      <div style={{ fontSize: '0.8rem', letterSpacing: '2px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '16px', textTransform: 'uppercase' }}>
        Exclusivo de CotiBO
      </div>
      
      <h2 style={{ fontSize: '2rem', fontWeight: '800', lineHeight: 1.2, marginBottom: '32px', color: '#fff' }}>
        El dólar <span style={{ color: '#fbbf24' }}>CALLE</span><br />
        de tu ciudad
      </h2>

      <div style={{ maxWidth: '400px', margin: '0 auto', textAlign: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ width: '8px', height: '8px', background: '#fbbf24', borderRadius: '50%', display: 'inline-block' }}></span>
            Santa Cruz
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fff' }}>
            {santaCruz ? santaCruz.toFixed(2) : '---'}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ width: '8px', height: '8px', background: '#fbbf24', borderRadius: '50%', display: 'inline-block' }}></span>
            La Paz
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fff' }}>
            {laPaz ? laPaz.toFixed(2) : '---'}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ width: '8px', height: '8px', background: '#fbbf24', borderRadius: '50%', display: 'inline-block' }}></span>
            Cochabamba
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fff' }}>
            {cochabamba ? cochabamba.toFixed(2) : '---'}
          </div>
        </div>
      </div>

      <p style={{ marginTop: '32px', color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px', margin: '32px auto 0 auto' }}>
        Reportado por gente real en casas de cambio — como Waze, pero del dólar.
      </p>
    </div>
  );
}

export default RegionalRates;
