import React from 'react';

function RateCard({ title, data, isBCB, logo }) {
  const [imgError, setImgError] = React.useState(false);

  if (!data) {
    return <div className="glass-card skeleton" style={{ height: '140px' }}></div>;
  }

  return (
    <div className="glass-card">
      <div className="rate-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '16px', borderBottom: '1px solid var(--card-border)' }}>
        {logo && !imgError && (
          <img 
            src={logo} 
            alt="logo" 
            style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
            onError={() => setImgError(true)}
          />
        )}
        <span style={{ fontWeight: 600, letterSpacing: '-0.02em', fontSize: '1.05rem' }}>{title}</span>
      </div>
      <div className="rate-body" style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
        <div style={{ flex: 1, background: data.sell == null ? 'transparent' : 'rgba(16, 185, 129, 0.05)', padding: '12px', borderRadius: '8px', border: data.sell == null ? 'none' : '1px solid rgba(16, 185, 129, 0.1)', textAlign: data.sell == null ? 'center' : 'left' }}>
          <div className="rate-label">{data.sell == null ? "Tasa de Referencia" : "Precio de Compra"}</div>
          <div className="rate-value compra">Bs {data.buy.toFixed(2)}</div>
        </div>
        {data.sell != null && (
          <div style={{ flex: 1, background: 'rgba(255, 255, 255, 0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <div className="rate-label">Precio de Venta</div>
            <div className="rate-value venta">Bs {data.sell.toFixed(2)}</div>
          </div>
        )}
      </div>
      {isBCB && (
        <div className="rate-footer" style={{ textAlign: 'center', marginTop: '20px' }}>
          <span style={{ display: 'inline-block', padding: '4px 12px', background: 'rgba(251, 191, 36, 0.1)', color: '#FBBF24', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>Tasa oficial fijada por el estado</span>
        </div>
      )}
    </div>
  );
}

function RatesGrid({ rates }) {
  if (!rates) {
    return (
      <div className="rates-container">
        <div className="grid-rates">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="glass-card skeleton" style={{ height: '140px' }}></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rates-container">
      {/* SECCIÓN HÉROE - PARALELO */}
      {rates.paralelo && (
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.03em' }}>Precio del Dólar Paralelo en Bolivia Hoy</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '24px', maxWidth: '800px', lineHeight: 1.5 }}>
            Precio del dólar paralelo en Bolivia, agregado en tiempo real desde plataformas P2P (Binance y otras). Tipo de cambio efectivo de compra y venta — también conocido como «dólar blue» en otras regiones.
          </p>
          
          <div className="glass-card" style={{ padding: '32px', maxWidth: '800px', background: 'var(--card-bg)' }}>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', fontWeight: 600 }}>Mediana Paralelo</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.04em' }}>Bs {((rates.paralelo.buy + rates.paralelo.sell) / 2).toFixed(2)}</span>
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>por USD</span>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 250px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '20px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', fontWeight: 700 }}>Precio de Compra</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Bs {rates.paralelo.buy.toFixed(2)}</div>
              </div>
              <div style={{ flex: '1 1 250px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '20px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', fontWeight: 700 }}>Precio de Venta</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Bs {rates.paralelo.sell.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OTRAS COTIZACIONES USD */}
      <h3 className="section-title" style={{ fontSize: '1.2rem', marginTop: '10px', marginBottom: '16px', color: 'var(--text-main)', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>
        Otras Referencias (USD)
      </h3>
      <div className="grid-rates">
        <RateCard title="Oficial BCB" data={rates.bcb} isBCB={true} logo="/assets/bcb.png" />
        <RateCard title="Binance (USDT)" data={rates.binanceUsdt} logo="/assets/usdt.png" />
        <RateCard title="Binance (USDC)" data={rates.binanceUsdc} logo="/assets/usdc.png" />
      </div>

      {/* EURO */}
      <h3 className="section-title" style={{ fontSize: '1.2rem', marginTop: '40px', marginBottom: '16px', color: 'var(--text-main)', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>
        Euro (EUR)
      </h3>
      <div className="grid-rates" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <RateCard title="Oficial BCB (EUR)" data={rates.euroOficial} logo="/assets/bcb.png" />
        <RateCard title="Binance (EUR)" data={rates.euroBinance} logo="/assets/eur.png" />
        <RateCard title="Wise (EUR)" data={rates.euroWise} logo="/assets/wise.png" />
      </div>
    </div>
  );
}

export default RatesGrid;
