import React, { useState, useEffect } from 'react';

function P2PMarket({ token, onRequireAuth }) {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // Filtros y paginación
  const [minRate, setMinRate] = useState('');
  const [maxRate, setMaxRate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [filterType, setFilterType] = useState('TODOS'); // 'TODOS', 'COMPRA', 'VENTA'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9; // Máximo 9 items (3 filas de 3 columnas)

  // Form state
  const [adType, setAdType] = useState('VENTA');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [phone, setPhone] = useState('');
  const [desc, setDesc] = useState('');

  const fetchAds = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${API_URL}/api/p2p`);
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

  useEffect(() => {
    // Resetear a la página 1 cuando cambian los filtros
    setCurrentPage(1);
  }, [minRate, maxRate, minAmount, filterType]);

  const handleOpenModal = () => {
    if (!token) {
      showToast('Debes iniciar sesión para publicar un anuncio.', 'error');
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
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${API_URL}/api/p2p`, {
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
      showToast('¡Anuncio publicado con éxito!');
      fetchAds();
    } catch (err) {
      setError('Error de conexión');
    }
  };

  return (
    <div style={{ marginBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: '1 1 auto' }}>
          <div>
            <h2 className="section-title" style={{ marginBottom: '8px' }}>🤝 Mercado Libre (P2P)</h2>
            <p className="section-subtitle" style={{ marginBottom: 0 }}>Compra y vende directamente con otros usuarios</p>
          </div>
          
          {/* Barra de Filtros */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--card-border)', alignItems: 'center' }}>
            
            {/* Toggle de Tipo de Anuncio */}
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '4px', gap: '4px' }}>
              <button 
                onClick={() => setFilterType('TODOS')}
                style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', transition: 'all 0.2s', background: filterType === 'TODOS' ? 'var(--primary)' : 'transparent', color: filterType === 'TODOS' ? '#fff' : 'var(--text-muted)' }}
              >Todos</button>
              <button 
                onClick={() => setFilterType('COMPRA')}
                style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', transition: 'all 0.2s', background: filterType === 'COMPRA' ? 'var(--success)' : 'transparent', color: filterType === 'COMPRA' ? '#fff' : 'var(--text-muted)' }}
              >Comprar</button>
              <button 
                onClick={() => setFilterType('VENTA')}
                style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', transition: 'all 0.2s', background: filterType === 'VENTA' ? 'var(--danger)' : 'transparent', color: filterType === 'VENTA' ? '#fff' : 'var(--text-muted)' }}
              >Vender</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tasa (Bs):</span>
              <input type="number" placeholder="Mín" value={minRate} onChange={e => setMinRate(e.target.value)} style={{ width: '70px', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: '0.9rem' }} />
              <span style={{ color: 'var(--text-muted)' }}>-</span>
              <input type="number" placeholder="Máx" value={maxRate} onChange={e => setMaxRate(e.target.value)} style={{ width: '70px', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: '0.9rem' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Cantidad ($):</span>
              <input type="number" placeholder="Mínimo" value={minAmount} onChange={e => setMinAmount(e.target.value)} style={{ width: '90px', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: '#fff', fontSize: '0.9rem' }} />
            </div>
          </div>
        </div>
        <button onClick={handleOpenModal} className="btn-primary" style={{ marginTop: '8px' }}>+ Publicar Anuncio</button>
      </div>

      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando anuncios...</div>
      ) : (
        <>
          {(() => {
            // Lógica de filtrado
            const filteredAds = ads.filter(ad => {
              const rateVal = parseFloat(ad.exchange_rate);
              const amtVal = parseFloat(ad.amount);
              
              if (filterType !== 'TODOS' && ad.ad_type !== filterType) return false;
              if (minRate && rateVal < parseFloat(minRate)) return false;
              if (maxRate && rateVal > parseFloat(maxRate)) return false;
              if (minAmount && amtVal < parseFloat(minAmount)) return false;
              
              return true;
            });

            const totalPages = Math.ceil(filteredAds.length / itemsPerPage);
            const displayedAds = filteredAds.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

            if (filteredAds.length === 0) {
              return <div className="glass-card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron anuncios con estos filtros.</div>;
            }

            return (
              <>
                <div className="grid-rates">
                  {displayedAds.map(ad => {
                    const isCompra = ad.ad_type === 'COMPRA';
                    let cleanPhone = String(ad.phone_number).replace(/[^0-9]/g, '');
                    if (cleanPhone && !cleanPhone.startsWith('591')) cleanPhone = '591' + cleanPhone;
                    const wpMsg = encodeURIComponent(`Hola, vi tu anuncio en Cambi. ¿Sigues ${isCompra ? 'comprando' : 'vendiendo'} $${ad.amount} a ${ad.exchange_rate} Bs?`);

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
                
                {/* Paginación */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', gap: '8px', flexWrap: 'wrap' }}>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        style={{
                          background: currentPage === page ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                          color: currentPage === page ? '#fff' : 'var(--text-muted)',
                          border: currentPage === page ? 'none' : '1px solid var(--card-border)',
                          padding: '8px 16px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          transition: 'all 0.2s',
                          minWidth: '40px'
                        }}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </>
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
              <input type="number" className="form-input" placeholder="Cantidad de Dólares (ej. 1000)" value={amount} onChange={(e) => setAmount(e.target.value)} required step="1" min="10" />
              <input type="number" className="form-input" placeholder="Tipo de cambio en Bs (ej. 11.20)" value={rate} onChange={(e) => setRate(e.target.value)} required step="0.01" min="5" max="20" />
              <input type="tel" className="form-input" placeholder="Número de WhatsApp (ej. 71234567)" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} required pattern="^[67]\d{7}$" minLength="8" maxLength="8" title="Debe ser un número celular boliviano de 8 dígitos válido (empezando con 6 o 7)" />
              <textarea className="form-input" placeholder="Condiciones (ej. Solo transferencia BNB)" style={{ resize: 'vertical', height: '80px' }} value={desc} onChange={(e) => setDesc(e.target.value)} maxLength="200"></textarea>
              
              {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '5px' }}>{error}</p>}
              <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '16px', padding: '12px', fontSize: '1rem' }}>Publicar Anuncio</button>
            </form>
          </div>
        </div>
      )}

      {/* Custom Toast Notification */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: toast.type === 'success' ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '30px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 'bold',
          animation: 'fadeInDown 0.3s ease-out forwards',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          {toast.type === 'success' ? '✅' : '⚠️'} {toast.message}
        </div>
      )}
    </div>
  );
}

export default P2PMarket;
