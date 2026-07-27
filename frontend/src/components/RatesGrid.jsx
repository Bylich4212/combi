import React from 'react';

function RateCard({ title, data, isBCB }) {
  if (!data) {
    return <div className="glass-card skeleton" style={{ height: '140px' }}></div>;
  }

  return (
    <div className="glass-card">
      <div className="rate-header">
        {title}
      </div>
      <div className="rate-body">
        <div className="rate-col">
          <span className="rate-label">Compra</span>
          <span className="rate-value compra">{data.buy.toFixed(2)}</span>
        </div>
        <div className="rate-col" style={{ textAlign: 'right' }}>
          <span className="rate-label">Venta</span>
          <span className="rate-value venta">{data.sell.toFixed(2)}</span>
        </div>
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
      <div className="grid-rates">
        {Array(6).fill(0).map((_, i) => (
          <div key={i} className="glass-card skeleton" style={{ height: '140px' }}></div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid-rates">
      <RateCard title="🏛 Oficial BCB" data={rates.bcb} isBCB={true} />
      <RateCard title="🏚 Paralelo (Calle)" data={rates.paralelo} />
      <RateCard title="💛 Binance (USDT)" data={rates.binanceUsdt} />
      <RateCard title="💙 Binance (USDC)" data={rates.binanceUsdc} />
      <RateCard title="🟣 Takenos" data={rates.takenos} />
      <RateCard title="🟢 Meru" data={rates.meru} />
    </div>
  );
}

export default RatesGrid;
