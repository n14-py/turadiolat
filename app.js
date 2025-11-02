document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. LÓGICA DEL MENÚ MÓVIL (Dark Mode) ---
    const menuToggle = document.getElementById('menu-toggle');
    const menuClose = document.getElementById('menu-close');
    const mobileMenu = document.getElementById('mobile-menu');
    const overlay = document.getElementById('overlay');

    if (menuToggle && mobileMenu && overlay) {
        menuToggle.addEventListener('click', () => {
            mobileMenu.classList.add('active');
            overlay.classList.add('active');
        });
    }

    const closeMenu = () => {
        if (mobileMenu) mobileMenu.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    };

    if (menuClose && mobileMenu && overlay) {
        menuClose.addEventListener('click', closeMenu);
        overlay.addEventListener('click', closeMenu);
    }
    
    if (mobileMenu) {
        mobileMenu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', closeMenu);
        });
    }

    // --- 2. CONFIGURACIÓN E INICIALIZACIÓN ---
    const API_URL = 'https://lfaftechapi.onrender.com/api'; // URL de tu API en Render
    const PLACEHOLDER_LOGO = 'images/placeholder-radio.png'; // Debes crear esta imagen

    const stationsContainer = document.getElementById('stations-container');
    const loadingMessage = document.getElementById('loading-message');
    const pageTitle = document.getElementById('page-title');
    const navLinks = document.querySelectorAll('.nav-link');

    // --- Reproductores ---
    const playerBar = document.getElementById('player-bar');
    const audioPlayer = document.getElementById('audio-player');
    const playerLogo = document.getElementById('player-logo');
    const playerNombre = document.getElementById('player-nombre');
    const playerPais = document.getElementById('player-pais');
    const playerClose = document.getElementById('player-close');

    // --- Menús de Países ---
    const dropdownPaises = document.getElementById('dropdown-paises');
    const mobilePaises = document.getElementById('mobile-paises');
    
    // --- ¡NUEVO! Elementos del Buscador ---
    const searchInput = document.getElementById('search-input');
    const searchForm = document.getElementById('search-form');
    const clearSearchButton = document.getElementById('clear-search-button');

    
    // --- 3. FUNCIONES DEL REPRODUCTOR DE AUDIO ---
    
    function playStation(station) {
        if (!audioPlayer || !playerBar) return;

        audioPlayer.src = station.stream_url;
        audioPlayer.play()
            .then(() => {
                playerLogo.src = station.logo || PLACEHOLDER_LOGO;
                playerLogo.onerror = () => { playerLogo.src = PLACEHOLDER_LOGO; };
                playerNombre.textContent = station.nombre;
                playerPais.textContent = station.pais;
                playerBar.classList.add('active');
            })
            .catch(error => {
                console.error("Error al reproducir la estación:", error);
                alert(`No se pudo reproducir la estación: ${station.nombre}. Puede que la transmisión no sea segura (HTTPS) o esté caída.`);
            });
    }

    if (playerClose && audioPlayer && playerBar) {
        playerClose.addEventListener('click', () => {
            audioPlayer.pause();
            audioPlayer.src = '';
            playerBar.classList.remove('active');
        });
    }

    // --- 4. FUNCIONES DE CARGA DE DATOS ---

    async function fetchPaises() {
        if (!dropdownPaises || !mobilePaises) return;

        try {
            const response = await fetch(`${API_URL}/radio/paises`);
            if (!response.ok) throw new Error('Error al cargar países');
            
            const paises = await response.json();
            
            paises.sort((a, b) => a.name.localeCompare(b.name));

            dropdownPaises.innerHTML = ''; // Limpiar "Cargando..."
            mobilePaises.innerHTML = ''; // Limpiar "Cargando..."
            
            paises.forEach(pais => {
                // Código de país en mayúsculas
                const countryCode = pais.code.toUpperCase();
                
                const link = `<li><a href="index.html?pais=${countryCode}" class="nav-link" data-filtro="${countryCode}">${pais.name}</a></li>`;
                dropdownPaises.innerHTML += link;

                const mobileLink = `<a href="index.html?pais=${countryCode}" class="nav-link" data-filtro="${countryCode}">${pais.name}</a>`;
                mobilePaises.innerHTML += mobileLink;
            });

        } catch (error) {
            console.error(error);
            dropdownPaises.innerHTML = '<li><a href="#">Error al cargar países</a></li>';
            mobilePaises.innerHTML = '<a href="#">Error al cargar países</a>';
        }
    }

    // --- ¡ACTUALIZADO! ---
    // Función principal de carga, ahora incluye lógica de búsqueda
    async function fetchStations() {
        if (!stationsContainer || !loadingMessage) return;

        stationsContainer.innerHTML = '';
        loadingMessage.style.display = 'block';

        // Restablecer el estilo del grid por si estaba en modo "Géneros"
        stationsContainer.style.display = 'grid';

        const params = new URLSearchParams(window.location.search);
        const query = params.get('query'); // ej: rock
        const pais = params.get('pais'); // ej: PY
        const genero = params.get('genero'); // ej: pop
        let filtro = params.get('filtro') || 'populares'; // ej: populares
        
        let url = `${API_URL}/radio/buscar?limite=100`;
        let tituloPagina = "Radios Populares";
        let activeFilter = filtro;

        if (query) {
            // 1. LÓGICA DE BÚSQUEDA (Prioridad Máxima)
            url = `${API_URL}/radio/buscar?query=${encodeURIComponent(query)}&limite=100`;
            tituloPagina = `Resultados para: "${query}"`;
            activeFilter = 'search'; // No marcamos ningún link
            if (searchInput) searchInput.value = query;
            if (clearSearchButton) clearSearchButton.style.display = 'inline-block';

        } else if (pais) {
            // 2. LÓGICA DE PAÍS
            url = `${API_URL}/radio/buscar?pais=${pais}&limite=200`;
            tituloPagina = `Radios de ${pais}`; // Se refinará con los datos
            activeFilter = pais; 
            if (clearSearchButton) clearSearchButton.style.display = 'none';

        } else if (genero) {
            // 3. LÓGICA DE GÉNERO
            url = `${API_URL}/radio/buscar?genero=${encodeURIComponent(genero)}&limite=200`;
            tituloPagina = `Radios de ${genero}`;
            activeFilter = 'generos';
            if (clearSearchButton) clearSearchButton.style.display = 'none';

        } else if (filtro === 'generos') {
            // 4. LÓGICA DE "PÁGINA DE GÉNEROS"
            loadingMessage.style.display = 'none';
            if (pageTitle) pageTitle.textContent = "Buscar por Género";
            fetchTags(); // Llamamos a la función que muestra los géneros
            activeFilter = 'generos';
            if (clearSearchButton) clearSearchButton.style.display = 'none';
            return; 
        } else {
            // 5. LÓGICA POR DEFECTO (Populares)
            if (clearSearchButton) clearSearchButton.style.display = 'none';
        }
        
        // Marcar el link activo
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.filtro === activeFilter) {
                link.classList.add('active');
            }
        });


        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Error al cargar estaciones');

            const stations = await response.json();
            loadingMessage.style.display = 'none';

            // Refinar título de la página (para países)
            if (pais && stations.length > 0) {
                tituloPagina = `Radios de ${stations[0].pais}`;
            } else if (genero) {
                 tituloPagina = `Radios de: ${genero.charAt(0).toUpperCase() + genero.slice(1)}`;
            }
            if (pageTitle) pageTitle.textContent = tituloPagina;
            
            if (stations.length === 0) {
                const message = query 
                    ? `No se encontraron resultados para "${query}".`
                    : 'No se encontraron estaciones para esta selección.';
                stationsContainer.innerHTML = `<p class="no-stations-message">${message}</p>`;
                return;
            }

            // Dibujar las tarjetas de radio
            stations.forEach(station => {
                const card = document.createElement('div');
                card.className = 'station-card';
                
                const logo = station.logo || PLACEHOLDER_LOGO;
                
                card.innerHTML = `
                    <img src="${logo}" alt="${station.nombre}" class="station-logo" onerror="this.onerror=null;this.src='${PLACEHOLDER_LOGO}';">
                    <h3 class="station-name" title="${station.nombre}">${station.nombre}</h3>
                    <p class="station-meta">${station.pais}</p>
                    <button class="btn-play">
                        <i class="fas fa-play"></i>
                        <span>Escuchar</span>
                    </button>
                `;

                // Añadir evento de clic al botón de Play
                card.querySelector('.btn-play').addEventListener('click', () => {
                    playStation(station);
                });
                
                stationsContainer.appendChild(card);
            });

        } catch (error) {
            console.error(error);
            loadingMessage.style.display = 'none';
            stationsContainer.innerHTML = `<p class="no-stations-message" style="color: red;">Error al conectar con el servidor de radios.</p>`;
        }
    }
    
    // Función para mostrar la lista de géneros
    async function fetchTags() {
        if (!stationsContainer || !loadingMessage) return;

        stationsContainer.innerHTML = '';
        loadingMessage.style.display = 'block';

        try {
            const response = await fetch(`${API_URL}/radio/generos`);
            if (!response.ok) throw new Error('Error al cargar géneros');

            const tags = await response.json();
            loadingMessage.style.display = 'none';

            // Estilos para la lista de géneros
            stationsContainer.style.display = 'flex';
            stationsContainer.style.flexWrap = 'wrap';
            stationsContainer.style.gap = '10px';
            stationsContainer.style.justifyContent = 'center';

            tags.forEach(tag => {
                const tagLink = document.createElement('a');
                tagLink.className = 'btn-play'; // Reusamos el estilo de botón
                tagLink.href = `index.html?genero=${encodeURIComponent(tag.name)}`;
                tagLink.style.textTransform = 'capitalize';
                tagLink.textContent = `${tag.name} (${tag.stationcount})`;
                stationsContainer.appendChild(tagLink);
            });

        } catch (error) {
            console.error(error);
            loadingMessage.style.display = 'none';
            stationsContainer.innerHTML = `<p class="no-stations-message" style="color: red;">Error al cargar los géneros.</p>`;
        }
    }

    // --- 5. EVENT LISTENERS PARA BÚSQUEDA ---
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = searchInput.value.trim();
            if (query) {
                // Redirige a la página de búsqueda
                window.location.href = `index.html?query=${encodeURIComponent(query)}`;
            }
        });
    }

    if (clearSearchButton) {
        clearSearchButton.addEventListener('click', () => {
            // Limpia la búsqueda y vuelve a 'Populares'
            window.location.href = 'index.html?filtro=populares'; 
        });
    }

    // --- 6. INICIAR LA APLICACIÓN ---
    fetchPaises();    // Cargar la lista de países en los menús
    fetchStations();  // Cargar las estaciones de la página actual
});