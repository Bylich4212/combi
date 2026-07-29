import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import RatesGrid from './components/RatesGrid';
import Calculator from './components/Calculator';
import P2PMarket from './components/P2PMarket';
import AuthModal from './components/AuthModal';
import RegionalRates from './components/RegionalRates';
import ForecastWidget from './components/ForecastWidget';

function App() {
  const [rates, setRates] = useState(null);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('cambi_token'));
  
  const [authMode, setAuthMode] = useState(null); // 'login', 'register', or null

  const fetchRates = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/rates');
      const data = await res.json();
      setRates(data);
    } catch (err) {
      console.error('Error fetching rates', err);
    }
  };

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Restaurar sesión desde localStorage
    const savedUser = localStorage.getItem('cambi_user');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
  }, [token]);

  const handleAuthSuccess = (newToken, newUser) => {
    localStorage.setItem('cambi_token', newToken);
    localStorage.setItem('cambi_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setAuthMode(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('cambi_token');
    localStorage.removeItem('cambi_user');
    setToken(null);
    setUser(null);
  };

  return (
    <div>
      <Navbar 
        user={user} 
        onLoginClick={() => setAuthMode('login')}
        onRegisterClick={() => setAuthMode('register')}
        onLogout={handleLogout}
      />

      {rates && (
        <>
          <RatesGrid rates={rates} />
          <ForecastWidget token={token} onRequireAuth={() => setAuthMode('login')} />
          <RegionalRates bolidolar={rates.bolidolar} />
          <Calculator rates={rates} />
          <P2PMarket token={token} onRequireAuth={() => setAuthMode('login')} />
        </>
      )}

      <div className="glass-card" style={{ marginTop: '24px', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center', padding: '40px 20px' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>🤖 Bot de Alertas por Telegram</h2>
        <div style={{ display: 'inline-block', background: 'var(--accent)', color: '#fff', fontSize: '0.75rem', fontWeight: 700, padding: '4px 12px', borderRadius: '12px', letterSpacing: '1px' }}>
          PRÓXIMAMENTE
        </div>
      </div>

      <footer style={{ textAlign: 'center', padding: '24px', color: 'var(--gris)', fontSize: '0.9rem' }}>
        Los valores son referenciales y no constituyen una oferta de cambio.
      </footer>

      {authMode && (
        <AuthModal 
          mode={authMode} 
          onClose={() => setAuthMode(null)} 
          onAuthSuccess={handleAuthSuccess} 
        />
      )}
    </div>
  );
}

export default App;
