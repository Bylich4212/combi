// =====================================================================
// LA MEMORIA RÁPIDA DEL SERVIDOR
// ---------------------------------------------------------------------
// Como nuestro servidor Express está SIEMPRE encendido, podemos guardar
// los precios aquí (en la RAM) en vez de preguntarle a Redis a cada rato.
//
// ¿Por qué importa? Upstash gratis permite ~16.000 operaciones al día.
// Si cada visitante y cada minuto consultaran Redis, lo agotaríamos.
// Con esta memoria: los visitantes leen de aquí (gratis e instantáneo)
// y Redis solo guarda lo que debe SOBREVIVIR a un reinicio del servidor
// (tasas manuales, usuarios premium, alertas, histórico).
// =====================================================================
module.exports = {
  rates: null,   // las últimas cotizaciones (lo que ve la página)
  history: [],   // puntos del gráfico: { time, value }
  historyDaily: [], // puntos diarios para el motor de pronóstico (USD/BOB)
  avisados: new Map(), // anti-spam de alertas: chatId -> hora del último aviso
};
