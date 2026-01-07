// dashboard-notificaciones.js
import { db, auth } from './firebase-config.js';
import {
    collection,
    query,
    orderBy,
    getDocs,
    limit,
    onSnapshot,
    updateDoc,
    doc,
    where,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

class NotificacionesManager {
    constructor() {
        this.notifications = [];
        this.unreadCount = 0;
        this.unsubscribeFunctions = [];
        this.isInitialized = false;
        this.panelElement = null;
        this.countElement = null;
        this.badgeElement = null;

        // Tipos de notificaciones
        this.notificationTypes = {
            mensaje: {
                icon: 'envelope',
                color: 'message',
                title: 'Nuevo mensaje',
                priority: 1
            },
            reserva: {
                icon: 'calendar-plus',
                color: 'reservation',
                title: 'Nueva reserva',
                priority: 2
            },
            checkin: {
                icon: 'sign-in-alt',
                color: 'checkin',
                title: 'Check-in pendiente',
                priority: 3
            },
            checkout: {
                icon: 'sign-out-alt',
                color: 'checkout',
                title: 'Check-out hoy',
                priority: 3
            },
            sistema: {
                icon: 'info-circle',
                color: 'system',
                title: 'Actualización del sistema',
                priority: 4
            }
        };
    }

    async init() {
        if (this.isInitialized) return;

        // Obtener elementos del DOM
        this.panelElement = document.getElementById('notification-panel');
        this.countElement = document.querySelector('.notification-count');
        this.badgeElement = document.querySelector('.menu-badge.badge-danger');

        if (!this.panelElement) {
            console.error('Panel de notificaciones no encontrado');
            return;
        }

        this.isInitialized = true;

        // OCULTAR el panel inicialmente
        this.panelElement.style.display = 'none';
        this.panelElement.classList.remove('show');
        
        // Cargar notificaciones iniciales



        await this.loadNotifications();

        // Configurar listeners en tiempo real
        this.setupRealTimeListeners();

        // Configurar eventos del panel
        this.setupPanelEvents();

        // console.log('🔔 Sistema de notificaciones inicializado');
    }

    async loadNotifications() {
        try {
            // Cargar notificaciones desde múltiples fuentes
            const notifications = [];

            // 1. Mensajes no leídos (contactos)
            const mensajesQuery = query(
                collection(db, "contactos"),
                where("leido", "==", false),
                orderBy("fecha", "desc"),
                limit(10)
            );
            // console.log("hola");

            const mensajesSnapshot = await getDocs(mensajesQuery);
            mensajesSnapshot.forEach(docSnap => {
                const data = docSnap.data();
                notifications.push(this.createNotification({
                    id: `msg-${docSnap.id}`,
                    type: 'mensaje',
                    title: `Mensaje de ${data.nombre}`,
                    description: this.truncateText(data.mensaje, 100),
                    timestamp: data.fecha?.toDate() || new Date(),
                    data: {
                        ...data,
                        docId: docSnap.id,
                        collection: 'contactos'
                    },
                    read: false,
                    action: 'viewMessage'
                }));
            });
            // console.log("9");


            // 2. Reservas pendientes (hoy o próximas)
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);

            const reservasQuery = query(
                collection(db, "reservas_activas"),
                orderBy("fecha_llegada", "asc"),
                limit(10)
            );
            const reservasSnapshot = await getDocs(reservasQuery);


            reservasSnapshot.forEach(docSnap => {
                const data = docSnap.data();
                const fechaLlegada = data.fecha_llegada?.toDate();

                if (fechaLlegada) {
                    // Notificación para check-in hoy
                    if (this.isSameDay(fechaLlegada, hoy)) {
                        notifications.push(this.createNotification({
                            id: `checkin-${docSnap.id}`,
                            type: 'checkin',
                            title: `Check-in hoy: Hab. ${data.numero_habitacion}`,
                            description: `Huésped: ${data.huesped_nombre || 'Sin nombre'}`,
                            timestamp: fechaLlegada,
                            data: {
                                ...data,
                                docId: docSnap.id,
                                collection: 'reservas_activas'
                            },
                            read: false,
                            action: 'viewReservation'
                        }));
                    }

                    // Notificación para check-out hoy
                    const fechaSalida = data.fecha_salida?.toDate();
                    if (fechaSalida && this.isSameDay(fechaSalida, hoy)) {
                        notifications.push(this.createNotification({
                            id: `checkout-${docSnap.id}`,
                            type: 'checkout',
                            title: `Check-out hoy: Hab. ${data.numero_habitacion}`,
                            description: `Huésped: ${data.huesped_nombre || 'Sin nombre'}`,
                            timestamp: fechaSalida,
                            data: {
                                ...data,
                                docId: docSnap.id,
                                collection: 'reservas_activas'
                            },
                            read: false,
                            action: 'viewReservation'
                        }));
                    }
                }
            });

            // 3. Notificaciones del sistema (colección separada si existe)
            try {
                const sistemaQuery = query(
                    collection(db, "notificaciones_sistema"),
                    where("activa", "==", true),
                    orderBy("fecha", "desc"),
                    limit(5)
                );
                const sistemaSnapshot = await getDocs(sistemaQuery);

                sistemaSnapshot.forEach(docSnap => {
                    const data = docSnap.data();
                    notifications.push(this.createNotification({
                        id: `sys-${docSnap.id}`,
                        type: 'sistema',
                        title: data.titulo || 'Actualización del sistema',
                        description: data.mensaje || '',
                        timestamp: data.fecha?.toDate() || new Date(),
                        data: {
                            ...data,
                            docId: docSnap.id,
                            collection: 'notificaciones_sistema'
                        },
                        read: data.leido || false,
                        action: 'viewSystemNotification'
                    }));
                });
            } catch (error) {
                // console.log('No se encontraron notificaciones del sistema');
            }

            // Ordenar por fecha (más reciente primero)
            // console.log("=" * 50);
            // console.log(notifications);
            // console.log("=" * 50);

            notifications.sort((a, b) => b.timestamp - a.timestamp);

            // Actualizar estado
            this.notifications = notifications;
            this.updateUnreadCount();

            // Renderizar
            this.renderNotifications();

            return this.notifications;

        } catch (error) {
            console.error('❌ Error cargando notificaciones:', error);
            this.showErrorState();
            return [];
        }
    }

    createNotification(config) {
        const typeConfig = this.notificationTypes[config.type] || this.notificationTypes.sistema;

        return {
            id: config.id,
            type: config.type,
            icon: typeConfig.icon,
            color: typeConfig.color,
            title: config.title,
            description: config.description,
            timestamp: config.timestamp,
            data: config.data,
            read: config.read || false,
            action: config.action,
            priority: typeConfig.priority,
            timeAgo: this.formatTimeAgo(config.timestamp)
        };
    }

    setupRealTimeListeners() {
        // Limpiar listeners anteriores
        this.cleanupListeners();

        // 1. Listener para mensajes nuevos
        const mensajesQuery = query(
            collection(db, "contactos"),
            where("leido", "==", false),
            orderBy("fecha", "desc")
        );

        const unsubscribeMensajes = onSnapshot(mensajesQuery,
            (snapshot) => {
                this.handleMensajesRealtime(snapshot);
            },
            (error) => {
                console.error('Error listener mensajes:', error);
            }
        );

        // 2. Listener para reservas (para check-in/out)
        const reservasQuery = query(
            collection(db, "reservas_activas"),
            orderBy("fecha_llegada", "asc")
        );

        const unsubscribeReservas = onSnapshot(reservasQuery,
            (snapshot) => {
                this.handleReservasRealtime(snapshot);
            },
            (error) => {
                console.error('Error listener reservas:', error);
            }
        );

        // Guardar funciones para limpiar
        this.unsubscribeFunctions.push(unsubscribeMensajes, unsubscribeReservas);
    }

    handleMensajesRealtime(snapshot) {
        const nuevosMensajes = [];

        snapshot.forEach(docSnap => {
            const data = docSnap.data();

            // Verificar si ya existe esta notificación
            const exists = this.notifications.some(n =>
                n.id === `msg-${docSnap.id}`
            );

            if (!exists) {
                nuevosMensajes.push(this.createNotification({
                    id: `msg-${docSnap.id}`,
                    type: 'mensaje',
                    title: `Mensaje de ${data.nombre}`,
                    description: this.truncateText(data.mensaje, 100),
                    timestamp: data.fecha?.toDate() || new Date(),
                    data: {
                        ...data,
                        docId: docSnap.id,
                        collection: 'contactos'
                    },
                    read: false,
                    action: 'viewMessage'
                }));
            }
        });

        if (nuevosMensajes.length > 0) {
            // Añadir nuevas notificaciones
            this.notifications.unshift(...nuevosMensajes);

            // Limitar a 50 notificaciones
            this.notifications = this.notifications.slice(0, 50);

            // Actualizar contador y renderizar
            this.updateUnreadCount();
            this.renderNotifications();

            // Mostrar notificación push si no está viendo el panel
            if (!this.isPanelVisible()) {
                this.showPushNotification(nuevosMensajes[0]);
            }
        }
    }

    handleReservasRealtime(snapshot) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const nuevasNotificaciones = [];

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const fechaLlegada = data.fecha_llegada?.toDate();
            const fechaSalida = data.fecha_salida?.toDate();

            // Check-in hoy
            if (fechaLlegada && this.isSameDay(fechaLlegada, hoy)) {
                const notificationId = `checkin-${docSnap.id}`;
                const exists = this.notifications.some(n => n.id === notificationId);

                if (!exists) {
                    nuevasNotificaciones.push(this.createNotification({
                        id: notificationId,
                        type: 'checkin',
                        title: `Check-in hoy: Hab. ${data.numero_habitacion}`,
                        description: `Huésped: ${data.huesped_nombre || 'Sin nombre'}`,
                        timestamp: fechaLlegada,
                        data: {
                            ...data,
                            docId: docSnap.id,
                            collection: 'reservas_activas'
                        },
                        read: false,
                        action: 'viewReservation'
                    }));
                }
            }

            // Check-out hoy
            if (fechaSalida && this.isSameDay(fechaSalida, hoy)) {
                const notificationId = `checkout-${docSnap.id}`;
                const exists = this.notifications.some(n => n.id === notificationId);

                if (!exists) {
                    nuevasNotificaciones.push(this.createNotification({
                        id: notificationId,
                        type: 'checkout',
                        title: `Check-out hoy: Hab. ${data.numero_habitacion}`,
                        description: `Huésped: ${data.huesped_nombre || 'Sin nombre'}`,
                        timestamp: fechaSalida,
                        data: {
                            ...data,
                            docId: docSnap.id,
                            collection: 'reservas_activas'
                        },
                        read: false,
                        action: 'viewReservation'
                    }));
                }
            }
        });

        if (nuevasNotificaciones.length > 0) {
            this.notifications.unshift(...nuevasNotificaciones);
            this.notifications = this.notifications.slice(0, 50);
            this.updateUnreadCount();
            this.renderNotifications();
        }
    }

    renderNotifications() {
        if (!this.panelElement.classList.contains('show')) {
            this.panelElement.style.display = 'none';
        }
        if (!this.panelElement) return;

        const notificationList = this.panelElement.querySelector('.notification-list');
        if (!notificationList) return;

        if (this.notifications.length === 0) {
            notificationList.innerHTML = `
                <div class="no-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <p>No hay notificaciones</p>
                    <small>Todo está al día</small>
                </div>
            `;
            return;
        }

        notificationList.innerHTML = this.notifications.map(notification => `
            <div class="notification-item ${notification.read ? '' : 'unread'}" 
                 data-notification-id="${notification.id}"
                 data-notification-type="${notification.type}">
                <div class="notification-icon ${notification.color}">
                    <i class="fas fa-${notification.icon}"></i>
                </div>
                <div class="notification-content">
                    <p><strong>${notification.title}</strong></p>
                    <span class="notification-desc">${notification.description}</span>
                    <span class="notification-time">${notification.timeAgo}</span>
                </div>
                ${!notification.read ? '<div class="unread-dot"></div>' : ''}
                <button class="notification-close" title="Descartar">
                    &times;
                </button>
            </div>
        `).join('');



        this.setupNotificationEvents();
    }

    setupNotificationEvents() {
        // Clic en notificación
        document.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Evitar que se dispare al hacer clic en el botón de cerrar
                if (e.target.classList.contains('notification-close')) return;

                const notificationId = e.currentTarget.dataset.notificationId;
                const notification = this.notifications.find(n => n.id === notificationId);

                if (notification) {
                    this.handleNotificationClick(notification);
                }
            });
        });

        // Botón de cerrar/descartar
        document.querySelectorAll('.notification-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const notificationId = e.currentTarget.closest('.notification-item').dataset.notificationId;
                this.dismissNotification(notificationId);
            });
        });
    }

    async handleNotificationClick(notification) {
        // Marcar como leída
        if (!notification.read) {
            await this.markAsRead(notification);
        }

        // Ejecutar acción según el tipo
        switch (notification.action) {
            case 'viewMessage':
                this.openMessageDetail(notification.data);
                break;
            case 'viewReservation':
                this.openReservationDetail(notification.data);
                break;
            case 'viewSystemNotification':
                this.openSystemNotification(notification.data);
                break;
            default:
                // console.log('Acción no implementada:', notification.action);
        }

        // Cerrar el panel
        this.hidePanel();
    }

    async markAsRead(notification) {
        try {
            // Actualizar en Firestore si corresponde
            if (notification.data.collection && notification.data.docId) {
                const docRef = doc(db, notification.data.collection, notification.data.docId);

                switch (notification.type) {
                    case 'mensaje':
                        await updateDoc(docRef, { leido: true });
                        break;
                    case 'sistema':
                        await updateDoc(docRef, { leido: true });
                        break;
                    // Para reservas no hay campo "leído"
                }
            }

            // Actualizar localmente
            notification.read = true;
            this.updateUnreadCount();
            this.renderNotifications();

        } catch (error) {
            console.error('Error marcando como leído:', error);
            // Actualizar solo localmente
            notification.read = true;
            this.updateUnreadCount();
            this.renderNotifications();
        }
    }

    async dismissNotification(notificationId) {
        // Eliminar notificación localmente
        this.notifications = this.notifications.filter(n => n.id !== notificationId);

        // Actualizar contador
        this.updateUnreadCount();

        // Renderizar
        this.renderNotifications();
    }

    async markAllAsRead() {
        try {
            // Marcar todas como leídas localmente
            this.notifications.forEach(notification => {
                notification.read = true;
            });

            // Actualizar en Firestore (mensajes no leídos)
            const unreadMessages = this.notifications.filter(n =>
                n.type === 'mensaje' && n.data.leido === false
            );

            for (const notification of unreadMessages) {
                if (notification.data.docId) {
                    const docRef = doc(db, 'contactos', notification.data.docId);
                    await updateDoc(docRef, { leido: true });
                }
            }

            // Actualizar UI
            this.updateUnreadCount();
            this.renderNotifications();

            // Mostrar confirmación
            this.showToast('Todas las notificaciones marcadas como leídas', 'success');

        } catch (error) {
            console.error('Error marcando todas como leídas:', error);
            this.showToast('Error al marcar como leídas', 'error');
        }
    }

    updateUnreadCount() {
        this.unreadCount = this.notifications.filter(n => !n.read).length;

        // Actualizar badge
        if (this.countElement) {
            this.countElement.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
            this.countElement.style.display = this.unreadCount > 0 ? 'flex' : 'none';
        }

        if (this.badgeElement) {
            this.badgeElement.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
            this.badgeElement.style.display = this.unreadCount > 0 ? 'flex' : 'none';
        }

        // Actualizar título de la página si hay notificaciones
        const pageTitle = document.querySelector('.page-title');
        if (pageTitle && this.unreadCount > 0) {
            const originalTitle = pageTitle.dataset.originalTitle || 'Dashboard';
            pageTitle.dataset.originalTitle = originalTitle;
            pageTitle.textContent = `${originalTitle} (${this.unreadCount})`;
        } else if (pageTitle && pageTitle.dataset.originalTitle) {
            pageTitle.textContent = pageTitle.dataset.originalTitle;
        }
    }

    setupPanelEvents() {
        // Botón "Marcar todas como leídas"
        const markAllBtn = this.panelElement.querySelector('.mark-all-read');
        if (markAllBtn) {
            markAllBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.markAllAsRead();
            });
        }

        // Botón "Ver todas"
        const viewAllBtn = this.panelElement.querySelector('.view-all');
        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showAllNotificationsPage();
            });
        }
    }

    showAllNotificationsPage() {
        // Aquí podríamos redirigir a una página de notificaciones completas
        // Por ahora mostramos un modal con todas las notificaciones
        const modalHTML = `
            <div class="modal-overlay show" id="all-notifications-modal">
                <div class="modal" style="max-width: 800px; max-height: 80vh;">
                    <div class="modal-header">
                        <h3>Todas las notificaciones</h3>
                        <button class="close-modal" data-modal="all-notifications-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="notifications-container">
                            ${this.notifications.length === 0 ? `
                                <div class="empty-notifications">
                                    <i class="fas fa-bell-slash"></i>
                                    <p>No hay notificaciones</p>
                                </div>
                            ` : `
                                <div class="notifications-list">
                                    ${this.notifications.map(notification => `
                                        <div class="notification-full-item ${notification.read ? '' : 'unread'}">
                                            <div class="notification-full-icon ${notification.color}">
                                                <i class="fas fa-${notification.icon}"></i>
                                            </div>
                                            <div class="notification-full-content">
                                                <h4>${notification.title}</h4>
                                                <p>${notification.description}</p>
                                                <div class="notification-full-meta">
                                                    <span class="time">${this.formatFullDate(notification.timestamp)}</span>
                                                    <span class="type">${notification.type}</span>
                                                </div>
                                            </div>
                                            <div class="notification-full-actions">
                                                ${!notification.read ? `
                                                    <button class="btn-icon mark-as-read-btn" data-id="${notification.id}">
                                                        <i class="fas fa-envelope-open"></i>
                                                    </button>
                                                ` : ''}
                                                <button class="btn-icon dismiss-btn" data-id="${notification.id}">
                                                    <i class="fas fa-times"></i>
                                                </button>
                                            </div>
                                        </div>
                                    `).join('')}
                                </div>
                            `}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" id="mark-all-read-modal">
                            <i class="fas fa-envelope-open"></i> Marcar todas como leídas
                        </button>
                        <button class="btn-primary close-modal" data-modal="all-notifications-modal">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Configurar eventos del modal
        setTimeout(() => {
            const closeBtns = document.querySelectorAll('.close-modal[data-modal="all-notifications-modal"]');
            closeBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    document.getElementById('all-notifications-modal')?.remove();
                });
            });

            // Marcar como leído en el modal
            document.querySelectorAll('.mark-as-read-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const notificationId = e.currentTarget.dataset.id;
                    const notification = this.notifications.find(n => n.id === notificationId);
                    if (notification) {
                        await this.markAsRead(notification);
                        e.currentTarget.closest('.notification-full-item').classList.remove('unread');
                        e.currentTarget.remove();
                    }
                });
            });

            // Descartar en el modal
            document.querySelectorAll('.dismiss-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const notificationId = e.currentTarget.dataset.id;
                    await this.dismissNotification(notificationId);
                    e.currentTarget.closest('.notification-full-item').remove();
                });
            });

            // Marcar todas como leídas
            const markAllBtn = document.getElementById('mark-all-read-modal');
            if (markAllBtn) {
                markAllBtn.addEventListener('click', async () => {
                    await this.markAllAsRead();
                    document.getElementById('all-notifications-modal')?.remove();
                });
            }
        }, 100);
    }

    openMessageDetail(messageData) {
        // Abrir detalle del mensaje
        // Podríamos integrar con el módulo de mensajes aquí
        // console.log('Abriendo mensaje:', messageData);

        // Mostrar modal con detalle del mensaje
        const modalHTML = `
            <div class="modal-overlay show" id="message-detail-modal">
                <div class="modal" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3>Mensaje de ${messageData.nombre}</h3>
                        <button class="close-modal" data-modal="message-detail-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="message-detail-view">
                            <div class="message-info">
                                <p><strong>Email:</strong> ${messageData.email}</p>
                                <p><strong>Fecha:</strong> ${this.formatFullDate(messageData.fecha?.toDate())}</p>
                            </div>
                            <div class="message-content">
                                <p>${messageData.mensaje}</p>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-primary close-modal" data-modal="message-detail-modal">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        setTimeout(() => {
            const closeBtns = document.querySelectorAll('.close-modal[data-modal="message-detail-modal"]');
            closeBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    document.getElementById('message-detail-modal')?.remove();
                });
            });
        }, 100);
    }

    openReservationDetail(reservationData) {
        // Abrir detalle de la reserva
        // console.log('Abriendo reserva:', reservationData);

        const llegada = reservationData.fecha_llegada?.toDate();
        const salida = reservationData.fecha_salida?.toDate();

        const modalHTML = `
            <div class="modal-overlay show" id="reservation-detail-modal">
                <div class="modal" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3>Reserva - Hab. ${reservationData.numero_habitacion}</h3>
                        <button class="close-modal" data-modal="reservation-detail-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="reservation-detail-view">
                            <div class="reservation-info">
                                <p><strong>Huésped:</strong> ${reservationData.huesped_nombre || 'No especificado'}</p>
                                <p><strong>Teléfono:</strong> ${reservationData.huesped_telefono || 'No especificado'}</p>
                                <p><strong>Check-in:</strong> ${llegada ? this.formatFullDate(llegada) : 'No especificado'}</p>
                                <p><strong>Check-out:</strong> ${salida ? this.formatFullDate(salida) : 'No especificado'}</p>
                                <p><strong>Estado:</strong> ${reservationData.estado_sincro || 'PENDIENTE'}</p>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-primary close-modal" data-modal="reservation-detail-modal">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        setTimeout(() => {
            const closeBtns = document.querySelectorAll('.close-modal[data-modal="reservation-detail-modal"]');
            closeBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    document.getElementById('reservation-detail-modal')?.remove();
                });
            });
        }, 100);
    }

    openSystemNotification(systemData) {
        // Mostrar notificación del sistema
        const modalHTML = `
            <div class="modal-overlay show" id="system-notification-modal">
                <div class="modal" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3>${systemData.titulo || 'Notificación del sistema'}</h3>
                        <button class="close-modal" data-modal="system-notification-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="system-notification-view">
                            <p>${systemData.mensaje || ''}</p>
                            ${systemData.fecha ? `<small>Publicado: ${this.formatFullDate(systemData.fecha?.toDate())}</small>` : ''}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-primary close-modal" data-modal="system-notification-modal">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        setTimeout(() => {
            const closeBtns = document.querySelectorAll('.close-modal[data-modal="system-notification-modal"]');
            closeBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    document.getElementById('system-notification-modal')?.remove();
                });
            });
        }, 100);
    }

    showPushNotification(notification) {
        // Crear notificación push (toast)
        const toast = document.createElement('div');
        toast.className = 'push-notification';
        toast.innerHTML = `
            <div class="push-icon ${notification.color}">
                <i class="fas fa-${notification.icon}"></i>
            </div>
            <div class="push-content">
                <strong>${notification.title}</strong>
                <p>${notification.description}</p>
            </div>
            <button class="push-close">&times;</button>
        `;

        document.body.appendChild(toast);

        // Animación de entrada
        setTimeout(() => toast.classList.add('show'), 10);

        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);

        // Cerrar manualmente
        const closeBtn = toast.querySelector('.push-close');
        closeBtn.addEventListener('click', () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        });

        // Click en toast para abrir notificación
        toast.addEventListener('click', (e) => {
            if (!e.target.classList.contains('push-close')) {
                this.handleNotificationClick(notification);
                toast.remove();
            }
        });
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    isPanelVisible() {
        return this.panelElement &&
            this.panelElement.style.display !== 'none' &&
            this.panelElement.classList.contains('show');
    }

    showPanel() {
        if (this.panelElement) {
            this.panelElement.style.display = 'flex'; // O 'block' según tu CSS
            setTimeout(() => this.panelElement.classList.add('show'), 10);
        }
    }

    hidePanel() {
        if (this.panelElement) {
            this.panelElement.classList.remove('show');
            setTimeout(() => {
                this.panelElement.style.display = 'none';
            }, 300); // Esperar a que termine la animación
        }
    }

    togglePanel() {
        if (this.isPanelVisible()) {
            this.hidePanel();
        } else {
            this.showPanel();
        }
    }
    // Métodos auxiliares
    formatTimeAgo(timestamp) {
        if (!timestamp) return 'Reciente';

        const now = new Date();
        const diffMs = now - timestamp;
        const diffMin = Math.floor(diffMs / (1000 * 60));
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffMin < 1) return 'Ahora';
        if (diffMin < 60) return `Hace ${diffMin} min`;
        if (diffHour < 24) return `Hace ${diffHour} h`;
        if (diffDay === 1) return 'Ayer';
        if (diffDay < 7) return `Hace ${diffDay} d`;

        return timestamp.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short'
        });
    }

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

    truncateText(text, maxLength) {
        if (!text) return '';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
            date1.getMonth() === date2.getMonth() &&
            date1.getFullYear() === date2.getFullYear();
    }

    showErrorState() {
        const notificationList = this.panelElement?.querySelector('.notification-list');
        if (notificationList) {
            notificationList.innerHTML = `
                <div class="error-notifications">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error cargando notificaciones</p>
                    <button class="btn-text retry-btn">Reintentar</button>
                </div>
            `;

            const retryBtn = notificationList.querySelector('.retry-btn');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => {
                    this.loadNotifications();
                });
            }
        }
    }

    cleanupListeners() {
        this.unsubscribeFunctions.forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') unsubscribe();
        });
        this.unsubscribeFunctions = [];
    }

    // Método para agregar notificación manualmente (desde otros módulos)
    addNotification(config) {
        const notification = this.createNotification({
            id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: config.type || 'sistema',
            title: config.title || 'Nueva notificación',
            description: config.description || '',
            timestamp: config.timestamp || new Date(),
            data: config.data || {},
            read: false,
            action: config.action || 'viewSystemNotification'
        });

        // Añadir al inicio
        this.notifications.unshift(notification);

        // Limitar tamaño
        this.notifications = this.notifications.slice(0, 50);

        // Actualizar UI
        this.updateUnreadCount();
        this.renderNotifications();

        // Mostrar push si el panel no está visible
        if (!this.isPanelVisible()) {
            this.showPushNotification(notification);
        }

        return notification;
    }
}

export const notificacionesManager = new NotificacionesManager();