// =====================================================================
// EL BOT DE TELEGRAM
// ---------------------------------------------------------------------
// Funciona por "polling": pregunta a Telegram cada segundo si hay
// mensajes nuevos. Sin webhook, sin configuración: se enciende solo.
//
// COMANDOS PARA CUALQUIER PERSONA:
//   /start           bienvenida
//   /dolar           las 6 cotizaciones al instante
//   /alerta 10.80    "avísame cuando el dólar llegue a 10.80"
//   /alerta off      apagar la alerta
//
// COMANDOS SOLO PARA TI (el admin):
//   /setparalelo 10.70 10.75    actualizar el dólar de la calle
//   /settakenos 10.65 10.60     actualizar Takenos (mira tu app)
//   /setmeru 10.55 10.50        actualizar Meru (mira tu app)
//   /aprobar <id>               activar premium a quien pagó
//   /rechazar <id>              rechazar un comprobante
// =====================================================================
const { Bot } = require('grammy');
const db = require('../config/db');
const cache = require('../config/cache');

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

// ¿Quién escribe es el dueño?
const esAdmin = (ctx) => ctx.from?.id.toString() === process.env.ADMIN_CHAT_ID;

// Formatear números bonito ("--" si no hay dato)
const f = (n) => (n ? Number(n).toFixed(2) : '--');

// ---------- comandos públicos ----------

bot.command('start', (ctx) =>
  ctx.reply(
    '👋 ¡Hola! Soy el bot de Cambi.\n\n' +
      '/dolar — precio del dólar en Bolivia ahora\n' +
      '/alerta 10.80 — te aviso cuando el dólar llegue a ese valor\n' +
      '/alerta off — apagar tu alerta'
  )
);

// /dolar lee de la memoria rápida: respuesta instantánea y sin gastar Redis
bot.command('dolar', async (ctx) => {
  const r = cache.rates;
  if (!r) return ctx.reply('Datos no disponibles aún. Intenta en un minuto.');
  await ctx.reply(
    `🇧🇴 *Cambi — Dólar hoy*\n` +
      `🏛 Oficial BCB: Compra ${f(r.bcb?.buy)} | Venta ${f(r.bcb?.sell)}\n` +
      `🏚 Paralelo P2P: Compra ${f(r.paralelo?.buy)} | Venta ${f(r.paralelo?.sell)}\n` +
      `💛 Binance USDT: Compra ${f(r.binanceUsdt?.buy)} | Venta ${f(r.binanceUsdt?.sell)}\n` +
      `💙 Binance USDC: Compra ${f(r.binanceUsdc?.buy)} | Venta ${f(r.binanceUsdc?.sell)}\n` +
      `🟣 Takenos: Compra ${f(r.takenos?.buy)} | Venta ${f(r.takenos?.sell)}\n` +
      `🟢 Meru: Compra ${f(r.meru?.buy)} | Venta ${f(r.meru?.sell)}\n` +
      `_Actualizado: ${new Date(r.updatedAt || Date.now()).toLocaleTimeString('es-BO', { timeZone: 'America/La_Paz' })}_`,
    { parse_mode: 'Markdown' }
  );
});

// Alertas: se guardan todas juntas en el casillero 'alertas' de Redis
// (chatId -> umbral). Así el actualizador las lee con 1 sola operación.
bot.command('alerta', async (ctx) => {
  const texto = (ctx.match ?? '').trim().toLowerCase();
  const chatId = ctx.chat.id.toString();

  if (texto === 'off' || texto === 'no') {
    await db.hdel('alertas', chatId);
    cache.avisados.delete(chatId);
    return ctx.reply('🔕 Alerta desactivada.');
  }

  const umbral = parseFloat(texto);
  if (isNaN(umbral) || umbral <= 0) {
    return ctx.reply(
      'Uso: /alerta 10.80\n(te avisaré cuando el dólar llegue a 10.80 Bs)\nPara apagar: /alerta off'
    );
  }

  await db.hset('alertas', { [chatId]: umbral });
  cache.avisados.delete(chatId);
  return ctx.reply(`🔔 Listo. Te avisaré cuando el dólar de mercado llegue a ${umbral.toFixed(2)} Bs.`);
});

// ---------- comandos de admin ----------

// Un solo molde para los 3 comandos de actualización manual
function comandoSet(clave, nombre) {
  bot.command('set' + clave, async (ctx) => {
    if (!esAdmin(ctx)) return; // ignorar a cualquier otra persona
    const partes = (ctx.match ?? '').trim().split(/\s+/);
    const compra = parseFloat(partes[0]);
    const venta = parseFloat(partes[1]);
    if (isNaN(compra) || isNaN(venta)) {
      return ctx.reply(`Uso: /set${clave} <compra> <venta>\nEjemplo: /set${clave} 10.70 10.75`);
    }
    const nuevo = { buy: compra, sell: venta, timestamp: Date.now() };
    await db.set('rates:' + clave, nuevo); // persistir (sobrevive reinicios)
    if (cache.rates) cache.rates[clave] = nuevo; // y verse YA en la web
    await ctx.reply(`✅ ${nombre} actualizado: compra ${compra} | venta ${venta}\n(Ya visible en la web)`);
  });
}
comandoSet('paralelo', 'Paralelo');
comandoSet('takenos', 'Takenos');
comandoSet('meru', 'Meru');

// Aprobar un pago: el usuario queda premium (sin anuncios) por 31 días
bot.command('aprobar', async (ctx) => {
  if (!esAdmin(ctx)) return;
  const id = ctx.match?.trim();
  if (!id) return ctx.reply('Uso: /aprobar <id>');
  const solicitud = await db.hgetall('premium:solicitud:' + id);
  if (!solicitud || solicitud.status !== 'pending') {
    return ctx.reply('Solicitud no encontrada o ya procesada.');
  }
  await db.hset('premium:solicitud:' + id, { status: 'approved' });
  const email = String(solicitud.email).toLowerCase();
  
  // Guardar en Redis para compatibilidad
  await db.set('premium:' + email, true, { ex: 60 * 60 * 24 * 31 });
  
  // Guardar en PostgreSQL si el usuario existe
  try {
    const pg = require('../config/postgres');
    await pg.query(
      `UPDATE users SET is_premium = true, premium_until = NOW() + INTERVAL '31 days' WHERE email = $1`,
      [email]
    );
  } catch (err) {
    console.error('Error actualizando postgres:', err);
  }
  
  await ctx.reply(`✅ Premium activado para ${email} (vence en 31 días)`);
});

bot.command('rechazar', async (ctx) => {
  if (!esAdmin(ctx)) return;
  const id = ctx.match?.trim();
  if (!id) return ctx.reply('Uso: /rechazar <id>');
  await db.hset('premium:solicitud:' + id, { status: 'rejected' });
  await ctx.reply('❌ Solicitud rechazada.');
});

module.exports = bot;
