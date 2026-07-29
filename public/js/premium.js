// Al hacer clic: armar el paquete (email + foto) y mandarlo al servidor
    const boton = document.getElementById('enviar');
    const mensaje = document.getElementById('mensaje');

    boton.addEventListener('click', async () => {
      const email = document.getElementById('email').value.trim();
      const foto = document.getElementById('foto').files[0];

      // Validar antes de enviar
      if (!email.includes('@')) {
        mensaje.textContent = 'Escribe un email válido.';
        mensaje.className = 'error';
        return;
      }
      if (!foto) {
        mensaje.textContent = 'Selecciona la foto de tu comprobante.';
        mensaje.className = 'error';
        return;
      }

      boton.disabled = true;
      boton.textContent = 'Enviando...';
      mensaje.textContent = '';

      try {
        const paquete = new FormData();
        paquete.append('email', email);
        paquete.append('comprobante', foto);

        const res = await fetch('/api/premium', { method: 'POST', body: paquete });
        const data = await res.json();

        mensaje.textContent = data.message;
        mensaje.className = res.ok ? 'ok' : 'error';

        if (res.ok) {
          // Recordar el email en este navegador: cuando el admin apruebe,
          // la página principal dejará de mostrar anuncios automáticamente
          localStorage.setItem('cambi_email', email.toLowerCase());
        }
      } catch {
        mensaje.textContent = 'Error de conexión. Intenta de nuevo.';
        mensaje.className = 'error';
      }

      boton.disabled = false;
      boton.textContent = 'Enviar comprobante';
    });