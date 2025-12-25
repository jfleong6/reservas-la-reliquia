// dashboard-actividades.js - VERSIÓN COMPLETA
import { db } from './firebase-config.js';
import { 
    collection, 
    query, 
    orderBy, 
    getDocs,
    limit,
    onSnapshot,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

class ActividadesManager {
    constructor() {
        this.activities = [];
        this.maxActivities = 20;
        this.unsubscribeFunctions = [];
        this.isInitialized = false;
        this.loadingElement = null;
        this.container = null;
    }
    
    // ✅ MÉTODO 1: Inicialización con tiempo real
    async init() {
        if (this.isInitialized) return;
        
        this.container = document.querySelector('.activity-list');
        if (!this.container) {
            console.error('Contenedor de actividades no encontrado');
            return;
        }
        
        this.showLoadingState();
        this.isInitialized = true;
        
        // Configurar listeners en tiempo real
        this.setupRealTimeListeners();
        
        // También cargar datos iniciales
        await this.loadInitialActivities();
        
        return this.activities;
    }
    
    // ✅ MÉTODO 2: Carga tradicional (para compatibilidad)
    async loadRecentActivities() {
        try {
            console.log('📊 Cargando actividades recientes...');
            
            // Si ya tenemos actividades cargadas, solo renderizar
            if (this.activities.length > 0) {
                this.renderActivities();
                return this.activities;
            }
            
            // Si no hay actividades, cargar datos iniciales
            const activities = [];
            
            // 1. Cargar últimos mensajes
            const mensajesQuery = query(
                collection(db, "contactos"),
                orderBy("fecha", "desc"),
                limit(5)
            );
            const mensajesSnapshot = await getDocs(mensajesQuery);
            
            mensajesSnapshot.forEach(doc => {
                const data = doc.data();
                activities.push({
                    id: doc.id,
                    type: 'mensaje',
                    icon: 'envelope',
                    color: 'message',
                    title: `Mensaje de ${data.nombre}`,
                    description: this.truncateText(data.mensaje, 80),
                    metadata: data.email,
                    timestamp: data.fecha?.toDate() || new Date(),
                    data: data,
                    isNew: data.leido === false
                });
            });
            
            // 2. Cargar últimas reservas
            const reservasQuery = query(
                collection(db, "reservas_activas"),
                orderBy("fecha_creacion", "desc"),
                limit(5)
            );
            const reservasSnapshot = await getDocs(reservasQuery);
            
            reservasSnapshot.forEach(doc => {
                const data = doc.data();
                activities.push({
                    id: doc.id,
                    type: 'reserva',
                    icon: 'calendar-plus',
                    color: 'reservation',
                    title: `Reserva - Hab. ${data.numero_habitacion}`,
                    description: data.huesped_nombre || 'Sin nombre',
                    metadata: data.estado_sincro || 'PENDIENTE',
                    timestamp: data.fecha_creacion?.toDate() || new Date(),
                    data: data
                });
            });
            
            // 3. Ordenar por fecha
            activities.sort((a, b) => b.timestamp - a.timestamp);
            
            // 4. Limitar
            this.activities = activities.slice(0, this.maxActivities);
            
            // 5. Renderizar
            this.renderActivities();
            
            console.log(`✅ ${this.activities.length} actividades cargadas`);
            return this.activities;
            
        } catch (error) {
            console.error('❌ Error cargando actividades:', error);
            this.showErrorState('Error al cargar actividades');
            throw error;
        }
    }
    
    // ✅ MÉTODO 3: Inicialización con tiempo real
    async loadInitialActivities() {
        try {
            // Cargar datos iniciales usando el método tradicional
            await this.loadRecentActivities();
        } catch (error) {
            console.error('Error en carga inicial:', error);
            this.showErrorState();
        }
    }
    
    // ✅ MÉTODO 4: Configurar listeners de tiempo real
    setupRealTimeListeners() {
        // Limpiar listeners anteriores
        this.cleanupListeners();
        
        // 1. Listener para mensajes
        const mensajesQuery = query(
            collection(db, "contactos"),
            orderBy("fecha", "desc"),
            limit(10)
        );
        
        const unsubscribeMensajes = onSnapshot(mensajesQuery, 
            (snapshot) => {
                console.log('📩 Mensajes actualizados en tiempo real');
                this.handleMensajesUpdate(snapshot);
            },
            (error) => {
                console.error('Error en listener de mensajes:', error);
            }
        );
        
        // 2. Listener para reservas
        const reservasQuery = query(
            collection(db, "reservas_activas"),
            orderBy("fecha_creacion", "desc"),
            limit(10)
        );
        
        const unsubscribeReservas = onSnapshot(reservasQuery, 
            (snapshot) => {
                console.log('📅 Reservas actualizadas en tiempo real');
                this.handleReservasUpdate(snapshot);
            },
            (error) => {
                console.error('Error en listener de reservas:', error);
            }
        );
        
        // Guardar funciones para limpiar
        this.unsubscribeFunctions.push(unsubscribeMensajes, unsubscribeReservas);
    }
    
    // ✅ MÉTODO 5: Manejar actualización de mensajes
    handleMensajesUpdate(snapshot) {
        const mensajesActivities = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            mensajesActivities.push({
                id: doc.id,
                type: 'mensaje',
                icon: 'envelope',
                color: 'message',
                title: `Mensaje de ${data.nombre}`,
                description: this.truncateText(data.mensaje, 80),
                metadata: data.email,
                timestamp: data.fecha?.toDate() || new Date(),
                data: data,
                isNew: data.leido === false
            });
        });
        
        // Actualizar actividades existentes o añadir nuevas
        this.updateActivitiesByType('mensaje', mensajesActivities);
    }
    
    // ✅ MÉTODO 6: Manejar actualización de reservas
    handleReservasUpdate(snapshot) {
        const reservasActivities = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            reservasActivities.push({
                id: doc.id,
                type: 'reserva',
                icon: 'calendar-plus',
                color: 'reservation',
                title: `Reserva - Hab. ${data.numero_habitacion}`,
                description: data.huesped_nombre || 'Sin nombre',
                metadata: data.estado_sincro || 'PENDIENTE',
                timestamp: data.fecha_creacion?.toDate() || new Date(),
                data: data
            });
        });
        
        this.updateActivitiesByType('reserva', reservasActivities);
    }
    
    // ✅ MÉTODO 7: Actualizar actividades por tipo
    updateActivitiesByType(type, newActivities) {
        // Filtrar actividades existentes de este tipo
        const otherActivities = this.activities.filter(a => a.type !== type);
        
        // Combinar con nuevas actividades
        this.activities = [...otherActivities, ...newActivities];
        
        // Ordenar por fecha (más reciente primero)
        this.activities.sort((a, b) => b.timestamp - a.timestamp);
        
        // Limitar al máximo
        this.activities = this.activities.slice(0, this.maxActivities);
        
        // Renderizar
        this.renderActivities();
    }
    
    // ✅ MÉTODO 8: Renderizar actividades
    renderActivities() {
        if (!this.container) return;
        
        if (this.activities.length === 0) {
            this.showEmptyState();
            return;
        }
        
        this.container.innerHTML = this.activities.map((activity, index) => `
            <div class="activity-item ${activity.isNew ? 'new-activity' : ''}" 
                 data-activity-id="${activity.id}" 
                 data-activity-type="${activity.type}">
                <div class="activity-icon ${activity.color}">
                    <i class="fas fa-${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <p><strong>${activity.title}</strong></p>
                    <span class="activity-meta">${activity.description}</span>
                    ${activity.metadata ? `<span class="activity-tag">${activity.metadata}</span>` : ''}
                </div>
                <span class="activity-time" title="${this.formatFullDate(activity.timestamp)}">
                    ${this.formatRelativeTime(activity.timestamp)}
                </span>
                ${index === 0 && activity.isNew ? '<div class="new-indicator" title="Nuevo"></div>' : ''}
            </div>
        `).join('');
        
        this.setupActivityClickHandlers();
    }
    
    // ✅ MÉTODO 9: Configurar handlers de clic
    setupActivityClickHandlers() {
        document.querySelectorAll('.activity-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const activityId = e.currentTarget.dataset.activityId;
                const activityType = e.currentTarget.dataset.activityType;
                const activity = this.activities.find(a => a.id === activityId && a.type === activityType);
                
                if (activity) {
                    this.showActivityDetail(activity);
                    
                    // Marcar como leído si es mensaje nuevo
                    if (activity.type === 'mensaje' && activity.isNew) {
                        this.markMessageAsRead(activity.id);
                    }
                }
            });
        });
    }
    
    // ✅ MÉTODO 10: Mostrar detalle de actividad
    showActivityDetail(activity) {
        let modalContent = '';
        let modalTitle = '';
        
        switch(activity.type) {
            case 'mensaje':
                modalTitle = `Mensaje de ${activity.data.nombre}`;
                modalContent = `
                    <div class="activity-detail-content">
                        <div class="detail-section">
                            <h4><i class="fas fa-user"></i> Información del contacto</h4>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <label>Nombre:</label>
                                    <span>${activity.data.nombre}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Email:</label>
                                    <span>${activity.data.email}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Fecha:</label>
                                    <span>${this.formatFullDate(activity.timestamp)}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Estado:</label>
                                    <span class="status-badge ${activity.data.leido ? 'read' : 'pending'}">
                                        ${activity.data.leido ? 'Leído' : 'No leído'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h4><i class="fas fa-comment-alt"></i> Mensaje</h4>
                            <div class="message-content-box">
                                <p>${activity.data.mensaje.replace(/\n/g, '<br>')}</p>
                            </div>
                        </div>
                    </div>
                `;
                break;
                
            case 'reserva':
                modalTitle = `Reserva - Hab. ${activity.data.numero_habitacion}`;
                const llegada = activity.data.fecha_llegada?.toDate();
                const salida = activity.data.fecha_salida?.toDate();
                const noches = llegada && salida ? 
                    Math.ceil((salida - llegada) / (1000 * 60 * 60 * 24)) : 0;
                
                modalContent = `
                    <div class="activity-detail-content">
                        <div class="detail-section">
                            <h4><i class="fas fa-info-circle"></i> Información de la reserva</h4>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <label>Habitación:</label>
                                    <span class="room-badge">${activity.data.numero_habitacion}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Huésped:</label>
                                    <span>${activity.data.huesped_nombre || 'No especificado'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Teléfono:</label>
                                    <span>${activity.data.huesped_telefono || 'No especificado'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Estado:</label>
                                    <span class="status-badge ${activity.data.estado_sincro === 'PENDIENTE' ? 'pending' : 'responded'}">
                                        ${activity.data.estado_sincro || 'PENDIENTE'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="detail-section">
                            <h4><i class="fas fa-calendar-alt"></i> Fechas</h4>
                            <div class="detail-grid">
                                <div class="detail-item">
                                    <label>Check-in:</label>
                                    <span>${llegada ? this.formatFullDate(llegada) : 'No especificado'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Check-out:</label>
                                    <span>${salida ? this.formatFullDate(salida) : 'No especificado'}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Noches:</label>
                                    <span>${noches} noche${noches !== 1 ? 's' : ''}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Creada:</label>
                                    <span>${this.formatFullDate(activity.timestamp)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                break;
        }
        
        this.showDetailModal(modalTitle, modalContent, activity);
    }
    
    // ✅ MÉTODO 11: Mostrar modal de detalle
    showDetailModal(title, content, activity) {
        const modalHTML = `
            <div class="modal-overlay show" id="activity-detail-modal">
                <div class="modal" style="max-width: 700px;">
                    <div class="modal-header">
                        <div class="modal-title-with-icon">
                            <div class="modal-icon ${activity.color}">
                                <i class="fas fa-${activity.icon}"></i>
                            </div>
                            <h3>${title}</h3>
                        </div>
                        <button class="close-modal" data-modal="activity-detail-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                    <div class="modal-footer">
                        <div class="modal-footer-left">
                            <span class="activity-timestamp">
                                <i class="far fa-clock"></i>
                                ${this.formatFullDate(activity.timestamp)}
                            </span>
                        </div>
                        <div class="modal-footer-right">
                            <button class="btn-primary close-modal" data-modal="activity-detail-modal">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        setTimeout(() => {
            const closeBtns = document.querySelectorAll('.close-modal[data-modal="activity-detail-modal"]');
            closeBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    document.getElementById('activity-detail-modal')?.remove();
                });
            });
        }, 100);
    }
    
    // ✅ MÉTODO 12: Marcar mensaje como leído (localmente)
    markMessageAsRead(messageId) {
        const activity = this.activities.find(a => a.id === messageId && a.type === 'mensaje');
        if (activity && activity.isNew) {
            activity.isNew = false;
            activity.data.leido = true;
            
            // Actualizar UI
            const activityElement = document.querySelector(`[data-activity-id="${messageId}"]`);
            if (activityElement) {
                activityElement.classList.remove('new-activity');
                activityElement.querySelector('.new-indicator')?.remove();
            }
        }
    }
    
    // ✅ MÉTODO 13: Formatear tiempo relativo
    formatRelativeTime(timestamp) {
        if (!timestamp) return 'Reciente';
        
        const now = new Date();
        const diffMs = now - timestamp;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);
        
        if (diffSec < 60) return 'Ahora';
        if (diffMin < 60) return `Hace ${diffMin} min`;
        if (diffHour < 24) return `Hace ${diffHour} h`;
        if (diffDay === 1) return 'Ayer';
        if (diffDay < 7) return `Hace ${diffDay} d`;
        
        return timestamp.toLocaleDateString('es-ES', { 
            day: 'numeric', 
            month: 'short' 
        });
    }
    
    // ✅ MÉTODO 14: Formatear fecha completa
    formatFullDate(timestamp) {
        if (!timestamp) return 'Fecha desconocida';
        
        return timestamp.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    // ✅ MÉTODO 15: Truncar texto
    truncateText(text, maxLength) {
        if (!text) return 'Sin descripción';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    // ✅ MÉTODO 16: Mostrar estado de carga
    showLoadingState() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="loading-activities">
                <div class="loading-spinner"></div>
                <p>Cargando actividades...</p>
            </div>
        `;
    }
    
    // ✅ MÉTODO 17: Mostrar estado vacío
    showEmptyState() {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="no-activities">
                <i class="fas fa-stream"></i>
                <p>No hay actividades recientes</p>
                <small>Las actividades aparecerán aquí automáticamente</small>
            </div>
        `;
    }
    
    // ✅ MÉTODO 18: Mostrar estado de error
    showErrorState(message = 'Error cargando actividades') {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="error-activities">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
                <button class="btn-text retry-btn">Reintentar</button>
            </div>
        `;
        
        const retryBtn = this.container.querySelector('.retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.refreshActivities();
            });
        }
    }
    
    // ✅ MÉTODO 19: Refrescar actividades
    async refreshActivities() {
        this.showLoadingState();
        this.cleanupListeners();
        await this.loadRecentActivities();
        this.setupRealTimeListeners();
    }
    
    // ✅ MÉTODO 20: Limpiar listeners
    cleanupListeners() {
        this.unsubscribeFunctions.forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') unsubscribe();
        });
        this.unsubscribeFunctions = [];
    }
    
    // ✅ MÉTODO 21: Añadir actividad manualmente
    addActivity(activityData) {
        const newActivity = {
            id: `manual-${Date.now()}`,
            type: activityData.type || 'system',
            icon: activityData.icon || 'info-circle',
            color: activityData.color || 'info',
            title: activityData.title || 'Nueva actividad',
            description: activityData.description || '',
            metadata: activityData.metadata || '',
            timestamp: new Date(),
            data: activityData.data || {},
            isNew: true
        };
        
        // Añadir al inicio del array
        this.activities.unshift(newActivity);
        
        // Limitar tamaño
        this.activities = this.activities.slice(0, this.maxActivities);
        
        // Renderizar
        this.renderActivities();
        
        return newActivity;
    }
}

export const actividadesManager = new ActividadesManager();