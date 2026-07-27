// =====================================================================
// LA "MEMORIA" DE LA APP (Redis de Upstash)
// ---------------------------------------------------------------------
// Redis es como un cuaderno en internet donde anotamos cosas con un
// nombre (clave) y un valor. Ejemplo:
//    db.set('rates:paralelo', { buy: 10.7, sell: 10.75 })
//    db.get('rates:paralelo')  ->  { buy: 10.7, sell: 10.75 }
// Upstash nos da ese cuaderno gratis y funciona por internet,
// así que no hay que instalar ninguna base de datos.
// =====================================================================
const { Redis } = require('@upstash/redis');

const db = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

module.exports = db;
