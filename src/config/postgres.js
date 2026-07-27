const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'admin',
  password: process.env.POSTGRES_PASSWORD || 'adminpassword',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'cambi_db'
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_premium BOOLEAN DEFAULT FALSE,
        premium_until TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS p2p_ads (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        ad_type VARCHAR(10) NOT NULL CHECK (ad_type IN ('COMPRA', 'VENTA')),
        amount NUMERIC(12, 2) NOT NULL,
        exchange_rate NUMERIC(10, 2) NOT NULL,
        description TEXT,
        phone_number VARCHAR(20) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('📦 PostgreSQL: Tablas users y p2p_ads listas');
  } catch (err) {
    console.error('Error inicializando PostgreSQL:', err);
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  initDB,
  query: (text, params) => pool.query(text, params)
};
