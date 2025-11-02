document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. CONFIGURACIÓN E INICIALIZACIÓN ---
    const API_URL = 'https://lfaftechapi.onrender.com/api'; 
    const PLACEHOLDER_LOGO = 'images/placeholder-radio.png'; 
    // API alternativa para buscar logos, usando el UUID de la estación
    const LOGO_FALLBACK_URL = 'https://api.radio-browser.info/json/stations/search?limit=1&byuuid='; 

    // --- Elementos del DOM ---
    const elements = {
        menuToggle: document.getElementById('menu-toggle'),
        menuClose: document.getElementById('menu-close'),
        mobileMenu: document.getElementById('mobile-menu'),
        overlay: document.getElementById('overlay'),
        playerBar: document.getElementById('player-bar'),
        audioPlayer: document.getElementById('audio-player'),
        playerLogo: document.getElementById('player-logo'),
        playerNombre: document.getElementById('player-nombre'),
        playerPais: document.getElementById('player-pais'),
        playerCloseBtn: document.getElementById('player-close-btn'), 
        playerInfo: document.getElementById('player-info'), 
        playPauseBtn: document.getElementById('play-pause-btn'), 
        playerPlayIcon: document.getElementById('player-play-icon'), 
        playerPauseIcon: document.getElementById('player-pause-icon'), 
        pageContainer: document.getElementById('page-container'), 
        dropdownPaises: document.getElementById('dropdown-paises'),
        mobilePaises: document.getElementById('mobile-paises'),
        searchInput: document.getElementById('search-input'),
        searchForm: document.getElementById('search-form'),
        clearSearchButton: document.getElementById('clear-search-button'),
    };
    
    // --- Estado Global ---
    let globalState = {
        currentStations: [], 
        currentPlaying: null,
        isPaused: true, 
        currentPage: 1, 
        totalPages: 1,  
        currentUrl: new URL(window.location.href) 
    };

    const closeMenu = () => {
        if (elements.mobileMenu) elements.mobileMenu.classList.remove('active');
        if (elements.overlay) elements.overlay.classList.remove('active');
    };
    
    // --- 2. FUNCIONES DEL REPRODUCTOR DE AUDIO ---
    
    function setPlayIcon() {
        if (!elements.playerPlayIcon || !elements.playerPauseIcon) return;
        elements.playerPlayIcon.style.display = 'block';
        elements.playerPauseIcon.style.display = 'none';
    }

    function setPauseIcon() {
        if (!elements.playerPlayIcon || !elements.playerPauseIcon) return;
        elements.playerPlayIcon.style.display = 'none';
        elements.playerPauseIcon.style.display = 'block';
    }

    function sanitizeStreamUrl(url) {
        if (!url) return '';
        if (url.startsWith('https://')) return url;
        return url.replace('http://', 'https://');
    }

    /**
     * Intenta obtener un logo de mejor calidad si el actual es el placeholder.
     */
    async function getBetterLogo(uuid) {
        try {
             const response = await fetch(LOGO_FALLBACK_URL + uuid);
             const data = await response.json();
             if (data && data[0] && data[0].favicon && data[0].favicon !== '') {
                 return data[0].favicon;
             }
             return null;
        } catch (e) {
             return null;
        }
    }
    
    /**
     * Inicia la reproducción de una estación.
     */
    async function playStation(station) {
        if (!elements.audioPlayer || !elements.playerBar) return;
        
        globalState.currentPlaying = station; 
        globalState.isPaused = false;
        
        // 1. Manejo del logo (Intento de obtener mejor logo si falta)
        let finalLogo = station.logo || PLACEHOLDER_LOGO;
        if (!station.logo || station.logo === PLACEHOLDER_LOGO) {
            const betterLogo = await getBetterLogo(station.uuid);
            if (betterLogo) {
                finalLogo = betterLogo;
                station.logo = betterLogo; // Actualizar el objeto station en memoria
            }
        }

        // 2. Actualizar la UI
        elements.playerLogo.src = finalLogo;
        elements.playerLogo.onerror = () => { elements.playerLogo.src = PLACEHOLDER_LOGO; };
        elements.playerNombre.textContent = station.nombre;
        elements.playerPais.textContent = station.pais;
        setPauseIcon(); 

        // 3. Establecer la fuente de audio (con fallback HTTPS)
        const httpsUrl = sanitizeStreamUrl(station.stream_url);
        elements.audioPlayer.src = httpsUrl;
        
        // 4. Iniciar la reproducción con un pequeño delay de carga
        // Esto evita que el navegador muestre un error antes de que el stream se conecte.
        setTimeout(() => {
            elements.audioPlayer.play()
                .then(() => {
                    elements.playerBar.classList.add('active');
                })
                .catch(error => {
                    // Fallback a HTTP si HTTPS falla
                    if (httpsUrl !== station.stream_url) {
                         elements.audioPlayer.src = station.stream_url;
                         elements.audioPlayer.play().catch(httpError => {
                            console.error(`Error final al reproducir ${station.nombre}:`, httpError.message);
                            setPlayIcon(); 
                            globalState.isPaused = true;
                            alert(`⚠️ La estación '${station.nombre}' no se pudo reproducir.`);
                         });
                         return; 
                    }
                    console.error(`Error al reproducir ${station.nombre}:`, error.message);
                    setPlayIcon();
                    globalState.isPaused = true;
                    alert(`⚠️ La estación '${station.nombre}' no se pudo reproducir. Problema de streaming.`);
                });
        }, 300); // 300ms de delay/carga simulada
    }

    function pauseStation() {
        if (elements.audioPlayer) {
            elements.audioPlayer.pause();
            globalState.isPaused = true;
            setPlayIcon();
        }
    }

    function stopStation() {
        if (elements.audioPlayer && elements.playerBar) {
            elements.audioPlayer.pause();
            elements.audioPlayer.src = '';
            elements.playerBar.classList.remove('active');
            globalState.currentPlaying = null; 
            globalState.isPaused = true;
        }
    }

    function initPlayerControls() {
        // Botón CERRAR [X] (Stop)
        if (elements.playerCloseBtn) {
            elements.playerCloseBtn.addEventListener('click', stopStation);
        }
        
        // Botón Play/Pause
        if (elements.playPauseBtn) {
            elements.playPauseBtn.addEventListener('click', () => {
                if (!globalState.currentPlaying) return;

                if (globalState.isPaused) {
                    elements.audioPlayer.play();
                    globalState.isPaused = false;
                } else {
                    pauseStation();
                }
            });
        }
        
        // Clic en la info minimizada navega al detalle
        if (elements.playerInfo) {
            elements.playerInfo.addEventListener('click', (e) => {
                if (globalState.currentPlaying && elements.playerBar.classList.contains('active')) {
                    const currentUuid = globalState.currentPlaying.uuid;
                    const newUrl = new URL(`${window.location.pathname}?radio=${currentUuid}`, window.location.origin);
                    
                    if (newUrl.href !== window.location.href) {
                        history.pushState({}, '', newUrl.href); 
                        loadContent(newUrl);
                    }
                }
            });
        }
        
        // Escucha eventos nativos para sincronizar el estado visual
        elements.audioPlayer.addEventListener('play', setPauseIcon);
        elements.audioPlayer.addEventListener('pause', setPlayIcon);
        elements.audioPlayer.addEventListener('ended', setPlayIcon);
    }
    
    // --- 3. FUNCIONES DE CARGA DE DATOS ---

    async function fetchPaises() {
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
                const link = `<li><a href="index.html?pais=${countryCode}&pagina=1" class="nav-link" data-filtro="${countryCode}" data-spa-link>${pais.name}</a></li>`;
                elements.dropdownPaises.innerHTML += link;

                const mobileLink = `<a href="index.html?pais=${countryCode}&pagina=1" class="nav-link" data-filtro="${countryCode}" data-spa-link>${pais.name}</a>`;
                elements.mobilePaises.innerHTML += mobileLink;
            });

        } catch (error) {
            console.error(error);
            elements.dropdownPaises.innerHTML = '<li><a href="#">Error al cargar</a></li>';
            elements.mobilePaises.innerHTML = '<a href="#">Error al cargar</a>';
        }
    }
    
    // --- 4. CEREBRO SPA (Single Page Application) ---

    function showLoading(title = "Cargando...") {
        elements.pageContainer.innerHTML = `
            <h2 id="page-title">${title}</h2>
            <div id="loading-message" class="loader-container">
                <div class="loader"></div>
                <p style="margin-top: 1rem; color: var(--color-texto-secundario);">Sintonizando...</p>
            </div>
        `;
    }

    /**
     * Dibuja la paginación.
     */
    function drawPagination(current, total, url) {
        if (total <= 1) return '';

        let paginationHTML = '<div class="pagination-container">';
        const maxPages = 5; 
        let startPage = Math.max(1, current - Math.floor(maxPages / 2));
        let endPage = Math.min(total, startPage + maxPages - 1);

        if (endPage - startPage < maxPages - 1) {
            startPage = Math.max(1, endPage - maxPages + 1);
        }

        // Botón Anterior
        const prevUrl = new URL(url.origin + url.pathname + url.search);
        prevUrl.searchParams.set('pagina', Math.max(1, current - 1));
        paginationHTML += `<a href="${prevUrl.href}" class="pagination-btn ${current === 1 ? 'disabled' : ''}" data-spa-link>&laquo; Anterior</a>`;

        // Botones de Páginas
        for (let i = startPage; i <= endPage; i++) {
            const pageUrl = new URL(url.origin + url.pathname + url.search);
            pageUrl.searchParams.set('pagina', i);
            paginationHTML += `<a href="${pageUrl.href}" class="pagination-btn ${i === current ? 'active' : ''}" data-spa-link>${i}</a>`;
        }

        // Botón Siguiente
        const nextUrl = new URL(url.origin + url.pathname + url.search);
        nextUrl.searchParams.set('pagina', Math.min(total, current + 1));
        paginationHTML += `<a href="${nextUrl.href}" class="pagination-btn ${current === total ? 'disabled' : ''}" data-spa-link>Siguiente &raquo;</a>`;

        paginationHTML += '</div>';
        return paginationHTML;
    }


    // Dibuja la lista de estaciones de radio
    function drawStationsList(data, title, url) {
        const { radios, totalRadios, paginaActual, totalPaginas } = data;
        let stationsHTML = '';
        
        globalState.currentStations = radios;
        globalState.currentPage = paginaActual;
        globalState.totalPages = totalPaginas;

        if (radios.length === 0) {
             const query = url.searchParams.get('query');
             const message = query 
                ? `No se encontraron resultados para "${query}".`
                : 'No se encontraron estaciones para esta selección.';
            stationsHTML = `<p class="no-stations-message">${message}</p>`;
        } else {
            // 1. Mostrar el contador total (ej. "Mostrando 20 de 89 radios en total.")
            let countInfoHTML = '';
            if (totalRadios > 0) {
                const radiosText = totalRadios === 1 ? 'radio' : 'radios';
                countInfoHTML = `<p id="radio-count-info">Mostrando ${radios.length} de ${totalRadios} ${radiosText} en total.</p>`;
            }
            
            // 2. Dibujar las tarjetas
            stationsHTML += countInfoHTML;
            stationsHTML += '<div id="stations-container">';
            radios.forEach(station => {
                const logo = station.logo || PLACEHOLDER_LOGO;
                const isPlaying = globalState.currentPlaying && globalState.currentPlaying.uuid === station.uuid && !globalState.isPaused ? 'is-playing' : '';
                
                stationsHTML += `
                    <div class="station-card ${isPlaying}">
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

            // 3. Dibujar la paginación
            stationsHTML += drawPagination(paginaActual, totalPaginas, url);
        }
        
        elements.pageContainer.innerHTML = `
            <h2 id="page-title">${title}</h2>
            ${stationsHTML}
        `;

        // Añadir eventos a los botones de play
        elements.pageContainer.querySelectorAll('.btn-play').forEach(button => {
            button.addEventListener('click', () => {
                const stationUuid = button.dataset.uuid;
                const stationData = globalState.currentStations.find(s => s.uuid === stationUuid);
                if (stationData) {
                    // Si ya está sonando, pausar
                    if (globalState.currentPlaying?.uuid === stationUuid && !globalState.isPaused) {
                         pauseStation();
                    } else {
                         // Si es diferente o está pausada, reproducir
                         playStation(stationData);
                    }
                    
                    // Actualizar el estado visual de la tarjeta
                    document.querySelectorAll('.station-card').forEach(card => card.classList.remove('is-playing'));
                    if(!globalState.isPaused) {
                        button.closest('.station-card').classList.add('is-playing');
                    }
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
            
            let tagsHTML = `<div class="tags-container">`; 
            tags.forEach(tag => {
                tagsHTML += `<a href="index.html?genero=${encodeURIComponent(tag.name)}&pagina=1" class="tag-btn" data-spa-link>
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
        globalState.currentUrl = url;
        const params = url.searchParams;
        const query = params.get('query'); 
        const pais = params.get('pais'); 
        const genero = params.get('genero'); 
        
        let urlParams = new URLSearchParams();
        urlParams.append('limite', '20'); 
        urlParams.append('pagina', params.get('pagina') || '1');
        
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
            tituloPagina = `Radios de ${pais}`;
            activeFilter = pais; 
            if (elements.clearSearchButton) elements.clearSearchButton.style.display = 'none';
        } else if (genero) {
            urlParams.append('genero', genero);
            tituloPagina = `Radios de ${genero}`;
            activeFilter = 'generos';
            if (elements.clearSearchButton) elements.clearSearchButton.style.display = 'none';
        } else {
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

            const data = await response.json(); // La API devuelve { radios, totalRadios, ... }

            // Refinar títulos usando el nombre real del país
            if (pais && data.radios.length > 0 && !query) {
                tituloPagina = `Radios de ${data.radios[0].pais}`;
            } else if (genero) {
                 tituloPagina = `Radios de: ${genero.charAt(0).toUpperCase() + genero.slice(1)}`;
            } else if (pais && query && data.radios.length > 0) {
                 tituloPagina = `Resultados para: "${query}" en ${data.radios[0].pais}`;
            }
            
            drawStationsList(data, tituloPagina, url);
            document.title = `${tituloPagina} - TuRadio.lat`;

        } catch (error) {
            console.error(error);
            elements.pageContainer.innerHTML = `<p class="no-stations-message" style="color: red;">Error al conectar con el servidor de radios.</p>`;
        }
    }
    
    
    /**
     * Carga la vista de "Detalle de Radio" + Recomendadas.
     */
    async function loadStationInfoPage(uuid) {
        showLoading("Cargando Información de la Radio...");
        document.title = `Detalle de Estación - TuRadio.lat`;
        
        try {
            // 1. Obtener la info de la radio actual
            const radioResponse = await fetch(`${API_URL}/radio/${uuid}`);
            if (!radioResponse.ok) throw new Error('Estación no encontrada');
            const station = await radioResponse.json();
            
            // 2. Obtener radios recomendadas
            const recommendedParams = new URLSearchParams();
            recommendedParams.append('pais', station.pais_code);
            recommendedParams.append('excludeUuid', station.uuid);
            recommendedParams.append('limite', 10); 
            
            const recommendedResponse = await fetch(`${API_URL}/radio/buscar?${recommendedParams.toString()}`);
            const recommendedData = recommendedResponse.ok ? await recommendedResponse.json() : { radios: [] };
            const recommendedStations = recommendedData.radios;

            // 3. Obtener el mejor logo
            let finalLogo = station.logo || PLACEHOLDER_LOGO;
            if (!station.logo || station.logo === PLACEHOLDER_LOGO) {
                const betterLogo = await getBetterLogo(station.uuid);
                if (betterLogo) finalLogo = betterLogo;
            }

            // 4. Renderizar la página
            const genres = (station.generos || '').split(',').map(g => g.trim()).filter(g => g);

            // Determinar el estado actual para el botón principal
            const isPlayingThis = globalState.currentPlaying && globalState.currentPlaying.uuid === station.uuid && !globalState.isPaused;
            const buttonText = isPlayingThis ? 'Pausar' : 'Escuchar Ahora';
            const buttonIcon = isPlayingThis ? 'fa-pause' : 'fa-play';

            let pageHTML = `<h2 id="page-title" style="margin-bottom: 0;">Sintonizando</h2>`;
            
            pageHTML += `
                <div class="station-info-page">
                    <div class="station-info-header">
                        <img src="${finalLogo}" alt="${station.nombre}" onerror="this.onerror=null;this.src='${PLACEHOLDER_LOGO}';" class="station-logo">
                        <div class="station-info-header-text">
                            <h1>${station.nombre}</h1>
                            <p>${station.pais}</p>
                            <button class="btn-play primary-play-btn ${isPlayingThis ? 'is-playing' : ''}" data-uuid="${station.uuid}" aria-label="${buttonText}" style="margin-top: 10px;">
                                <i class="fas ${buttonIcon}"></i> <span>${buttonText}</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="station-info-body">
                        <div class="station-info-details">
                            <h3>Detalles de la Estación</h3>
                            <ul>
                                <li><strong>País:</strong> ${station.pais}</li>
                                <li><strong>Popularidad:</strong> ${station.popularidad} votos</li>
                                </ul>
                            
                            <h3>Géneros</h3>
                            <div class="station-info-tags">
                                ${genres.map(g => `<a href="index.html?genero=${encodeURIComponent(g)}&pagina=1" class="tag-btn" data-spa-link>${g}</a>`).join('')}
                            </div>
                        </div>
                    </div>
                    
                    <div class="btn-back-container">
                        <button id="back-button" class="btn-back">
                             <i class="fas fa-arrow-left"></i> Volver a ${document.referrer ? 'la página anterior' : 'Radios Populares'}
                        </button>
                    </div>
                </div>
            `;
            
            // 5. Renderizar las Recomendaciones
            if (recommendedStations.length > 0) {
                globalState.currentStations = recommendedStations; 
                
                let recHTML = '<div id="stations-container" class="recommended-grid">';
                recommendedStations.forEach(r => {
                    const recLogo = r.logo || PLACEHOLDER_LOGO;
                    const recIsPlaying = globalState.currentPlaying && globalState.currentPlaying.uuid === r.uuid && !globalState.isPaused ? 'is-playing' : '';
                    recHTML += `
                        <div class="station-card small-card ${recIsPlaying}">
                            <a href="index.html?radio=${r.uuid}" class="station-info-link" data-spa-link>
                                <img src="${recLogo}" alt="${r.nombre}" class="station-logo" onerror="this.onerror=null;this.src='${PLACEHOLDER_LOGO}';">
                                <h3 class="station-name" title="${r.nombre}">${r.nombre}</h3>
                            </a>
                            <p class="station-meta">${r.pais}</p>
                            <button class="btn-play" data-uuid="${r.uuid}" aria-label="Reproducir ${r.nombre}">
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
            
            // 6. Adjuntar eventos
            document.getElementById('back-button').addEventListener('click', () => {
                history.back(); 
            });
            
            elements.pageContainer.querySelectorAll('.btn-play').forEach(button => {
                button.addEventListener('click', () => {
                    handleDetailPlayButtonClick(button, station, recommendedStations);
                });
            });
            
            // 7. Sincronizar el estado del reproductor minimizado
            if (globalState.currentPlaying && globalState.currentPlaying.uuid === station.uuid) {
                 elements.playerBar.classList.add('active');
            } else {
                 elements.playerBar.classList.remove('active');
            }
            
        } catch (error) {
            console.error(error);
            elements.pageContainer.innerHTML = `<p class="no-stations-message" style="color: red;">No se encontró la estación solicitada.</p>`;
        }
    }

    /**
     * Lógica de reproducción y pausa para el botón grande en la página de detalle.
     */
    function handleDetailPlayButtonClick(button, mainStation, recommendedStations) {
        const stationUuid = button.dataset.uuid;
        let stationData = mainStation.uuid === stationUuid ? mainStation : recommendedStations.find(s => s.uuid === stationUuid);
        if (!stationData) return;

        // Limpiar estados visuales
        document.querySelectorAll('.station-card').forEach(card => card.classList.remove('is-playing'));
        document.querySelectorAll('.primary-play-btn').forEach(btn => {
            btn.classList.remove('is-playing');
            btn.innerHTML = '<i class="fas fa-play"></i> <span>Escuchar Ahora</span>';
        });

        // 1. Si es la radio actual (la que está sonando/pausada)
        if (stationData.uuid === globalState.currentPlaying?.uuid) {
            if (globalState.isPaused) {
                // Play
                elements.audioPlayer.play();
                globalState.isPaused = false;
            } else {
                // Pause
                pauseStation();
            }
        } else {
            // 2. Es una radio nueva. Iniciar.
            playStation(stationData);
        }
        
        // 3. Actualizar el botón tocado
        if (!globalState.isPaused && globalState.currentPlaying.uuid === stationUuid) {
            // El botón debe mostrar PAUSA
            button.innerHTML = '<i class="fas fa-pause"></i> <span>Pausar</span>';
            button.classList.add('is-playing');
        } else if (globalState.isPaused && globalState.currentPlaying.uuid === stationUuid) {
            // La radio actual está pausada. El botón debe mostrar PLAY
            button.innerHTML = '<i class="fas fa-play"></i> <span>Escuchar Ahora</span>';
            button.classList.remove('is-playing');
        } else if (!globalState.isPaused && globalState.currentPlaying.uuid !== stationUuid) {
             // Si toqué una nueva y está sonando, actualizar el botón a pausa
             button.innerHTML = '<i class="fas fa-pause"></i> <span>Pausar</span>';
             button.classList.add('is-playing');
        }
        
        // Sincronizar el estado de la tarjeta si aplica
        const currentPlayingCard = document.querySelector(`.station-card[data-uuid="${globalState.currentPlaying.uuid}"]`);
        if (currentPlayingCard && !globalState.isPaused) {
            currentPlayingCard.classList.add('is-playing');
        }
    }


    /**
     * ROUTER PRINCIPAL
     */
    function loadContent(url) {
        globalState.currentUrl = url;
        const params = new URLSearchParams(url.search);
        
        const radioUuid = params.get('radio');
        if (radioUuid) {
            loadStationInfoPage(radioUuid);
            return;
        }

        if (params.get('filtro') === 'generos' || params.get('genero')) {
            if (params.get('genero')) {
                fetchStationsList(url);
            } else {
                fetchTags();
            }
        } else {
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
                    // Resetear la paginación al buscar
                    const newUrl = new URL(`${window.location.pathname}?query=${encodeURIComponent(query)}&pagina=1`, window.location.origin);
                    history.pushState({}, '', newUrl.href);
                    loadContent(newUrl);
                }
            });
        }
        
        if (elements.clearSearchButton) {
            elements.clearSearchButton.addEventListener('click', () => {
                const newUrl = new URL(`${window.location.pathname}?filtro=populares&pagina=1`, window.location.origin);
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