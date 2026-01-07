// dashboard-firebase.js
import { auth, db } from './firebase-config.js';

import { 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    updateDoc, 
    doc, 
    onSnapshot,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

class DashboardFirebase {
    constructor() {
        this.user = null;
        this.init();
    }
    
    async init() {
        this.setupAuthListener();
    }
    
    setupAuthListener() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.user = user;
                // console.log(user);
                this.loadUserData();
                this.loadUnreadMessagesCount();
                this.loadRecentActivity();
            } else {
                window.location.href = 'login.html';
            }
        });
    }
    
    loadUserData() {
        // Actualizar UI con datos del usuario
        const userElements = {
            name: document.querySelector('.user-name'),
            email: document.querySelector('.user-email'),
            headerEmail: document.querySelector('.footer-links strong')
        };
        
        if (userElements.name) userElements.name.textContent = this.user.displayName || 'Administrador';
        if (userElements.email) userElements.email.textContent = this.user.email;
        if (userElements.headerEmail) userElements.headerEmail.textContent = this.user.email;
    }
    
    async loadUnreadMessagesCount() {
        const q = query(
            collection(db, "contactos"), 
            where("leido", "==", false)
        );
        
        const snapshot = await getDocs(q);
        const count = snapshot.size;
        
        // Actualizar badge en sidebar
        const badge = document.querySelector('.menu-badge.badge-danger');
        if (badge) badge.textContent = count;
        
        // Actualizar notificación count
        const notificationCount = document.querySelector('.notification-count');
        if (notificationCount) notificationCount.textContent = count;
        
        return count;
    }
    
    async loadRecentActivity() {
        // Cargar últimos mensajes y reservas para dashboard
        
    }
    
    async logout() {
        try {
            await signOut(auth);
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            alert('Error al cerrar sesión. Intenta nuevamente.');
        }
    }
}

export const dashboardFirebase = new DashboardFirebase();