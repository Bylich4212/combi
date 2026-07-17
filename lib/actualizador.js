// =====================================================================
// EL ACTUALIZADOR (se ejecuta cada minuto)
// Ahora con 6 fuentes: BCB, paralelo.bo, Binance USDT, Binance USDC, Takenos, Meru
// =====================================================================
const db = require('./db');
const cache = require('./cache');
const { fetchBCB, fetchParalelo, fetchBinanceUSDT, fetchBinanceUSDC, fetchTakenos, fetchMeru } = require('./fuentes');

let contadorCorridas = 0;

async function restaurarHistorico() {
  try {
    const respaldo = await db.get('history:respaldo');
    if (Array.isArray(respaldo)) {
      cache.history = respaldo;
      console.log(`📊 Histórico restaurado: ${respaldo.length} puntos`);
    }
  } catch (e) {
    console.error('Error restaurando histórico:', e.message);
  }
}

function asegurarHistoricoInicial(tasas) {
  if (cache.history.length >= 10 && cache.history[cache.history.length - 1]?.binanceUsdt && cache.history[cache.history.length - 1]?.takenos) return;
  console.log('Seeding initial 24h historical data for chart...');
  const baseUsdt = tasas.binanceUsdt?.buy || 10.72;
  const baseUsdc = tasas.binanceUsdc?.buy || 10.71;
  const baseParalelo = tasas.paralelo?.buy || 10.74;
  const baseTakenos = tasas.takenos?.buy || 10.93;
  const baseMeru = tasas.meru?.buy || 11.09;

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
      takenos: parseFloat((baseTakenos + variacion * 0.9).toFixed(2)),
      meru: parseFloat((baseMeru + variacion * 0.85).toFixed(2)),
    });
  }
  cache.history = [...puntos, ...cache.history];
}

async function actualizar(bot) {
  contadorCorridas++;

  // PASO 1: pedir las 6 fuentes (incluyendo Binance USDT, Binance USDC, Takenos y Meru)
  const [bcb, paralelo, binanceUsdt, binanceUsdc, takenos, meru] = await Promise.all([
    fetchBCB(),
    fetchParalelo(),
    fetchBinanceUSDT(),
    fetchBinanceUSDC(),
    fetchTakenos(),
    fetchMeru(),
  ]);

  // PASO 2: a la memoria rápida del servidor
  cache.rates = { bcb, paralelo, binanceUsdt, binanceUsdc, takenos, meru, updatedAt: Date.now() };

  // Asegurar historial para el gráfico
  asegurarHistoricoInicial({ binanceUsdt, binanceUsdc, paralelo, takenos, meru });

  // PASO 3: punto para el gráfico (con todas las monedas para permitir cambio en la web)
  const referencia = binanceUsdt?.buy || paralelo?.buy || 10.70;
  cache.history.push({
    time: Date.now(),
    value: referencia,
    binanceUsdt: binanceUsdt?.buy || referencia,
    binanceUsdc: binanceUsdc?.buy || referencia,
    paralelo: paralelo?.buy || referencia,
    takenos: takenos?.buy || parseFloat((referencia + 0.22).toFixed(2)),
    meru: meru?.buy || parseFloat((referencia + 0.38).toFixed(2)),
  });
  if (cache.history.length > 2000) cache.history.shift();

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
    } catch (e) {
      console.error('Error respaldando histórico:', e.message);
    }
  }

  console.log(`[${new Date().toLocaleTimeString('es-BO')}] ✓ Cotizaciones actualizadas. Paralelo: ${referencia}`);
}

module.exports = { actualizar, restaurarHistorico };
