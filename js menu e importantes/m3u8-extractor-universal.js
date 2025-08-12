// M3U8 Extractor Universal - Replica la funcionalidad del extractor de M3U8
// Compatible con cualquier página que tenga streams M3U8

(function() {
    'use strict';

    // Configuración
    const CONFIG = {
        overlayId: 'm3u8ExtractorOverlay',
        title: 'M3U8 Extractor Universal',
        position: 'top-left', // top-left, top-right, bottom-left, bottom-right
        autoHide: false,
        showCount: true,
        copyToClipboard: true,
        autoPlay: false
    };

    // Estado global
    let m3u8Urls = [];
    let currentUrlIndex = 0;
    let overlay = null;
    let isOverlayVisible = true;
    let isExpanded = true;

    // Función principal de inicialización
    function initM3U8Extractor() {
        console.log('🚀 Iniciando M3U8 Extractor Universal...');
        
        // Crear overlay
        createOverlay();
        
        // Configurar interceptores
        setupInterceptors();
        
        // Configurar observadores
        setupObservers();
        
        // Configurar atajos de teclado
        setupKeyboardShortcuts();
        
        console.log('✅ M3U8 Extractor Universal iniciado');
    }

    // Crear el overlay
    function createOverlay() {
        // Remover overlay existente si existe
        const existingOverlay = document.getElementById(CONFIG.overlayId);
        if (existingOverlay) {
            existingOverlay.remove();
        }

        // Crear contenedor principal
        overlay = document.createElement('div');
        overlay.id = CONFIG.overlayId;
        overlay.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            z-index: 999999;
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #00ffcc;
            border-radius: 8px;
            color: white;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 12px;
            padding: 8px;
            max-width: 600px;
            min-width: 300px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            transition: all 0.3s ease;
        `;

        // Crear contenido del overlay
        overlay.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-weight: bold; color: #00ffcc;">${CONFIG.title}</span>
                    ${CONFIG.showCount ? '<span id="m3u8Count" style="background: #00ffcc; color: black; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: bold;">0</span>' : ''}
                </div>
                <div style="display: flex; gap: 4px;">
                    <button id="m3u8ToggleExpand" style="background: #333; border: 1px solid #555; color: white; padding: 2px 6px; border-radius: 4px; cursor: pointer; font-size: 10px;">-</button>
                    <button id="m3u8Copy" style="background: #333; border: 1px solid #555; color: white; padding: 2px 6px; border-radius: 4px; cursor: pointer; font-size: 10px;">Copy</button>
                    <button id="m3u8Play" style="background: #333; border: 1px solid #555; color: white; padding: 2px 6px; border-radius: 4px; cursor: pointer; font-size: 10px;">Play</button>
                    <button id="m3u8Close" style="background: #c00; border: 1px solid #f00; color: white; padding: 2px 6px; border-radius: 4px; cursor: pointer; font-size: 10px;">X</button>
                </div>
            </div>
            <div id="m3u8Content" style="display: block;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <select id="m3u8UrlSelect" style="background: #333; border: 1px solid #555; color: white; padding: 4px; border-radius: 4px; font-size: 11px; min-width: 80px;">
                        <option value="first">First</option>
                        <option value="last">Last</option>
                    </select>
                    <span id="m3u8CurrentUrl" style="color: #ccc; font-size: 11px; word-break: break-all;">No M3U8 URLs detected yet...</span>
                </div>
                <div id="m3u8UrlList" style="max-height: 200px; overflow-y: auto; display: none;">
                    <div style="font-size: 10px; color: #888; margin-bottom: 4px;">All detected URLs:</div>
                    <div id="m3u8UrlItems"></div>
                </div>
            </div>
        `;

        // Agregar al documento
        document.body.appendChild(overlay);

        // Configurar eventos
        setupOverlayEvents();
    }

    // Configurar eventos del overlay
    function setupOverlayEvents() {
        // Botón de expandir/contraer
        const toggleBtn = document.getElementById('m3u8ToggleExpand');
        toggleBtn.addEventListener('click', toggleExpand);

        // Botón de copiar
        const copyBtn = document.getElementById('m3u8Copy');
        copyBtn.addEventListener('click', copyCurrentUrl);

        // Botón de reproducir
        const playBtn = document.getElementById('m3u8Play');
        playBtn.addEventListener('click', playCurrentUrl);

        // Botón de cerrar
        const closeBtn = document.getElementById('m3u8Close');
        closeBtn.addEventListener('click', hideOverlay);

        // Selector de URL
        const urlSelect = document.getElementById('m3u8UrlSelect');
        urlSelect.addEventListener('change', updateCurrentUrl);

        // Hacer el overlay arrastrable
        makeOverlayDraggable();
    }

    // Hacer el overlay arrastrable
    function makeOverlayDraggable() {
        let isDragging = false;
        let startX, startY, startLeft, startTop;

        overlay.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') return;
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseInt(overlay.style.left);
            startTop = parseInt(overlay.style.top);
            
            overlay.style.cursor = 'grabbing';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            overlay.style.left = (startLeft + deltaX) + 'px';
            overlay.style.top = (startTop + deltaY) + 'px';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            overlay.style.cursor = 'grab';
        });
    }

    // Configurar interceptores de red
    function setupInterceptors() {
        // Interceptar Fetch API
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            const url = args[0];
            if (typeof url === 'string' && url.includes('.m3u8')) {
                addM3U8Url(url);
            }
            return originalFetch.apply(this, args);
        };

        // Interceptar XMLHttpRequest
        const originalXHROpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url, ...args) {
            if (typeof url === 'string' && url.includes('.m3u8')) {
                addM3U8Url(url);
            }
            return originalXHROpen.apply(this, [method, url, ...args]);
        };

        // Interceptar WebSocket (para algunos streams)
        const originalWebSocket = window.WebSocket;
        window.WebSocket = function(url, ...args) {
            if (typeof url === 'string' && url.includes('.m3u8')) {
                addM3U8Url(url);
            }
            return new originalWebSocket(url, ...args);
        };

        // Buscar en el DOM existente
        searchForM3U8InDOM();
    }

    // Buscar M3U8 en el DOM
    function searchForM3U8InDOM() {
        // Buscar en scripts
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
            if (script.textContent && script.textContent.includes('.m3u8')) {
                const matches = script.textContent.match(/https?:\/\/[^\s"']*\.m3u8[^\s"']*/g);
                if (matches) {
                    matches.forEach(url => addM3U8Url(url));
                }
            }
        });

        // Buscar en atributos
        const elements = document.querySelectorAll('*');
        elements.forEach(element => {
            const attributes = ['src', 'href', 'data-src', 'data-url'];
            attributes.forEach(attr => {
                const value = element.getAttribute(attr);
                if (value && value.includes('.m3u8')) {
                    addM3U8Url(value);
                }
            });
        });

        // Buscar en iframes
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                if (iframeDoc) {
                    searchForM3U8InIframe(iframeDoc);
                }
            } catch (e) {
                // Error de CORS
            }
        });
    }

    // Buscar M3U8 en iframe
    function searchForM3U8InIframe(iframeDoc) {
        const scripts = iframeDoc.querySelectorAll('script');
        scripts.forEach(script => {
            if (script.textContent && script.textContent.includes('.m3u8')) {
                const matches = script.textContent.match(/https?:\/\/[^\s"']*\.m3u8[^\s"']*/g);
                if (matches) {
                    matches.forEach(url => addM3U8Url(url));
                }
            }
        });
    }

    // Configurar observadores
    function setupObservers() {
        // Observar cambios en el DOM
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Buscar M3U8 en nuevos elementos
                        if (node.textContent && node.textContent.includes('.m3u8')) {
                            const matches = node.textContent.match(/https?:\/\/[^\s"']*\.m3u8[^\s"']*/g);
                            if (matches) {
                                matches.forEach(url => addM3U8Url(url));
                            }
                        }

                        // Si es un iframe, observar su contenido
                        if (node.tagName === 'IFRAME') {
                            node.addEventListener('load', () => {
                                setTimeout(() => {
                                    try {
                                        const iframeDoc = node.contentDocument || node.contentWindow?.document;
                                        if (iframeDoc) {
                                            searchForM3U8InIframe(iframeDoc);
                                        }
                                    } catch (e) {
                                        // Error de CORS
                                    }
                                }, 2000);
                            });
                        }
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Configurar atajos de teclado
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Alt + M: Mostrar/ocultar overlay
            if (e.altKey && e.key === 'm') {
                e.preventDefault();
                toggleOverlay();
            }

            // Alt + C: Copiar URL actual
            if (e.altKey && e.key === 'c') {
                e.preventDefault();
                copyCurrentUrl();
            }

            // Alt + P: Reproducir URL actual
            if (e.altKey && e.key === 'p') {
                e.preventDefault();
                playCurrentUrl();
            }

            // Alt + X: Cerrar overlay
            if (e.altKey && e.key === 'x') {
                e.preventDefault();
                hideOverlay();
            }

            // Alt + F: Primera URL
            if (e.altKey && e.key === 'f') {
                e.preventDefault();
                selectFirstUrl();
            }

            // Alt + L: Última URL
            if (e.altKey && e.key === 'l') {
                e.preventDefault();
                selectLastUrl();
            }
        });
    }

    // Agregar URL M3U8
    function addM3U8Url(url) {
        // Limpiar URL
        url = url.trim();
        
        // Verificar si ya existe
        if (m3u8Urls.includes(url)) {
            return;
        }

        // Agregar a la lista
        m3u8Urls.push(url);
        console.log('🎯 M3U8 detectado:', url);

        // Actualizar overlay
        updateOverlay();

        // Auto-copiar si está habilitado
        if (CONFIG.copyToClipboard && m3u8Urls.length === 1) {
            setTimeout(() => copyCurrentUrl(), 1000);
        }

        // Auto-reproducir si está habilitado
        if (CONFIG.autoPlay && m3u8Urls.length === 1) {
            setTimeout(() => playCurrentUrl(), 1500);
        }
    }

    // Actualizar overlay
    function updateOverlay() {
        if (!overlay) return;

        // Actualizar contador
        const countElement = document.getElementById('m3u8Count');
        if (countElement) {
            countElement.textContent = m3u8Urls.length;
        }

        // Actualizar URL actual
        updateCurrentUrl();

        // Actualizar lista de URLs
        updateUrlList();
    }

    // Actualizar URL actual
    function updateCurrentUrl() {
        const urlSelect = document.getElementById('m3u8UrlSelect');
        const currentUrlElement = document.getElementById('m3u8CurrentUrl');
        
        if (!urlSelect || !currentUrlElement) return;

        const selection = urlSelect.value;
        let url = '';

        if (m3u8Urls.length > 0) {
            if (selection === 'first') {
                url = m3u8Urls[0];
                currentUrlIndex = 0;
            } else {
                url = m3u8Urls[m3u8Urls.length - 1];
                currentUrlIndex = m3u8Urls.length - 1;
            }
        }

        currentUrlElement.textContent = url || 'No M3U8 URLs detected yet...';
    }

    // Actualizar lista de URLs
    function updateUrlList() {
        const urlList = document.getElementById('m3u8UrlList');
        const urlItems = document.getElementById('m3u8UrlItems');
        
        if (!urlList || !urlItems) return;

        if (m3u8Urls.length === 0) {
            urlList.style.display = 'none';
            return;
        }

        urlItems.innerHTML = '';
        m3u8Urls.forEach((url, index) => {
            const item = document.createElement('div');
            item.style.cssText = `
                padding: 4px;
                margin: 2px 0;
                background: ${index === currentUrlIndex ? '#00ffcc' : '#333'};
                color: ${index === currentUrlIndex ? 'black' : 'white'};
                border-radius: 4px;
                font-size: 10px;
                word-break: break-all;
                cursor: pointer;
            `;
            item.textContent = `${index + 1}. ${url}`;
            item.addEventListener('click', () => {
                currentUrlIndex = index;
                updateCurrentUrl();
                updateUrlList();
            });
            urlItems.appendChild(item);
        });

        if (isExpanded) {
            urlList.style.display = 'block';
        }
    }

    // Alternar expandir/contraer
    function toggleExpand() {
        isExpanded = !isExpanded;
        const content = document.getElementById('m3u8Content');
        const urlList = document.getElementById('m3u8UrlList');
        const toggleBtn = document.getElementById('m3u8ToggleExpand');
        
        if (isExpanded) {
            content.style.display = 'block';
            urlList.style.display = 'block';
            toggleBtn.textContent = '-';
        } else {
            content.style.display = 'none';
            toggleBtn.textContent = '+';
        }
    }

    // Copiar URL actual
    async function copyCurrentUrl() {
        const url = m3u8Urls[currentUrlIndex];
        if (!url) {
            showNotification('No M3U8 URL to copy', 'error');
            return;
        }

        try {
            await navigator.clipboard.writeText(url);
            showNotification('M3U8 URL copied to clipboard!', 'success');
            console.log('📋 URL copiada:', url);
        } catch (err) {
            // Fallback para navegadores antiguos
            const textArea = document.createElement('textarea');
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showNotification('M3U8 URL copied to clipboard!', 'success');
        }
    }

    // Reproducir URL actual
    function playCurrentUrl() {
        const url = m3u8Urls[currentUrlIndex];
        if (!url) {
            showNotification('No M3U8 URL to play', 'error');
            return;
        }

        // Crear ventana de reproducción
        const playerUrl = `data:text/html,
            <!DOCTYPE html>
            <html>
            <head>
                <title>M3U8 Player</title>
                <style>
                    body { margin: 0; padding: 0; background: #000; }
                    video { width: 100vw; height: 100vh; }
                </style>
            </head>
            <body>
                <video controls autoplay>
                    <source src="${url}" type="application/x-mpegURL">
                    Your browser does not support HLS.
                </video>
                <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
                <script>
                    if (Hls.isSupported()) {
                        const video = document.querySelector('video');
                        const hls = new Hls();
                        hls.loadSource('${url}');
                        hls.attachMedia(video);
                    }
                </script>
            </body>
            </html>`;

        const playerWindow = window.open('', '_blank', 'width=800,height=600');
        playerWindow.document.write(playerUrl);
        playerWindow.document.close();

        showNotification('Opening M3U8 player...', 'info');
        console.log('▶️ Reproduciendo:', url);
    }

    // Mostrar/ocultar overlay
    function toggleOverlay() {
        if (overlay) {
            overlay.style.display = overlay.style.display === 'none' ? 'block' : 'none';
            isOverlayVisible = overlay.style.display !== 'none';
        }
    }

    // Ocultar overlay
    function hideOverlay() {
        if (overlay) {
            overlay.style.display = 'none';
            isOverlayVisible = false;
        }
    }

    // Seleccionar primera URL
    function selectFirstUrl() {
        const urlSelect = document.getElementById('m3u8UrlSelect');
        if (urlSelect) {
            urlSelect.value = 'first';
            updateCurrentUrl();
        }
    }

    // Seleccionar última URL
    function selectLastUrl() {
        const urlSelect = document.getElementById('m3u8UrlSelect');
        if (urlSelect) {
            urlSelect.value = 'last';
            updateCurrentUrl();
        }
    }

    // Mostrar notificación
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            z-index: 1000000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;

        // Agregar animación CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        // Remover después de 3 segundos
        setTimeout(() => {
            notification.remove();
            style.remove();
        }, 3000);
    }

    // API pública
    window.M3U8Extractor = {
        addUrl: addM3U8Url,
        getUrls: () => [...m3u8Urls],
        getCurrentUrl: () => m3u8Urls[currentUrlIndex],
        copyUrl: copyCurrentUrl,
        playUrl: playCurrentUrl,
        showOverlay: () => { if (overlay) overlay.style.display = 'block'; },
        hideOverlay: hideOverlay,
        toggleOverlay: toggleOverlay
    };

    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initM3U8Extractor);
    } else {
        initM3U8Extractor();
    }

    console.log('🎯 M3U8 Extractor Universal cargado');
    console.log('📋 Atajos de teclado:');
    console.log('   Alt + M: Mostrar/ocultar overlay');
    console.log('   Alt + C: Copiar URL actual');
    console.log('   Alt + P: Reproducir URL actual');
    console.log('   Alt + X: Cerrar overlay');
    console.log('   Alt + F: Primera URL');
    console.log('   Alt + L: Última URL');

})();
