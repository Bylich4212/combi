import React, { useState, useEffect } from 'react';

function ForecastWidget({ token, onRequireAuth }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('7'); // '1', '7', '15', '30'

  useEffect(() => {
    const fetchForecast = async () => {
      if (!token) return;
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const res = await fetch(`${API_URL}/api/pronostico`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (res.ok) {
          setData(json);
        } else {
          setError(json.message || 'Error cargando pronóstico');
        }
      } catch (err) {
        setError('Error de conexión');
      } finally {
        setLoading(false);
      }
    };
    
    if (token) fetchForecast();
  }, [token]);

  if (!token) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px', marginBottom: '40px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '16px' }}>🔮 Pronóstico Inteligente (Dólar a Boliviano)</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Inicia sesión o adquiere Premium para ver la probabilidad matemática de que el dólar (USD) suba o baje en los próximos días frente al Boliviano (BOB).</p>
        <button onClick={onRequireAuth} className="btn-primary">Ver Pronóstico</button>
      </div>
    );
  }

  if (loading) {
    return <div className="glass-card skeleton" style={{ height: '300px', marginBottom: '40px' }}></div>;
  }

  if (error) {
    return <div className="glass-card" style={{ marginBottom: '40px', color: 'var(--danger)' }}>{error}</div>;
  }

  if (!data || !data[period] || !data[period].disponible) {
    return (
      <div className="glass-card" style={{ marginBottom: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No hay suficientes datos estadísticos para generar un pronóstico fiable aún.
      </div>
    );
  }

  const pData = data[period];
  const isUp = pData.probabilidadSube >= 0.5;
  const mainProb = isUp ? pData.probabilidadSube : pData.probabilidadBaja;
  const percentage = (mainProb * 100).toFixed(0);
  
  const probColor = isUp ? 'var(--success)' : 'var(--danger)';
  const probArrow = isUp ? '↑' : '↓';
  const probText = isUp ? 'SUBA' : 'BAJE';

  return (
    <div style={{ marginBottom: '40px', textAlign: 'center' }}>
      <div style={{ display: 'inline-block', background: '#fbbf24', color: '#000', fontSize: '0.75rem', fontWeight: 'bold', padding: '4px 12px', borderRadius: '12px', letterSpacing: '1px', marginBottom: '16px' }}>
        PREMIUM
      </div>
      <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '8px' }}>¿Va a subir o bajar? (Dólar a Boliviano)</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Un algoritmo te estima el futuro del USD frente al BOB.</p>

      <div className="glass-card" style={{ maxWidth: '400px', margin: '0 auto', padding: '32px 24px', background: 'var(--card-bg)' }}>
        <div style={{ fontSize: '4.5rem', fontWeight: '800', color: probColor, lineHeight: 1, marginBottom: '8px', textShadow: `0 0 20px ${probColor}40` }}>
          {probArrow} {percentage}%
        </div>
        <div style={{ fontSize: '1.1rem', color: '#fff', marginBottom: '24px', fontWeight: 600 }}>
          probable que {probText} en {period === '1' ? 'hoy' : `${period} días`}
        </div>

        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: '32px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
          RANGO PROBABLE: <span style={{ color: '#fff' }}>{pData.rango80.min.toFixed(2)} - {pData.rango80.max.toFixed(2)} Bs</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
          {['1', '7', '15', '30'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                background: period === p ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                color: period === p ? '#fff' : 'var(--text-muted)',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {p === '1' ? '1D' : `${p}D`}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '32px', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
        Probabilidades y rangos con estadística real <br />
        — al momento y a 7, 15 o 30 días.
      </div>
      <div style={{ marginTop: '16px', color: '#fbbf24', fontSize: '0.9rem', fontWeight: 'bold' }}>
        Sin humo: el margen de error, siempre visible.
      </div>
    </div>
  );
}

export default ForecastWidget;
