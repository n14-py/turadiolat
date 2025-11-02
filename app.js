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
        playerCloseBtn: document.getElementById('player-close-btn'), // Botón de CERRAR
        playerToggleBtn: document.getElementById('player-toggle-btn'), // Botón de MAXIMIZAR/MINIMIZAR
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
    // Guardamos la lista actual de radios aquí para que los botones de "Play" puedan encontrarlas
    let globalState = {
        currentStations: []
    };

    const closeMenu = () => {
        if (elements.mobileMenu) elements.mobileMenu.classList.remove('active');
        if (elements.overlay) elements.overlay.classList.remove('active');
    };
    
    // --- 2. FUNCIONES DEL REPRODUCTOR DE AUDIO ---
    
    /**
     * ¡FUNCIÓN CLAVE!
     * Se llama al presionar "Escuchar" en cualquier tarjeta
     */
    function playStation(station) {
        if (!elements.audioPlayer || !elements.playerBar) return;

        // 1. Cargar y reproducir el audio
        elements.audioPlayer.src = station.stream_url;
        elements.audioPlayer.play()
            .then(() => {
                const logo = station.logo || PLACEHOLDER_LOGO;

                // 2. Actualizar la vista MINIMIZADA
                elements.playerLogo.src = logo;
                elements.playerLogo.onerror = () => { elements.playerLogo.src = PLACEHOLDER_LOGO; };
                elements.playerNombre.textContent = station.nombre;
                elements.playerPais.textContent = station.pais;
                
                // 3. Actualizar la vista EXPANDIDA
                elements.playerExpandedLogo.src = logo;
                elements.playerExpandedLogo.onerror = () => { elements.playerExpandedLogo.src = PLACEHOLDER_LOGO; };
                elements.playerExpandedNombre.textContent = station.nombre;
                elements.playerExpandedPais.textContent = station.pais;
                elements.playerExpandedGeneros.textContent = (station.generos || "").split(',').join(', ');
                
                // 4. ¡LA MAGIA! Mostrar y EXPANDIR el reproductor
                elements.playerBar.classList.add('active'); // Mostrar
                elements.playerBar.classList.add('expanded'); // ¡Expandir automáticamente!
            })
            .catch(error => {
                console.warn(`No se pudo reproducir: ${station.nombre}. (Error: ${error.message})`);
                alert(`No se pudo reproducir la estación: ${station.nombre}. Puede que la transmisión no sea segura (HTTPS) o esté caída.`);
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
                elements.playerBar.classList.remove('expanded'); // Asegurarse de que esté cerrado
            });
        }
        
        // Botón MINIMIZAR/MAXIMIZAR [^] [v]
        if (elements.playerToggleBtn && elements.playerBar) {
            elements.playerToggleBtn.addEventListener('click', () => {
                elements.playerBar.classList.toggle('expanded');
            });
        }
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
                        <div class="station-info-link">
                            <img src="${logo}" alt="${station.nombre}" class="station-logo" onerror="this.onerror=null;this.src='${PLACEHOLDER_LOGO}';">
                            <h3 class="station-name" title="${station.nombre}">${station.nombre}</h3>
                        </div>
                        <p class="station-meta">${station.pais}</p>
                        <button class="btn-play" data-uuid="${station.uuid}">
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
            
            let tagsHTML = `<div class="tags-container" style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">`;
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
     * ROUTER PRINCIPAL
     * Decide qué página cargar
     */
    function loadContent(url) {
        const params = new URLSearchParams(url.search);

        // La lógica de "Más Info" (?radio=uuid) se eliminó.
        // El reproductor es ahora el "Más Info".
        
        if (params.get('filtro') === 'generos' || params.get('genero')) {
            // Cargar lista de géneros o radios de un género
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
    initPlayerControls(); // ¡Cambiado!
    initNavigation(); 
    fetchPaises();    
    
    loadContent(new URL(window.location.href));
});