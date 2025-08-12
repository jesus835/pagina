(() => {
  const foundM3u8Urls = new Set();
  // Sniffer simple: solo detectar y registrar URLs .m3u8
  const scheduledAndroidCalls = new Map();

  function scheduleAndroidPlayback(urlString) {
    if (scheduledAndroidCalls.has(urlString)) return;
    console.log(`[M3U8][Android] Programado reproducirStream en 2s -> ${urlString}`);
    const timeoutId = setTimeout(() => {
      console.log(`[M3U8][Android] Ejecutando reproducirStream -> ${urlString}`);
      try {
        if (window.AndroidInterface && typeof window.AndroidInterface.reproducirStream === 'function') {
          window.AndroidInterface.reproducirStream(urlString);
          console.log('[M3U8][Android] reproducirStream llamado correctamente');
        } else {
          console.warn('[M3U8][Android] AndroidInterface.reproducirStream no disponible');
        }
      } catch (error) {
        console.warn('[M3U8][Android] Error al llamar reproducirStream:', error);
      } finally {
        scheduledAndroidCalls.delete(urlString);
      }
    }, 2000);
    scheduledAndroidCalls.set(urlString, timeoutId);
  }

  function tryCopyToClipboard(text) {
    if (!navigator.clipboard || !navigator.clipboard.writeText) return;
    navigator.clipboard.writeText(text).catch(() => {});
  }

  function isM3u8Url(candidate) {
    if (!candidate) return false;
    try {
      const urlString = String(candidate);
      return urlString.includes('.m3u8');
    } catch (_) {
      return false;
    }
  }

  function recordM3u8(url, source) {
    if (!isM3u8Url(url)) return;
    const urlString = String(url);
    if (foundM3u8Urls.has(urlString)) return;
    foundM3u8Urls.add(urlString);
    console.log('[M3U8]', urlString, 'via', source);
    tryCopyToClipboard(urlString);
    scheduleAndroidPlayback(urlString);
  }

  // 1) DOM inicial (video/source)
  try {
    const mediaElements = document.querySelectorAll('video, audio, source');
    mediaElements.forEach((element) => {
      const src = element.currentSrc || element.src || element.getAttribute('src');
      if (src) recordM3u8(src, 'DOM');
    });
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
        try { recordM3u8(response.url, 'fetch-res'); } catch (_) {}
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
    performance.getEntriesByType('resource').forEach((entry) => {
      recordM3u8(entry.name, 'perf-init');
    });
    const po = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        recordM3u8(entry.name, 'perf-observer');
      });
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
        set(value) { try { recordM3u8(value, 'media.src'); } catch (_) {} return descriptor.set.call(this, value); },
      });
    }
  } catch (_) {}

  // 6) API pública
  window.__m3u8 = foundM3u8Urls;
  window.__m3u8_list = () => Array.from(foundM3u8Urls);
  window.__m3u8_autoOpen = true;
  window.__m3u8_setAutoOpen = (enabled) => { window.__m3u8_autoOpen = !!enabled; };

  console.log('Sniffer M3U8 activo. Las URLs se copiarán al portapapeles y estarán en window.__m3u8 / window.__m3u8_list().');
})();


