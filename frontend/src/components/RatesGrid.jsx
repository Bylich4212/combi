import React from 'react';

function RateCard({ title, data, isBCB, logo }) {
  const [imgError, setImgError] = React.useState(false);

  if (!data) {
    return <div className="glass-card skeleton" style={{ height: '140px' }}></div>;
  }

  return (
    <div className="glass-card">
      <div className="rate-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {logo && !imgError && (
          <img 
            src={logo} 
            alt="logo" 
            style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
            onError={() => setImgError(true)}
          />
        )}
        <span>{title}</span>
      </div>
      <div className="rate-body">
        <div className="rate-col" style={data.sell == null ? { width: '100%', textAlign: 'center' } : {}}>
          <span className="rate-label">{data.sell == null ? "Tasa de Referencia" : "Compra"}</span>
          <span className="rate-value compra">{data.buy.toFixed(2)}</span>
        </div>
        {data.sell != null && (
          <div className="rate-col" style={{ textAlign: 'right' }}>
            <span className="rate-label">Venta</span>
            <span className="rate-value venta">{data.sell.toFixed(2)}</span>
          </div>
        )}
      </div>
      {isBCB && (
        <div className="rate-footer">
          Tasa oficial fijada por el estado
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
      <h3 className="section-title" style={{ fontSize: '1.2rem', marginTop: '10px', marginBottom: '16px', color: 'var(--text-primary)' }}>
        Dólar Estadounidense (USD)
      </h3>
      <div className="grid-rates">
        <RateCard title="Oficial BCB" data={rates.bcb} isBCB={true} logo="/assets/bcb.png" />
        <RateCard title="Paralelo (Calle)" data={rates.paralelo} logo="/assets/dolarcalle.png" />
        <RateCard title="Binance (USDT)" data={rates.binanceUsdt} logo="/assets/usdt.png" />
        <RateCard title="Binance (USDC)" data={rates.binanceUsdc} logo="/assets/usdc.png" />
      </div>

      <h3 className="section-title" style={{ fontSize: '1.2rem', marginTop: '30px', marginBottom: '16px', color: 'var(--text-primary)' }}>
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
