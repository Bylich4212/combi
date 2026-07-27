// Límite de peticiones: máximo 60 por minuto por IP (anti-abuso simple)
const contadorIPs = new Map();

function rateLimiter(req, res, next) {
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
  
  // limpieza simple
  if (contadorIPs.size > 10000) contadorIPs.clear();
  
  next();
}

module.exports = rateLimiter;
