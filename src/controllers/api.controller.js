const cache = require('../config/cache');
const pronostico = require('../services/pronostico');

function getRates(req, res) {
  if (!cache.rates) return res.status(503).json({ error: 'Datos no disponibles aún' });
  res.set('Cache-Control', 'public, max-age=30');
  res.json(cache.rates);
}

function getHistory(req, res) {
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
}

async function getPronostico(req, res) {
  try {
    const claveCache = 'pronostico_bob';
    if (cache[claveCache] && (Date.now() - cache[claveCache].timestamp < 6 * 60 * 60 * 1000)) {
      return res.json(cache[claveCache].data);
    }
    
    const historia = cache.historyDaily;
    if (!historia || historia.length < 14) {
      return res.status(500).json({ error: 'Faltan datos históricos' });
    }
    
    // Correr pronóstico a 1, 7, 15 y 30 días
    const d1 = pronostico.calcularPronostico(historia, 1);
    const d7 = pronostico.calcularPronostico(historia, 7);
    const d15 = pronostico.calcularPronostico(historia, 15);
    const d30 = pronostico.calcularPronostico(historia, 30);
    
    const resultado = {
      "1": d1,
      "7": d7,
      "15": d15,
      "30": d30
    };
    
    cache[claveCache] = { timestamp: Date.now(), data: resultado };
    res.json(resultado);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error calculando pronóstico' });
  }
}

module.exports = {
  getRates,
  getHistory,
  getPronostico
};
