// ==UserScript==
// @name         Capturar M3U8 en todas las frames (Tampermonkey)
// @namespace    xz.capturador.m3u8
// @version      1.2.0
// @description  Detecta y copia URLs .m3u8 interceptando fetch/XHR/Performance tanto en la página principal como en iframes de terceros.
// @author       XuanZhi
// @match        *://*/*
// @run-at       document-start
// @allFrames    true
// @grant        GM_setClipboard
// @require      https://cdn.jsdelivr.net/npm/hls.js@1.5.8/dist/hls.min.js
// ==/UserScript==

(() => {
  if (window.__m3u8_sniffer_installed) return; // Evitar doble instalación
  window.__m3u8_sniffer_installed = true;

  const foundM3u8Urls = new Set();
  const scheduledAndroidCalls = new Map();
  let overlay;
  let overlayList;
  let overlayToggleBtn;
  let playerContainer;
  let playerVideo;
  let hlsInstance;

  function log(...args) {
    try { console.log('[M3U8]', ...args); } catch (_) {}
  }

  function scheduleAndroidPlayback(urlString) {
    try {
      if (!urlString) return;
      if (scheduledAndroidCalls.has(urlString)) return;
      const timeoutId = setTimeout(() => {
        try {
          if (window.AndroidInterface && typeof window.AndroidInterface.reproducirStream === 'function') {
            window.AndroidInterface.reproducirStream(urlString);
            log('[Android] reproducirStream llamado');
          }
        } catch (error) {
          log('[Android] Error al llamar reproducirStream:', error);
        } finally {
          scheduledAndroidCalls.delete(urlString);
        }
      }, 1500);
      scheduledAndroidCalls.set(urlString, timeoutId);
    } catch (_) {}
  }

  function copyToClipboard(text) {
    try {
      if (!text) return;
      if (typeof GM_setClipboard === 'function') {
        GM_setClipboard(String(text));
        return;
      }
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(String(text)).catch(() => {});
      }
    } catch (_) {}
  }

  function isM3u8Url(candidate) {
    if (!candidate) return false;
    try {
      const urlString = String(candidate);
      // Acepta variantes con query/fragment
      return urlString.includes('.m3u8');
    } catch (_) {
      return false;
    }
  }

  function sendToTopWindow(urlString) {
    try {
      if (!urlString) return;
      // Intenta notificar al top para mostrar en consola de la página principal
      if (window.top && window.top !== window) {
        window.top.postMessage({ __m3u8_found: true, url: urlString, from: location.href }, '*');
      }
    } catch (_) {}
  }

  function recordM3u8(url, source) {
    if (!isM3u8Url(url)) return;
    const urlString = String(url);
    if (foundM3u8Urls.has(urlString)) return;
    foundM3u8Urls.add(urlString);
    log(urlString, 'via', source);
    copyToClipboard(urlString);
    scheduleAndroidPlayback(urlString);
    sendToTopWindow(urlString);
    try { if (isTopWindow()) updateOverlayList(); } catch (_) {}
  }

  // Escucha mensajes en el top para mostrar todos los hallazgos de iframes
  try {
    if (window.top === window) {
      window.addEventListener('message', (evt) => {
        try {
          const data = evt?.data;
          if (data && data.__m3u8_found && typeof data.url === 'string') {
            if (!foundM3u8Urls.has(data.url)) {
              foundM3u8Urls.add(data.url);
              log('[desde iframe]', data.url, 'origen:', data.from || 'desconocido');
              copyToClipboard(data.url);
              scheduleAndroidPlayback(data.url);
              updateOverlayList();
            }
          }
        } catch (_) {}
      }, false);
    }
  } catch (_) {}

  // 1) DOM inicial (video/audio/source)
  try {
    const emitFromDom = () => {
      try {
        const mediaElements = document.querySelectorAll('video, audio, source');
        mediaElements.forEach((element) => {
          try {
            const src = element.currentSrc || element.src || element.getAttribute('src');
            if (src) recordM3u8(src, 'DOM');
          } catch (_) {}
        });
      } catch (_) {}
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', emitFromDom, { once: true });
    } else {
      emitFromDom();
    }
  } catch (_) {}

  // 2) Interceptar fetch
  try {
    if (window.fetch) {
      const originalFetch = window.fetch;
      window.fetch = async function (...args) {
        try {
          const req = args[0];
          const url = typeof req === 'string' ? req : req?.url;
          recordM3u8(url, 'fetch-req');
        } catch (_) {}
        const response = await originalFetch.apply(this, args);
        try {
          recordM3u8(response.url, 'fetch-res');
        } catch (_) {}
        return response;
      };
    }
  } catch (_) {}

  // 3) Interceptar XHR
  try {
    if (window.XMLHttpRequest) {
      const originalOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        try { recordM3u8(url, 'xhr.open'); } catch (_) {}
        return originalOpen.call(this, method, url, ...rest);
      };
    }
  } catch (_) {}

  // 4) Observador de recursos (PerformanceObserver)
  try {
    try {
      performance.getEntriesByType('resource').forEach((entry) => {
        recordM3u8(entry.name, 'perf-init');
      });
    } catch (_) {}
    const po = new PerformanceObserver((list) => {
      try {
        list.getEntries().forEach((entry) => {
          recordM3u8(entry.name, 'perf-observer');
        });
      } catch (_) {}
    });
    po.observe({ entryTypes: ['resource'] });
  } catch (_) {}

  // 5) Asignación de src en elementos multimedia
  try {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
    if (descriptor && descriptor.set && descriptor.get) {
      Object.defineProperty(HTMLMediaElement.prototype, 'src', {
        configurable: true,
        get() { return descriptor.get.call(this); },
        set(value) {
          try { recordM3u8(value, 'media.src'); } catch (_) {}
          return descriptor.set.call(this, value);
        },
      });
    }
  } catch (_) {}

  // 6) API pública (útil para depuración)
  try {
    window.__m3u8 = foundM3u8Urls;
    window.__m3u8_list = () => Array.from(foundM3u8Urls);
    log('Sniffer M3U8 (all frames) activo. URLs en window.__m3u8 / window.__m3u8_list().');
  } catch (_) {}

  // 7) Overlay UI (solo en ventana principal)
  function isTopWindow() {
    try { return window.top === window; } catch { return false; }
  }

  function ensureStyles() {
    const css = `
      .__m3u8-toggle {
        position: fixed; bottom: 16px; right: 16px; z-index: 2147483646;
        background: #111; color: #fff; border: 1px solid #333; border-radius: 6px;
        padding: 8px 12px; font: 12px/1.2 Arial, sans-serif; cursor: pointer; opacity: 0.9;
      }
      .__m3u8-overlay { position: fixed; right: 16px; bottom: 56px; width: 360px; max-height: 60vh; z-index: 2147483646;
        background: #0f0f10; color: #eaeaea; border: 1px solid #333; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.35); display: none; }
      .__m3u8-header { display:flex; align-items:center; justify-content:space-between; padding: 8px 10px; border-bottom: 1px solid #2a2a2a; }
      .__m3u8-title { font-weight: bold; font-size: 13px; }
      .__m3u8-actions { display:flex; gap:6px; }
      .__m3u8-btn { background:#1f1f20; color:#ddd; border:1px solid #3a3a3a; border-radius:4px; padding:4px 8px; font-size:12px; cursor:pointer; }
      .__m3u8-btn:hover { background:#2a2a2a; }
      .__m3u8-list { overflow:auto; max-height: 44vh; padding: 6px 8px; }
      .__m3u8-item { border:1px solid #2a2a2a; border-radius:6px; margin-bottom:6px; padding:6px; background:#161617; }
      .__m3u8-url { word-break: break-all; font-size: 12px; margin-bottom: 6px; color: #9bdcff; }
      .__m3u8-row { display:flex; gap:6px; flex-wrap: wrap; }
      .__m3u8-player { display:none; position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%);
        width: min(90vw, 900px); height: min(60vh, 520px); background:#000; border: 1px solid #444; z-index: 2147483647; border-radius: 8px; }
      .__m3u8-player video { width: 100%; height: calc(100% - 36px); background: #000; }
      .__m3u8-player .bar { height: 36px; display:flex; align-items:center; justify-content: space-between; background:#111; color:#ddd; padding: 0 8px; border-bottom:1px solid #333; }
    `;
    const style = document.createElement('style');
    style.id = '__m3u8_styles';
    style.textContent = css;
    document.documentElement.appendChild(style);
  }

  function createOverlay() {
    if (!isTopWindow()) return;
    try {
      ensureStyles();
      overlayToggleBtn = document.createElement('button');
      overlayToggleBtn.className = '__m3u8-toggle';
      overlayToggleBtn.textContent = 'M3U8';
      overlayToggleBtn.title = 'Mostrar/Ocultar capturas M3U8';
      overlayToggleBtn.addEventListener('click', () => {
        overlay.style.display = overlay.style.display === 'none' ? 'block' : 'none';
        if (overlay.style.display === 'block') updateOverlayList();
      });

      overlay = document.createElement('div');
      overlay.className = '__m3u8-overlay';
      overlay.innerHTML = `
        <div class="__m3u8-header">
          <div class="__m3u8-title">Capturas M3U8</div>
          <div class="__m3u8-actions">
            <button class="__m3u8-btn" data-act="copyall">Copiar todo</button>
            <button class="__m3u8-btn" data-act="clear">Limpiar</button>
            <button class="__m3u8-btn" data-act="close">Cerrar</button>
          </div>
        </div>
        <div class="__m3u8-list"></div>
      `;
      overlayList = overlay.querySelector('.__m3u8-list');
      overlay.addEventListener('click', (ev) => {
        const btn = ev.target.closest('button');
        if (!btn) return;
        const act = btn.getAttribute('data-act');
        if (act === 'close') overlay.style.display = 'none';
        if (act === 'clear') { foundM3u8Urls.clear(); updateOverlayList(); }
        if (act === 'copyall') copyToClipboard(Array.from(foundM3u8Urls).join('\n'));
        if (act === 'copy') copyToClipboard(btn.getAttribute('data-url'));
        if (act === 'open') window.open(btn.getAttribute('data-url'), '_blank', 'noreferrer');
        if (act === 'play') playInOverlay(btn.getAttribute('data-url'));
      });

      playerContainer = document.createElement('div');
      playerContainer.className = '__m3u8-player';
      playerContainer.innerHTML = `
        <div class="bar">
          <div>Reproductor HLS</div>
          <div>
            <button class="__m3u8-btn" data-act="stop">Detener</button>
            <button class="__m3u8-btn" data-act="close-player">Cerrar</button>
          </div>
        </div>
        <video controls playsinline></video>
      `;
      playerVideo = playerContainer.querySelector('video');
      playerContainer.addEventListener('click', (ev) => {
        const btn = ev.target.closest('button');
        if (!btn) return;
        const act = btn.getAttribute('data-act');
        if (act === 'close-player') hidePlayer();
        if (act === 'stop') stopPlayback();
      });

      document.documentElement.appendChild(overlayToggleBtn);
      document.documentElement.appendChild(overlay);
      document.documentElement.appendChild(playerContainer);
    } catch (_) {}
  }

  function updateOverlayList() {
    if (!overlayList) return;
    const items = Array.from(foundM3u8Urls);
    overlayList.innerHTML = items.map((u) => (
      `<div class="__m3u8-item">
         <div class="__m3u8-url">${escapeHtml(u)}</div>
         <div class="__m3u8-row">
           <button class="__m3u8-btn" data-act="copy" data-url="${encodeHtmlAttr(u)}">Copiar</button>
           <button class="__m3u8-btn" data-act="open" data-url="${encodeHtmlAttr(u)}">Abrir</button>
           <button class="__m3u8-btn" data-act="play" data-url="${encodeHtmlAttr(u)}">Reproducir</button>
         </div>
       </div>`
    )).join('');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  }
  function encodeHtmlAttr(s) {
    return escapeHtml(s).replace(/"/g, '&quot;');
  }

  function playInOverlay(url) {
    try {
      showPlayer();
      stopPlayback();
      if (window.Hls && window.Hls.isSupported()) {
        hlsInstance = new window.Hls({ lowLatencyMode: true, backBufferLength: 30 });
        hlsInstance.loadSource(url);
        hlsInstance.attachMedia(playerVideo);
        hlsInstance.on(window.Hls.Events.MANIFEST_PARSED, () => { try { playerVideo.play().catch(()=>{}); } catch {} });
      } else if (playerVideo.canPlayType('application/vnd.apple.mpegurl')) {
        playerVideo.src = url;
        playerVideo.addEventListener('loadedmetadata', () => { try { playerVideo.play().catch(()=>{}); } catch {} }, { once: true });
      } else {
        alert('HLS no soportado por el navegador y Hls.js no disponible.');
      }
    } catch (e) {
      console.log('[M3U8] Error al reproducir:', e);
    }
  }

  function stopPlayback() {
    try {
      if (hlsInstance) {
        try { hlsInstance.destroy(); } catch {}
        hlsInstance = null;
      }
      if (playerVideo) {
        try { playerVideo.pause(); } catch {}
        playerVideo.removeAttribute('src');
        try { playerVideo.load(); } catch {}
      }
    } catch {}
  }

  function showPlayer() { if (playerContainer) playerContainer.style.display = 'block'; }
  function hidePlayer() { stopPlayback(); if (playerContainer) playerContainer.style.display = 'none'; }

  if (isTopWindow()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createOverlay, { once: true });
    } else {
      createOverlay();
    }
  }
})();


