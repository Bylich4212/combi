// =====================================================================
// FUENTES DE COTIZACIONES (VERIFICADAS Y OPTIMIZADAS)
// =====================================================================
// AUTOMÁTICAS (se actualizan solas cada minuto):
//    - Oficial BCB      -> DolarApi.com (API verificada)
//    - Paralelo P2P     -> paralelo.bo (mediana de 5 exchanges)
//    - Binance USDT     -> API oficial P2P de Binance (USDT respecto a BOB)
//    - Binance USDC     -> API oficial P2P de Binance (USDC respecto a BOB)
//    - Takenos          -> API Takenos / cálculo en vivo con base al P2P
//    - Meru             -> API Meru / cálculo en vivo con base al P2P
//
// Nota: si una fuente falla o si el admin sobreescribe en Telegram,
// caemos a lo último guardado en Redis.
// =====================================================================
const db = require('../config/db');

// Valores de emergencia para el primer día
const RESPALDO = {
  bcb: { buy: 6.86, sell: 6.96, timestamp: 0 },
  paralelo: { buy: 10.70, sell: 10.75, timestamp: 0 }, // paralelo.bo actualiza este
  binanceUsdt: { buy: 10.72, sell: 10.70, timestamp: 0 },
  binanceUsdc: { buy: 10.71, sell: 10.75, timestamp: 0 },
  takenos: { buy: 10.93, sell: 10.88, timestamp: 0 },
  meru: { buy: 11.09, sell: 11.04, timestamp: 0 },
};

// Si algo falla, devolver lo último guardado
async function ultimoGuardado(clave) {
  try {
    const guardado = await db.get('rates:' + clave);
    if (guardado) return guardado;
  } catch {
    // Si Redis falla o no hay conexión local, usar el respaldo local
  }
  return RESPALDO[clave] || { buy: 0, sell: 0, timestamp: Date.now() };
}

// Pedir datos a una URL con timeout de 5 segundos
async function pedirJSON(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ========== 1. BANCO CENTRAL DE BOLIVIA (BCB) Oficial ==========
async function fetchBCB() {
  try {
    const fetch = globalThis.fetch || require('node-fetch');
    const res = await fetch('https://www.bcb.gob.bo/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(5000)
    });
    
    if (res.ok) {
      const html = await res.text();
      // Buscar algo como: <span class="bcb-tco-num">11,54</span>
      const match = html.match(/<span[^>]*class="[^"]*bcb-tco-num[^"]*"[^>]*>\s*([\d,.]+)\s*<\/span>/i);
      if (match && match[1]) {
        // Convertir coma a punto decimal
        const rate = parseFloat(match[1].replace(',', '.'));
        return { buy: rate, sell: null, timestamp: Date.now() };
      }
    }
  } catch (e) {
    console.error('Error consultando BCB Directo:', e.message);
  }
  return { buy: 6.96, sell: null, timestamp: Date.now() }; // Fallback
}

// ========== 2. PARALELO (automático desde paralelo.bo) ==========
// paralelo.bo agrega 5 exchanges: Binance, Bybit, OKX, Bitget, ElDorado
// Respuesta: { buy: X, sell: Y, spread: Z, timestamp: T }
async function fetchParalelo() {
  try {
    const data = await pedirJSON('https://paralelo.bo/api/v1/rate');
    // paralelo.bo devuelve "compra" y "venta" o "buy" y "sell"
    return {
      buy: parseFloat(data.compra || data.buy),
      sell: parseFloat(data.venta || data.sell),
      timestamp: Date.now(),
    };
  } catch {
    return ultimoGuardado('paralelo');
  }
}

// ========== 3 y 4. BINANCE P2P (automático directo desde la API de Binance) ==========
// Consulta directa a la API pública de búsqueda de anuncios P2P en Binance (BOB)
async function fetchBinanceP2P(asset = 'USDT') {
  try {
    const fetch = globalThis.fetch || require('node-fetch');
    // tradeType: 'BUY'  -> Usuario entra a la pestaña "Comprar" crypto
    // tradeType: 'SELL' -> Usuario entra a la pestaña "Vender" crypto
    const [resCompra, resVenta] = await Promise.all([
      fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        body: JSON.stringify({ page: 1, rows: 20, payTypes: [], asset, tradeType: 'BUY', fiat: 'BOB' }),
        signal: AbortSignal.timeout(6000)
      }),
      fetch('https://p2p.binance.com/bapi/c2c/v2/friendly/c2c/adv/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        body: JSON.stringify({ page: 1, rows: 20, payTypes: [], asset, tradeType: 'SELL', fiat: 'BOB' }),
        signal: AbortSignal.timeout(6000)
      })
    ]);

    if (!resCompra.ok || !resVenta.ok) throw new Error('HTTP error en Binance');
    const dataCompra = await resCompra.json();
    const dataVenta = await resVenta.json();

    let preciosCompra = (dataCompra.data || []).map(x => parseFloat(x.adv?.price)).filter(x => !isNaN(x) && x > 0);
    let preciosVenta = (dataVenta.data || []).map(x => parseFloat(x.adv?.price)).filter(x => !isNaN(x) && x > 0);

    // Ordenar para garantizar que promediamos las mejores ofertas reales:
    // Compra (Usuario compra crypto): queremos el precio MÁS BAJO
    preciosCompra.sort((a, b) => a - b);
    // Venta (Usuario vende crypto): queremos el precio MÁS ALTO
    preciosVenta.sort((a, b) => b - a);

    if (preciosCompra.length === 0 || preciosVenta.length === 0) {
      throw new Error('Sin anuncios P2P de ' + asset);
    }

    // Tomamos el promedio de las 15 mejores ofertas del mercado para mayor estabilidad (ya que ahora solicitamos 20 max)
    const sampleSizeBuy = Math.min(preciosCompra.length, 15);
    const sampleSizeSell = Math.min(preciosVenta.length, 15);
    const buy = parseFloat((preciosCompra.slice(0, sampleSizeBuy).reduce((a, b) => a + b, 0) / sampleSizeBuy).toFixed(2));
    const sell = parseFloat((preciosVenta.slice(0, sampleSizeSell).reduce((a, b) => a + b, 0) / sampleSizeSell).toFixed(2));

    return { buy, sell, timestamp: Date.now() };
  } catch {
    const clave = asset === 'USDT' ? 'binanceUsdt' : 'binanceUsdc';
    return ultimoGuardado(clave);
  }
}

async function fetchBinanceUSDT() {
  return fetchBinanceP2P('USDT');
}

async function fetchBinanceUSDC() {
  return fetchBinanceP2P('USDC');
}

// ========== 5. EURO OFICIAL (BCB DIRECTO) ==========
async function fetchEuroOficial() {
  try {
    const fetch = globalThis.fetch || require('node-fetch');
    const res = await fetch('https://www.bcb.gob.bo/librerias/indicadores/euro/ultimo.php', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const html = await res.text();
      const matches = [...html.matchAll(/([0-9]+,[0-9]+)&nbsp;/g)];
      // El segundo match es la tasa "En Bs por unidad de Euro" (ej. 13,12214)
      if (matches && matches.length >= 2) {
        const rate = parseFloat(matches[1][1].replace(',', '.'));
        return { buy: rate, sell: null, timestamp: Date.now() };
      }
    }
  } catch (e) {
    console.error('Error consultando Euro Oficial BCB:', e.message);
  }
  return ultimoGuardado('euroOficial');
}

// ========== 6. WISE (EUR) ==========
async function fetchEuroWise() {
  try {
    const fetch = globalThis.fetch || require('node-fetch');
    const res = await fetch('https://wise.com/rates/live?source=EUR&target=BOB&length=1', { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.value) {
        const rate = parseFloat(data.value);
        // En Wise, solo se puede enviar EUR a BOB (no al revés). 
        // No hay un precio de "venta" de EUR, usan una tasa mid-market única.
        return { buy: rate, sell: null, timestamp: Date.now() };
      }
    }
  } catch (e) {
    console.error('Error consultando Wise Euro:', e.message);
  }
  return ultimoGuardado('euroWise');
}

// ========== 6.5 SPOT EUR/USDT (BINANCE) ==========
async function fetchBinanceEuroSpot() {
  try {
    const fetch = globalThis.fetch || require('node-fetch');
    // Usamos bookTicker para obtener el precio real de Compra (Bid) y Venta (Ask) que fija Binance
    const res = await fetch('https://api.binance.com/api/v3/ticker/bookTicker?symbol=EURUSDT', { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      if (data && data.bidPrice && data.askPrice) {
        return { 
          bid: parseFloat(data.bidPrice), 
          ask: parseFloat(data.askPrice), 
          timestamp: Date.now() 
        };
      }
    }
  } catch (e) {
    console.error('Error consultando Binance Euro Spot:', e.message);
  }
  return { bid: 1.08, ask: 1.08, timestamp: Date.now() }; // Fallback aproximado
}


// ========== 7. BOLIDOLAR (Precio Calle) ==========
async function fetchBolidolar() {
  try {
    const fetch = globalThis.fetch || require('node-fetch');
    const cities = ['santa-cruz', 'la-paz', 'cochabamba'];
    const results = { 'santa-cruz': 0, 'la-paz': 0, 'cochabamba': 0 };
    let mainBuy = 0;

    for (const city of cities) {
      try {
        const res = await fetch(`https://www.bolidolar.com/api/exchange-rate?cache=true&department=${city}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'Accept': 'application/json'
          },
          signal: AbortSignal.timeout(3000)
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.data && data.data.rate) {
            results[city] = parseFloat(data.data.rate);
            if (city === 'santa-cruz') mainBuy = results[city];
          }
        }
      } catch (e) {
        console.error(`Error consultando API Bolidolar para ${city}:`, e.message);
      }
    }
    
    return {
      buy: mainBuy,
      sell: parseFloat((mainBuy - 0.05).toFixed(2)),
      timestamp: Date.now(),
      cities: {
        santaCruz: results['santa-cruz'],
        laPaz: results['la-paz'],
        cochabamba: results['cochabamba']
      }
    };
  } catch (e) {
    console.error('Error general consultando API Bolidolar:', e.message);
  }
  return { buy: 0, sell: 0, timestamp: Date.now(), cities: {} };
}

// ========== 8. DUKASCOPY (Banco Suizo) - Histórico para Forex ==========
async function fetchDukascopyHistory(instrument = 'eurusd', days = 45) {
  try {
    const { getHistoricalRates } = require('dukascopy-node');
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
    
    const data = await getHistoricalRates({
      instrument,
      dates: { from, to },
      timeframe: 'd1',
      format: 'json'
    });
    
    // Transformar al formato que espera el motor de pronóstico (array de { valor: cierres, oficial: 0 })
    return data.map(d => ({
      fecha: d.timestamp,
      valor: d.close,
      oficial: d.close // no hay paralelo
    }));
  } catch (e) {
    console.error(`Error consultando Dukascopy para ${instrument}:`, e.message);
    return [];
  }
}

module.exports = {
  fetchBCB,
  fetchParalelo,
  fetchBinanceUSDT,
  fetchBinanceUSDC,
  fetchEuroOficial,
  fetchEuroWise,
  fetchBinanceEuroSpot,
  fetchBolidolar,
  fetchDukascopyHistory
};
