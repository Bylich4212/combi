const { InputFile } = require('grammy');
const db = require('../config/db');
const bot = require('../services/bot');

async function submitPremium(req, res) {
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
    await db.set('premium:reciente:' + email, true, { ex: 600 });

    res.json({
      message: '✅ Comprobante enviado. Lo verificaremos en minutos y tu cuenta quedará sin anuncios.',
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'No se pudo enviar. Intenta de nuevo.' });
  }
}

async function getPremiumStatus(req, res) {
  try {
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!email || email.length > 100) return res.json({ premium: false });
    
    // Check in PostgreSQL
    const pg = require('../config/postgres');
    const result = await pg.query('SELECT is_premium, premium_until FROM users WHERE email = $1', [email]);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const isPremium = user.is_premium && (!user.premium_until || new Date() < new Date(user.premium_until));
      return res.json({ premium: isPremium });
    }
    
    // Fallback to Redis for old users
    const premium = await db.get('premium:' + email);
    res.json({ premium: premium === true });
  } catch (err) {
    console.error('Error in getPremiumStatus:', err);
    res.json({ premium: false });
  }
}

module.exports = {
  submitPremium,
  getPremiumStatus
};
