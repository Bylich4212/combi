import React, { useState, useEffect } from 'react';

function P2PMarket({ token, onRequireAuth }) {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [adType, setAdType] = useState('VENTA');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [phone, setPhone] = useState('');
  const [desc, setDesc] = useState('');

  const fetchAds = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/p2p');
      const data = await res.json();
      setAds(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAds();
  }, []);

  const handleOpenModal = () => {
    if (!token) {
      alert('Debes iniciar sesión para publicar un anuncio.');
      onRequireAuth();
      return;
    }
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!token) return;

    try {
      const res = await fetch('http://localhost:3000/api/p2p', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ad_type: adType,
          amount: parseFloat(amount),
          exchange_rate: parseFloat(rate),
          phone_number: phone,
          description: desc
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        setError(data.message || 'Error al publicar');
        return;
      }

      setModalOpen(false);
      setAmount('');
      setRate('');
      setPhone('');
      setDesc('');
      alert('¡Anuncio publicado con éxito!');
      fetchAds();
    } catch (err) {
      setError('Error de conexión');
    }
  };

  return (
    <div style={{ marginBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="section-title">🤝 Mercado Libre (P2P)</h2>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>Compra y vende directamente con otros usuarios</p>
        </div>
        <button onClick={handleOpenModal} className="btn-primary">+ Publicar Anuncio</button>
      </div>

      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando anuncios...</div>
      ) : ads.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Todavía no hay anuncios. ¡Sé el primero en publicar!</div>
      ) : (
        <div className="grid-rates">
          {ads.map(ad => {
            const isCompra = ad.ad_type === 'COMPRA';
            let cleanPhone = String(ad.phone_number).replace(/[^0-9]/g, '');
            if (cleanPhone && !cleanPhone.startsWith('591')) cleanPhone = '591' + cleanPhone;
            const wpMsg = encodeURIComponent(`Hola, vi tu anuncio en CotiBO. ¿Sigues ${isCompra ? 'comprando' : 'vendiendo'} $${ad.amount} a ${ad.exchange_rate} Bs?`);

            return (
              <div key={ad.id} className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '8px' }}>
                  <span className={`p2p-badge ${isCompra ? 'compra' : 'venta'}`} style={{ whiteSpace: 'nowrap' }}>
                    {isCompra ? 'COMPRA' : 'VENTA'}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(ad.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
                    ${parseFloat(ad.amount).toLocaleString('en-US')}
                  </div>
                  <div style={{ fontSize: '1.2rem', color: 'var(--accent)', fontWeight: 500 }}>
                    a {parseFloat(ad.exchange_rate).toFixed(2)} Bs
                  </div>
                </div>

                {ad.description && (
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px', fontStyle: 'italic' }}>
                    "{ad.description}"
                  </div>
                )}
                
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--card-border)', gap: '12px' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '120px' }} title={ad.email.split('@')[0]}>
                    👤 {ad.email.split('@')[0]}
                  </div>
                  <a href={`https://wa.me/${cleanPhone}?text=${wpMsg}`} target="_blank" rel="noreferrer" className="btn-whatsapp" style={{ whiteSpace: 'nowrap' }}>
                    💬 Contactar
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <span className="close-modal" onClick={() => setModalOpen(false)}>&times;</span>
            <h2 className="section-title" style={{ marginBottom: '24px' }}>Publicar Anuncio</h2>
            <form onSubmit={handleSubmit}>
              <select className="form-input" value={adType} onChange={(e) => setAdType(e.target.value)} required>
                <option value="VENTA">Quiero Vender Dólares</option>
                <option value="COMPRA">Quiero Comprar Dólares</option>
              </select>
              <input type="number" className="form-input" placeholder="Cantidad de Dólares (ej. 1000)" value={amount} onChange={(e) => setAmount(e.target.value)} required step="0.01" />
              <input type="number" className="form-input" placeholder="Tipo de cambio en Bs (ej. 11.20)" value={rate} onChange={(e) => setRate(e.target.value)} required step="0.01" />
              <input type="text" className="form-input" placeholder="Número de WhatsApp (ej. 71234567)" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              <textarea className="form-input" placeholder="Condiciones (ej. Solo transferencia BNB)" style={{ resize: 'vertical', height: '80px' }} value={desc} onChange={(e) => setDesc(e.target.value)}></textarea>
              
              {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '5px' }}>{error}</p>}
              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '16px', padding: '12px', fontSize: '1rem' }}>Publicar Anuncio</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default P2PMarket;
