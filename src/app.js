const express = require('express');
const path = require('path');
const rateLimiter = require('./middlewares/rateLimiter');
const apiRoutes = require('./routes/api.routes');
const premiumRoutes = require('./routes/premium.routes');
const authRoutes = require('./routes/auth.routes');
const p2pRoutes = require('./routes/p2p.routes');
const cors = require('cors');

const app = express();

// CONFIGURACIÓN BÁSICA
app.set('trust proxy', 1);
app.use(cors()); // Permitir conexiones desde Vite (5173)
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public'))); // servir public/

// Cabeceras de seguridad básicas
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'SAMEORIGIN');
  res.set('Referrer-Policy', 'origin-when-cross-origin');
  next();
});

// Middleware global de rate limit para las APIs
app.use('/api/', rateLimiter);

// RUTAS
app.use('/api', apiRoutes);
app.use('/api/premium', premiumRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/p2p', p2pRoutes);

// Manejo de errores globales (ej. Multer file size)
app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'La imagen supera los 5 MB' });
  }
  console.error(err);
  res.status(500).json({ message: 'Error del servidor' });
});

module.exports = app;
