import React, { useState } from 'react';

function Calculator({ rates }) {
  const [monto, setMonto] = useState(1);

  if (!rates) return null;

  return (
    <div className="glass-card" style={{ marginBottom: '40px' }}>
      <h2 className="section-title">💰 ¿Cuánto recibo por mis Dólares?</h2>
      <p className="section-subtitle">Calcula cuánto vale tu dinero en diferentes mercados al instante.</p>
      
      <div className="calc-input-wrapper">
        <span style={{ color: 'var(--text-muted)' }}>$</span>
        <input 
          className="calc-input"
          type="number" 
          value={monto} 
          onChange={(e) => setMonto(e.target.value)} 
          min="0" 
          placeholder="Ingresa la cantidad"
        />
        <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>USD</span>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="calc-result-row">
          <span>🏛 BCB Oficial</span>
          <span style={{ fontWeight: 600 }}>{(monto * (rates.bcb?.buy || 0)).toFixed(2)} Bs</span>
        </div>
        <div className="calc-result-row">
          <span>🏚 Paralelo (Calle)</span>
          <span style={{ fontWeight: 600, color: 'var(--success)' }}>{(monto * (rates.paralelo?.buy || 0)).toFixed(2)} Bs</span>
        </div>
        <div className="calc-result-row">
          <span>💛 Binance USDT</span>
          <span style={{ fontWeight: 600, color: 'var(--success)' }}>{(monto * (rates.binanceUsdt?.buy || 0)).toFixed(2)} Bs</span>
        </div>
        <div className="calc-result-row">
          <span>🟣 Takenos</span>
          <span style={{ fontWeight: 600, color: 'var(--success)' }}>{(monto * (rates.takenos?.buy || 0)).toFixed(2)} Bs</span>
        </div>
      </div>
    </div>
  );
}

export default Calculator;
