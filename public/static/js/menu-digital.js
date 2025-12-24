import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { addToCart, toggleCart, updateCartUI, checkout } from './cart.js';

let menuData = {};
let currentCat = '';
let currentIndex = 0;

async function initCategories() {
    const querySnapshot = await getDocs(collection(db, "categorias"));
    const nav = document.getElementById('cat-nav');
    nav.innerHTML = '';

    querySnapshot.forEach((doc) => {
        const catId = doc.id;
        if (!currentCat) currentCat = catId;
        
        const btn = document.createElement('button');
        btn.className = `cat-btn ${currentCat === catId ? 'active' : ''}`;
        btn.innerText = catId.toUpperCase();
        btn.onclick = (e) => window.changeCategory(catId, e.target);
        nav.appendChild(btn);
    });
    loadDishes(currentCat);
}

async function loadDishes(catId) {
    if (!menuData[catId]) {
        const snap = await getDocs(collection(db, "categorias", catId, "platos"));
        menuData[catId] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    currentIndex = 0;
    render();
}

// ... (mantenemos el inicio del archivo igual hasta llegar a render)
function render() {
    const container = document.getElementById('dish-container');
    const platos = menuData[currentCat] || [];
    const plato = platos[currentIndex];
    if (!plato) return;

    // Aplicamos la clase de entrada para que el nuevo contenido aparezca suavemente
    container.classList.remove('fade-out');
    container.classList.add('fade-in');

    container.innerHTML = `
        <div class="dish-card">
            <div class="dish-image" style="background-image:url('${plato.foto}')">
            </div>
            <div class="dish-info controls">
                <button class="nav-btn" onclick="moveDish(-1)">❮</button>
                <div>
                    <h2>${plato.nombre}</h2>
                    <div class="price">$${plato.precio.toLocaleString()}</div>
                    <p class="desc">${plato.desc}</p>
                    
                </div>
                <button class="nav-btn" onclick="moveDish(1)">❯</button>
            </div>
        </div>`;
    
    // El botón de agregar al carrito estaba comentado, aquí lo reactivamos si lo necesitas
    // <button class="add-to-cart-btn" id="add-to-cart-btn">Agregar al Carrito</button>
    // const btn = document.getElementById('add-to-cart-btn');
    if(btn) btn.onclick = () => addToCart(plato);
}

// Nueva función genérica para transiciones suaves
function transitionContent(callback) {
    const container = document.getElementById('dish-container');
    container.classList.add('fade-out');
    
    // Esperamos 300ms (lo que dura la transición CSS) antes de cambiar los datos
    setTimeout(() => {
        callback();
    }, 300);
}

window.moveDish = (step) => {
    transitionContent(() => {
        const total = menuData[currentCat].length;
        currentIndex = (currentIndex + step + total) % total;
        render();
    });
};

window.changeCategory = (catId, btn) => {
    // Si ya estamos en la categoría, no hacemos nada
    if (currentCat === catId) return;

    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    transitionContent(() => {
        currentCat = catId;
        loadDishes(catId);
    });
};

document.getElementById('open-cart-btn').onclick = toggleCart;
document.getElementById('close-cart-btn').onclick = toggleCart;
document.getElementById('btn-checkout').onclick = checkout;

document.addEventListener('DOMContentLoaded', () => {
    initCategories();
    updateCartUI();
});