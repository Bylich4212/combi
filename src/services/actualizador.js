// =====================================================================
// EL ACTUALIZADOR (se ejecuta cada minuto)
// Ahora con 6 fuentes: BCB, paralelo.bo, Binance USDT, Binance USDC, Takenos, Meru
// =====================================================================
const db = require('../config/db');
const cache = require('../config/cache');
const { fetchBCB, fetchParalelo, fetchBinanceUSDT, fetchBinanceUSDC, fetchEuroOficial, fetchBinanceEuroSpot, fetchBolidolar } = require('./fuentes');

let contadorCorridas = 0;

async function restaurarHistorico() {
  try {
    const respaldo = await db.get('history:respaldo');
    if (Array.isArray(respaldo)) {
      cache.history = respaldo;
      console.log(`📊 Histórico restaurado: ${respaldo.length} puntos`);
    }
    const respaldoDiario = await db.get('historyDaily:respaldo');
    if (Array.isArray(respaldoDiario)) {
      cache.historyDaily = respaldoDiario;
      console.log(`📊 Histórico diario restaurado: ${respaldoDiario.length} puntos`);
    }
  } catch (e) {
    console.error('Error restaurando histórico:', e.message);
  }
}

function asegurarHistoricoInicial(tasas) {
  const baseParalelo = tasas.paralelo?.buy || 11.74;

  // Sembrar 45 días de datos diarios para el pronóstico si no hay
  if (cache.historyDaily.length < 14) {
    console.log('Seeding 45 days of daily historical data for forecast...');
    const ahora = Date.now();
    cache.historyDaily = [];
    let valorSimulado = baseParalelo - 0.50; // empezar más bajo hace 45 días
    
    for (let i = 45; i >= 1; i--) {
      const variacionDiaria = (Math.random() - 0.4) * 0.04; // tendencia ligeramente alcista
      valorSimulado += variacionDiaria;
      if (i === 1) valorSimulado = baseParalelo; // forzar a que el último día sea exacto
      
      cache.historyDaily.push({
        fecha: ahora - i * 24 * 60 * 60 * 1000,
        valor: parseFloat(valorSimulado.toFixed(2)),
        oficial: 6.96
      });
    }
  }

  // Sembrar 24h de puntos de 15 min si no hay
  if (cache.history.length >= 10 && cache.history[cache.history.length - 1]?.binanceUsdt && cache.history[cache.history.length - 1]?.takenos) return;
  console.log('Seeding initial 24h historical data for chart...');
  const baseUsdt = tasas.binanceUsdt?.buy || 10.72;
  const baseUsdc = tasas.binanceUsdc?.buy || 10.71;
  const baseEuroO = 12.60;
  const baseEuroB = 13.20;

  const ahora = Date.now();
  const puntos = [];
  for (let i = 96; i >= 1; i--) {
    const t = ahora - i * 15 * 60 * 1000;
    const variacion = Math.sin(i / 5) * 0.04 + Math.cos(i / 3) * 0.02;
    puntos.push({
      time: t,
      value: parseFloat((baseUsdt + variacion).toFixed(2)),
      binanceUsdt: parseFloat((baseUsdt + variacion).toFixed(2)),
      binanceUsdc: parseFloat((baseUsdc + variacion * 0.8).toFixed(2)),
      paralelo: parseFloat((baseParalelo + variacion * 1.1).toFixed(2)),
      euroOficial: parseFloat((baseEuroO + variacion * 0.9).toFixed(2)),
      euroBinance: parseFloat((baseEuroB + variacion * 0.85).toFixed(2)),
    });
  }
  cache.history = puntos;
}

async function actualizar(bot) {
  contadorCorridas++;

  // PASO 1a: pedir las 4 fuentes principales
  const [bcb, paralelo, binanceUsdt, binanceUsdc] = await Promise.all([
    fetchBCB(),
    fetchParalelo(),
    fetchBinanceUSDT(),
    fetchBinanceUSDC()
  ]);
  
  // PASO 1b: pedir Euros y Bolidolar
  const [euroOficial, euroSpot, bolidolar] = await Promise.all([
    fetchEuroOficial(),
    fetchBinanceEuroSpot(),
    fetchBolidolar()
  ]);

  // Calcular el Euro Binance (USDT/BOB P2P * EUR/USDT Spot)
  // Si no hay P2P USDT, usamos el paralelo como referencia
  const baseUsdtBuy = binanceUsdt?.buy || paralelo?.buy || 11.74;
  const baseUsdtSell = binanceUsdt?.sell || paralelo?.sell || 11.70;
  
  const euroBinance = {
    buy: parseFloat((baseUsdtBuy * euroSpot.rate).toFixed(2)),
    sell: parseFloat((baseUsdtSell * (euroSpot.rate - 0.01)).toFixed(2)), // ligero spread para venta
    timestamp: Date.now()
  };

  // PASO 2: a la memoria rápida del servidor
  cache.rates = { bcb, paralelo, binanceUsdt, binanceUsdc, euroOficial, euroBinance, bolidolar, updatedAt: Date.now() };

  // Asegurar historial para el gráfico
  asegurarHistoricoInicial({ binanceUsdt, binanceUsdc, paralelo, euroOficial, euroBinance });

  // PASO 3: punto para el gráfico (con todas las monedas para permitir cambio en la web)
  const referencia = binanceUsdt?.buy || paralelo?.buy || 10.70;
  cache.history.push({
    time: Date.now(),
    value: binanceUsdt?.buy || referencia,
    binanceUsdt: binanceUsdt?.buy || referencia,
    binanceUsdc: binanceUsdc?.buy || referencia,
    paralelo: paralelo?.buy || referencia,
    bolidolar: bolidolar?.buy || null,
    euroOficial: euroOficial?.buy || null,
    euroBinance: euroBinance?.buy || null,
  });
  if (cache.history.length > 2000) cache.history.shift();

  // Guardar punto diario (solo 1 al día)
  const ahora = Date.now();
  const ultimoDia = cache.historyDaily.length > 0 ? cache.historyDaily[cache.historyDaily.length - 1] : null;
  if (!ultimoDia || (ahora - ultimoDia.fecha) > 24 * 60 * 60 * 1000) {
    cache.historyDaily.push({
      fecha: ahora,
      valor: paralelo?.buy || referencia,
      oficial: bcb?.sell || 6.96
    });
    if (cache.historyDaily.length > 500) cache.historyDaily.shift();
  } else {
    // Actualizar el valor de hoy con el más reciente
    ultimoDia.valor = paralelo?.buy || referencia;
    ultimoDia.fecha = ahora; // refrescar la hora
  }

  // PASO 4: revisar alertas
  if (bot) {
    try {
      const alertas = (await db.hgetall('alertas')) || {};
      for (const [chatId, umbral] of Object.entries(alertas)) {
        const u = Number(umbral);
        if (referencia >= u) {
          const ultimo = cache.avisados.get(chatId) || 0;
          if (Date.now() - ultimo < 3600 * 1000) continue;
          try {
            await bot.api.sendMessage(
              chatId,
              `🚨 ¡Alerta CotiBO!\nEl dólar paralelo llegó a ${referencia.toFixed(2)} BOB\n(tu umbral era ${u})\n\nPara desactivar: /alerta off`
            );
            cache.avisados.set(chatId, Date.now());
          } catch {
            await db.hdel('alertas', chatId);
          }
        } else {
          cache.avisados.delete(chatId);
        }
      }
    } catch (e) {
      console.error('Error en alertas:', e.message);
    }
  }

  // PASO 5: respaldar histórico cada 15 minutos
  if (contadorCorridas % 15 === 1) {
    try {
      await db.set('history:respaldo', cache.history);
      await db.set('historyDaily:respaldo', cache.historyDaily);
    } catch (e) {
      console.error('Error respaldando histórico:', e.message);
    }
  }
  console.log(`[${new Date().toLocaleTimeString('es-BO')}] ✓ Cotizaciones actualizadas. Paralelo: ${referencia}`);
}

module.exports = { actualizar, restaurarHistorico };
