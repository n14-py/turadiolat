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
        pageContainer: document.getElementById('page-container'), // ¡Contenedor principal!
        playerBar: document.getElementById('player-bar'),
        audioPlayer: document.getElementById('audio-player'),
        playerLogo: document.getElementById('player-logo'),
        playerNombre: document.getElementById('player-nombre'),
        playerPais: document.getElementById('player-pais'),
        playerClose: document.getElementById('player-close'),
        dropdownPaises: document.getElementById('dropdown-paises'),
        mobilePaises: document.getElementById('mobile-paises'),
        searchInput: document.getElementById('search-input'),
        searchForm: document.getElementById('search-form'),
        clearSearchButton: document.getElementById('clear-search-button')
    };
    
    // --- ¡CORRECCIÓN! ---
    // Movemos closeMenu aquí para que sea accesible globalmente
    const closeMenu = () => {
        if (elements.mobileMenu) elements.mobileMenu.classList.remove('active');
        if (elements.overlay) elements.overlay.classList.remove('active');
    };
    
    // --- 2. FUNCIONES DEL REPRODUCTOR DE AUDIO ---
    
    function playStation(station) {
        if (!elements.audioPlayer || !elements.playerBar) return;

        elements.audioPlayer.src = station.stream_url;
        elements.audioPlayer.play()
            .then(() => {
                elements.playerLogo.src = station.logo || PLACEHOLDER_LOGO;
                elements.playerLogo.onerror = () => { elements.playerLogo.src = PLACEHOLDER_LOGO; };
                elements.playerNombre.textContent = station.nombre;
                elements.playerPais.textContent = station.pais;
                elements.playerBar.classList.add('active');
            })
            .catch(error => {
                console.warn(`No se pudo reproducir: ${station.nombre}. (Error: ${error.message})`);
            });
    }

    function initPlayer() {
        if (elements.playerClose && elements.audioPlayer && elements.playerBar) {
            elements.playerClose.addEventListener('click', () => {
                elements.audioPlayer.pause();
                elements.audioPlayer.src = '';
                elements.playerBar.classList.remove('active');
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
    
    async function fetchTags() {
        // Esta función ahora solo *dibuja* el HTML de los géneros
        if (!elements.pageContainer) return;
        
        elements.pageContainer.innerHTML = `
            <h2 id="page-title">Buscar por Género</h2>
            <div id="loading-message" class="loader-container">
                <div class="loader"></div>
            </div>
        `;

        try {
            const response = await fetch(`${API_URL}/radio/generos`);
            if (!response.ok) throw new Error('Error al cargar géneros');

            const tags = await response.json();
            
            let tagsHTML = `<div class="tags-container">`;
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

    // --- 4. CEREBRO SPA (Single Page Application) ---

    // Dibuja la pantalla de "Cargando..."
    function showLoading() {
        elements.pageContainer.innerHTML = `
            <h2 id="page-title">Cargando...</h2>
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
                        <img src="${logo}" alt="${station.nombre}" class="station-logo" onerror="this.onerror=null;this.src='${PLACEHOLDER_LOGO}';">
                        <h3 class="station-name" title="${station.nombre}">${station.nombre}</h3>
                        <p class="station-meta">${station.pais}</p>
                        <button class="btn-play" data-uuid="${station.uuid}">
                            <i class="fas fa-play"></i>
                            <span>Escuchar</span>
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

        // Añadir eventos a los botones de play CREADOS
        elements.pageContainer.querySelectorAll('.btn-play').forEach(button => {
            button.addEventListener('click', () => {
                // Buscamos la info de la radio en el array que ya cargamos
                const stationUuid = button.dataset.uuid;
                const stationData = stations.find(s => s.uuid === stationUuid);
                if (stationData) {
                    playStation(stationData);
                }
            });
        });
    }

    /**
     * Esta es la función principal que carga todo el contenido
     */
    async function loadContent(url) {
        showLoading(); // Mostrar "Cargando..."
        
        const params = new URLSearchParams(url.search);
        const query = params.get('query'); 
        const pais = params.get('pais'); 
        const genero = params.get('genero'); 
        let filtro = params.get('filtro') || 'populares'; 
        
        let urlParams = new URLSearchParams();
        urlParams.append('limite', '100');
        
        let tituloPagina = "Radios Populares";
        let activeFilter = filtro;

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
        } else if (filtro === 'generos') {
            fetchTags(); // Cargar y dibujar la página de géneros
            activeFilter = 'generos';
            if (elements.clearSearchButton) elements.clearSearchButton.style.display = 'none';
            return; 
        } else {
            // Populares
            if (elements.clearSearchButton) elements.clearSearchButton.style.display = 'none';
            if (elements.searchInput) elements.searchInput.value = '';
        }
        
        const apiUrl = `${API_URL}/radio/buscar?${urlParams.toString()}`;
        
        // Marcar link activo
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

            // Refinar títulos
            if (pais && stations.length > 0 && !query) {
                tituloPagina = `Radios de ${stations[0].pais}`;
            } else if (genero) {
                 tituloPagina = `Radios de: ${genero.charAt(0).toUpperCase() + genero.slice(1)}`;
            } else if (pais && query && stations.length > 0) {
                 tituloPagina = `Resultados para: "${query}" en ${stations[0].pais}`;
            }
            
            // Dibujar la lista de estaciones
            drawStationsList(stations, tituloPagina, query);

        } catch (error) {
            console.error(error);
            elements.pageContainer.innerHTML = `<p class="no-stations-message" style="color: red;">Error al conectar con el servidor de radios.</p>`;
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
        // Usamos la función 'closeMenu' global
        if (elements.menuClose) elements.menuClose.addEventListener('click', closeMenu);
        if (elements.overlay) elements.overlay.addEventListener('click', closeMenu);
    }
    
    function initNavigation() {
        document.body.addEventListener('click', (e) => {
            const link = e.target.closest('a[data-spa-link]');
            if (link) {
                e.preventDefault(); 
                const url = new URL(link.href);
                history.pushState({}, '', url.href); 
                loadContent(url);
                closeMenu(); // ¡Ahora esta función SÍ es visible!
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
    initPlayer();     
    initNavigation(); 
    fetchPaises();    
    
    // Cargar el contenido de la página actual al iniciar
    loadContent(new URL(window.location.href));
});