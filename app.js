document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. CONFIGURACIÓN E INICIALIZACIÓN ---
    const API_URL = 'https://lfaftechapi.onrender.com/api'; 
    const PLACEHOLDER_LOGO = 'images/placeholder-radio.png'; 

    // --- Elementos del DOM ---
    const elements = {
        menuToggle: document.getElementById('menu-toggle'),
        menuClose: document.getElementById('menu-close'),
        mobileMenu: document.getElementById('mobile-menu'),
        overlay: document.getElementById('overlay'),
        pageContainer: document.getElementById('page-container'), 
        playerBar: document.getElementById('player-bar'),
        audioPlayer: document.getElementById('audio-player'),
        playerLogo: document.getElementById('player-logo'),
        playerNombre: document.getElementById('player-nombre'),
        playerPais: document.getElementById('player-pais'),
        playerCloseBtn: document.getElementById('player-close-btn'), 
        playerToggleBtn: document.getElementById('player-toggle-btn'), 
        playerInfo: document.getElementById('player-info'), // ¡AÑADIDO del HTML!
        dropdownPaises: document.getElementById('dropdown-paises'),
        mobilePaises: document.getElementById('mobile-paises'),
        searchInput: document.getElementById('search-input'),
        searchForm: document.getElementById('search-form'),
        clearSearchButton: document.getElementById('clear-search-button'),
        // Vistas del reproductor
        playerExpandedLogo: document.getElementById('player-expanded-logo'),
        playerExpandedNombre: document.getElementById('player-expanded-nombre'),
        playerExpandedPais: document.getElementById('player-expanded-pais'),
        playerExpandedGeneros: document.getElementById('player-expanded-generos')
    };
    
    // --- Estado Global ---
    let globalState = {
        currentStations: [], // Radios cargadas en el listado principal/recomendadas
        currentPlaying: null // Objeto de la radio actual en reproducción
    };

    const closeMenu = () => {
        if (elements.mobileMenu) elements.mobileMenu.classList.remove('active');
        if (elements.overlay) elements.overlay.classList.remove('active');
    };
    
    // --- 2. FUNCIONES DEL REPRODUCTOR DE AUDIO ---
    
    /**
     * Intenta forzar el stream a HTTPS para evitar errores de contenido mixto.
     */
    function sanitizeStreamUrl(url) {
        if (!url) return '';
        if (url.startsWith('https://')) return url;
        // Intenta forzar HTTPS para compatibilidad
        return url.replace('http://', 'https://');
    }
    
    /**
     * ¡FUNCIÓN CLAVE!
     * Lógica de reproducción con manejo de errores y fallback HTTP.
     */
    function playStation(station) {
        if (!elements.audioPlayer || !elements.playerBar) return;
        
        globalState.currentPlaying = station; 

        // Intentamos primero con la URL sanitizada (HTTPS)
        const httpsUrl = sanitizeStreamUrl(station.stream_url);
        elements.audioPlayer.src = httpsUrl;
        
        const playPromise = elements.audioPlayer.play();
        
        playPromise
            .then(() => {
                // Éxito: Actualizar las vistas del reproductor
                const logo = station.logo || PLACEHOLDER_LOGO;

                elements.playerLogo.src = logo;
                elements.playerLogo.onerror = () => { elements.playerLogo.src = PLACEHOLDER_LOGO; };
                elements.playerNombre.textContent = station.nombre;
                elements.playerPais.textContent = station.pais;
                
                elements.playerExpandedLogo.src = logo;
                elements.playerExpandedLogo.onerror = () => { elements.playerExpandedLogo.src = PLACEHOLDER_LOGO; };
                elements.playerExpandedNombre.textContent = station.nombre;
                elements.playerExpandedPais.textContent = station.pais;
                elements.playerExpandedGeneros.textContent = (station.generos || "").split(',').join(', ');
                
                // Mostrar y MINIMIZAR el reproductor (para no tapar la lista)
                elements.playerBar.classList.add('active');
                elements.playerBar.classList.remove('expanded'); 
            })
            .catch(error => {
                // Si falla (ej. Mixed Content Error o Autoplay Blocked)
                if (httpsUrl !== station.stream_url) {
                     console.warn(`Falló HTTPS. Intentando con HTTP original para ${station.nombre}...`);
                     elements.audioPlayer.src = station.stream_url;
                     
                     elements.audioPlayer.play().catch(httpError => {
                        console.error(`Error final al reproducir ${station.nombre}:`, httpError.message);
                        alert(`⚠️ La estación '${station.nombre}' no se pudo reproducir. Intenta abrirla en la página de detalle y haz clic en Reproducir.`);
                     });
                     return; 
                }
                
                console.error(`Error al reproducir ${station.nombre}:`, error.message);
                alert(`⚠️ La estación '${station.nombre}' no se pudo reproducir. Esto suele deberse a problemas de streaming o bloqueo de contenido mixto.`);
            });
    }

    /**
     * Inicializa los botones del reproductor (Cerrar y Minimizar)
     */
    function initPlayerControls() {
        // Botón CERRAR [X]
        if (elements.playerCloseBtn && elements.audioPlayer && elements.playerBar) {
            elements.playerCloseBtn.addEventListener('click', () => {
                elements.audioPlayer.pause();
                elements.audioPlayer.src = '';
                elements.playerBar.classList.remove('active');
                elements.playerBar.classList.remove('expanded'); 
                globalState.currentPlaying = null; // Reiniciar estado
            });
        }
        
        // Botón MINIMIZAR/MAXIMIZAR [^] [v]
        if (elements.playerToggleBtn && elements.playerBar) {
            elements.playerToggleBtn.addEventListener('click', () => {
                elements.playerBar.classList.toggle('expanded');
            });
        }
        
        // ¡NUEVO! Clic en la info minimizada para maximizar (Ideal para móvil)
        if (elements.playerInfo && elements.playerBar) {
            elements.playerInfo.addEventListener('click', () => {
                if (globalState.currentPlaying) {
                     elements.playerBar.classList.add('expanded');
                }
            });
        }
    }
    
    // --- 3. FUNCIONES DE CARGA DE DATOS ---

    async function fetchPaises() {
        // ... (fetchPaises se mantiene) ...
        if (!elements.dropdownPaises || !elements.mobilePaises) return;

        try {
            const response = await fetch(`${API_URL}/radio/paises`);
            if (!response.ok) throw new Error('Error al cargar países');
            
            const paises = await response.json();
            paises.sort((a, b) => a.name.localeCompare(b.name));

            elements.dropdownPaises.innerHTML = ''; 
            elements.mobilePaises.innerHTML = ''; 
            
            paises.forEach(pais => {
                const countryCode = pais.code.toUpperCase();
                const link = `<li><a href="index.html?pais=${countryCode}" class="nav-link" data-filtro="${countryCode}" data-spa-link>${pais.name}</a></li>`;
                elements.dropdownPaises.innerHTML += link;

                const mobileLink = `<a href="index.html?pais=${countryCode}" class="nav-link" data-filtro="${countryCode}" data-spa-link>${pais.name}</a>`;
                elements.mobilePaises.innerHTML += mobileLink;
            });

        } catch (error) {
            console.error(error);
            elements.dropdownPaises.innerHTML = '<li><a href="#">Error al cargar</a></li>';
            elements.mobilePaises.innerHTML = '<a href="#">Error al cargar</a>';
        }
    }
    
    // --- 4. CEREBRO SPA (Single Page Application) ---

    // Dibuja la pantalla de "Cargando..."
    function showLoading(title = "Cargando...") {
        elements.pageContainer.innerHTML = `
            <h2 id="page-title">${title}</h2>
            <div id="loading-message" class="loader-container">
                <div class="loader"></div>
                <p style="margin-top: 1rem; color: var(--color-texto-secundario);">Sintonizando...</p>
            </div>
        `;
    }

    // Dibuja la lista de estaciones de radio
    function drawStationsList(stations, title, query = null) {
        let stationsHTML = '';
        
        if (stations.length === 0) {
            const message = query 
                ? `No se encontraron resultados para "${query}".`
                : 'No se encontraron estaciones para esta selección.';
            stationsHTML = `<p class="no-stations-message">${message}</p>`;
        } else {
            stationsHTML = '<div id="stations-container">';
            stations.forEach(station => {
                const logo = station.logo || PLACEHOLDER_LOGO;
                stationsHTML += `
                    <div class="station-card">
                        <a href="index.html?radio=${station.uuid}" class="station-info-link" data-spa-link>
                            <img src="${logo}" alt="${station.nombre}" class="station-logo" onerror="this.onerror=null;this.src='${PLACEHOLDER_LOGO}';">
                            <h3 class="station-name" title="${station.nombre}">${station.nombre}</h3>
                        </a>
                        <p class="station-meta">${station.pais}</p>
                        <button class="btn-play" data-uuid="${station.uuid}" aria-label="Reproducir ${station.nombre}">
                            <i class="fas fa-play"></i>
                        </button>
                    </div>
                `;
            });
            stationsHTML += '</div>';
        }
        
        elements.pageContainer.innerHTML = `
            <h2 id="page-title">${title}</h2>
            ${stationsHTML}
        `;

        // Añadir eventos a los botones de play
        elements.pageContainer.querySelectorAll('.btn-play').forEach(button => {
            button.addEventListener('click', () => {
                const stationUuid = button.dataset.uuid;
                // Buscar la info completa de la radio en nuestro estado global
                const stationData = globalState.currentStations.find(s => s.uuid === stationUuid);
                if (stationData) {
                    playStation(stationData);
                }
            });
        });
    }

    // Carga los géneros
    async function fetchTags() {
        showLoading("Buscar por Género");

        try {
            const response = await fetch(`${API_URL}/radio/generos`);
            if (!response.ok) throw new Error('Error al cargar géneros');

            const tags = await response.json();
            
            let tagsHTML = `<div class="tags-container">`; // Removimos el estilo inline
            tags.forEach(tag => {
                tagsHTML += `<a href="index.html?genero=${encodeURIComponent(tag.name)}" class="tag-btn" data-spa-link>
                                ${tag.name} <span>${tag.stationcount}</span>
                             </a>`;
            });
            tagsHTML += `</div>`;
            
            elements.pageContainer.innerHTML = `
                <h2 id="page-title">Buscar por Género</h2>
                ${tagsHTML}
            `;

        } catch (error) {
            console.error(error);
            elements.pageContainer.innerHTML = `<p class="no-stations-message" style="color: red;">Error al cargar los géneros.</p>`;
        }
    }
    
    // Carga la lista de radios
    async function fetchStationsList(url) {
        const params = new URLSearchParams(url.search);
        const query = params.get('query'); 
        const pais = params.get('pais'); 
        const genero = params.get('genero'); 
        
        let urlParams = new URLSearchParams();
        urlParams.append('limite', '100');
        
        let tituloPagina = "Radios Populares";
        let activeFilter = params.get('filtro') || 'populares';

        if (query) {
            urlParams.append('query', query);
            tituloPagina = `Resultados para: "${query}"`;
            activeFilter = 'search'; 
            if (elements.searchInput) elements.searchInput.value = query;
            if (elements.clearSearchButton) elements.clearSearchButton.style.display = 'inline-block';
            
            if(pais) {
                urlParams.append('pais', pais);
                tituloPagina = `Resultados para: "${query}" en ${pais}`;
                activeFilter = pais;
            }
        } else if (pais) {
            urlParams.append('pais', pais);
            urlParams.set('limite', '200');
            tituloPagina = `Radios de ${pais}`;
            activeFilter = pais; 
            if (elements.clearSearchButton) elements.clearSearchButton.style.display = 'none';
        } else if (genero) {
            urlParams.append('genero', genero);
            urlParams.set('limite', '200');
            tituloPagina = `Radios de ${genero}`;
            activeFilter = 'generos';
            if (elements.clearSearchButton) elements.clearSearchButton.style.display = 'none';
        } else {
            // Populares
            if (elements.clearSearchButton) elements.clearSearchButton.style.display = 'none';
            if (elements.searchInput) elements.searchInput.value = '';
        }
        
        showLoading(tituloPagina);
        
        const apiUrl = `${API_URL}/radio/buscar?${urlParams.toString()}`;
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.filtro === activeFilter) {
                link.classList.add('active');
            }
        });

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('Error al cargar estaciones');

            const stations = await response.json();
            globalState.currentStations = stations; // ¡Guardar en estado global!

            // Refinar títulos
            if (pais && stations.length > 0 && !query) {
                tituloPagina = `Radios de ${stations[0].pais}`;
            } else if (genero) {
                 tituloPagina = `Radios de: ${genero.charAt(0).toUpperCase() + genero.slice(1)}`;
            } else if (pais && query && stations.length > 0) {
                 tituloPagina = `Resultados para: "${query}" en ${stations[0].pais}`;
            }
            
            drawStationsList(stations, tituloPagina, query);
            document.title = `${tituloPagina} - TuRadio.lat`;

        } catch (error) {
            console.error(error);
            elements.pageContainer.innerHTML = `<p class="no-stations-message" style="color: red;">Error al conectar con el servidor de radios.</p>`;
        }
    }
    
    
    /**
     * ¡NUEVA PÁGINA! Carga la vista de "Detalle de Radio" + Recomendadas.
     */
    async function loadStationInfoPage(uuid) {
        showLoading("Cargando Información de la Radio...");
        document.title = `Detalle de Estación - TuRadio.lat`;
        
        try {
            // 1. Obtener la info de la radio actual
            const radioResponse = await fetch(`${API_URL}/radio/${uuid}`);
            if (!radioResponse.ok) throw new Error('Estación no encontrada');
            const station = await radioResponse.json();
            
            // 2. Obtener radios recomendadas (mismo país, excluyendo la actual)
            const recommendedParams = new URLSearchParams();
            recommendedParams.append('pais', station.pais_code);
            recommendedParams.append('excludeUuid', station.uuid);
            recommendedParams.append('limite', 10); 
            
            const recommendedResponse = await fetch(`${API_URL}/radio/buscar?${recommendedParams.toString()}`);
            const recommendedStations = recommendedResponse.ok ? await recommendedResponse.json() : [];
            
            // 3. Renderizar la página
            const logo = station.logo || PLACEHOLDER_LOGO;
            const genres = (station.generos || '').split(',').map(g => g.trim()).filter(g => g);

            // Título de la página de detalle
            let pageHTML = `<h2 id="page-title" style="margin-bottom: 0;">Sintonizando</h2>`;
            
            pageHTML += `
                <div class="station-info-page">
                    <div class="station-info-header">
                        <img src="${logo}" alt="${station.nombre}" onerror="this.onerror=null;this.src='${PLACEHOLDER_LOGO}';" class="station-logo">
                        <div class="station-info-header-text">
                            <h1>${station.nombre}</h1>
                            <p>${station.pais}</p>
                            <button class="btn-play primary-play-btn" data-uuid="${station.uuid}" aria-label="Escuchar Ahora" style="margin-top: 10px;">
                                <i class="fas fa-play"></i> <span>Escuchar Ahora</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="station-info-body">
                        <div class="station-info-details">
                            <h3>Detalles de la Estación</h3>
                            <ul>
                                <li><strong>País:</strong> ${station.pais}</li>
                                <li><strong>Popularidad:</strong> ${station.popularidad} votos</li>
                                <li><strong>Streaming:</strong> <a href="${station.stream_url}" target="_blank">Ver Enlace Original</a></li>
                            </ul>
                            
                            <h3>Géneros</h3>
                            <div class="station-info-tags">
                                ${genres.map(g => `<a href="index.html?genero=${encodeURIComponent(g)}" class="tag-btn" data-spa-link>${g}</a>`).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <a href="index.html" class="btn-back" data-spa-link style="margin-top: 2rem; display: inline-block;">
                        <i class="fas fa-arrow-left"></i> Volver al listado principal
                    </a>
                </div>
            `;
            
            // 4. Renderizar las Recomendaciones
            if (recommendedStations.length > 0) {
                globalState.currentStations = recommendedStations; // Cargar las recomendadas al estado
                
                let recHTML = '<div id="stations-container" class="recommended-grid">';
                recommendedStations.forEach(station => {
                    const recLogo = station.logo || PLACEHOLDER_LOGO;
                    recHTML += `
                        <div class="station-card small-card">
                            <a href="index.html?radio=${station.uuid}" class="station-info-link" data-spa-link>
                                <img src="${recLogo}" alt="${station.nombre}" class="station-logo" onerror="this.onerror=null;this.src='${PLACEHOLDER_LOGO}';">
                                <h3 class="station-name" title="${station.nombre}">${station.nombre}</h3>
                            </a>
                            <p class="station-meta">${station.pais}</p>
                            <button class="btn-play" data-uuid="${station.uuid}" aria-label="Reproducir ${station.nombre}">
                                <i class="fas fa-play"></i>
                            </button>
                        </div>
                    `;
                });
                recHTML += '</div>';

                pageHTML += `<h2 id="page-title" style="margin-top: 3rem;">Radios Recomendadas de ${station.pais}</h2>${recHTML}`;
            }

            elements.pageContainer.innerHTML = pageHTML;
            document.title = `${station.nombre} - TuRadio.lat`;
            
            // 5. Re-adjuntar eventos de reproducción (para la principal y las recomendadas)
            elements.pageContainer.querySelectorAll('.btn-play').forEach(button => {
                button.addEventListener('click', () => {
                    const stationUuid = button.dataset.uuid;
                    // Busca en las recomendadas o en la radio principal
                    let stationData = station.uuid === stationUuid ? station : globalState.currentStations.find(s => s.uuid === stationUuid);
                    if (stationData) {
                        playStation(stationData);
                        // Asegurarse de que el reproductor esté activo
                        elements.playerBar.classList.add('active');
                        elements.playerBar.classList.remove('expanded');
                    }
                });
            });
            
            // Si la radio actual es la que se está reproduciendo, iniciar la reproducción
            if (globalState.currentPlaying && globalState.currentPlaying.uuid === station.uuid) {
                 // Si ya está sonando, forzamos la barra a estar activa y minimizada
                 elements.playerBar.classList.add('active');
                 elements.playerBar.classList.remove('expanded');
            } else {
                 // Si NO está sonando, forzamos al usuario a darle play
                 elements.playerBar.classList.remove('active');
            }
            
        } catch (error) {
            console.error(error);
            elements.pageContainer.innerHTML = `<p class="no-stations-message" style="color: red;">No se encontró la estación solicitada.</p>`;
        }
    }


    /**
     * ROUTER PRINCIPAL
     * Decide qué página cargar
     */
    function loadContent(url) {
        const params = new URLSearchParams(url.search);
        
        // 1. RUTA DE DETALLE (?radio=UUID)
        const radioUuid = params.get('radio');
        if (radioUuid) {
            loadStationInfoPage(radioUuid);
            // Al ir a la página de detalle, minimizamos la barra de abajo si está activa
            if(elements.playerBar.classList.contains('active')) {
                elements.playerBar.classList.remove('expanded');
            }
            return;
        }

        // 2. RUTAS DE LISTADO (Generos, Paises, Populares)
        if (params.get('filtro') === 'generos' || params.get('genero')) {
            if (params.get('genero')) {
                fetchStationsList(url);
            } else {
                fetchTags();
            }
        } else {
            // Cargar lista de radios (Populares, País, o Búsqueda)
            fetchStationsList(url);
        }
    }

    // --- 5. INICIALIZACIÓN DE ROUTER Y MENÚS ---
    
    function initMenu() {
        if (elements.menuToggle) {
            elements.menuToggle.addEventListener('click', () => {
                elements.mobileMenu.classList.add('active');
                elements.overlay.classList.add('active');
            });
        }
        if (elements.menuClose) elements.menuClose.addEventListener('click', closeMenu);
        if (elements.overlay) elements.overlay.addEventListener('click', closeMenu);
    }
    
    function initNavigation() {
        // Interceptar todos los clics 'data-spa-link'
        document.body.addEventListener('click', (e) => {
            const link = e.target.closest('a[data-spa-link]');
            if (link) {
                e.preventDefault(); 
                const url = new URL(link.href);
                if (url.href !== window.location.href) {
                    history.pushState({}, '', url.href); 
                    loadContent(url);
                }
                closeMenu();
            }
        });

        if (elements.searchForm) {
            elements.searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const query = elements.searchInput.value.trim();
                if (query) {
                    const params = new URLSearchParams(window.location.search);
                    const pais = params.get('pais');
                    
                    let newParams = new URLSearchParams();
                    newParams.append('query', query);
                    if (pais) newParams.append('pais', pais); 
                    
                    const newUrl = new URL(`${window.location.pathname}?${newParams.toString()}`, window.location.origin);
                    history.pushState({}, '', newUrl.href);
                    loadContent(newUrl);
                }
            });
        }
        
        if (elements.clearSearchButton) {
            elements.clearSearchButton.addEventListener('click', () => {
                const newUrl = new URL(`${window.location.pathname}?filtro=populares`, window.location.origin);
                history.pushState({}, '', newUrl.href);
                loadContent(newUrl);
            });
        }

        window.addEventListener('popstate', () => {
            loadContent(new URL(window.location.href));
        });
    }

    // --- 6. INICIAR LA APLICACIÓN ---
    initMenu();       
    initPlayerControls(); 
    initNavigation(); 
    fetchPaises();    
    
    loadContent(new URL(window.location.href));
});