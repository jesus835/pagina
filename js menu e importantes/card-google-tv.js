// Transforma cada .event al estilo Google TV (como la imagen), sin botón
(() => {
  function addStyles() {
    if (document.getElementById('gtv_card_styles')) return;
    const style = document.createElement('style');
    style.id = 'gtv_card_styles';
    style.textContent = `
      #events-container{display:block !important; max-width:100% !important; margin:14vh 0 0 0 !important}
      .gtv-card{background:#1e1e1e;color:#fff;border-radius:16px;padding:18px 20px;box-shadow:0 10px 30px rgba(0,0,0,.45);font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;width:100%;box-sizing:border-box;min-height:140px;margin:12px 0; text-align:center}
      .event[data-gtv-card]{background:#2a2a2a !important;border-radius:16px}
      .gtv-brand{color:#cfd4db;font:600 12px/1.2 system-ui,Segoe UI,Roboto,Arial;margin-bottom:8px;opacity:.95}
      .gtv-title{font:700 30px/1.2 system-ui,Segoe UI,Roboto,Arial;margin-bottom:8px}
      .gtv-desc{color:#cbd1d8;font:400 14px/1.45 system-ui,Segoe UI,Roboto,Arial;margin-bottom:0}
      .gtv-click{cursor:pointer}
      .gtv-click:hover{filter:brightness(1.02)}
    `;
    document.head.appendChild(style);
  }

  function parseEvent(el) {
    const nameEl = el.querySelector('.event-name');
    const raw = (nameEl?.textContent || '').replace(/\u00a0/g, ' ').trim();
    let time = '', league = '', title = raw;
    const dashIdx = raw.indexOf(' - ');
    if (dashIdx !== -1) {
      time = raw.slice(0, dashIdx).trim();
      title = raw.slice(dashIdx + 3).trim();
    }
    const pipeIdx = title.indexOf('|');
    if (pipeIdx !== -1) title = title.slice(0, pipeIdx).trim();
    const colonIdx = title.indexOf(':');
    if (colonIdx !== -1) {
      league = title.slice(0, colonIdx).trim();
      title = title.slice(colonIdx + 1).trim();
    }
    return { time, league, title };
  }

  function transformOne(el) {
    if (!el || el.dataset.gtvCard === '1') return;
    const { time, league, title } = parseEvent(el);
    const url = (el.querySelector('.iframe-link')?.value || '').trim();
    const statusEl = el.querySelector('.status-button');
    const isLive = !!(statusEl && statusEl.classList.contains('status-live'));
    const isFinished = !!(statusEl && statusEl.classList.contains('status-finished'));
    const statusText = (statusEl?.textContent || '').trim() || (isLive ? 'En Vivo' : (isFinished ? 'Finalizado' : ''));

    el.innerHTML = '';
    // Asegurar que el contenedor del evento ocupe ancho completo
    try { el.style.display = 'block'; el.style.width = '100%'; } catch(_) {}
    const card = document.createElement('div');
    card.className = 'gtv-card' + (url ? ' gtv-click' : '');
    card.innerHTML = `
      <div class="gtv-brand">Google TV</div>
      <div class="gtv-title">${title || 'Event'}</div>
      ${statusText ? `<div class="gtv-status"><span class="gtv-dot ${isFinished ? 'finished' : 'live'}"></span><span>${statusText}</span></div>` : ''}
      <div class="gtv-desc">${[league, time].filter(Boolean).join(' · ')}</div>
    `;
    if (url) {
      const open = () => window.open(url, '_blank');
      card.addEventListener('click', (e) => { e.stopPropagation(); open(); });
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
      card.tabIndex = 0;
      card.setAttribute('role', 'link');
      card.setAttribute('aria-label', `Open ${title}`);
    }
    el.appendChild(card);
    el.dataset.gtvCard = '1';
  }

  function transformAll() {
    document.querySelectorAll('#events-container .event').forEach(transformOne);
  }

  function start() {
    addStyles();
    transformAll();
    const target = document.getElementById('events-container') || document.body;
    const obs = new MutationObserver(() => setTimeout(transformAll, 50));
    obs.observe(target, { childList: true, subtree: true });
    window.__gtvCardsStop = () => obs.disconnect();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

