// Importamos la configuración centralizada
import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const loginForm = document.getElementById('login-form');
const mensajeDiv = document.getElementById('mensaje');

// Función para mostrar mensajes
const mostrarMensaje = (msg, isError = false) => {
    mensajeDiv.textContent = msg;
    mensajeDiv.className = isError ? 'error-msg' : 'success-msg';
    // Estilo rápido por JS si no tienes el CSS
    mensajeDiv.style.color = isError ? "#e74c3c" : "#27ae60";
};

// Listener para el envío del formulario
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        // Usamos la función modular de Firebase v10
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Guardar persistencia local
        localStorage.setItem('user_email', user.email);

        mostrarMensaje(`Bienvenido, ${user.email}. Redirigiendo...`, false);

        // Redirigir a la página del menú (o reservas según prefieras)
        setTimeout(() => {
            window.location.href = 'index.html'; 
        }, 1500);

    } catch (error) {
        let errorMessage = 'Error de autenticación.';
        console.error(error.code);
        
        switch (error.code) {
            case 'auth/invalid-credential':
                errorMessage = 'Usuario o contraseña incorrectos.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'El formato del correo no es válido.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Demasiados intentos. Intenta más tarde.';
                break;
            default:
                errorMessage = 'Error al intentar ingresar.';
        }
        mostrarMensaje(errorMessage, true);
    }
});