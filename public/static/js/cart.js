import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let cart = JSON.parse(localStorage.getItem('oasis_cart')) || [];

export function toggleCart() {
    document.getElementById('cart-modal').classList.toggle('open');
}

export function addToCart(plato) {
    const itemExistente = cart.find(item => item.id === plato.id);
    if (itemExistente) {
        itemExistente.qty++;
    } else {
        cart.push({ ...plato, qty: 1 });
    }
    saveCart();
    updateCartUI();
}

function saveCart() {
    localStorage.setItem('oasis_cart', JSON.stringify(cart));
}

export function updateCartUI() {
    const itemsContainer = document.getElementById('cart-items');
    const totalLabel = document.getElementById('cart-total');
    const countLabel = document.getElementById('cart-count');

    itemsContainer.innerHTML = '';
    let total = 0;
    let totalQty = 0;

    cart.forEach(item => {
        total += item.precio * item.qty;
        totalQty += item.qty;

        itemsContainer.innerHTML += `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h4>${item.nombre}</h4>
                    <small>$${item.precio}</small>
                </div>
                <div class="qty-controls">
                    <button class="qty-btn" onclick="updateQty('${item.id}', -1)">-</button>
                    <span>${item.qty}</span>
                    <button class="qty-btn" onclick="updateQty('${item.id}', 1)">+</button>
                </div>
            </div>
        `;
    });

    totalLabel.innerText = `$${total.toLocaleString()}`;
    countLabel.innerText = totalQty;
}

window.updateQty = (id, change) => {
    const item = cart.find(i => i.id === id);
    if (item) {
        item.qty += change;
        if (item.qty <= 0) {
            cart = cart.filter(i => i.id !== id);
        }
        saveCart();
        updateCartUI();
    }
};

export function checkout() {
    if (cart.length === 0) return alert("El carrito está vacío.");

    onAuthStateChanged(auth, (user) => {
        if (user) {
            alert(`Pedido confirmado para ${user.email}. ¡Gracias!`);
            cart = [];
            saveCart();
            updateCartUI();
            toggleCart();
        } else {
            alert("Debes iniciar sesión para completar el pedido.");
            window.location.href = 'login.html';
        }
    });
}