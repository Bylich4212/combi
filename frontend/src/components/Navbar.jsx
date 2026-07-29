import React from 'react';

function Navbar({ user, onLoginClick, onRegisterClick, onLogout }) {
  return (
    <header className="navbar">
      <div className="brand">
        <img src="/assets/logo.png" alt="Logo Cambi" />
        <div>
          <h1>Cambi</h1>
          <p className="sub">Cotizaciones en tiempo real</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {!user ? (
          <>
            <button onClick={onLoginClick} className="btn-outline">Iniciar sesión</button>
            <button onClick={onRegisterClick} className="btn-primary">Crear cuenta</button>
          </>
        ) : (
          <>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{user.email}</span>
            <button onClick={onLogout} className="btn-outline">Salir</button>
          </>
        )}
      </div>
    </header>
  );
}

export default Navbar;
