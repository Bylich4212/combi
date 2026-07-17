// =====================================================================
//  COTIBO — SERVIDOR PRINCIPAL (Node.js + Express)
// ---------------------------------------------------------------------
//  Este archivo enciende TODO:
//    1. El servidor web (sirve la página y las APIs)
//    2. El bot de Telegram (por polling, sin webhook)
//    3. El actualizador automático (cada minuto, con node-cron)
//
//  Para correrlo:   npm start
// =====================================================================

// PRIMERO: cargar las llaves del archivo .env
// (en Render no hace falta el archivo: las llaves se ponen en el panel)
require('dotenv').config();

const express = require('express');
const cron = require('node-cron');
const multer = require('multer');
const path = require('path');
const { InputFile } = require('grammy');
const db = require('./lib/db');
const cache = require('./lib/cache');
const bot = require('./lib/bot');
const { actualizar, restaurarHistorico } = require('./lib/actualizador');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------
// CONFIGURACIÓN BÁSICA
// ---------------------------------------------------------------------
app.set('trust proxy', 1); // estamos detrás del proxy de Render
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // servir public/

// Cabeceras de seguridad básicas en todas las respuestas
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('X-Frame-Options', 'SAMEORIGIN');
  res.set('Referrer-Policy', 'origin-when-cross-origin');
  next();
});

// Los comprobantes se reciben en memoria (nunca tocan el disco)
// con un máximo de 5 MB para evitar abusos
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Límite de peticiones: máximo 60 por minuto por IP (anti-abuso simple)
const contadorIPs = new Map();
app.use('/api/', (req, res, next) => {
  const ip = req.ip || 'desconocida';
  const ahora = Date.now();
  const registro = contadorIPs.get(ip);
  if (registro && ahora - registro.inicio < 60000 && registro.count >= 60) {
    return res.status(429).json({ error: 'Demasiadas peticiones, espera un minuto' });
  }
  if (!registro || ahora - registro.inicio > 60000) {
    contadorIPs.set(ip, { count: 1, inicio: ahora });
  } else {
    registro.count++;
  }
  if (contadorIPs.size > 10000) contadorIPs.clear(); // limpieza
  next();
});

// ---------------------------------------------------------------------
// API 1: LAS COTIZACIONES  ->  GET /api/rates
// Se leen de la memoria rápida: instantáneo y sin gastar Redis,
// aunque entren miles de visitantes a la vez.
// ---------------------------------------------------------------------
app.get('/api/rates', (req, res) => {
  if (!cache.rates) return res.status(503).json({ error: 'Datos no disponibles aún' });
  res.set('Cache-Control', 'public, max-age=30');
  res.json(cache.rates);
});

// ---------------------------------------------------------------------
// API 2: EL HISTÓRICO PARA EL GRÁFICO  ->  GET /api/history?fuente=...
// Convierte los puntos en "velas" de 15 minutos para la moneda seleccionada
// ---------------------------------------------------------------------
app.get('/api/history', (req, res) => {
  const fuente = req.query.fuente || 'binanceUsdt';
  const INTERVALO = 15 * 60 * 1000; // 15 minutos
  const velas = {};
  for (const p of cache.history) {
    let val = p.value;
    if (fuente === 'binanceUsdc' && typeof p.binanceUsdc === 'number') val = p.binanceUsdc;
    else if (fuente === 'binanceUsdt' && typeof p.binanceUsdt === 'number') val = p.binanceUsdt;
    else if (fuente === 'paralelo' && typeof p.paralelo === 'number') val = p.paralelo;
    else if (fuente === 'takenos' && typeof p.takenos === 'number') val = p.takenos;
    else if (fuente === 'meru' && typeof p.meru === 'number') val = p.meru;

    if (typeof val !== 'number' || isNaN(val)) continue;

    const bloque = Math.floor(p.time / INTERVALO) * INTERVALO;
    if (!velas[bloque]) {
      velas[bloque] = { open: val, high: val, low: val, close: val };
    } else {
      velas[bloque].high = Math.max(velas[bloque].high, val);
      velas[bloque].low = Math.min(velas[bloque].low, val);
      velas[bloque].close = val;
    }
  }
  const resultado = Object.entries(velas)
    .map(([t, v]) => ({ time: Math.floor(Number(t) / 1000), ...v })) // segundos UNIX
    .sort((a, b) => a.time - b.time);
  res.set('Cache-Control', 'public, max-age=60');
  res.json(resultado);
});

// ---------------------------------------------------------------------
// API 3: ENVIAR COMPROBANTE DE PAGO  ->  POST /api/premium
// El usuario sube la foto de su pago QR + su email.
// La foto viaja directo a TU Telegram (no se guarda en el servidor).
// Tú la verificas y respondes /aprobar <id> en Telegram.
// ---------------------------------------------------------------------
app.post('/api/premium', upload.single('comprobante'), async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const foto = req.file;

    // Validaciones básicas
    if (!email || !email.includes('@') || email.length > 100) {
      return res.status(400).json({ message: 'Escribe un email válido' });
    }
    if (!foto) return res.status(400).json({ message: 'Falta la foto del comprobante' });
    if (!foto.mimetype.startsWith('image/')) {
      return res.status(400).json({ message: 'El comprobante debe ser una imagen' });
    }

    // Anti-spam: máximo 1 solicitud cada 10 minutos por email
    const reciente = await db.get('premium:reciente:' + email);
    if (reciente) {
      return res
        .status(429)
        .json({ message: 'Ya enviaste un comprobante hace poco. Espera unos minutos.' });
    }

    // Registrar la solicitud con un ID único
    const id = Date.now().toString();
    await db.hset('premium:solicitud:' + id, {
      email,
      status: 'pending',
      fecha: new Date().toISOString(),
    });

    // Mandar la foto a tu Telegram con las instrucciones para aprobar
    await bot.api.sendPhoto(
      process.env.ADMIN_CHAT_ID,
      new InputFile(foto.buffer, 'comprobante.jpg'),
      {
        caption:
          `📩 Nueva solicitud premium\n` +
          `Email: ${email}\n` +
          `ID: ${id}\n\n` +
          `Verifica el pago en tu banco y responde:\n` +
          `/aprobar ${id}   o   /rechazar ${id}`,
      }
    );

    // El candado anti-spam se activa SOLO si el envío tuvo éxito
    // (si falló, el usuario puede reintentar de inmediato)
    await db.set('premium:reciente:' + email, true, { ex: 600 });

    res.json({
      message: '✅ Comprobante enviado. Lo verificaremos en minutos y tu cuenta quedará sin anuncios.',
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'No se pudo enviar. Intenta de nuevo.' });
  }
});

// ---------------------------------------------------------------------
// API 4: ¿ESTE EMAIL ES PREMIUM?  ->  GET /api/premium/status?email=...
// La página lo usa para decidir si muestra o esconde los anuncios.
// ---------------------------------------------------------------------
app.get('/api/premium/status', async (req, res) => {
  try {
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!email || email.length > 100) return res.json({ premium: false });
    const premium = await db.get('premium:' + email);
    res.json({ premium: premium === true });
  } catch {
    res.json({ premium: false });
  }
});

// Si el usuario sube algo demasiado grande, multer lanza un error:
// responder con un mensaje claro en vez de tumbar el servidor
app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'La imagen supera los 5 MB' });
  }
  console.error(err);
  res.status(500).json({ message: 'Error del servidor' });
});

// ---------------------------------------------------------------------
// ENCENDER TODO
// ---------------------------------------------------------------------
app.listen(PORT, async () => {
  console.log(`✅ CotiBO corriendo en http://localhost:${PORT}`);

  // Recuperar el histórico del gráfico guardado en Redis
  await restaurarHistorico();

  // Encender el bot de Telegram (polling: sin webhook, sin configuración)
  bot.start().catch((e) => console.error('Error del bot:', e.message));
  console.log('🤖 Bot de Telegram encendido');

  // Actualizar cotizaciones AHORA y luego cada minuto
  actualizar(bot).catch(console.error);
  cron.schedule('* * * * *', () => actualizar(bot).catch(console.error));
  console.log('⏰ Actualizador automático programado (cada minuto)');
});

// Apagado ordenado: respaldar el histórico antes de morir
// (Render reinicia el servidor en cada despliegue)
process.once('SIGTERM', async () => {
  try {
    await db.set('history:respaldo', cache.history);
    await bot.stop();
  } catch {}
  process.exit(0);
});
