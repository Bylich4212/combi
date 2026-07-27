import React, { useState } from 'react';

function AuthModal({ mode, onClose, onAuthSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isLogin = mode === 'login';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';

    try {
      const res = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Error de autenticación');
        setLoading(false);
        return;
      }

      onAuthSuccess(data.token, data.user);
    } catch (err) {
      setError('Error de conexión');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <span className="close-modal" onClick={onClose}>&times;</span>
        <h2 className="section-title" style={{ marginBottom: '24px' }}>
          {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
        </h2>
        <form onSubmit={handleSubmit}>
          <input 
            type="email" 
            placeholder="Correo electrónico" 
            className="form-input" 
            required 
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <input 
            type="password" 
            placeholder="Contraseña" 
            className="form-input" 
            required 
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: '5px' }}>{error}</p>}
          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '16px', padding: '12px', fontSize: '1rem' }} disabled={loading}>
            {loading ? 'Cargando...' : isLogin ? 'Ingresar' : 'Registrarse'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AuthModal;
