// =====================================================================
// MOTOR DE PRONÓSTICO v2 — SOLO PREMIUM
// ---------------------------------------------------------------------
// MEJORAS SOBRE LA VERSIÓN ANTERIOR:
//   1. GARCH(1,1) para la volatilidad (con respaldo EWMA si hay pocos datos)
//   2. Filtro de Kalman para una deriva que cambia en el tiempo
//   3. Distribución t de Student en vez de normal (colas gordas)
//   4. Simulación Monte Carlo (10.000 caminos) para la distribución completa
//   5. Detección automática de shocks / cambios de régimen
//   6. Backtest con RMSE, MAE y comparación contra el camino aleatorio
//   7. Percentiles configurables para el gráfico de abanico
// =====================================================================

// =====================================================================
// SECCIÓN 1 — HERRAMIENTAS ESTADÍSTICAS
// =====================================================================

function promedio(a) {
  return a.reduce((x, y) => x + y, 0) / a.length;
}

function varianzaMuestral(a) {
  if (a.length < 2) return 0;
  const m = promedio(a);
  return a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1);
}

function curtosisExceso(a) {
  const n = a.length;
  if (n < 4) return 0;
  const m = promedio(a);
  const s2 = varianzaMuestral(a);
  if (s2 <= 0) return 0;
  const m4 = a.reduce((s, x) => s + Math.pow(x - m, 4), 0) / n;
  return m4 / (s2 * s2) - 3;
}

function normalCDF(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp((-x * x) / 2);
  const p =
    d * t *
    (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x > 0 ? 1 - p : p;
}

function normalInversa(p) {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
             1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
             6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
             -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0,
             3.754408661907416e0];
  const pl = 0.02425;
  let q, r;
  if (p < pl) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
           ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
  if (p <= 1 - pl) {
    q = p - 0.5; r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5]) * q /
           (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
          ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
}

function tInversa(p, gl) {
  if (gl >= 200) return normalInversa(p);
  const z = normalInversa(p);
  const z2 = z * z, z3 = z2 * z, z5 = z3 * z2, z7 = z5 * z2;
  const g1 = (z3 + z) / 4;
  const g2 = (5 * z5 + 16 * z3 + 3 * z) / 96;
  const g3 = (3 * z7 + 19 * z5 + 17 * z3 - 15 * z) / 384;
  return z + g1 / gl + g2 / (gl * gl) + g3 / (gl * gl * gl);
}

function gradosLibertad(rendimientos) {
  const n = rendimientos.length;
  const k = curtosisExceso(rendimientos);
  let gl = k > 0.1 ? 4 + 6 / k : 30;
  gl = Math.max(3, Math.min(gl, 30));
  gl = Math.min(gl, Math.max(3, n - 1));
  return gl;
}

function percentil(ordenados, p) {
  const i = (ordenados.length - 1) * p;
  const bajo = Math.floor(i), alto = Math.ceil(i);
  return bajo === alto ? ordenados[bajo] : ordenados[bajo] * (alto - i) + ordenados[alto] * (i - bajo);
}

function limitar(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function calcularRendimientos(valores) {
  const r = [];
  for (let i = 1; i < valores.length; i++) {
    if (valores[i] > 0 && valores[i - 1] > 0) r.push(Math.log(valores[i] / valores[i - 1]));
  }
  return r;
}

// =====================================================================
// SECCIÓN 2 — VOLATILIDAD: GARCH(1,1) CON RESPALDO EWMA
// =====================================================================

function volatilidadEWMA(rendimientos, lambda = 0.94) {
  if (rendimientos.length < 2) return 0;
  const arranque = rendimientos.slice(0, Math.min(10, rendimientos.length));
  let v = varianzaMuestral(arranque) || 1e-8;
  for (const r of rendimientos) v = lambda * v + (1 - lambda) * r * r;
  return Math.sqrt(Math.max(v, 1e-12));
}

function ajustarGARCH(rendimientos) {
  const n = rendimientos.length;
  const MINIMO_GARCH = 100;
  if (n < MINIMO_GARCH) return null;

  const media = promedio(rendimientos);
  const centrados = rendimientos.map((r) => r - media);
  const varLargoPlazo = varianzaMuestral(centrados);
  if (varLargoPlazo <= 0) return null;

  function verosimilitud(alfa, beta) {
    const omega = varLargoPlazo * (1 - alfa - beta);
    if (omega <= 0) return -Infinity;
    let v = varLargoPlazo;
    let logL = 0;
    for (const r of centrados) {
      if (v <= 1e-14) return -Infinity;
      logL += -0.5 * (Math.log(v) + (r * r) / v);
      v = omega + alfa * r * r + beta * v;
    }
    return logL;
  }

  let mejor = { alfa: 0.06, beta: 0.90, logL: -Infinity };
  for (let alfa = 0.02; alfa <= 0.30001; alfa += 0.02) {
    for (let beta = 0.50; beta <= 0.97001; beta += 0.02) {
      if (alfa + beta >= 0.999) continue;
      const L = verosimilitud(alfa, beta);
      if (L > mejor.logL) mejor = { alfa, beta, logL: L };
    }
  }
  const a0 = mejor.alfa, b0 = mejor.beta;
  for (let alfa = Math.max(0.005, a0 - 0.02); alfa <= a0 + 0.02; alfa += 0.005) {
    for (let beta = Math.max(0.40, b0 - 0.02); beta <= Math.min(0.985, b0 + 0.02); beta += 0.005) {
      if (alfa + beta >= 0.999) continue;
      const L = verosimilitud(alfa, beta);
      if (L > mejor.logL) mejor = { alfa, beta, logL: L };
    }
  }

  const { alfa, beta } = mejor;
  const omega = varLargoPlazo * (1 - alfa - beta);

  let v = varLargoPlazo;
  const serie = [];
  for (const r of centrados) {
    serie.push(v);
    v = omega + alfa * r * r + beta * v;
  }

  return {
    alfa, beta, omega,
    varianzaLargoPlazo: varLargoPlazo,
    varianzaManana: v,
    persistencia: alfa + beta,
    serieVarianza: serie,
    logL: mejor.logL,
  };
}

function varianzaAcumuladaGARCH(garch, h) {
  const { varianzaLargoPlazo: vLP, varianzaManana: v1, persistencia: pers } = garch;
  let total = 0;
  for (let k = 1; k <= h; k++) {
    total += vLP + Math.pow(pers, k - 1) * (v1 - vLP);
  }
  return total;
}

// =====================================================================
// SECCIÓN 3 — DERIVA VARIABLE CON FILTRO DE KALMAN
// =====================================================================

function derivaKalman(rendimientos, sigmaDiaria) {
  const n = rendimientos.length;
  if (n < 8) return { deriva: 0, incertidumbre: 0, adaptativa: false };

  const varObs = Math.max(sigmaDiaria * sigmaDiaria, 1e-12);
  const varProceso = varObs / 400;

  let mu = 0;
  let P = varObs;

  for (const r of rendimientos) {
    P = P + varProceso;
    const K = P / (P + varObs);
    mu = mu + K * (r - mu);
    P = (1 - K) * P;
  }

  const t = P > 0 ? mu / Math.sqrt(P) : 0;
  const factor = (t * t) / (1 + t * t);

  return {
    deriva: mu * factor,
    derivaCruda: mu,
    incertidumbre: Math.sqrt(P),
    adaptativa: true,
  };
}

function derivaEncogida(rendimientos) {
  const n = rendimientos.length;
  if (n < 5) return 0;
  const media = promedio(rendimientos);
  const desv = Math.sqrt(varianzaMuestral(rendimientos));
  if (desv === 0) return 0;
  const t = media / (desv / Math.sqrt(n));
  return media * ((t * t) / (1 + t * t));
}

// =====================================================================
// SECCIÓN 4 — DETECCIÓN DE SHOCKS
// =====================================================================

function detectarShocks(rendimientos, sigma) {
  const shocks = [];
  const UMBRAL = 4;
  rendimientos.forEach((r, i) => {
    const z = sigma > 0 ? r / sigma : 0;
    if (Math.abs(z) > UMBRAL) {
      shocks.push({
        indice: i,
        magnitudPct: Number((r * 100).toFixed(2)),
        desviaciones: Number(z.toFixed(1)),
        direccion: r > 0 ? 'alza' : 'baja',
      });
    }
  });
  const recientes = shocks.filter((s) => s.indice >= rendimientos.length - 10);
  return {
    total: shocks.length,
    recientes: recientes.length,
    ultimos: shocks.slice(-3),
    regimenAlterado: recientes.length > 0,
  };
}

// =====================================================================
// SECCIÓN 5 — SIMULACIÓN MONTE CARLO
// =====================================================================

function simularMonteCarlo(opciones) {
  const {
    precioActual, deriva, garch, sigmaDiaria, gl, horizonte,
    caminos = 10000, semilla = 42,
  } = opciones;

  let s = semilla;
  const aleatorio = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s + 0.5) / 0x7fffffff;
  };
  const escalaT = gl > 2 ? Math.sqrt((gl - 2) / gl) : 1;
  const sorpresa = () => tInversa(limitar(aleatorio(), 1e-6, 1 - 1e-6), gl) * escalaT;

  const finales = new Array(caminos);
  const porDia = Array.from({ length: horizonte }, () => new Array(caminos));

  for (let c = 0; c < caminos; c++) {
    let logPrecio = 0;
    let v = garch ? garch.varianzaManana : sigmaDiaria * sigmaDiaria;
    for (let d = 0; d < horizonte; d++) {
      const sd = Math.sqrt(Math.max(v, 1e-14));
      const r = deriva + sd * sorpresa();
      logPrecio += r;
      porDia[d][c] = precioActual * Math.exp(logPrecio);
      if (garch) {
        v = garch.omega + garch.alfa * r * r + garch.beta * v;
      }
    }
    finales[c] = precioActual * Math.exp(logPrecio);
  }

  finales.sort((a, b) => a - b);
  porDia.forEach((dia) => dia.sort((a, b) => a - b));

  return { finales, porDia, caminos };
}

function construirHistograma(valoresOrdenados, cajas = 24) {
  const min = valoresOrdenados[Math.floor(valoresOrdenados.length * 0.005)];
  const max = valoresOrdenados[Math.floor(valoresOrdenados.length * 0.995)];
  const ancho = (max - min) / cajas;
  if (!(ancho > 0)) return [];
  const conteo = new Array(cajas).fill(0);
  for (const v of valoresOrdenados) {
    const i = Math.floor((v - min) / ancho);
    if (i >= 0 && i < cajas) conteo[i]++;
  }
  const maxConteo = Math.max(...conteo);
  return conteo.map((c, i) => ({
    desde: Number((min + i * ancho).toFixed(3)),
    hasta: Number((min + (i + 1) * ancho).toFixed(3)),
    centro: Number((min + (i + 0.5) * ancho).toFixed(3)),
    frecuencia: c,
    altura: Number((c / maxConteo).toFixed(3)),
  }));
}

// =====================================================================
// SECCIÓN 6 — PRONÓSTICO PRINCIPAL
// =====================================================================

function nivelConfianza(n) {
  if (n < 14) return { nivel: 'insuficiente', etiqueta: 'Recolectando datos' };
  if (n < 30) return { nivel: 'baja', etiqueta: 'Confianza baja' };
  if (n < 90) return { nivel: 'media', etiqueta: 'Confianza media' };
  return { nivel: 'alta', etiqueta: 'Confianza alta' };
}

function analizarFactores(cierres) {
  const factores = [];
  const valores = cierres.map((c) => c.valor);
  const n = valores.length;
  let inclinacion = 0;

  if (n >= 30) {
    const prom7 = promedio(valores.slice(-7));
    const prom30 = promedio(valores.slice(-30));
    const dif = (prom7 - prom30) / prom30;
    inclinacion += limitar(dif * 40, -0.35, 0.35);
    factores.push({
      nombre: 'Tendencia reciente',
      detalle: `Promedio de 7 días vs 30 días: ${(dif * 100).toFixed(2)}%`,
      impacto: 'alto',
      direccion: dif > 0.002 ? 'sube' : dif < -0.002 ? 'baja' : 'neutral',
    });
  }

  const conOficial = cierres.filter((c) => c.oficial > 0);
  if (conOficial.length >= 15) {
    const brechas = conOficial.map((c) => (c.valor - c.oficial) / c.oficial);
    const hoy = brechas[brechas.length - 1];
    const media = promedio(brechas);
    const desv = Math.sqrt(varianzaMuestral(brechas)) || 1e-6;
    const z = (hoy - media) / desv;
    inclinacion += limitar(-z * 0.10, -0.25, 0.25);
    factores.push({
      nombre: 'Brecha con el oficial',
      detalle: `${(hoy * 100).toFixed(1)}% (promedio histórico: ${(media * 100).toFixed(1)}%)`,
      impacto: 'alto',
      direccion: z > 1 ? 'baja' : z < -1 ? 'sube' : 'neutral',
    });
  }

  if (n >= 14) {
    const r = calcularRendimientos(valores);
    const acel = promedio(r.slice(-5)) - promedio(r.slice(-14, -5));
    inclinacion += limitar(acel * 25, -0.20, 0.20);
    factores.push({
      nombre: 'Aceleración',
      detalle: acel > 0 ? 'El movimiento gana fuerza' : 'El movimiento pierde fuerza',
      impacto: 'medio',
      direccion: acel > 0.0005 ? 'sube' : acel < -0.0005 ? 'baja' : 'neutral',
    });
  }

  return { factores, inclinacion: limitar(inclinacion, -0.6, 0.6) };
}

function calcularPronostico(cierres, horizonteDias = 7, opciones = {}) {
  const minimo = opciones.minimo || 14;
  if (!Array.isArray(cierres) || cierres.length < minimo) {
    return {
      disponible: false,
      motivo: `Se necesitan al menos ${minimo} días de historia (hay ${cierres?.length || 0}).`,
      diasRecolectados: cierres?.length || 0,
      diasFaltantes: minimo - (cierres?.length || 0),
    };
  }

  const valores = cierres.map((c) => c.valor);
  const ultimo = valores[valores.length - 1];
  const rendimientos = calcularRendimientos(valores);
  if (rendimientos.length < 5) {
    return { disponible: false, motivo: 'Historia insuficiente para calcular.' };
  }

  const rangoRendimientos = Math.max(...rendimientos.map(Math.abs));
  if (rangoRendimientos < 1e-9) {
    return {
      disponible: true, sinMovimiento: true,
      probabilidadSube: 0.5, probabilidadBaja: 0.5,
      precioActual: ultimo, esperado: ultimo,
      rango50: { min: ultimo, max: ultimo },
      rango80: { min: ultimo, max: ultimo },
      rango95: { min: ultimo, max: ultimo },
      horizonteDias, confianza: nivelConfianza(cierres.length), factores: [],
    };
  }

  const garch = opciones.sinGarch ? null : ajustarGARCH(rendimientos);
  let sigmaDiaria, modeloVol;
  if (garch) {
    sigmaDiaria = Math.sqrt(garch.varianzaManana);
    modeloVol = 'GARCH(1,1)';
  } else {
    const corta = volatilidadEWMA(rendimientos);
    const larga = Math.sqrt(varianzaMuestral(rendimientos));
    sigmaDiaria = Math.sqrt(0.7 * corta * corta + 0.3 * larga * larga);
    modeloVol = 'EWMA + histórica';
  }
  if (sigmaDiaria <= 1e-9) {
    return {
      disponible: true, sinMovimiento: true,
      probabilidadSube: 0.5, probabilidadBaja: 0.5,
      precioActual: ultimo, esperado: ultimo,
      rango95: { min: ultimo, max: ultimo }, rango80: { min: ultimo, max: ultimo },
      horizonteDias, confianza: nivelConfianza(cierres.length), factores: [],
    };
  }

  const shocks = detectarShocks(rendimientos, sigmaDiaria);
  const rendimientosLimpios = rendimientos.filter((r) => Math.abs(r / sigmaDiaria) <= 4);

  const kalman = opciones.sinKalman
    ? { deriva: derivaEncogida(rendimientosLimpios), adaptativa: false }
    : derivaKalman(rendimientosLimpios, sigmaDiaria);
  const derivaBase = kalman.adaptativa ? kalman.deriva : derivaEncogida(rendimientosLimpios);

  const { factores, inclinacion } = opciones.sinFactores
    ? { factores: [], inclinacion: 0 }
    : analizarFactores(cierres);
  const deriva = derivaBase + inclinacion * sigmaDiaria * 0.5;

  const gl = gradosLibertad(rendimientos);

  const h = horizonteDias;
  const mc = simularMonteCarlo({
    precioActual: ultimo, deriva, garch, sigmaDiaria, gl,
    horizonte: h, caminos: opciones.caminos || 10000,
  });

  const probSube = mc.finales.filter((v) => v > ultimo).length / mc.caminos;
  const pct = (p) => percentil(mc.finales, p);

  const trayectoria = mc.porDia.map((dia, i) => ({
    dia: i + 1,
    mediana: Number(percentil(dia, 0.5).toFixed(4)),
    p05: Number(percentil(dia, 0.05).toFixed(4)),
    p10: Number(percentil(dia, 0.10).toFixed(4)),
    p25: Number(percentil(dia, 0.25).toFixed(4)),
    p75: Number(percentil(dia, 0.75).toFixed(4)),
    p90: Number(percentil(dia, 0.90).toFixed(4)),
    p95: Number(percentil(dia, 0.95).toFixed(4)),
    esperado: Number(percentil(dia, 0.5).toFixed(4)),
    min80: Number(percentil(dia, 0.10).toFixed(4)),
    max80: Number(percentil(dia, 0.90).toFixed(4)),
    min95: Number(percentil(dia, 0.025).toFixed(4)),
    max95: Number(percentil(dia, 0.975).toFixed(4)),
  }));

  const r95 = { min: pct(0.025), max: pct(0.975) };
  const r80 = { min: pct(0.10), max: pct(0.90) };
  const r50 = { min: pct(0.25), max: pct(0.75) };
  const margenError = ((r95.max - r95.min) / 2 / ultimo) * 100;

  return {
    disponible: true,
    horizonteDias: h,
    precioActual: Number(ultimo.toFixed(4)),
    probabilidadSube: Number(probSube.toFixed(4)),
    probabilidadBaja: Number((1 - probSube).toFixed(4)),
    esperado: Number(pct(0.5).toFixed(4)),

    rango50: { min: Number(r50.min.toFixed(4)), max: Number(r50.max.toFixed(4)) },
    rango80: { min: Number(r80.min.toFixed(4)), max: Number(r80.max.toFixed(4)) },
    rango95: { min: Number(r95.min.toFixed(4)), max: Number(r95.max.toFixed(4)) },
    margenErrorPct: Number(margenError.toFixed(2)),

    histograma: construirHistograma(mc.finales),
    trayectoria,

    probabilidades: {
      subeMasDe1pct: Number((mc.finales.filter((v) => v > ultimo * 1.01).length / mc.caminos).toFixed(4)),
      subeMasDe3pct: Number((mc.finales.filter((v) => v > ultimo * 1.03).length / mc.caminos).toFixed(4)),
      bajaMasDe1pct: Number((mc.finales.filter((v) => v < ultimo * 0.99).length / mc.caminos).toFixed(4)),
      bajaMasDe3pct: Number((mc.finales.filter((v) => v < ultimo * 0.97).length / mc.caminos).toFixed(4)),
    },

    modelo: {
      volatilidad: modeloVol,
      deriva: kalman.adaptativa ? 'Filtro de Kalman' : 'Encogimiento simple',
      distribucion: gl >= 200 ? 'Normal' : `t de Student (${gl.toFixed(1)} g.l.)`,
      simulaciones: mc.caminos,
      garch: garch
        ? {
            alfa: Number(garch.alfa.toFixed(4)),
            beta: Number(garch.beta.toFixed(4)),
            persistencia: Number(garch.persistencia.toFixed(4)),
          }
        : null,
    },

    shocks: {
      detectados: shocks.total,
      recientes: shocks.recientes,
      regimenAlterado: shocks.regimenAlterado,
      ultimos: shocks.ultimos,
    },

    volatilidadDiariaPct: Number((sigmaDiaria * 100).toFixed(3)),
    factores,
    confianza: nivelConfianza(cierres.length),
    diasHistoria: cierres.length,
    generadoEn: Date.now(),
  };
}

function backtest(cierres, horizonteDias = 7, minHistoria = 14) {
  let aciertos = 0, total = 0, dentro95 = 0, dentro80 = 0;
  let sumaErrorCuad = 0, sumaErrorAbs = 0;
  let sumaErrorCuadIngenuo = 0, sumaErrorAbsIngenuo = 0;

  for (let i = minHistoria; i - 1 + horizonteDias < cierres.length; i++) {
    const historia = cierres.slice(0, i);
    const p = calcularPronostico(historia, horizonteDias, { minimo: minHistoria, caminos: 1200 });
    if (!p.disponible || p.sinMovimiento) continue;

    const base = cierres[i - 1].valor;
    const real = cierres[i - 1 + horizonteDias].valor;

    if ((real > base) === (p.probabilidadSube > 0.5)) aciertos++;
    if (real >= p.rango95.min && real <= p.rango95.max) dentro95++;
    if (real >= p.rango80.min && real <= p.rango80.max) dentro80++;

    const err = p.esperado - real;
    sumaErrorCuad += err * err;
    sumaErrorAbs += Math.abs(err);

    const errIngenuo = base - real;
    sumaErrorCuadIngenuo += errIngenuo * errIngenuo;
    sumaErrorAbsIngenuo += Math.abs(errIngenuo);

    total++;
  }

  if (total < 5) {
    return { disponible: false, motivo: 'Aún no hay suficiente historia para medir la precisión.' };
  }

  const rmse = Math.sqrt(sumaErrorCuad / total);
  const mae = sumaErrorAbs / total;
  const rmseIngenuo = Math.sqrt(sumaErrorCuadIngenuo / total);
  const maeIngenuo = sumaErrorAbsIngenuo / total;
  const theil = rmseIngenuo > 0 ? rmse / rmseIngenuo : null;
  const precision = aciertos / total;

  let veredicto;
  if (theil !== null && theil < 0.97 && precision >= 0.56) {
    veredicto = 'El modelo le gana al pronóstico ingenuo y acierta más que el azar';
  } else if (theil !== null && theil < 1) {
    veredicto = 'El modelo se acerca algo más que suponer que el precio no cambia';
  } else {
    veredicto = 'El modelo NO supera al pronóstico ingenuo: tomar con mucha cautela';
  }

  return {
    disponible: true,
    predicciones: total,
    aciertos,
    precision: Number(precision.toFixed(4)),
    rmse: Number(rmse.toFixed(4)),
    mae: Number(mae.toFixed(4)),
    rmsePct: Number(((rmse / promedio(cierres.map((c) => c.valor))) * 100).toFixed(3)),
    maePct: Number(((mae / promedio(cierres.map((c) => c.valor))) * 100).toFixed(3)),
    rmseIngenuo: Number(rmseIngenuo.toFixed(4)),
    maeIngenuo: Number(maeIngenuo.toFixed(4)),
    theil: theil !== null ? Number(theil.toFixed(4)) : null,
    mejorQueIngenuo: theil !== null && theil < 1,
    coberturaRango95: Number((dentro95 / total).toFixed(4)),
    coberturaRango80: Number((dentro80 / total).toFixed(4)),
    veredicto,
  };
}

function calibrarFactoresRidge(cierres, horizonte = 7, lambda = 1.0) {
  const MINIMO = 200;
  if (!Array.isArray(cierres) || cierres.length < MINIMO) {
    return {
      disponible: false,
      motivo: `La calibración automática necesita ${MINIMO} días (hay ${cierres?.length || 0}). Mientras tanto se usan pesos acotados y conservadores.`,
      diasFaltantes: MINIMO - (cierres?.length || 0),
    };
  }

  const X = [], y = [];
  for (let i = 40; i - 1 + horizonte < cierres.length; i++) {
    const hist = cierres.slice(0, i);
    const vals = hist.map((c) => c.valor);
    const n = vals.length;
    const r = calcularRendimientos(vals);

    const momentum = (promedio(vals.slice(-7)) - promedio(vals.slice(-30))) / promedio(vals.slice(-30));
    const conOf = hist.filter((c) => c.oficial > 0);
    const brechas = conOf.map((c) => (c.valor - c.oficial) / c.oficial);
    const zBrecha = brechas.length > 10
      ? (brechas[brechas.length - 1] - promedio(brechas)) / (Math.sqrt(varianzaMuestral(brechas)) || 1e-6)
      : 0;
    const acel = promedio(r.slice(-5)) - promedio(r.slice(-14, -5));

    X.push([momentum, zBrecha, acel]);
    y.push(Math.log(cierres[i - 1 + horizonte].valor / vals[n - 1]));
  }

  const k = X[0].length;
  const medias = [], desvs = [];
  for (let j = 0; j < k; j++) {
    const col = X.map((f) => f[j]);
    medias.push(promedio(col));
    desvs.push(Math.sqrt(varianzaMuestral(col)) || 1);
  }
  const Xs = X.map((f) => f.map((v, j) => (v - medias[j]) / desvs[j]));

  const A = Array.from({ length: k }, () => new Array(k).fill(0));
  const b = new Array(k).fill(0);
  for (let j = 0; j < k; j++) {
    for (let l = 0; l < k; l++) A[j][l] = Xs.reduce((s, f) => s + f[j] * f[l], 0);
    A[j][j] += lambda;
    b[j] = Xs.reduce((s, f, i) => s + f[j] * y[i], 0);
  }
  for (let j = 0; j < k; j++) {
    let piv = A[j][j];
    if (Math.abs(piv) < 1e-12) piv = 1e-12;
    for (let l = j; l < k; l++) A[j][l] /= piv;
    b[j] /= piv;
    for (let m = 0; m < k; m++) {
      if (m === j) continue;
      const f = A[m][j];
      for (let l = j; l < k; l++) A[m][l] -= f * A[j][l];
      b[m] -= f * b[j];
    }
  }

  return {
    disponible: true,
    pesos: { momentum: b[0], brecha: b[1], aceleracion: b[2] },
    observaciones: X.length,
    lambda,
    nota: 'Pesos estimados con regresión ridge sobre la historia disponible.',
  };
}

module.exports = {
  calcularPronostico,
  backtest,
  calibrarFactoresRidge,
  _internos: {
    volatilidadEWMA, ajustarGARCH, varianzaAcumuladaGARCH,
    derivaKalman, derivaEncogida, detectarShocks,
    simularMonteCarlo, construirHistograma,
    normalCDF, normalInversa, tInversa, gradosLibertad,
    curtosisExceso, calcularRendimientos, percentil,
  },
};
