// Fondo blanco para paginacambiada.html
(() => {
  function aplicarFondoBlanco() {
    try {
      const body = document.body;
      if (!body) return;
      // Fondo y color base (gris oscuro)
      body.style.background = '#1f1f1f';
      // Banda superior ligeramente más clara para distinguir
      body.style.backgroundImage = 'linear-gradient(to bottom, #2a2a2a 0, #2a2a2a 180px, #1f1f1f 180px, #1f1f1f 100%)';
      body.style.backgroundRepeat = 'no-repeat';
      body.style.color = '#f5f5f5';
      body.style.minHeight = '100vh';
      body.style.margin = body.style.margin || '0';

      // Intentar blanquear contenedor principal si existe
      const container = document.querySelector('.container');
      if (container) {
        container.style.background = '#262626';
        container.style.boxShadow = 'none';
        container.style.borderRadius = '0';
      }

      // Blanquear área de eventos
      const events = document.getElementById('events-container');
      if (events) {
        events.style.background = '#1f1f1f';
      }

      console.log('Fondo blanco aplicado.');
    } catch (e) {
      console.warn('No se pudo aplicar el fondo blanco:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', aplicarFondoBlanco);
  } else {
    aplicarFondoBlanco();
  }

  // Exponer utilidades
  window.__fondoBlanco = { aplicar: aplicarFondoBlanco };
})();



