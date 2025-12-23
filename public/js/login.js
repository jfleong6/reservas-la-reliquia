
// *****************************************************************
// 2. CONFIGURACIÓN DE TU PROYECTO FIREBASE
// DEBES REEMPLAZAR ESTOS VALORES CON LOS DE TU CONSOLA FIREBASE
// *****************************************************************
const firebaseConfig = {
    apiKey: "AIzaSyCp3oscTZSuU82ZwOdHOL03uibtgCZoc-w",
    authDomain: "hotel-la-reliquia.firebaseapp.com",
    projectId: "hotel-la-reliquia",
    storageBucket: "hotel-la-reliquia.firebasestorage.app",
    messagingSenderId: "318030903600",
    appId: "1:318030903600:web:bacc5e923f02231c2870f5",
    measurementId: "G-ZDQX7Y4QRM"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referencia a la autenticación
const auth = firebase.auth();
const loginForm = document.getElementById('login-form');
const mensajeDiv = document.getElementById('mensaje');

// Función para mostrar mensajes de error/éxito
const mostrarMensaje = (msg, isError = false) => {
    mensajeDiv.textContent = msg;
    mensajeDiv.className = isError ? 'error' : 'success';
};

// Listener para el envío del formulario
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Intentar iniciar sesión
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // ÉXITO
            const user = userCredential.user;

            // CRÍTICO: Guardar la información del usuario en localStorage
            localStorage.setItem('user_uid', user.uid);
            localStorage.setItem('user_email', user.email);

            mostrarMensaje(`Bienvenido, ${user.email}. Redirigiendo...`, false);

            // Redirigir a la página principal después de un breve retraso
            setTimeout(() => {
                window.location.href = 'reservas.html';
            }, 1500);
        })
        .catch((error) => {
            // FALLO
            let errorMessage = 'Error de autenticación.';
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    errorMessage = 'Usuario o contraseña inválidos.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Formato de correo inválido.';
                    break;
                default:
                    errorMessage = `Error: ${error.message}`;
            }
            mostrarMensaje(errorMessage, true);
        });
});
