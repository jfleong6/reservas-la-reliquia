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

function render() {
    const container = document.getElementById('dish-container');
    const platos = menuData[currentCat] || [];
    const plato = platos[currentIndex];
    if (!plato) return;

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
    document.getElementById('add-to-cart-btn').onclick = () => addToCart(plato);
}

window.moveDish = (step) => {
    const total = menuData[currentCat].length;
    currentIndex = (currentIndex + step + total) % total;
    render();
};

window.changeCategory = (catId, btn) => {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCat = catId;
    loadDishes(catId);
};

document.getElementById('open-cart-btn').onclick = toggleCart;
document.getElementById('close-cart-btn').onclick = toggleCart;
document.getElementById('btn-checkout').onclick = checkout;

document.addEventListener('DOMContentLoaded', () => {
    initCategories();
    updateCartUI();
});