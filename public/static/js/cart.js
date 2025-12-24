import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let cart = JSON.parse(localStorage.getItem('oasis_cart')) || [];

export function toggleCart() {
    document.getElementById('cart-modal').classList.toggle('open');
}

export function addToCart(plato) {
    const exist = cart.find(item => item.id === plato.id);
    if (exist) { exist.qty++; } else { cart.push({ ...plato, qty: 1 }); }
    saveCart();
    updateCartUI();
}

export function updateCartUI() {
    const container = document.getElementById('cart-items');
    const totalLabel = document.getElementById('cart-total');
    const countLabel = document.getElementById('cart-count');
    let total = 0; let qty = 0;
    container.innerHTML = '';

    cart.forEach(item => {
        total += item.precio * item.qty;
        qty += item.qty;
        container.innerHTML += `
            <div class="cart-item">
                <div><h4>${item.nombre}</h4><small>$${item.precio}</small></div>
                <div class="qty-controls">
                    <button onclick="updateQty('${item.id}', -1)">-</button>
                    <span>${item.qty}</span>
                    <button onclick="updateQty('${item.id}', 1)">+</button>
                </div>
            </div>`;
    });
    totalLabel.innerText = `$${total.toLocaleString()}`;
    countLabel.innerText = qty;
}

window.updateQty = (id, change) => {
    const item = cart.find(i => i.id === id);
    if (item) {
        item.qty += change;
        if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
        saveCart(); updateCartUI();
    }
};

function saveCart() { localStorage.setItem('oasis_cart', JSON.stringify(cart)); }

export function checkout() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            alert("Pedido procesado con éxito.");
            cart = []; saveCart(); updateCartUI(); toggleCart();
        } else {
            alert("Inicia sesión para finalizar.");
            window.location.href = 'login.html';
        }
    });
}