// =================================================================
    // JAVASCRIPT DE LA PÁGINA
    // 1. Pide /api/rates y dibuja las tarjetas + calculadora
    // 2. Pide /api/history y dibuja el gráfico
    // 3. Repite el paso 1 cada 60 segundos
    // =================================================================

    let datos = null; // aquí guardamos las últimas cotizaciones

    const fmt = (n) => (n ? Number(n).toFixed(2) : '--');

    // ---- Dibujar una tarjeta con compra y venta ----
    function tarjetaHTML(titulo, r, destacada, claveGrafico) {
      const click = claveGrafico ? `onclick="cambiarFuenteGrafico('${claveGrafico}', '${titulo}')" title="Haz clic para ver ${titulo} en el gráfico"` : '';
      return `
        <div class="tarjeta glass ${destacada ? 'destacada' : ''}" ${click}>
          <h3>${titulo}</h3>
          <div class="fila"><span>Compra</span><span class="valor">${fmt(r?.buy)}</span></div>
          <div class="fila"><span>Venta</span><span class="valor">${fmt(r?.sell)}</span></div>
          ${claveGrafico ? `<span class="badge-grafico">📊 Ver en gráfico →</span>` : ''}
        </div>`;
    }

    // ---- Dibujar todo con los datos recibidos ----
    function dibujar() {
      const d = datos;

      // Las tarjetas principales
      document.getElementById('tarjetas').innerHTML =
        tarjetaHTML('Oficial BCB', d.bcb) +
        tarjetaHTML('P2P USDT', d.paralelo, true, 'paralelo') +
        tarjetaHTML('P2P USDC', d.binanceUsdc, true, 'binanceUsdc') +
        tarjetaHTML('Precio Calle', d.bolidolar, false, 'bolidolar') +
        tarjetaHTML('Takenos', d.takenos, false, 'takenos') +
        tarjetaHTML('Meru', d.meru, false, 'meru');

      // La brecha oficial vs mercado
      const mercado = d.binanceUsdt?.buy || d.paralelo?.buy;
      if (mercado && d.bcb?.sell) {
        const brecha = ((mercado - d.bcb.sell) / d.bcb.sell) * 100;
        document.getElementById('brecha').hidden = false;
        document.getElementById('brecha-texto').textContent = 'Brecha oficial vs mercado: ' + brecha.toFixed(1) + '%';
        document.getElementById('brecha-barra').style.width = Math.min(Math.abs(brecha), 100) + '%';
      }

      // Fecha de actualización
      document.getElementById('actualizado').textContent =
        'Actualizado: ' + new Date(d.updatedAt).toLocaleTimeString('es-BO');

      calcular(); // refrescar la calculadora
    }

    // ---- La calculadora: multiplica y ordena de mejor a peor ----
    function calcular() {
      if (!datos) return;
      const monto = Math.max(0, Number(document.getElementById('monto').value) || 0);
      const opciones = [
        { nombre: 'P2P USDT', valor: datos.paralelo?.buy },
        { nombre: 'P2P USDC', valor: datos.binanceUsdc?.buy },
        { nombre: 'Precio Calle', valor: datos.bolidolar?.buy },
        { nombre: 'Takenos', valor: datos.takenos?.buy },
        { nombre: 'Meru', valor: datos.meru?.buy },
        { nombre: 'Oficial BCB', valor: datos.bcb?.sell },
      ]
        .filter((o) => o.valor > 0)          // ocultar fuentes sin datos
        .sort((a, b) => b.valor - a.valor);  // la mejor tasa primero

      document.getElementById('calc-resultados').innerHTML = opciones
        .map((o, i) => `
          <div class="calc-fila ${i === 0 ? 'mejor' : ''}">
            <span>${o.nombre}${i === 0 ? ' 🏆' : ''}</span>
            <span class="num">${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(monto * o.valor)} BOB</span>
          </div>`)
        .join('');
    }
    document.getElementById('monto').addEventListener('input', calcular);

    // ---- Pedir las cotizaciones al servidor ----
    async function cargarRates() {
      try {
        const res = await fetch('/api/rates');
        if (!res.ok) return;
        datos = await res.json();
        dibujar();
      } catch (e) { console.error(e); }
    }

    // ---- El gráfico de velas ----
    let grafico = null, serie = null, fuenteGrafico = 'paralelo';

    async function cargarGrafico() {
      try {
        const res = await fetch('/api/history?fuente=' + fuenteGrafico);
        const velas = await res.json();
        const cont = document.getElementById('grafico');
        if (!Array.isArray(velas) || velas.length === 0) {
          cont.innerHTML =
            '<p class="sub" style="padding:16px">El gráfico se irá llenando con el histórico del dólar.</p>';
          return;
        }
        if (!grafico) {
          cont.innerHTML = ''; // Limpiar si antes había un texto
          const oscuro = matchMedia('(prefers-color-scheme: dark)').matches;
          grafico = LightweightCharts.createChart(cont, {
            width: cont.clientWidth, height: 280,
            layout: { background: { color: 'transparent' }, textColor: oscuro ? '#cbd5e1' : '#64748b' },
            grid: { vertLines: { color: 'rgba(150,150,150,.1)' }, horzLines: { color: 'rgba(150,150,150,.1)' } },
            timeScale: { timeVisible: true, secondsVisible: false },
          });
          serie = grafico.addCandlestickSeries({
            upColor: '#26a69a', downColor: '#ef5350', borderVisible: false,
            wickUpColor: '#26a69a', wickDownColor: '#ef5350',
          });
          addEventListener('resize', () => grafico.applyOptions({ width: cont.clientWidth }));
        }
        serie.setData(velas);
        grafico.timeScale().fitContent();
      } catch (e) { console.error(e); }
    }

    function cambiarFuenteGrafico(nuevaFuente, titulo) {
      fuenteGrafico = nuevaFuente;
      const nombres = { binanceUsdt: 'Binance USDT / BOB', binanceUsdc: 'Binance USDC / BOB', paralelo: 'Paralelo P2P / BOB', takenos: 'Takenos / BOB', meru: 'Meru / BOB' };
      document.getElementById('grafico-titulo').textContent = '📈 Gráfico — ' + (titulo || nombres[nuevaFuente] || nuevaFuente);
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('activo'));
      const tabActual = document.getElementById('tab-' + nuevaFuente);
      if (tabActual) tabActual.classList.add('activo');
      
      document.getElementById('caja-grafico').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      cargarGrafico();
    }

    // ---- ¿El visitante es premium? Entonces esconder el anuncio ----
    async function revisarPremium() {
      const email = localStorage.getItem('cambi_email');
      if (!email) return;
      try {
        const res = await fetch('/api/premium/status?email=' + encodeURIComponent(email));
        const d = await res.json();
        if (d.premium) {
          document.getElementById('anuncio').remove();
          document.getElementById('link-premium').textContent = 'Premium activo ⭐';
        }
      } catch (err) {
        console.error('Error cargando gráfico:', err);
      }
    }

    // ---- MOTOR DE PRONÓSTICO (PREMIUM) ----
    let chartPronostico = null;
    
    async function cargarPronostico() {
      const resultDiv = document.getElementById('pronostico-resultado');
      const loadDiv = document.getElementById('pronostico-cargando');
      
      resultDiv.style.display = 'none';
      loadDiv.style.display = 'block';
      
      try {
        const res = await fetch('/api/pronostico');
        const data = await res.json();
        
        if (!data || !data.disponible) {
          loadDiv.textContent = '❌ ' + (data.error || data.motivo || 'Error cargando pronóstico');
          return;
        }
        
        loadDiv.style.display = 'none';
        resultDiv.style.display = 'block';
        
        document.getElementById('p-actual').textContent = data.precioActual;
        document.getElementById('p-subida').textContent = (data.probabilidadSube * 100).toFixed(1) + '%';
        document.getElementById('p-esperado').textContent = data.esperado;
        document.getElementById('p-rango').textContent = data.rango95.min + ' - ' + data.rango95.max;
        
        // Dibujar el Fan Chart con Chart.js
        dibujarChartPronostico(data);
      } catch (e) {
        loadDiv.textContent = '❌ Error de conexión';
      }
    }
    
    function dibujarChartPronostico(data) {
      const ctx = document.getElementById('grafico-pronostico').getContext('2d');
      if (chartPronostico) chartPronostico.destroy();
      
      const labels = ['Hoy', ...data.trayectoria.map(t => 'Día ' + t.dia)];
      
      const medians = [data.precioActual, ...data.trayectoria.map(t => t.mediana)];
      const p95_min = [data.precioActual, ...data.trayectoria.map(t => t.p05)];
      const p95_max = [data.precioActual, ...data.trayectoria.map(t => t.p95)];
      const p50_min = [data.precioActual, ...data.trayectoria.map(t => t.p25)];
      const p50_max = [data.precioActual, ...data.trayectoria.map(t => t.p75)];
      
      chartPronostico = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: '95% Max',
              data: p95_max,
              borderColor: 'transparent',
              backgroundColor: 'transparent',
              pointRadius: 0,
              fill: false
            },
            {
              label: 'Rango 95%',
              data: p95_min,
              borderColor: 'transparent',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              pointRadius: 0,
              fill: '-1' // Rellena hasta el dataset anterior (95% Max)
            },
            {
              label: '50% Max',
              data: p50_max,
              borderColor: 'transparent',
              backgroundColor: 'transparent',
              pointRadius: 0,
              fill: false
            },
            {
              label: 'Rango 50%',
              data: p50_min,
              borderColor: 'transparent',
              backgroundColor: 'rgba(59, 130, 246, 0.3)',
              pointRadius: 0,
              fill: '-1' // Rellena hasta el dataset anterior (50% Max)
            },
            {
              label: 'Valor Esperado',
              data: medians,
              borderColor: '#2563eb',
              borderWidth: 3,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: '#2563eb',
              pointRadius: 4,
              pointHoverRadius: 6,
              fill: false,
              tension: 0.2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              titleFont: { size: 14, family: 'Outfit' },
              bodyFont: { size: 13, family: 'Outfit' },
              padding: 12,
              callbacks: {
                label: function(context) {
                  if (context.dataset.label.includes('Max') || context.dataset.label.includes('Min')) {
                    return null; // Ocultar las líneas invisibles del tooltip
                  }
                  if (context.dataset.label === 'Valor Esperado') {
                    const idx = context.dataIndex;
                    const vE = medians[idx].toFixed(2);
                    const r50m = p50_min[idx].toFixed(2);
                    const r50M = p50_max[idx].toFixed(2);
                    const r95m = p95_min[idx].toFixed(2);
                    const r95M = p95_max[idx].toFixed(2);
                    return [
                      `🎯 Esperado: ${vE} BOB`,
                      `🔹 Rango 50%: ${r50m} - ${r50M}`,
                      `🌫️ Rango 95%: ${r95m} - ${r95M}`
                    ];
                  }
                  return null;
                }
              }
            }
          },
          scales: {
            x: { 
              grid: { color: 'rgba(150, 150, 150, 0.1)' },
              ticks: { font: { family: 'Outfit' } }
            },
            y: { 
              grid: { color: 'rgba(150, 150, 150, 0.1)' },
              ticks: { 
                font: { family: 'Outfit' },
                callback: function(value) { return value.toFixed(2) + ' BOB'; }
              }
            }
          }
        }
      });
    }

    // ---- Encender todo ----
    cargarRates();
    cargarGrafico();
    revisarPremium();
    setInterval(cargarRates, 60000);   // repetir cada 60 segundos
    setInterval(cargarGrafico, 60000);
    
    // Cargar pronóstico inicial
    setTimeout(cargarPronostico, 1500);

    try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
// =================================================================
// AUTHENTICATION LOGIC
// =================================================================
let authMode = 'login'; // 'login' or 'register'

function checkAuth() {
  const token = localStorage.getItem('cambi_token');
  const userStr = localStorage.getItem('cambi_user');
  
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      document.getElementById('auth-buttons').style.display = 'none';
      document.getElementById('user-info').style.display = 'flex';
      document.getElementById('user-email').textContent = user.email;
    } catch(e) {
      logout();
    }
  } else {
    document.getElementById('auth-buttons').style.display = 'flex';
    document.getElementById('user-info').style.display = 'none';
  }
}

function openAuthModal(mode) {
  authMode = mode;
  document.getElementById('auth-modal').hidden = false;
  document.getElementById('auth-error').style.display = 'none';
  document.getElementById('auth-email').value = '';
  document.getElementById('auth-password').value = '';
  
  if (mode === 'login') {
    document.getElementById('auth-title').textContent = 'Iniciar Sesión';
    document.getElementById('auth-submit-btn').textContent = 'Ingresar';
  } else {
    document.getElementById('auth-title').textContent = 'Crear Cuenta';
    document.getElementById('auth-submit-btn').textContent = 'Registrarse';
  }
}

function closeAuthModal() {
  document.getElementById('auth-modal').hidden = true;
}

async function handleAuth(event) {
  event.preventDefault();
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  const errorEl = document.getElementById('auth-error');
  
  errorEl.style.display = 'none';
  const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
  
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      errorEl.textContent = data.message || 'Error en la autenticación';
      errorEl.style.display = 'block';
      return;
    }
    
    // Guardar en localStorage
    localStorage.setItem('cambi_token', data.token);
    localStorage.setItem('cambi_user', JSON.stringify(data.user));
    
    closeAuthModal();
    checkAuth();
    
  } catch (err) {
    errorEl.textContent = 'Error de conexión con el servidor';
    errorEl.style.display = 'block';
  }
}

function logout() {
  localStorage.removeItem('cambi_token');
  localStorage.removeItem('cambi_user');
  checkAuth();
}

// Inicializar la vista al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});

// =================================================================
// P2P MARKET LOGIC
// =================================================================

function openP2pModal() {
  const token = localStorage.getItem('cambi_token');
  if (!token) {
    alert('Debes iniciar sesión para publicar un anuncio.');
    openAuthModal('login');
    return;
  }
  document.getElementById('p2p-modal').hidden = false;
  document.getElementById('p2p-error').style.display = 'none';
  document.getElementById('p2p-amount').value = '';
  document.getElementById('p2p-rate').value = '';
  document.getElementById('p2p-desc').value = '';
  document.getElementById('p2p-phone').value = '';
}

function closeP2pModal() {
  document.getElementById('p2p-modal').hidden = true;
}

async function handleP2pSubmit(event) {
  event.preventDefault();
  const token = localStorage.getItem('cambi_token');
  const errorEl = document.getElementById('p2p-error');
  errorEl.style.display = 'none';
  
  if (!token) {
    errorEl.textContent = 'Debes iniciar sesión.';
    errorEl.style.display = 'block';
    return;
  }
  
  const payload = {
    ad_type: document.getElementById('p2p-type').value,
    amount: document.getElementById('p2p-amount').value,
    exchange_rate: document.getElementById('p2p-rate').value,
    phone_number: document.getElementById('p2p-phone').value,
    description: document.getElementById('p2p-desc').value,
  };
  
  try {
    const res = await fetch('/api/p2p', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      errorEl.textContent = data.message || 'Error publicando anuncio';
      errorEl.style.display = 'block';
      return;
    }
    
    closeP2pModal();
    loadP2pAds(); // Recargar lista
    alert('¡Anuncio publicado con éxito!');
  } catch(err) {
    errorEl.textContent = 'Error de conexión';
    errorEl.style.display = 'block';
  }
}

async function loadP2pAds() {
  const container = document.getElementById('p2p-lista');
  const cargando = document.getElementById('p2p-cargando');
  if(!container) return; // Si no estamos en el index
  
  try {
    const res = await fetch('/api/p2p');
    const ads = await res.json();
    
    cargando.style.display = 'none';
    
    if (!ads || ads.length === 0) {
      container.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: var(--gris);">Todavía no hay anuncios. ¡Sé el primero en publicar!</p>';
      return;
    }
    
    container.innerHTML = '';
    
    ads.forEach(ad => {
      const isCompra = ad.ad_type === 'COMPRA';
      const badgeClass = isCompra ? 'badge-compra' : 'badge-venta';
      const badgeText = isCompra ? 'QUIERE COMPRAR' : 'QUIERE VENDER';
      
      const card = document.createElement('div');
      card.className = 'p2p-card';
      
      // Enlace de WhatsApp
      let cleanPhone = String(ad.phone_number).replace(/[^0-9]/g, '');
      if (cleanPhone && !cleanPhone.startsWith('591')) cleanPhone = '591' + cleanPhone;
      const wpMsg = encodeURIComponent(`Hola, vi tu anuncio en Cambi. ¿Sigues ${isCompra ? 'comprando' : 'vendiendo'} $${ad.amount} a ${ad.exchange_rate} Bs?`);
      
      card.innerHTML = `
        <div class="p2p-header">
          <span class="badge ${badgeClass}">${badgeText}</span>
          <span style="font-size: 0.8rem; color: var(--gris);">${new Date(ad.created_at).toLocaleDateString()}</span>
        </div>
        <div>
          <div class="p2p-amount">$${parseFloat(ad.amount).toLocaleString('en-US')}</div>
          <div class="p2p-rate">a ${parseFloat(ad.exchange_rate).toFixed(2)} Bs</div>
        </div>
        ${ad.description ? `<div class="p2p-desc">"${ad.description}"</div>` : ''}
        <div class="p2p-footer">
          <div class="p2p-user">👤 ${ad.email.split('@')[0]}</div>
          <a href="https://wa.me/${cleanPhone}?text=${wpMsg}" target="_blank" class="btn-whatsapp">
            💬 Contactar
          </a>
        </div>
      `;
      
      container.appendChild(card);
    });
    
  } catch(err) {
    cargando.textContent = 'Error cargando anuncios.';
  }
}

// Cargar anuncios al iniciar la página
document.addEventListener('DOMContentLoaded', () => {
  loadP2pAds();
});
