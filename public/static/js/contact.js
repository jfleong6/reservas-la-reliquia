import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const contactForm = document.getElementById('contact-form');

// FUNCIÓN PARA LA ALERTA BONITA
function showAlert(message, type = 'success') {
    const container = document.getElementById('notification-container');
    const alert = document.createElement('div');
    alert.className = `custom-alert ${type === 'error' ? 'error' : ''}`;
    
    // Icono según el tipo
    const icon = type === 'success' ? '🌿' : '⚠️';
    
    alert.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(alert);

    // Eliminar la alerta después de 4 segundos
    setTimeout(() => {
        alert.style.animation = 'fadeOut 0.5s ease forwards';
        setTimeout(() => alert.remove(), 500);
    }, 4000);
}

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const btn = document.getElementById('contact-btn');
        const originalText = btn.innerText;
        
        btn.disabled = true;
        btn.innerText = "Enviando...";

        const contactData = {
            nombre: document.getElementById('contact-name').value,
            email: document.getElementById('contact-email').value,
            mensaje: document.getElementById('contact-message').value,
            fecha: serverTimestamp(),
            leido: false
        };

        try {
            await addDoc(collection(db, "contactos"), contactData);
            
            // USAMOS LA ALERTA BONITA AQUÍ
            showAlert("¡Mensaje recibido! Nos contactaremos pronto.");
            contactForm.reset();
            
        } catch (error) {
            console.error("Error:", error);
            showAlert("Hubo un error al enviar el mensaje.", "error");
        } finally {
            btn.disabled = false;
            btn.innerText = originalText;
        }
    });
}