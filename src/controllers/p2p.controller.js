const db = require('../config/postgres');

// Obtener los anuncios activos
async function getAds(req, res) {
  try {
    const result = await db.query(`
      SELECT p.id, p.ad_type, p.amount, p.exchange_rate, p.description, p.phone_number, p.created_at, u.email
      FROM p2p_ads p
      JOIN users u ON p.user_id = u.id
      WHERE p.is_active = TRUE
      ORDER BY p.created_at DESC
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error en getAds:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
}

// Crear un anuncio nuevo (solo usuarios autenticados)
async function createAd(req, res) {
  try {
    const { ad_type, amount, exchange_rate, description, phone_number } = req.body;
    const user_id = req.user.id; // Viene del token JWT

    if (!ad_type || !amount || !exchange_rate || !phone_number) {
      return res.status(400).json({ message: 'Todos los campos obligatorios deben ser completados' });
    }

    if (ad_type !== 'COMPRA' && ad_type !== 'VENTA') {
      return res.status(400).json({ message: 'Tipo de anuncio inválido' });
    }

    const result = await db.query(
      `INSERT INTO p2p_ads (user_id, ad_type, amount, exchange_rate, description, phone_number)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [user_id, ad_type, amount, exchange_rate, description || '', phone_number]
    );

    res.status(201).json({
      message: 'Anuncio publicado exitosamente',
      ad: result.rows[0]
    });
  } catch (error) {
    console.error('Error en createAd:', error);
    res.status(500).json({ message: 'Error interno del servidor al crear anuncio' });
  }
}

module.exports = {
  getAds,
  createAd
};
