// ==========================================================================
// 1. NAVEGACIÓN AL HACER SCROLL
// ==========================================================================
window.addEventListener('scroll', () => {
    const nav = document.getElementById('navbar');
    if (window.scrollY > 50) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }
});

// ==========================================================================
// 2. GALERÍA MODERNA DE HABITACIONES
// ==========================================================================
// Configuración de las imágenes y datos de las habitaciones
const roomImages = [
    'static/img/hab/hab1.jpeg',
    'static/img/hab/hab2.jpeg',
    'static/img/hab/hab3.jpeg',
    'static/img/hab/hab4.jpeg',
    'static/img/hab/hab5.jpeg'
];

const roomTitles = [
    'Suite Premium 1',
    'Suite Ejecutiva 2', 
    'Suite Familiar 3',
    'Habitación Deluxe 4',
    'Habitación Vista Montaña 5'
];

const roomDescriptions = [
    'Vista panorámica a las montañas • 45m² • Cama King Size',
    'Espacio de trabajo ejecutivo • 40m² • WiFi Premium',
    'Perfecta para familias • 55m² • Dos habitaciones',
    'Elegancia y confort • 35m² • Ducha de lluvia',
    'Vista privilegiada • 38m² • Balcón privado'
];

// Función para cambiar la imagen principal
window.changeRoomImage = function(index) {
    const mainImage = document.getElementById('main-room-image');
    const thumbnails = document.querySelectorAll('.thumbnail');
    
    // Validar índice
    if (index < 0 || index >= roomImages.length) {
        console.error('Índice de imagen inválido');
        return;
    }
    
    // Efecto de transición suave
    mainImage.style.opacity = '0.7';
    
    // Cambiar imagen principal después de un breve delay para la transición
    setTimeout(() => {
        mainImage.style.backgroundImage = `url('${roomImages[index]}')`;
        mainImage.style.opacity = '1';
    }, 300);
    
    // Actualizar información de la habitación
    const roomInfo = document.querySelector('.room-info');
    if (roomInfo) {
        roomInfo.querySelector('h3').textContent = roomTitles[index];
        roomInfo.querySelector('p').textContent = roomDescriptions[index];
    }
    
    // Actualizar thumbnails activos
    thumbnails.forEach((thumb, i) => {
        thumb.classList.toggle('active', i === index);
    });
    
    // Actualizar índice actual para auto-cambio
    if (typeof window.currentRoomIndex !== 'undefined') {
        window.currentRoomIndex = index;
    }
};

// ==========================================================================
// 3. INICIALIZACIÓN DE LA GALERÍA
// ==========================================================================
function initGallery() {
    const galleryElement = document.querySelector('.gallery-modern');
    
    if (!galleryElement) {
        console.log('Galería no encontrada en la página');
        return;
    }
    
    // Verificar que existan las imágenes de muestra
    console.log('Inicializando galería de habitaciones...');
    
    // Inicializar thumbnails
    const thumbnails = document.querySelectorAll('.thumbnail');
    thumbnails.forEach((thumb, index) => {
        thumb.addEventListener('click', () => {
            changeRoomImage(index);
        });
    });
    
    // Iniciar auto-cambio cada 8 segundos
    startAutoChange();
}

// ==========================================================================
// 4. AUTO-CAMBIO DE IMÁGENES
// ==========================================================================
let autoChangeInterval;

function startAutoChange() {
    // Detener intervalo anterior si existe
    if (autoChangeInterval) {
        clearInterval(autoChangeInterval);
    }
    
    // Inicializar índice
    window.currentRoomIndex = 0;
    
    // Crear nuevo intervalo
    autoChangeInterval = setInterval(() => {
        window.currentRoomIndex = (window.currentRoomIndex + 1) % roomImages.length;
        changeRoomImage(window.currentRoomIndex);
    }, 8000); // Cambiar cada 8 segundos
}

// Pausar auto-cambio cuando el usuario interactúa
function pauseAutoChange() {
    if (autoChangeInterval) {
        clearInterval(autoChangeInterval);
        autoChangeInterval = null;
        
        // Reanudar después de 30 segundos de inactividad
        setTimeout(startAutoChange, 30000);
    }
}

// ==========================================================================
// 5. EVENT LISTENERS PARA INTERACCIÓN DEL USUARIO
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar galería
    initGallery();
    
    // Pausar auto-cambio cuando el usuario interactúa con los thumbnails
    document.querySelectorAll('.thumbnail').forEach(thumb => {
        thumb.addEventListener('mouseenter', pauseAutoChange);
        thumb.addEventListener('click', pauseAutoChange);
    });
    
    // Pausar auto-cambio cuando el usuario está en la sección de habitaciones
    const roomsSection = document.getElementById('habitaciones');
    if (roomsSection) {
        roomsSection.addEventListener('mouseenter', pauseAutoChange);
    }
    
    // Smooth scroll para enlaces de navegación
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Efecto hover para botones
    document.querySelectorAll('.btn-main, .btn-details, .btn-whatsapp').forEach(btn => {
        btn.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px)';
        });
        
        btn.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
});

// ==========================================================================
// 6. FUNCIÓN PARA SCROLL SUAVE AL HERO
// ==========================================================================
function scrollToHero() {
    const heroSection = document.querySelector('.hero');
    if (heroSection) {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
}

// ==========================================================================
// 7. MANEJO DE ERRORES DE IMÁGENES
// ==========================================================================
// Función para manejar errores en la carga de imágenes
function handleImageError(imgElement) {
    console.warn('Error cargando imagen:', imgElement.src);
    imgElement.style.display = 'none';
    
    // Mostrar un placeholder o mensaje
    const parent = imgElement.parentElement;
    if (parent && !parent.querySelector('.image-error')) {
        const errorMsg = document.createElement('div');
        errorMsg.className = 'image-error';
        errorMsg.textContent = 'Imagen no disponible';
        errorMsg.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            background: #f0f0f0;
            color: #666;
            font-size: 0.9rem;
        `;
        parent.appendChild(errorMsg);
    }
}

// Agregar event listeners para errores de imágenes
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('img').forEach(img => {
        img.addEventListener('error', function() {
            handleImageError(this);
        });
    });
});

// ==========================================================================
// 8. RESETEAR GALERÍA CUANDO EL USUARIO VUELVE A LA SECCIÓN
// ==========================================================================
// Observar cuando la sección de habitaciones entra en el viewport
if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !autoChangeInterval) {
                // Si la galería está visible y no hay auto-cambio activo, iniciarlo
                startAutoChange();
            }
        });
    }, {
        threshold: 0.3
    });
    
    const roomsSection = document.getElementById('habitaciones');
    if (roomsSection) {
        observer.observe(roomsSection);
    }
}

// ==========================================================================
// 9. EXPORTAR FUNCIONES PARA USO GLOBAL
// ==========================================================================
// Hacer funciones disponibles globalmente
window.pauseAutoChange = pauseAutoChange;
window.startAutoChange = startAutoChange;
window.scrollToHero = scrollToHero;

console.log('Hotel La Reliquia - JavaScript cargado correctamente');