const f = require('./lib/fuentes');

async function testAll() {
  console.log('🔍 Iniciando verificación de APIs...\n');
  
  const fuentesPrincipales = [
    { nombre: 'BCB (Oficial)', funcion: f.fetchBCB },
    { nombre: 'Paralelo P2P (paralelo.bo)', funcion: f.fetchParalelo },
    { nombre: 'Binance USDT (P2P API)', funcion: f.fetchBinanceUSDT },
    { nombre: 'Binance USDC (P2P API)', funcion: f.fetchBinanceUSDC }
  ];

  let baseUsdt = 11.61;
  let baseUsdc = 11.58;

  for (const fuente of fuentesPrincipales) {
    process.stdout.write(`Probando ${fuente.nombre}... `);
    const inicio = Date.now();
    try {
      const resultado = await fuente.funcion();
      const tiempo = Date.now() - inicio;
      
      if (fuente.nombre.includes('USDT') && resultado?.buy) baseUsdt = resultado.buy;
      if (fuente.nombre.includes('USDC') && resultado?.buy) baseUsdc = resultado.buy;
      
      if (resultado && resultado.buy > 0) {
        console.log(`✅ OK (${tiempo}ms)`);
        console.log(`   └─ Compra: ${resultado.buy} | Venta: ${resultado.sell}`);
      } else {
        console.log(`⚠️ Advertencia: Respondió pero los valores son 0 o inválidos.`);
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }
    console.log('');
  }

  // Ahora probamos Takenos y Meru inyectando la base
  const fuentesDerivadas = [
    { nombre: 'Takenos', funcion: () => f.fetchTakenos(baseUsdt) },
    { nombre: 'Meru', funcion: () => f.fetchMeru(baseUsdc) }
  ];

  for (const fuente of fuentesDerivadas) {
    process.stdout.write(`Probando ${fuente.nombre}... `);
    const inicio = Date.now();
    try {
      const resultado = await fuente.funcion();
      const tiempo = Date.now() - inicio;
      if (resultado && resultado.buy > 0) {
        console.log(`✅ OK (${tiempo}ms)`);
        console.log(`   └─ Compra: ${resultado.buy} | Venta: ${resultado.sell}`);
      } else {
        console.log(`⚠️ Advertencia: Respondió pero los valores son 0 o inválidos.`);
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }
    console.log('');
  }
  
  console.log('✅ Verificación completada.');
}

testAll();
