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

require('dotenv').config();
const cron = require('node-cron');
const app = require('./src/app');
const bot = require('./src/services/bot');
const { actualizar, restaurarHistorico } = require('./src/services/actualizador');
const db = require('./src/config/db');
const cache = require('./src/config/cache');

const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------
// ENCENDER TODO
// ---------------------------------------------------------------------
app.listen(PORT, async () => {
  // Iniciar conexión a PostgreSQL
  const postgres = require('./src/config/postgres');
  await postgres.initDB();

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
process.once('SIGTERM', async () => {
  try {
    await db.set('history:respaldo', cache.history);
    await bot.stop();
  } catch {}
  process.exit(0);
});
