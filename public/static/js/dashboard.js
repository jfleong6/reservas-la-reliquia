// ==========================================================================
// DASHBOARD - JavaScript Base
// ==========================================================================
// dashboard.js - Versión actualizada con Firebase
import { dashboardFirebase } from './dashboard-firebase.js';
import { actividadesManager } from './dashboard-actividades.js';
import { mensajesManager } from './dashboard-mensajes.js';
import { notificacionesManager } from './dashboard-notificaciones.js';
let isDashboardInitialized = false;
// Elementos principales del DOM
const elements = {
    sidebar: document.querySelector('.sidebar'),
    sidebarToggle: document.getElementById('sidebar-toggle'),
    mobileOverlay: document.getElementById('mobile-overlay'),
    menuItems: document.querySelectorAll('.menu-item'),
    viewContainer: document.getElementById('view-container'),
    pageTitle: document.getElementById('page-title'),
    currentPage: document.getElementById('current-page'),
    notificationBtn: document.getElementById('notification-btn'),
    notificationPanel: document.getElementById('notification-panel'),
    logoutBtn: document.getElementById('logout-btn'),
    logoutModal: document.getElementById('logout-modal'),
    confirmLogout: document.getElementById('confirm-logout'),
    closeModals: document.querySelectorAll('.close-modal'),
    mobileUser: document.getElementById('mobile-user'),
    currentDate: document.getElementById('current-date')
};

// Estado de la aplicación
const state = {
    currentView: 'dashboard',
    sidebarOpen: false,
    notificationsOpen: false
};

// ==========================================================================
// 1. INICIALIZACIÓN
// ==========================================================================
function setupNavigation() {
    // Asegurarse de que hay una vista activa por defecto
    if (!state.currentView) {
        state.currentView = 'dashboard';
    }

    // Mostrar vista actual
    showView(state.currentView);

    // Resaltar ítem de menú activo
    highlightActiveMenuItem();

    // Configurar botón "Ver todas"
    setupVerTodasButton();
}

// Añadir al DOMContentLoaded después de initDashboard()
document.addEventListener('DOMContentLoaded', async () => {
    await initDashboard();
    setupNavigation();  // <-- Añadir esto
    setupEventListeners();
    updateCurrentDate();
});

async function initDashboard() {
    if (isDashboardInitialized) return;

    // 1. Inicializar navegación básica
    setupNavigation();

    // 2. Inicializar sistema de notificaciones
    await notificacionesManager.init();

    // 3. Cargar módulos según la vista
    if (state.currentView === 'dashboard') {
        await actividadesManager.loadRecentActivities();
    }

    // 4. Configurar eventos globales
    setupGlobalEventListeners();

    isDashboardInitialized = true;

    // Inicilicia nombres de login
    actividadesManager.init();
}

function setupGlobalEventListeners() {
    // Toggle panel de notificaciones
    const notificationBtn = document.getElementById('notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', (e) => {

            e.stopPropagation();
            notificacionesManager.togglePanel();
        });
    }

    // Cerrar panel al hacer clic fuera
    document.addEventListener('click', (e) => {

        const notificationPanel = document.getElementById('notification-panel');
        const notificationBtn = document.getElementById('notification-btn');

        if (notificationPanel &&
            notificationPanel.classList.contains('show') &&
            !notificationPanel.contains(e.target) &&
            !notificationBtn.contains(e.target)) {
            notificacionesManager.hidePanel();
        }
    });

    // Cerrar panel con ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            notificacionesManager.hidePanel();
        }
    });
}
// ==========================================================================
// INTEGRACIÓN ENTRE MÓDULOS
// ==========================================================================
// Evento para que otros módulos notifiquen nuevas acciones
document.addEventListener('message-marked-read', (e) => {
    // Cuando se marca un mensaje como leído, actualizar notificaciones
    notificacionesManager.loadNotifications();
});

document.addEventListener('new-reservation', (e) => {
    // Cuando se crea una nueva reserva
    const notification = notificacionesManager.addNotification({
        type: 'reserva',
        title: 'Nueva reserva creada',
        description: `Habitación ${e.detail.roomNumber}`,
        data: e.detail,
        action: 'viewReservation'
    });
});

// ==========================================================================
// BOTÓN "VER TODAS" MEJORADO
// ==========================================================================
function setupVerTodasButton() {
    const verTodasBtn = document.querySelector('.btn-text.ver-todas-actividades');
    if (verTodasBtn) {
        verTodasBtn.addEventListener('click', async () => {
            verTodasBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...';
            verTodasBtn.disabled = true;

            try {
                await actividadesManager.loadRecentActivities();
                showToast('Actividades actualizadas', 'success');
            } catch (error) {
                showToast('Error al cargar actividades', 'error');
            } finally {
                verTodasBtn.innerHTML = 'Ver todo <i class="fas fa-arrow-right"></i>';
                verTodasBtn.disabled = false;
            }
        });
    }
}

// ==========================================================================
// TOAST NOTIFICATIONS
// ==========================================================================
function showToast(message, type = 'info') {
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

// Nueva función para cargar datos del dashboard
async function loadDashboardData() {
    try {
        await actividadesManager.init();
    } catch (error) {
        console.error('Error cargando datos del dashboard:', error);
    }
}

// ==========================================================================
// 2. SISTEMA DE VISTAS (SPA)
// ==========================================================================
function showView(viewName) {
    // Ocultar todas las vistas
    document.querySelectorAll('.view-content').forEach(view => {
        view.classList.remove('active');
    });

    // Mostrar la vista solicitada
    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) {
        targetView.classList.add('active');
        state.currentView = viewName;

        // Cargar módulos específicos de la vista
        loadViewModules(viewName);
    }

    // Actualizar título
    updatePageTitle(getViewTitle(viewName));
}
function getViewTitle(viewName) {
    const titles = {
        'dashboard': 'Dashboard',
        'reservas': 'Gestión de Reservas',
        'habitaciones': 'Habitaciones',
        'clientes': 'Gestión de Clientes',
        'mensajes': 'Mensajes',
        'reportes': 'Reportes y Estadísticas',
        'ajustes': 'Configuración'
    };
    return titles[viewName] || 'Dashboard';
}

function updatePageTitle(title) {
    if (elements.pageTitle) {
        elements.pageTitle.textContent = title;
    }
    if (elements.currentPage) {
        elements.currentPage.textContent = title;
    }

    // Actualizar también el título del documento
    document.title = `${title} | Hotel La Reliquia`;
}

function loadViewModules(viewName) {
    switch (viewName) {
        case 'dashboard':
            setTimeout(async () => {
                await actividadesManager.loadRecentActivities();
            }, 100);
            break;

        case 'mensajes':
            setTimeout(() => {
                mensajesManager.init(actividadesManager);
                // setupMessageFilters();
            }, 100);
            break;

        case 'reservas':
            // Aquí iría el módulo de reservas
            // console.log('Inicializando módulo de reservas...');
            break;
    }
}

// ==========================================================================
// 3. NAVEGACIÓN DEL SIDEBAR
// ==========================================================================
function setupMenuNavigation() {
    elements.menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            // Obtener la vista del data attribute
            const viewName = item.getAttribute('data-view');
            if (!viewName) return;

            // Cambiar vista
            showView(viewName);

            // Actualizar título de página
            const viewTitle = item.querySelector('span').textContent;
            updatePageTitle(viewTitle);

            // Actualizar item activo
            elements.menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            // Cerrar sidebar en móvil
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });
    });
}

function highlightActiveMenuItem() {
    elements.menuItems.forEach(item => {
        if (item.getAttribute('data-view') === state.currentView) {
            item.classList.add('active');
        }
    });
}

// ==========================================================================
// 4. TOGGLES Y MENÚS
// ==========================================================================
function toggleSidebar() {
    if (window.innerWidth <= 768) {
        // En móvil: toggle con overlay
        state.sidebarOpen = !state.sidebarOpen;
        elements.sidebar.classList.toggle('open', state.sidebarOpen);
        elements.mobileOverlay.classList.toggle('show', state.sidebarOpen);
    } else {
        // En desktop/tablet: toggle normal
        const isCollapsed = elements.sidebar.style.width === '70px' ||
            elements.sidebar.classList.contains('collapsed');

        if (isCollapsed) {
            expandSidebar();
        } else {
            collapseSidebar();
        }
    }
}

function collapseSidebar() {
    elements.sidebar.style.width = '70px';
    document.querySelector('.main-content').style.marginLeft = '70px';
    elements.sidebar.classList.add('collapsed');
}

function expandSidebar() {
    elements.sidebar.style.width = '';
    document.querySelector('.main-content').style.marginLeft = '';
    elements.sidebar.classList.remove('collapsed');
}

function closeSidebar() {
    state.sidebarOpen = false;
    elements.sidebar.classList.remove('open');
    elements.mobileOverlay.classList.remove('show');
}

function toggleNotifications() {
    state.notificationsOpen = !state.notificationsOpen;
    elements.notificationPanel.classList.toggle('show', state.notificationsOpen);

    // Cerrar otros menús abiertos
    if (state.notificationsOpen) {
        closeSidebar();
    }
}

// ==========================================================================
// 5. EVENT LISTENERS
// ==========================================================================
function setupEventListeners() {
    // Logout con Firebase
    const confirmLogout = document.getElementById('confirm-logout');
    if (confirmLogout) {
        confirmLogout.addEventListener('click', () => {
            dashboardFirebase.logout();
        });
    }
    // Toggle sidebar
    if (elements.sidebarToggle) {
        elements.sidebarToggle.addEventListener('click', toggleSidebar);
    }

    // Cerrar sidebar al hacer clic en overlay
    if (elements.mobileOverlay) {
        elements.mobileOverlay.addEventListener('click', closeSidebar);
    }

    // Navegación del menú
    setupMenuNavigation();

    // Notificaciones
    if (elements.notificationBtn) {
        elements.notificationBtn.addEventListener('click', toggleNotifications);
    }

    // Cerrar notificaciones al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (state.notificationsOpen &&
            !elements.notificationBtn.contains(e.target) &&
            !elements.notificationPanel.contains(e.target)) {
            closeNotifications();
        }
    });

    // Logout
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', () => {
            elements.logoutModal.classList.add('show');
        });
    }

    // Confirmar logout
    if (elements.confirmLogout) {
        elements.confirmLogout.addEventListener('click', () => {
            elements.logoutModal.classList.remove('show');
            // Redirigir a login (temporal)
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 5000);
        });
    }

    // Cerrar modales
    elements.closeModals.forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.getAttribute('data-modal');
            if (modalId) {
                document.getElementById(modalId).classList.remove('show');
            }
        });
    });

    // Mobile user menu
    if (elements.mobileUser) {
        elements.mobileUser.addEventListener('click', toggleSidebar);
    }

    // Buscador global
    const searchInput = document.getElementById('global-search');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch(searchInput.value);
            }
        });
    }

    // Resize window
    window.addEventListener('resize', checkMobileView);
}

function closeNotifications() {
    state.notificationsOpen = false;
    elements.notificationPanel.classList.remove('show');
}

function checkMobileView() {
    if (window.innerWidth <= 768) {
        // En móvil, asegurar que sidebar esté cerrado
        closeSidebar();
        elements.mobileOverlay.classList.remove('show');
    } else {
        // En desktop, expandir sidebar si estaba colapsada
        if (elements.sidebar.classList.contains('collapsed')) {
            expandSidebar();
        }
    }
}

// ==========================================================================
// 6. FUNCIONALIDADES AUXILIARES
// ==========================================================================
function performSearch(query) {
    if (!query.trim()) return;

    // console.log(`Buscando: ${query}`);
    // Aquí se implementará la búsqueda real
    alert(`Búsqueda: ${query}\n(Esta funcionalidad se implementará próximamente)`);
}

function updateCurrentDate() {
    if (!elements.currentDate) return;

    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };

    elements.currentDate.textContent = now.toLocaleDateString('es-ES', options);
}

// ==========================================================================
// 7. SIMULACIÓN DE DATOS (para demo)
// ==========================================================================
function simulateDataUpdates() {
    // Simular actualizaciones periódicas
    setInterval(() => {
        // Actualizar contador de notificaciones aleatorio
        const notificationCount = document.querySelector('.notification-count');
        if (notificationCount) {
            const newCount = Math.floor(Math.random() * 10) + 1;
            notificationCount.textContent = newCount;
        }

        // Actualizar estadísticas
        updateStats();
    }, 30000); // Cada 30 segundos
}

function updateStats() {
    // Simular cambios en las stats
    const stats = document.querySelectorAll('.stat-info h3');
    if (stats.length >= 4) {
        // Ocupación (entre 70% y 95%)
        const ocupacion = Math.floor(Math.random() * 25) + 70;
        stats[0].textContent = `${ocupacion}%`;

        // Check-in (entre 2 y 6)
        const checkin = Math.floor(Math.random() * 5) + 2;
        stats[1].textContent = checkin;

        // Check-out (entre 1 y 5)
        const checkout = Math.floor(Math.random() * 5) + 1;
        stats[2].textContent = checkout;

        // Ingresos (entre 10M y 15M)
        const ingresos = Math.floor(Math.random() * 5) + 10;
        stats[3].textContent = `$${ingresos}.5M`;
    }
}

// ==========================================================================
// 8. EXPORTAR FUNCIONES PARA DEPURACIÓN
// ==========================================================================
window.dashboard = {
    showView,
    toggleSidebar,
    toggleNotifications,
    updatePageTitle
};

// Iniciar simulación de datos (solo para demo)
// simulateDataUpdates();

// console.log('Dashboard Hotel La Reliquia - Cargado correctamente');