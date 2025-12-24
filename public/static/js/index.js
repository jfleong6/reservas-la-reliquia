
const track = document.getElementById('room-track');
let currentSlide = 0;
const maxImages = 10; // Límite de búsqueda

// Función para cargar imágenes dinámicamente
function loadRooms() {
    for (let i = 1; i <= maxImages; i++) {
        const imgPath = `static/img/hab/hab${i}.jpeg`;

        // Creamos el elemento slide
        const slide = document.createElement('div');
        slide.className = 'slide';
        slide.style.backgroundImage = `url('${imgPath}')`;

        // Agregamos un pequeño texto descriptivo opcional
        slide.innerHTML = `
                <div class="slide-info">
                    <h3>Suite Reliquia ${i}</h3>
                    <p>Confort y naturaleza en un solo lugar.</p>
                </div>
            `;

        // Validación: Solo lo agregamos si la imagen existe (opcional pero recomendado)
        // Aquí simplemente las agregamos confiando en tu estructura
        track.appendChild(slide);
    }
}

function moveSlide(direction) {
    const slides = document.querySelectorAll('.slide');
    currentSlide += direction;

    if (currentSlide >= slides.length) currentSlide = 0;
    if (currentSlide < 0) currentSlide = slides.length - 1;

    track.style.transform = `translateX(-${currentSlide * 100}%)`;
}

// Inicializar
loadRooms();

// Auto-play cada 5 segundos
setInterval(() => moveSlide(1), 5000);
