import React, { useState } from 'react';

function Calculator({ rates }) {
  const [monto, setMonto] = useState(1);
  const [currency, setCurrency] = useState('USD');

  if (!rates) return null;

  const LogoTitle = ({ logo, title }) => {
    const [err, setErr] = React.useState(false);
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {logo && !err && (
          <img src={logo} alt="logo" style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} onError={() => setErr(true)} />
        )}
        <span>{title}</span>
      </span>
    );
  };

  return (
    <div className="glass-card" style={{ marginBottom: '40px' }}>
      <h2 className="section-title">💰 ¿Cuánto recibo por mi dinero?</h2>
      <p className="section-subtitle">Calcula el valor de tus fondos al instante.</p>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={() => setCurrency('USD')}
          style={{ 
            flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            backgroundColor: currency === 'USD' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
            color: currency === 'USD' ? '#fff' : 'var(--text-muted)',
            fontWeight: 'bold', transition: 'all 0.3s'
          }}
        >🇺🇸 Dólares (USD)</button>
        <button 
          onClick={() => setCurrency('EUR')}
          style={{ 
            flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer',
            backgroundColor: currency === 'EUR' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
            color: currency === 'EUR' ? '#fff' : 'var(--text-muted)',
            fontWeight: 'bold', transition: 'all 0.3s'
          }}
        >🇪🇺 Euros (EUR)</button>
      </div>

      <div className="calc-input-wrapper">
        <span style={{ color: 'var(--text-muted)' }}>{currency === 'USD' ? '$' : '€'}</span>
        <input 
          className="calc-input"
          type="number" 
          value={monto} 
          onChange={(e) => setMonto(e.target.value)} 
          min="0" 
          placeholder="Ingresa la cantidad"
        />
        <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>{currency}</span>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {currency === 'USD' && (
          <>
            <div className="calc-result-row">
              <LogoTitle logo="/assets/bcb.png" title="BCB Oficial" />
              <span style={{ fontWeight: 600 }}>{(monto * (rates.bcb?.buy || 0)).toFixed(2)} Bs</span>
            </div>
            <div className="calc-result-row">
              <LogoTitle logo="/assets/dolarcalle.png" title="Paralelo (Calle)" />
              <span style={{ fontWeight: 600, color: 'var(--success)' }}>{(monto * (rates.paralelo?.buy || 0)).toFixed(2)} Bs</span>
            </div>
            <div className="calc-result-row">
              <LogoTitle logo="/assets/usdt.png" title="Binance USDT" />
              <span style={{ fontWeight: 600, color: 'var(--success)' }}>{(monto * (rates.binanceUsdt?.buy || 0)).toFixed(2)} Bs</span>
            </div>
            <div className="calc-result-row">
              <LogoTitle logo="/assets/usdc.png" title="Binance USDC" />
              <span style={{ fontWeight: 600, color: 'var(--success)' }}>{(monto * (rates.binanceUsdc?.buy || 0)).toFixed(2)} Bs</span>
            </div>
          </>
        )}
        
        {currency === 'EUR' && (
          <>
            <div className="calc-result-row">
              <LogoTitle logo="/assets/bcb.png" title="Oficial BCB (EUR)" />
              <span style={{ fontWeight: 600 }}>{(monto * (rates.euroOficial?.buy || 0)).toFixed(2)} Bs</span>
            </div>
            <div className="calc-result-row">
              <LogoTitle logo="/assets/eur.png" title="Binance (EUR)" />
              <span style={{ fontWeight: 600, color: 'var(--success)' }}>{(monto * (rates.euroBinance?.buy || 0)).toFixed(2)} Bs</span>
            </div>
            <div className="calc-result-row">
              <LogoTitle logo="/assets/wise.png" title="Wise (EUR)" />
              <span style={{ fontWeight: 600, color: 'var(--success)' }}>{(monto * (rates.euroWise?.buy || 0)).toFixed(2)} Bs</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Calculator;
