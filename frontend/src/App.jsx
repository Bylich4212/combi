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

      <div className="caja glass" style={{ marginTop: '24px' }}>
        <h2>🔔 Alertas gratis por Telegram</h2>
        <p className="sub" style={{ marginBottom: '12px' }}>
          Escríbele a nuestro bot <b>/alerta 10.80</b> y te avisará al instante
          cuando el dólar llegue a ese precio. También responde <b>/dolar</b>
          con las cotizaciones al momento.
        </p>
        <a className="btn-primary" href="https://t.me/cotibo_bot" target="_blank" rel="noopener noreferrer">
          Abrir el bot en Telegram
        </a>
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
