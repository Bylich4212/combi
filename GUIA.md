# 🚀 GUÍA: LANZA CAMBI HOY (versión Node.js + Express)
### Todo en JavaScript puro. Tiempo total: 1 a 2 horas. Todo gratis.

---

## ¿Qué es cada archivo? (el proyecto entero son 6 archivos de código)

```
cambi/
├── server.js            ← EL CORAZÓN: enciende la web, el bot y el actualizador
├── lib/
│   ├── db.js            ← la "memoria" (Redis de Upstash)
│   ├── fuentes.js       ← de dónde salen los precios (6 fuentes)
│   ├── actualizador.js  ← se ejecuta cada minuto: actualiza precios y alertas
│   └── bot.js           ← el bot de Telegram (comandos /dolar, /alerta, etc.)
└── public/
    ├── index.html       ← la página que ve la gente
    ├── premium.html     ← la página de pago por QR
    └── qr-pago.png      ← ⚠️ REEMPLAZA con la captura de TU QR bancario
```

## Las 6 fuentes de precios

| Fuente | ¿Cómo se actualiza? |
|---|---|
| Oficial BCB | 🤖 Sola, cada minuto (DolarApi.com) |
| Paralelo P2P | 🤖 Sola, cada minuto (paralelo.bo: mediana de 5 exchanges) |
| Takenos | ✍️ Tú: `/settakenos 10.65 10.60` al bot |
| Meru | ✍️ Tú: `/setmeru 10.55 10.50` al bot |

Takenos y Meru solo muestran su tasa dentro de sus apps (no tienen API
pública), por eso las actualizas tú: abres la app, ves la tasa, y le
mandas un mensaje a tu bot. 10 segundos al día.

---

## PARTE 1 — Solo 3 cuentas (15 min, gratis)

1. **GitHub** (github.com) → donde vive tu código
2. **Upstash** (upstash.com) → la memoria que guarda los precios
3. **Render** (render.com) → donde vive tu página (regístrate CON GitHub)

Y en Telegram: háblale a **@BotFather** → `/newbot` → nombre Cambi →
usuario `cambi_bot` (o el que esté libre). Guarda el token que te da.

## PARTE 2 — Las 4 llaves (10 min)

Copia el archivo `.env.example` como `.env` y llena estos 4 valores:

1. **UPSTASH_REDIS_REST_URL** y **UPSTASH_REDIS_REST_TOKEN**:
   en Upstash → Create Database → pestaña "REST API" → copia ambos.
2. **TELEGRAM_BOT_TOKEN**: el que te dio @BotFather.
3. **ADMIN_CHAT_ID**: mándale "hola" a tu bot nuevo y abre en el navegador
   `https://api.telegram.org/bot<TU_TOKEN>/getUpdates`
   → busca `"chat":{"id":123456789` → ese número es tu ID.

¡Eso es todo! No hay Firebase, no hay Google Cloud, no hay OAuth.

## PARTE 3 — Probar en tu computadora (10 min)

Instala Node.js (nodejs.org, botón verde LTS). Luego en la carpeta:

```
npm install     (descarga las 5 piezas que usa el proyecto)
npm start       (enciende TODO: web + bot + actualizador)
```

Verás en la consola:
```
✅ Cambi corriendo en http://localhost:3000
🤖 Bot de Telegram encendido
⏰ Actualizador automático programado (cada minuto)
```

- Abre http://localhost:3000 → la página con precios (BCB, Binance y
  Airtm ya salen solos; los manuales muestran valores de arranque).
- Mándale `/dolar` a tu bot → responde al instante.
- Mándale `/settakenos 10.65 10.60` → refresca la web al minuto: cambió.

## PARTE 4 — Personalizar (10 min)

1. `public/qr-pago.png` → reemplaza con la captura del QR de tu banco.
2. `public/premium.html` → busca "Banco XYZ" y pon tus datos reales.
3. `public/index.html` → busca `t.me/cambi_bot` y pon el usuario de TU bot.
4. (Cuando AdSense te apruebe) → reemplaza `ca-pub-XXXX` en index.html
   y el ID en `public/ads.txt`.

## PARTE 5 — Publicar en internet HOY (15 min)

1. Sube la carpeta a GitHub (repositorio nuevo → "uploading an existing
   file" → arrastra todo MENOS node_modules y .env).
2. En **Render**: New → Web Service → conecta tu repositorio.
   - Build command: `npm install`
   - Start command: `npm start`
   - Plan: **Free**
   - En "Environment" agrega las 4 variables de tu `.env`.
3. Deploy. En 3 minutos tienes tu página EN VIVO en
   `https://cambi.onrender.com` (o el nombre que elijas).
   **No necesitas comprar dominio para lanzar hoy.**

⚠️ **Un detalle del plan gratis de Render**: si nadie visita la página
en 15 minutos, se "duerme" y la primera visita tarda ~30 seg en
despertarla (y el actualizador se pausa mientras duerme). Solución
gratis en 3 minutos: crea una cuenta en **cron-job.org** y programa que
visite `https://tucambi.onrender.com/api/rates` cada 10 minutos.
Así tu página nunca duerme y los precios siempre están frescos.

## PARTE 6 — Primer día en vivo (2 min)

Desde tu Telegram, manda las tasas de arranque (míralas en tus apps):

```
/setparalelo 10.70 10.75
/settakenos 10.65 10.60
/setmeru 10.55 10.50
```

Prueba `/dolar` y entra a tu página. **Estás en vivo.** 🇧🇴🎉

---

## Tu rutina diaria (2 min/día)

- Mañana: mirar Takenos, Meru y el precio de la calle → mandar los 3
  comandos `/set...` al bot.
- Cuando llegue un comprobante a tu Telegram: verificar el pago en tu
  banco → responder `/aprobar <id>`. El usuario queda sin anuncios 31 días.
- Todo lo demás (BCB, Binance, Airtm, gráfico, alertas) es automático.

## ¿Dominio propio después? (opcional)

Compra el dominio (~$10/año) → Render → Settings → Custom Domain →
te dice qué registro DNS crear en tu proveedor. Listo en 10 minutos.

## ¿Cómo crece esto? Ideas rápidas

- Comparte tu bot en grupos de WhatsApp/Telegram de finanzas: el comando
  /dolar es adictivo y gratis de compartir.
- TikTok/Instagram: captura diaria de la brecha con el link.
- El comando /alerta hace que la gente vuelva sola.
