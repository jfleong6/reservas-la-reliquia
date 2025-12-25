// dashboard-mensajes.js - CON TIEMPO REAL
import { db } from './firebase-config.js';
import { 
    collection, 
    query, 
    orderBy, 
    getDocs, 
    updateDoc, 
    doc,
    where,
    limit,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

class MensajesManager {
    constructor() {
        this.messages = [];
        this.currentFilter = 'all';
        this.unsubscribeFunctions = [];
        this.isInitialized = false;
        this.container = null;
        this.badgeElement = null;
        
        // Referencia al módulo de actividades (para notificar)
        this.actividadesManager = null;
    }
    
    async init(actividadesManager = null) {
        if (this.isInitialized) return;
        
        this.container = document.querySelector('.messages-table tbody');
        this.badgeElement = document.querySelector('.menu-badge.badge-danger');
        
        if (!this.container) {
            console.error('Contenedor de mensajes no encontrado');
            return;
        }
        
        this.actividadesManager = actividadesManager;
        this.isInitialized = true;
        
        // Configurar listener en tiempo real
        this.setupRealTimeListener();
        
        // Cargar mensajes iniciales
        await this.loadMessages(this.currentFilter);
    }
    
    setupRealTimeListener() {
        // Limpiar listener anterior
        this.cleanupListeners();
        
        // Query para todos los mensajes (ordenados por fecha)
        const baseQuery = query(
            collection(db, "contactos"),
            orderBy("fecha", "desc")
        );
        
        const unsubscribe = onSnapshot(baseQuery, 
            (snapshot) => {
                console.log('🔄 Mensajes actualizados en tiempo real');
                this.handleMessagesUpdate(snapshot);
            },
            (error) => {
                console.error('Error en listener de mensajes:', error);
                this.showErrorMessage('Error de conexión');
            }
        );
        
        this.unsubscribeFunctions.push(unsubscribe);
    }
    
    handleMessagesUpdate(snapshot) {
        const newMessages = [];
        let unreadCount = 0;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const message = {
                id: doc.id,
                ...data,
                timestamp: data.fecha?.toDate() || new Date()
            };
            
            newMessages.push(message);
            
            // Contar no leídos
            if (!data.leido) {
                unreadCount++;
                
                // Notificar al módulo de actividades si el mensaje es nuevo
                if (this.isMessageNew(message)) {
                    this.notifyNewMessage(message);
                }
            }
        });
        
        // Actualizar lista local
        this.messages = newMessages;
        
        // Actualizar contador de no leídos
        this.updateUnreadCount(unreadCount);
        
        // Filtrar según el filtro actual y renderizar
        this.applyCurrentFilter();
    }
    
    isMessageNew(message) {
        // Un mensaje es "nuevo" si:
        // 1. No está leído
        // 2. Fue creado en los últimos 5 minutos
        // 3. No está ya en nuestra lista local
        if (message.leido) return false;
        
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const isRecent = message.timestamp > fiveMinutesAgo;
        
        const alreadyExists = this.messages.some(m => m.id === message.id);
        
        return isRecent && !alreadyExists;
    }
    
    notifyNewMessage(message) {
        // Notificar al módulo de actividades
        if (this.actividadesManager) {
            this.actividadesManager.addActivity({
                type: 'mensaje',
                icon: 'envelope',
                color: 'message',
                title: `Nuevo mensaje de ${message.nombre}`,
                description: this.truncateText(message.mensaje, 60),
                metadata: message.email,
                data: message
            });
        }
        
        // Mostrar notificación toast
        this.showNewMessageNotification(message);
    }
    
    showNewMessageNotification(message) {
        // Crear toast notification
        const toast = document.createElement('div');
        toast.className = 'new-message-toast';
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas fa-envelope"></i>
            </div>
            <div class="toast-content">
                <strong>Nuevo mensaje</strong>
                <p>De: ${message.nombre}</p>
            </div>
            <button class="toast-close">&times;</button>
        `;
        
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border-left: 4px solid var(--warning);
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-lg);
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            z-index: 9999;
            animation: slideInRight 0.3s ease;
            max-width: 350px;
        `;
        
        document.body.appendChild(toast);
        
        // Cerrar toast
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            toast.remove();
        });
        
        // Auto-remove después de 5 segundos
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideOutRight 0.3s ease forwards';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
        
        // Click en toast para ver mensaje
        toast.addEventListener('click', (e) => {
            if (!e.target.classList.contains('toast-close')) {
                this.showMessageDetail(message);
                toast.remove();
            }
        });
    }
    
    updateUnreadCount(count) {
        // Actualizar badge en sidebar
        if (this.badgeElement) {
            this.badgeElement.textContent = count > 99 ? '99+' : count;
            this.badgeElement.style.display = count > 0 ? 'flex' : 'none';
        }
        
        // Actualizar contador en header
        const notificationCount = document.querySelector('.notification-count');
        if (notificationCount) {
            notificationCount.textContent = count > 99 ? '99+' : count;
            notificationCount.style.display = count > 0 ? 'flex' : 'none';
        }
        
        // Actualizar título de la página si hay mensajes nuevos
        const pageTitle = document.querySelector('.page-title');
        if (pageTitle && count > 0) {
            const originalTitle = pageTitle.dataset.originalTitle || pageTitle.textContent;
            pageTitle.dataset.originalTitle = originalTitle;
            
            if (!pageTitle.dataset.hasUnread) {
                pageTitle.textContent = `${originalTitle} (${count} nuevo${count !== 1 ? 's' : ''})`;
                pageTitle.dataset.hasUnread = true;
            }
        }
    }
    
    async loadMessages(filter = 'all') {
        this.currentFilter = filter;
        
        if (!this.isInitialized) {
            await this.init();
        }
        
        // Con tiempo real, los mensajes ya están cargados
        // Solo necesitamos aplicar el filtro
        this.applyCurrentFilter();
    }
    
    applyCurrentFilter() {
        let filteredMessages = [...this.messages];
        
        switch(this.currentFilter) {
            case 'unread':
                filteredMessages = filteredMessages.filter(msg => !msg.leido);
                break;
            case 'responded':
                filteredMessages = filteredMessages.filter(msg => msg.respondido);
                break;
            // 'all' no filtra
        }
        
        this.renderMessages(filteredMessages);
    }
    
    renderMessages(messages) {
        if (!this.container) return;
        
        if (messages.length === 0) {
            this.container.innerHTML = `
                <tr class="no-messages-row">
                    <td colspan="6">
                        <div class="no-messages">
                            <i class="fas fa-inbox"></i>
                            <p>No hay mensajes ${this.getFilterText()}</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        this.container.innerHTML = messages.map(msg => `
            <tr data-message-id="${msg.id}" class="${!msg.leido ? 'unread-row' : ''}">
                <td class="${msg.leido ? '' : 'unread-indicator'}">
                    ${!msg.leido ? '<div class="unread-dot pulsating"></div>' : ''}
                    ${msg.nombre}
                </td>
                <td>${msg.email}</td>
                <td>${this.truncateText(msg.mensaje, 60)}</td>
                <td>${this.formatDate(msg.timestamp)}</td>
                <td>
                    <span class="status-badge ${this.getStatusClass(msg)}">
                        ${this.getStatusText(msg)}
                    </span>
                </td>
                <td>
                    <button class="btn-icon view-message" title="Ver" data-id="${msg.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${!msg.respondido ? `
                        <button class="btn-icon mark-responded" title="Marcar como respondido" data-id="${msg.id}">
                            <i class="fas fa-reply"></i>
                        </button>
                    ` : ''}
                    <button class="btn-icon toggle-read" title="${msg.leido ? 'Marcar no leído' : 'Marcar leído'}" data-id="${msg.id}">
                        <i class="fas fa-envelope${msg.leido ? '' : '-open'}"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
        this.setupMessageActions();
    }
    
    getFilterText() {
        switch(this.currentFilter) {
            case 'unread': return 'no leídos';
            case 'responded': return 'respondidos';
            default: return '';
        }
    }
    
    async markAsRead(messageId) {
        try {
            const messageRef = doc(db, "contactos", messageId);
            await updateDoc(messageRef, {
                leido: true
            });
            // No necesitamos recargar - onSnapshot lo hará automáticamente
        } catch (error) {
            console.error('Error marcando como leído:', error);
            alert('Error al actualizar el mensaje');
        }
    }
    
    async markAsResponded(messageId) {
        try {
            const messageRef = doc(db, "contactos", messageId);
            await updateDoc(messageRef, {
                respondido: true,
                leido: true
            });
            
            // También notificar al módulo de actividades
            if (this.actividadesManager) {
                const message = this.messages.find(m => m.id === messageId);
                if (message) {
                    this.actividadesManager.addActivity({
                        type: 'mensaje',
                        icon: 'reply',
                        color: 'success',
                        title: `Mensaje respondido`,
                        description: `A: ${message.nombre}`,
                        metadata: message.email,
                        data: { ...message, respondido: true }
                    });
                }
            }
        } catch (error) {
            console.error('Error marcando como respondido:', error);
            alert('Error al actualizar el mensaje');
        }
    }
    
    async toggleReadStatus(messageId) {
        const message = this.messages.find(m => m.id === messageId);
        if (!message) return;
        
        try {
            const messageRef = doc(db, "contactos", messageId);
            await updateDoc(messageRef, {
                leido: !message.leido
            });
        } catch (error) {
            console.error('Error cambiando estado de lectura:', error);
        }
    }
    
    // Métodos auxiliares (mantener iguales)
    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    formatDate(date) {
        if (!date) return 'N/A';
        
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return `Hoy ${date.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}`;
        } else if (diffDays === 1) {
            return `Ayer ${date.toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}`;
        } else {
            return date.toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }
    
    getStatusClass(message) {
        if (message.respondido) return 'responded';
        if (message.leido) return 'read';
        return 'pending';
    }
    
    getStatusText(message) {
        if (message.respondido) return 'Respondido';
        if (message.leido) return 'Leído';
        return 'No leído';
    }
    
    setupMessageActions() {
        // Ver mensaje completo
        document.querySelectorAll('.view-message').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const messageId = e.currentTarget.dataset.id;
                const message = this.messages.find(m => m.id === messageId);
                if (message) this.showMessageDetail(message);
            });
        });
        
        // Marcar como respondido
        document.querySelectorAll('.mark-responded').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const messageId = e.currentTarget.dataset.id;
                await this.markAsResponded(messageId);
            });
        });
        
        // Toggle leído/no leído
        document.querySelectorAll('.toggle-read').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const messageId = e.currentTarget.dataset.id;
                await this.toggleReadStatus(messageId);
            });
        });
    }
    
    showErrorMessage(message) {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <tr class="error-row">
                <td colspan="6">
                    <div class="error-messages">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>${message}</p>
                        <button class="btn-text retry-btn">Reintentar</button>
                    </div>
                </td>
            </tr>
        `;
        
        const retryBtn = this.container.querySelector('.retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.setupRealTimeListener();
            });
        }
    }
    
    cleanupListeners() {
        this.unsubscribeFunctions.forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') unsubscribe();
        });
        this.unsubscribeFunctions = [];
    }
    
    // Método para ser llamado desde otras partes del sistema
    notifyMessageAction(action, messageId) {
        // Este método permite que otros módulos notifiquen acciones sobre mensajes
        console.log(`Acción en mensaje: ${action} - ID: ${messageId}`);
        
        // Podemos disparar eventos personalizados
        const event = new CustomEvent('message-action', {
            detail: { action, messageId }
        });
        document.dispatchEvent(event);
    }
}

export const mensajesManager = new MensajesManager();