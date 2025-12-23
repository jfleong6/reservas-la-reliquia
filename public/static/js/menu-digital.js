import { db, auth } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { addToCart, toggleCart, updateCartUI, checkout } from './cart.js';

let menuData = {};
let currentCat = '';
let currentIndex = 0;

// 1. Inicializar Categorías desde Firebase
async function initCategories() {
    const querySnapshot = await getDocs(collection(db, "categorias"));
    const nav = document.getElementById('cat-nav');
    nav.innerHTML = '';

    querySnapshot.forEach((doc) => {
        const catId = doc.id;
        if (!currentCat) currentCat = catId; // Selecciona la primera por defecto

        const btn = document.createElement('button');
        btn.className = `cat-btn ${currentCat === catId ? 'active' : ''}`;
        btn.innerText = catId.toUpperCase();
        btn.onclick = (e) => changeCategory(catId, e.target);
        nav.appendChild(btn);
    });

    loadDishes(currentCat);
}

// 2. Cargar Platos de una Categoría (Subcolección)
async function loadDishes(catId) {
    if (!menuData[catId]) {
        const platosRef = collection(db, "categorias", catId, "platos");
        const snap = await getDocs(platosRef);
        menuData[catId] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    currentIndex = 0;
    render();
}

// 3. Renderizar Plato Actual
function render() {
    const container = document.getElementById('dish-container');
    const dotsContainer = document.getElementById('dots-container');
    const platos = menuData[currentCat] || [];
    const plato = platos[currentIndex];

    if (!plato) return;

    container.innerHTML = `
        <div class="dish-card">
            <div class="dish-image" style="background-image:url('${plato.foto}')">
            </div>
            <div class="dish-info">
                <div>
                    <h2>${plato.nombre}</h2>
                    <div class="price">$ ${plato.precio}</div>
                    <p class="desc">${plato.desc}</p>
                </div>
                <div class="controls">
                    <button class="nav-btn" onclick="moveDish(-1)">❮</button>
                    <button class="btn-add-cart" id="add-to-cart-btn">Añadir al Carrito</button>
                    <button class="nav-btn" onclick="moveDish(1)">❯</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('add-to-cart-btn').onclick = () => addToCart(plato);

    dotsContainer.innerHTML = platos.map((_, i) =>
        `<div class="dot ${i === currentIndex ? 'active' : ''}"></div>`
    ).join('');
}

// Funciones globales para botones onclick
window.moveDish = (step) => {
    const total = menuData[currentCat].length;
    currentIndex = (currentIndex + step + total) % total;
    render();
};

window.changeCategory = (catId, btn) => {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    btn.scrollIntoView({ behavior: 'smooth', inline: 'center' });
    currentCat = catId;
    loadDishes(catId);
};

// Eventos de interfaz
document.getElementById('open-cart-btn').onclick = toggleCart;
document.getElementById('close-cart-btn').onclick = toggleCart;
document.getElementById('btn-checkout').onclick = checkout;

document.addEventListener('DOMContentLoaded', () => {
    initCategories();
    updateCartUI(); // Carga carrito desde localStorage
});