// Importar addDoc si no está importado
import { addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { db } from './firebase-config.js';
import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Variables globales
let currentDate = new Date();
let reservas = [];
let habitaciones = [];
let calendarioMensualElement = null;
let currentPeriodElement = null;

// Días de la semana en español
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('view-reservas')) {
        inicializarVistaReservas();
    }
});

async function inicializarVistaReservas() {
    try {
        console.log('Inicializando vista de reservas...');

        // Obtener referencias a elementos
        calendarioMensualElement = document.getElementById('calendario-mensual');
        currentPeriodElement = document.getElementById('current-period');

        if (!calendarioMensualElement || !currentPeriodElement) {
            console.error('Elementos del calendario no encontrados');
            return;
        }

        // Mostrar loading
        mostrarLoading(true);

        // 1. Cargar habitaciones
        await cargarHabitaciones();

        // 2. Cargar reservas del mes actual
        await cargarReservasMes(currentDate);

        // 3. Generar calendario
        generarCalendarioMensual(currentDate);

        // 4. Configurar eventos de navegación
        configurarEventos();

        // 5. Actualizar estadísticas
        actualizarEstadisticas();

        mostrarLoading(false);

        console.log('Vista de reservas inicializada correctamente');

    } catch (error) {
        console.error('Error inicializando vista de reservas:', error);
        mostrarError('Error cargando las reservas');
        mostrarLoading(false);
    }
}

// 1. CARGAR HABITACIONES DESDE FIREBASE
async function cargarHabitaciones() {
    try {
        console.log('Cargando habitaciones...');
        const querySnapshot = await getDocs(collection(db, 'habitaciones_catalogo'));
        habitaciones = [];

        querySnapshot.forEach(doc => {
            const habitacion = {
                id: doc.id,
                ...doc.data()
            };
            habitaciones.push(habitacion);
        });

        // Ordenar por número de habitación
        habitaciones.sort((a, b) => {
            return parseInt(a.numero) - parseInt(b.numero);
        });

        console.log(`${habitaciones.length} habitaciones cargadas`);

    } catch (error) {
        console.error('Error cargando habitaciones:', error);
        throw error;
    }
}

// 2. CARGAR RESERVAS DEL MES ACTUAL
async function cargarReservasMes(fecha) {
    try {
        // Calcular inicio y fin del mes
        const inicioMes = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
        const finMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);

        // Ajustar horas para cubrir todo el día
        inicioMes.setHours(0, 0, 0, 0);
        finMes.setHours(23, 59, 59, 999);

        console.log(`Cargando reservas del mes: ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`);
        console.log('Rango:', inicioMes.toLocaleDateString(), 'al', finMes.toLocaleDateString());

        // Consulta para reservas que se superpongan con el mes
        const q = query(
            collection(db, 'reservas_activas'),
            where('fecha_llegada', '<=', Timestamp.fromDate(finMes)),
            where('fecha_salida', '>=', Timestamp.fromDate(inicioMes)),
            orderBy('fecha_llegada')
        );

        const querySnapshot = await getDocs(q);
        reservas = [];

        querySnapshot.forEach(doc => {
            const reservaData = doc.data();
            const reserva = {
                id: doc.id,
                ...reservaData
            };

            // Convertir Timestamps a Date
            if (reservaData.fecha_llegada instanceof Timestamp) {
                reserva.fecha_llegada = reservaData.fecha_llegada.toDate();
            }
            if (reservaData.fecha_salida instanceof Timestamp) {
                reserva.fecha_salida = reservaData.fecha_salida.toDate();
            }

            // Convertir fecha_creacion si existe
            if (reservaData.fecha_creacion instanceof Timestamp) {
                reserva.fecha_creacion = reservaData.fecha_creacion.toDate();
            }

            reservas.push(reserva);
        });

        console.log(`${reservas.length} reservas cargadas para el mes`);

        // Mostrar reservas en consola para debug
        reservas.forEach(reserva => {
            console.log(`Reserva: ${reserva.huesped_nombre} - Hab: ${reserva.numero_habitacion} - ${reserva.fecha_llegada?.toLocaleDateString()} al ${reserva.fecha_salida?.toLocaleDateString()}`);
        });

    } catch (error) {
        console.error('Error cargando reservas:', error);
        throw error;
    }
}

// 3. GENERAR CALENDARIO MENSUAL
function generarCalendarioMensual(fecha) {
    const year = fecha.getFullYear();
    const month = fecha.getMonth();

    // Actualizar título del período
    if (currentPeriodElement) {
        currentPeriodElement.textContent = `${MESES[month]} ${year}`;
    }

    // Calcular primer día del mes y último día
    const primerDia = new Date(year, month, 1);
    const ultimoDia = new Date(year, month + 1, 0);

    // Día de la semana del primer día (0=Domingo, 1=Lunes...)
    let primerDiaSemana = primerDia.getDay();
    // Ajustar para que Lunes sea 0, Domingo sea 6
    primerDiaSemana = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;
    console.log(primerDiaSemana);

    // Calcular total de días a mostrar (días del mes anterior + mes actual)
    const totalDias = primerDiaSemana + ultimoDia.getDate();
    const totalSemanas = Math.ceil(totalDias / 7);
    const totalCeldas = totalSemanas * 7;

    // Limpiar calendario
    calendarioMensualElement.innerHTML = '';

    // --- DÍAS DEL MES ANTERIOR (CORREGIDO) ---
    // Mostrar desde el lunes de la semana en que cae el primer día
    for (let i = 0; i <= primerDiaSemana - 1; i++) {
        const fechaDia = new Date(primerDia);
        fechaDia.setDate(primerDia.getDate() - (i + 1));
        const diaNum = fechaDia.getDate();
        const diaElement = crearDiaCalendario(diaNum, true, fechaDia);
        calendarioMensualElement.appendChild(diaElement);
    }

    // --- DÍAS DEL MES ACTUAL ---
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
        const fechaDia = new Date(year, month, dia);
        const diaElement = crearDiaCalendario(dia, false, fechaDia);
        calendarioMensualElement.appendChild(diaElement);
    }

    // --- DÍAS DEL MES SIGUIENTE ---
    const diasRestantes = totalCeldas - totalDias;
    for (let i = 1; i <= diasRestantes; i++) {
        const fechaDia = new Date(ultimoDia);
        fechaDia.setDate(ultimoDia.getDate() + i);
        const diaNum = fechaDia.getDate();
        const diaElement = crearDiaCalendario(diaNum, true, fechaDia);
        calendarioMensualElement.appendChild(diaElement);
    }
}

// CREAR ELEMENTO DE DÍA DEL CALENDARIO
function crearDiaCalendario(numeroDia, esOtroMes, fechaDia) {
    const diaElement = document.createElement('div');
    diaElement.className = 'calendario-dia';
    diaElement.dataset.fecha = fechaDia.toISOString().split('T')[0];

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaComparar = new Date(fechaDia);
    fechaComparar.setHours(0, 0, 0, 0);

    // 1. Verificar si es día PASADO
    if (fechaComparar < hoy) {
        diaElement.classList.add('pasado');
    }

    // 2. Verificar si es HOY
    if (fechaComparar.getTime() === hoy.getTime() & !esOtroMes) {
        diaElement.classList.add('hoy');
    }

    if (esOtroMes) {
        diaElement.classList.add('otro-mes');
    } else {
        // 3. Verificar reservas para este día
        const reservasDia = obtenerReservasParaDia(fechaDia);

        if (reservasDia.length > 0) {
            // Obtener todas las habitaciones ocupadas en este día
            const habitacionesOcupadas = new Set();
            reservasDia.forEach(reserva => {
                if (reserva.numero_habitacion) {
                    habitacionesOcupadas.add(reserva.numero_habitacion);
                }
                if (reserva.habitaciones && Array.isArray(reserva.habitaciones)) {
                    reserva.habitaciones.forEach(hab => habitacionesOcupadas.add(hab));
                }
            });

            // Verificar si TODAS las habitaciones están ocupadas
            const totalHabitaciones = habitaciones.length;
            if (habitacionesOcupadas.size >= totalHabitaciones) {
                diaElement.classList.add('todas-ocupadas');
            } else {
                // Solo algunas habitaciones ocupadas - mostrar eventos
                diaElement.classList.add('parcialmente-ocupado');

                const eventosContainer = document.createElement('div');
                eventosContainer.className = 'eventos-dia';

                reservasDia.forEach(reserva => {
                    const evento = document.createElement('div');
                    evento.className = 'evento-reserva';
                    evento.textContent = `Hab. ${reserva.huesped_nombre}`;
                    evento.dataset.reservaId = reserva.id;

                    // Solo permitir click en eventos para ver detalles
                    evento.addEventListener('click', (e) => {
                        e.stopPropagation();
                        mostrarDetallesReserva(reserva);
                    });

                    eventosContainer.appendChild(evento);
                });

                diaElement.appendChild(eventosContainer);
            }
        }

        // Solo hacer clickeable si no es pasado y no todas ocupadas
        if (!diaElement.classList.contains('pasado') &&
            !diaElement.classList.contains('todas-ocupadas')) {
            diaElement.addEventListener('click', () => {
                abrirModalNuevaReserva(fechaDia);
            });
        }
    }

    // Número del día
    const numeroElement = document.createElement('div');
    numeroElement.className = 'calendario-dia-numero';
    numeroElement.textContent = numeroDia;
    diaElement.appendChild(numeroElement);

    return diaElement;
}

// OBTENER RESERVAS PARA UN DÍA ESPECÍFICO
function obtenerReservasParaDia(fecha) {
    return reservas.filter(reserva => {
        const llegada = new Date(reserva.fecha_llegada);
        const salida = new Date(reserva.fecha_salida);

        // Ajustar fechas para comparación
        llegada.setHours(0, 0, 0, 0);
        salida.setHours(0, 0, 0, 0);
        const fechaComparar = new Date(fecha);
        fechaComparar.setHours(0, 0, 0, 0);

        return fechaComparar >= llegada && fechaComparar < salida;
    });
}

async function verificarDisponibilidadHoy() {
    try {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        // Obtener reservas activas para hoy
        const q = query(
            collection(db, 'reservas_activas'),
            where('fecha_llegada', '<=', Timestamp.fromDate(hoy)),
            where('fecha_salida', '>', Timestamp.fromDate(hoy))
        );

        const querySnapshot = await getDocs(q);
        const habitacionesOcupadasHoy = new Set();

        querySnapshot.forEach(doc => {
            const reserva = doc.data();
            if (reserva.numero_habitacion) {
                habitacionesOcupadasHoy.add(reserva.numero_habitacion);
            }
        });

        // Verificar si hay al menos una habitación disponible
        const totalHabitaciones = habitaciones.length;
        const ocupadasHoy = habitacionesOcupadasHoy.size;

        return ocupadasHoy < totalHabitaciones;

    } catch (error) {
        console.error('Error verificando disponibilidad hoy:', error);
        return true; // En caso de error, permitir intentar
    }
}

function mostrarMensajeError(mensaje, tipo = 'error') {
    // Eliminar mensaje anterior si existe
    const mensajeAnterior = document.getElementById('mensaje-temporal');
    if (mensajeAnterior) mensajeAnterior.remove();

    // Crear mensaje
    const mensajeDiv = document.createElement('div');
    mensajeDiv.id = 'mensaje-temporal';
    mensajeDiv.className = `mensaje-flotante ${tipo}`;
    mensajeDiv.innerHTML = `
        <div class="mensaje-contenido">
            <i class="fas fa-${tipo === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${mensaje}</span>
        </div>
    `;

    document.body.appendChild(mensajeDiv);

    // Mostrar con animación
    setTimeout(() => {
        mensajeDiv.classList.add('mostrar');
    }, 10);

    // Ocultar después de 3 segundos
    setTimeout(() => {
        mensajeDiv.classList.remove('mostrar');
        setTimeout(() => {
            if (mensajeDiv.parentNode) {
                mensajeDiv.parentNode.removeChild(mensajeDiv);
            }
        }, 300);
    }, 3000);
}

// 4. CONFIGURAR EVENTOS DE NAVEGACIÓN
async function configurarEventos() {
    // Navegación por meses
    document.getElementById('prev-date')?.addEventListener('click', () => {
        navegarMes(-1);
    });

    document.getElementById('next-date')?.addEventListener('click', () => {
        navegarMes(1);
    });

    // Ir a hoy
    document.getElementById('btn-today')?.addEventListener('click', () => {
        currentDate = new Date();
        recargarCalendario();
    });

    // Cambiar entre vistas (mensual, semanal, etc.)
    document.querySelectorAll('.view-tab').forEach(tab => {
        tab.addEventListener('click', function () {
            const view = this.dataset.view;

            // Actualizar tabs activos
            document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            // Mostrar vista correspondiente
            document.querySelectorAll('.calendario-vista').forEach(v => {
                v.classList.remove('active');
                if (v.id === `vista-${view}`) {
                    v.classList.add('active');
                }
            });

            // Si es vista semanal, generar semana
            if (view === 'semanal') {
                generarVistaSemanal(currentDate);
            }
        });
    });

    // Botón de nueva reserva en el calendario
    document.getElementById('nueva-reserva-btn')?.addEventListener('click', () => {
        abrirModalNuevaReserva();
    });

    // Click en día del calendario - CON VALIDACIONES MEJORADAS
    document.addEventListener('click', (e) => {
        // 1. Verificar si click fue en un día del calendario
        const diaElement = e.target.closest('.calendario-dia');
        if (!diaElement) return;

        // 2. Verificar EXCLUSIONES (no debe ser):
        //    - Día de otro mes
        //    - Día ocupado EN TODAS LAS HABITACIONES (si aplica)
        if (diaElement.classList.contains('otro-mes')) {
            return; // No hacer nada en días de otros meses
        }

        // 3. Verificar si es día PASADO (anterior a hoy)
        const fechaStr = diaElement.dataset.fecha;
        if (!fechaStr) return;

        const fechaClick = new Date(fechaStr);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0); // Normalizar a inicio del día

        // Si la fecha es anterior a hoy, BLOQUEAR
        if (fechaClick < hoy + 1) {
            mostrarMensajeError('No se pueden hacer reservas para fechas pasadas');
            return;
        }

        // 4. Verificar si es día HOY - comportamiento especial
        const esHoy = fechaClick.getTime() === hoy.getTime();

        if (esHoy) {
            // Para HOY, verificar si hay habitaciones disponibles
            // (no bloquear automáticamente aunque haya reservas)
            const hayHabitacionesDisponibles = verificarDisponibilidadHoy();
            if (!hayHabitacionesDisponibles) {
                mostrarMensajeError('No hay habitaciones disponibles para hoy');
                return;
            }
            // Si hay disponibilidad, permitir reservar
        }

        // 5. Para días FUTUROS (mañana en adelante)
        // Verificar si TODAS las habitaciones están ocupadas
        const todasOcupadas = diaElement.classList.contains('todas-ocupadas');
        if (todasOcupadas) {
            mostrarMensajeError('Todas las habitaciones están ocupadas para esta fecha');
            return;
        }

        // 6. Si pasa todas las validaciones, ABRIR MODAL
        abrirModalNuevaReserva(fechaClick);
    });
}
// Función para verificar disponibilidad para HOY


// NAVEGACIÓN POR MESES
async function navegarMes(direccion) {
    currentDate.setMonth(currentDate.getMonth() + direccion);
    await recargarCalendario();
}

// RECARGAR CALENDARIO COMPLETO
async function recargarCalendario() {
    try {
        mostrarLoading(true);
        await cargarReservasMes(currentDate);
        generarCalendarioMensual(currentDate);
        actualizarEstadisticas();
        mostrarLoading(false);
    } catch (error) {
        console.error('Error recargando calendario:', error);
        mostrarError('Error actualizando calendario');
        mostrarLoading(false);
    }
}

// 5. ACTUALIZAR ESTADÍSTICAS
function actualizarEstadisticas() {
    // Calcular estadísticas del mes
    const totalHabitaciones = habitaciones.length;
    const reservasMes = reservas.length;

    // Calcular días ocupados (simplificado)
    let diasOcupadosEstimados = 0;
    reservas.forEach(reserva => {
        const diasReserva = Math.ceil((reserva.fecha_salida - reserva.fecha_llegada) / (1000 * 60 * 60 * 24));
        diasOcupadosEstimados += diasReserva;
    });

    const diasMes = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const ocupacionEstimada = Math.round((diasOcupadosEstimados / (totalHabitaciones * diasMes)) * 100);

    // Actualizar UI si hay elementos
    const ocupacionElement = document.getElementById('occupancy-rate');
    if (ocupacionElement) {
        ocupacionElement.textContent = `${ocupacionEstimada}%`;
    }
}

// MOSTRAR DETALLES DE RESERVA
function mostrarDetallesReserva(reserva) {
    // Crear modal de detalles
    const modalHTML = `
        <div class="modal-overlay" id="detalles-reserva-modal">
            <div class="modal">
                <div class="modal-header">
                    <h3>Detalles de Reserva</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="reserva-info">
                        <p><strong>Huésped:</strong> ${reserva.huesped_nombre || 'No especificado'}</p>
                        <p><strong>Teléfono:</strong> ${reserva.huesped_celular || 'No especificado'}</p>
                        <p><strong>Habitaciones:</strong> ${reserva.habitaciones || 'No especificado'}</p>
                        <p><strong>Check-in:</strong> ${reserva.fecha_llegada?.toLocaleDateString() || 'No especificado'}</p>
                        <p><strong>Check-out:</strong> ${reserva.fecha_salida?.toLocaleDateString() || 'No especificado'}</p>
                        <p><strong>Noches:</strong> ${reserva.noches || 'No especificado'}</p>
                        <p><strong>Total:</strong> $${reserva.monto_total?.toLocaleString() || '0'}</p>
                        <p><strong>Estado:</strong> ${reserva.estado_sincro || 'PENDIENTE'}</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary close-modal">Cerrar</button>
                    <button class="btn-primary" onclick="enviarWhatsApp('${reserva.huesped_telefono}', '${reserva.huesped_nombre}', '${reserva.fecha_llegada}', '${reserva.fecha_salida}')">
                        <i class="fab fa-whatsapp"></i> Enviar WhatsApp
                    </button>
                </div>
            </div>
        </div>
    `;

    // Agregar modal al DOM
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer.firstElementChild);

    // Mostrar modal
    const modal = document.getElementById('detalles-reserva-modal');
    modal.style.display = 'flex';

    // Configurar cierre
    modal.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            modal.style.display = 'none';
            setTimeout(() => modal.remove(), 300);
        });
    });
}

// FUNCIÓN PARA ENVIAR WHATSAPP (placeholder)
function enviarWhatsApp(telefono, nombre, fecha_llegada, fecha_salida) {
    if (!telefono) {
        alert('No hay número de teléfono disponible');
        return;
    }

    const numeroLimpio = telefono.replace(/\D/g, '');

    const llegada = formatearFecha(fecha_llegada);
    const salida = formatearFecha(fecha_salida);

    const mensaje = `
Hola *${nombre}*

Te escribimos desde *Hotel La Reliquia* para confirmar tu reserva

* *Fecha de llegada:* ${llegada}
* *Fecha de salida:* ${salida}

Tu habitación ha sido reservada exitosamente.
Si tienes alguna solicitud especial o deseas realizar algún cambio, no dudes en escribirnos.

Será un gusto recibirte.
¡Te esperamos! 
    `;

    const url = `https://wa.me/57${numeroLimpio}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
}


function formatearFecha(fecha) {
    const date = new Date(fecha);

    const opcionesFecha = {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    };

    const opcionesHora = {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    };

    const fechaFormateada = date.toLocaleDateString('es-CO', opcionesFecha);
    const horaFormateada = date.toLocaleTimeString('es-CO', opcionesHora);

    return `${fechaFormateada} – ${horaFormateada}`;
}


// MOSTRAR LOADING
function mostrarLoading(mostrar) {
    const loadingElement = document.getElementById('loading-reservas');
    if (!loadingElement) {
        // Crear elemento de loading si no existe
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-reservas';
        loadingDiv.className = 'loading-overlay';
        loadingDiv.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner-large"></div>
                <p>Cargando reservas...</p>
            </div>
        `;
        document.getElementById('view-reservas').appendChild(loadingDiv);
    }

    const loading = document.getElementById('loading-reservas');
    if (loading) {
        loading.style.display = mostrar ? 'flex' : 'none';
    }
}

// MOSTRAR ERROR
function mostrarError(mensaje) {
    // Eliminar error anterior
    const errorAnterior = document.getElementById('error-reservas');
    if (errorAnterior) errorAnterior.remove();

    // Crear mensaje de error
    const errorDiv = document.createElement('div');
    errorDiv.id = 'error-reservas';
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <div class="error-content">
            <i class="fas fa-exclamation-triangle"></i>
            <p>${mensaje}</p>
            <button onclick="recargarCalendario()">Reintentar</button>
        </div>
    `;

    const reservasContainer = document.querySelector('.reservas-container');
    if (reservasContainer) {
        reservasContainer.prepend(errorDiv);
    }
}

// VISTA SEMANAL (BÁSICA)
function generarVistaSemanal(fecha) {
    // Implementación básica - puedes expandir esto
    const inicioSemana = new Date(fecha);
    inicioSemana.setDate(fecha.getDate() - fecha.getDay() + 1); // Lunes

    console.log('Generando vista semanal para:', inicioSemana.toLocaleDateString());

    // Aquí iría la lógica para generar la vista semanal
    // Por ahora solo un placeholder
    const vistaSemanal = document.getElementById('vista-semanal');
    if (vistaSemanal) {
        vistaSemanal.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <i class="fas fa-calendar-week" style="font-size: 3rem; color: var(--gray-400); margin-bottom: 1rem;"></i>
                <h3>Vista Semanal</h3>
                <p>Próximamente: Vista detallada por semana</p>
                <p>Semana del ${inicioSemana.toLocaleDateString()}</p>
            </div>
        `;
    }
}

// ==========================================================================
// FUNCIONES PARA NUEVA RESERVA
// ==========================================================================

// Variables para nueva reserva
let pasoActual = 1;
let habitacionesSeleccionadas = [];
let huespedSeleccionado = null;
let huespedesExistentes = [];

// ABRIR MODAL DE NUEVA RESERVA
function abrirModalNuevaReserva(fechaInicial = null) {
    // Reiniciar formulario
    pasoActual = 1;
    habitacionesSeleccionadas = [];
    huespedSeleccionado = null;

    // Mostrar modal
    const modal = document.getElementById('modal-nueva-reserva');
    modal.style.display = 'flex';

    // Configurar fecha inicial si se proporciona
    if (fechaInicial) {
        const fechaFormato = fechaInicial.toISOString().split('T')[0];
        document.getElementById('checkin-date').value = fechaFormato;

        // Calcular check-out (1 día después)
        const fechaOut = new Date(fechaInicial);
        fechaOut.setDate(fechaOut.getDate() + 1);
        document.getElementById('checkout-date').value = fechaOut.toISOString().split('T')[0];
    } else {
        // Fecha por defecto (mañana)
        const manana = new Date();
        manana.setDate(manana.getDate() + 1);
        document.getElementById('checkin-date').value = manana.toISOString().split('T')[0];

        // Check-out (2 días después)
        const pasadoManana = new Date(manana);
        pasadoManana.setDate(pasadoManana.getDate() + 1);
        document.getElementById('checkout-date').value = pasadoManana.toISOString().split('T')[0];
    }

    // Configurar eventos
    configurarEventosNuevaReserva();

    // Cargar datos iniciales
    cargarHuespedesExistentes();

    // Mostrar paso 1
    mostrarPaso(1);
}

// CERRAR MODAL
function cerrarModalReserva() {
    document.getElementById('modal-nueva-reserva').style.display = 'none';
}

// CONFIGURAR EVENTOS DEL FORMULARIO
function configurarEventosNuevaReserva() {
    // Cambio en fechas
    document.getElementById('checkin-date').addEventListener('change', function () {
        validarFechas();
        if (pasoActual >= 2) {
            cargarHabitacionesDisponibles();
        }
    });

    document.getElementById('checkout-date').addEventListener('change', function () {
        validarFechas();
        if (pasoActual >= 2) {
            cargarHabitacionesDisponibles();
        }
    });

    // Búsqueda de huésped
    document.getElementById('buscar-huesped').addEventListener('input', function () {
        buscarHuespedes();
    });

    // Método de pago
    document.getElementById('metodo-pago').addEventListener('change', function () {
        const montoAdelanto = document.getElementById('monto-adelanto');
        if (this.value === 'reservado') {
            montoAdelanto.style.display = 'block';
        } else {
            montoAdelanto.style.display = 'none';
        }
    });

    // Envío del formulario
    document.getElementById('form-nueva-reserva').addEventListener('submit', async function (e) {
        e.preventDefault();
        await crearReserva();
    });
}

// VALIDAR FECHAS
function validarFechas() {
    const checkin = document.getElementById('checkin-date');
    const checkout = document.getElementById('checkout-date');

    if (checkin.value && checkout.value) {
        const fechaIn = new Date(checkin.value);
        const fechaOut = new Date(checkout.value);

        if (fechaOut <= fechaIn) {
            alert('La fecha de salida debe ser posterior a la de entrada');
            checkout.value = '';
        }
    }
}

// MOSTRAR/OCULTAR PASOS
function mostrarPaso(paso) {
    // Ocultar todos los pasos
    document.querySelectorAll('.modal-step').forEach(step => {
        step.classList.remove('active');
    });

    // Mostrar paso actual
    document.getElementById(`step-${paso}`).classList.add('active');

    // Actualizar botones de navegación
    const prevBtn = document.getElementById('prev-step');
    const nextBtn = document.getElementById('next-step');
    const submitBtn = document.getElementById('submit-reserva');

    if (paso === 1) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'inline-flex';
        submitBtn.style.display = 'none';
    } else if (paso === 2) {
        prevBtn.style.display = 'inline-flex';
        nextBtn.style.display = 'inline-flex';
        submitBtn.style.display = 'none';

        // Cargar habitaciones disponibles
        cargarHabitacionesDisponibles();
    } else if (paso === 3) {
        prevBtn.style.display = 'inline-flex';
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'inline-flex';

        // Actualizar resumen
        actualizarResumenReserva();
    }
}

// CAMBIAR DE PASO
function cambiarPaso(direccion) {
    // Validar paso actual antes de avanzar
    if (direccion > 0 && !validarPasoActual()) {
        return;
    }

    const nuevoPaso = pasoActual + direccion;

    if (nuevoPaso >= 1 && nuevoPaso <= 3) {
        pasoActual = nuevoPaso;
        mostrarPaso(pasoActual);
    }
}

// VALIDAR PASO ACTUAL
function validarPasoActual() {
    if (pasoActual === 1) {
        // Validar fechas y huésped
        const checkin = document.getElementById('checkin-date').value;
        const checkout = document.getElementById('checkout-date').value;
        const personas = document.getElementById('numero-personas').value;

        if (!checkin || !checkout || !personas) {
            alert('Por favor completa todos los campos requeridos');
            return false;
        }

        return true;

    } else if (pasoActual === 2) {
        // Validar que se hayan seleccionado habitaciones
        if (habitacionesSeleccionadas.length === 0) {
            alert('Debes seleccionar al menos una habitación');
            return false;
        }

        return true;
    }

    return true;
}

// CARGAR HUÉSPEDES EXISTENTES DESDE FIREBASE
async function cargarHuespedesExistentes() {
    try {
        const querySnapshot = await getDocs(collection(db, 'clientes'));
        huespedesExistentes = [];

        querySnapshot.forEach(doc => {
            const huesped = {
                id: doc.id,
                ...doc.data()
            };
            huespedesExistentes.push(huesped);
        });

        // Actualizar datalist
        const datalist = document.getElementById('huespedes-lista');
        datalist.innerHTML = '';

        huespedesExistentes.forEach(huesped => {
            const option = document.createElement('option');
            option.value = `${huesped.nombre} - ${huesped.celular}`;
            option.dataset.huespedId = huesped.id;
            option.dataset.nombre = huesped.nombre;
            option.dataset.telefono = huesped.celular;
            option.dataset.email = huesped.correo || '';
            option.dataset.documento = huesped.documento || '';
            datalist.appendChild(option);
        });

    } catch (error) {
        console.error('Error cargando huéspedes:', error);
    }
}

// BUSCAR HUÉSPEDES
function buscarHuespedes() {
    const buscador = document.getElementById('buscar-huesped');
    const query = buscador.value.toLowerCase().trim();

    if (!query) {
        document.getElementById('huesped-info').style.display = 'none';
        huespedSeleccionado = null;
        return;
    }

    // Buscar en huéspedes existentes
    const encontrado = huespedesExistentes.find(h =>
        h.nombre.toLowerCase().includes(query) ||
        (h.documento && h.documento.includes(query)) ||
        (h.celular && h.celular.includes(query))
    );

    if (encontrado) {
        // Mostrar información del huésped encontrado
        document.getElementById('selected-huesped-nombre').textContent = encontrado.nombre;
        document.getElementById('selected-huesped-doc').textContent = encontrado.documento || 'Sin documento';
        document.getElementById('selected-huesped-tel').textContent = encontrado.celular || 'Sin teléfono';
        document.getElementById('selected-huesped-email').textContent = encontrado.correo || 'Sin email';

        document.getElementById('huesped-info').style.display = 'block';
        huespedSeleccionado = encontrado;
    } else {
        // Si no existe, crear nuevo
        document.getElementById('huesped-info').style.display = 'none';
        huespedSeleccionado = {
            nombre: query,
            telefono: '',
            esNuevo: true
        };
    }
}

// CARGAR HABITACIONES DISPONIBLES
async function cargarHabitacionesDisponibles() {
    const checkin = document.getElementById('checkin-date').value;
    const checkout = document.getElementById('checkout-date').value;

    if (!checkin || !checkout) {
        alert('Primero selecciona las fechas de check-in y check-out');
        return;
    }

    const grid = document.getElementById('habitaciones-grid');
    grid.innerHTML = '<div class="loading-habitaciones"><div class="spinner"></div><p>Cargando habitaciones disponibles...</p></div>';

    try {
        // Convertir fechas a Date
        const fechaInicio = new Date(checkin);
        const fechaFin = new Date(checkout);

        // 1. Obtener habitaciones ocupadas en ese rango
        const reservasEnRango = await obtenerReservasEnRango(fechaInicio, fechaFin);
        const habitacionesOcupadas = reservasEnRango.map(r => r.numero_habitacion);

        // 2. Filtrar habitaciones disponibles
        const filtroTipo = document.getElementById('filtro-tipo').value;
        const filtroPiso = document.getElementById('filtro-piso').value;

        const habitacionesFiltradas = habitaciones.filter(habitacion => {
            // Verificar disponibilidad
            if (habitacionesOcupadas.includes(habitacion.numero)) {
                return false;
            }

            // Aplicar filtros
            if (filtroTipo && habitacion.tipo !== filtroTipo) {
                return false;
            }

            if (filtroPiso) {
                const pisoHabitacion = habitacion.numero.charAt(0); // Primer dígito
                if (pisoHabitacion !== filtroPiso) {
                    return false;
                }
            }

            return true;
        });

        // 3. Generar HTML de habitaciones
        grid.innerHTML = '';

        if (habitacionesFiltradas.length === 0) {
            grid.innerHTML = '<div class="no-habitaciones"><p>No hay habitaciones disponibles para las fechas seleccionadas</p></div>';
            return;
        }

        // Llenar filtro de pisos
        const pisos = [...new Set(habitaciones.map(h => h.numero.charAt(0)))].sort();
        const filtroPisoSelect = document.getElementById('filtro-piso');
        filtroPisoSelect.innerHTML = '<option value="">Todos los pisos</option>';
        pisos.forEach(piso => {
            const option = document.createElement('option');
            option.value = piso;
            option.textContent = `Piso ${piso}`;
            filtroPisoSelect.appendChild(option);
        });

        // Crear tarjetas de habitaciones
        habitacionesFiltradas.forEach(habitacion => {
            const card = document.createElement('div');
            card.className = 'habitacion-card';
            card.dataset.habitacionId = habitacion.numero;

            const isSelected = habitacionesSeleccionadas.includes(habitacion.numero);
            if (isSelected) {
                card.classList.add('selected');
            }

            card.innerHTML = `
                <div class="habitacion-numero">${habitacion.numero}</div>
                <div class="habitacion-tipo">${habitacion.tipo || 'Estándar'}</div>
                <div class="habitacion-capacidad">${habitacion.capacidad || 2} personas</div>
                <div class="habitacion-precio">$${(habitacion.precio_noche || 95000).toLocaleString()}/noche</div>
            `;

            card.addEventListener('click', () => {
                toggleSeleccionHabitacion(habitacion.numero);
            });

            grid.appendChild(card);
        });

    } catch (error) {
        console.error('Error cargando habitaciones:', error);
        grid.innerHTML = '<div class="error-habitaciones"><p>Error cargando habitaciones</p></div>';
    }
}

// OBTENER RESERVAS EN UN RANGO DE FECHAS
async function obtenerReservasEnRango(fechaInicio, fechaFin) {
    try {
        const q = query(
            collection(db, 'reservas_activas'),
            where('fecha_llegada', '<=', Timestamp.fromDate(fechaFin)),
            where('fecha_salida', '>=', Timestamp.fromDate(fechaInicio))
        );

        const querySnapshot = await getDocs(q);
        const reservasRango = [];

        querySnapshot.forEach(doc => {
            const reserva = doc.data();
            reserva.id = doc.id;
            reservasRango.push(reserva);
        });

        return reservasRango;

    } catch (error) {
        console.error('Error obteniendo reservas en rango:', error);
        return [];
    }
}

// TOGGLE SELECCIÓN DE HABITACIÓN
function toggleSeleccionHabitacion(numeroHabitacion) {
    const index = habitacionesSeleccionadas.indexOf(numeroHabitacion);

    if (index === -1) {
        // Agregar
        habitacionesSeleccionadas.push(numeroHabitacion);
    } else {
        // Remover
        habitacionesSeleccionadas.splice(index, 1);
    }

    // Actualizar UI
    actualizarHabitacionesSeleccionadasUI();
    cargarHabitacionesDisponibles(); // Para actualizar estado visual
}

// ACTUALIZAR UI DE HABITACIONES SELECCIONADAS
function actualizarHabitacionesSeleccionadasUI() {
    const countElement = document.getElementById('count-selected');
    const listElement = document.getElementById('selected-rooms-list');

    countElement.textContent = habitacionesSeleccionadas.length;
    listElement.innerHTML = '';

    habitacionesSeleccionadas.forEach(habitacionNum => {
        const habitacion = habitaciones.find(h => h.numero === habitacionNum);
        const tag = document.createElement('div');
        tag.className = 'selected-room-tag';
        tag.innerHTML = `
            <span>${habitacionNum}</span>
            <button type="button" onclick="removerHabitacion('${habitacionNum}')">
                <i class="fas fa-times"></i>
            </button>
        `;
        listElement.appendChild(tag);
    });
}

// REMOVER HABITACIÓN SELECCIONADA
function removerHabitacion(numeroHabitacion) {
    const index = habitacionesSeleccionadas.indexOf(numeroHabitacion);
    if (index > -1) {
        habitacionesSeleccionadas.splice(index, 1);
        actualizarHabitacionesSeleccionadasUI();
        cargarHabitacionesDisponibles();
    }
}

// ACTUALIZAR RESUMEN DE RESERVA
function actualizarResumenReserva() {
    const checkin = document.getElementById('checkin-date').value;

    const [year, month, day] = checkin.split('-');
    const fechaInLista = new Date(year, month - 1, day);
    const checkout = document.getElementById('checkout-date').value;
    const [yearO, monthO, dayO] = checkout.split('-');
    const fechaOutLista = new Date(yearO, monthO - 1, dayO);

    const personas = document.getElementById('numero-personas').value;

    // Calcular noches
    let noches = 0;
    if (checkin && checkout) {
        const fechaIn = fechaInLista;
        const fechaOut = fechaOutLista;
        const diffTime = Math.abs(fechaOut - fechaIn);
        noches = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Calcular total estimado
    let totalEstimado = 0;
    habitacionesSeleccionadas.forEach(habitacionNum => {
        const habitacion = habitaciones.find(h => h.numero === habitacionNum);
        if (habitacion && habitacion.precio_noche) {
            totalEstimado += habitacion.precio_noche * noches;
        }
    });
    alert(totalEstimado);
    // totalEstimado = totalEstimado * parseInt(personas);

    // Actualizar UI
    document.getElementById('resumen-huesped').textContent =
        huespedSeleccionado?.nombre || 'Nuevo huésped';

    document.getElementById('resumen-fechas').textContent =
        `${fechaInLista.toLocaleDateString('es-co')} - ${fechaOutLista.toLocaleDateString('es-co')}`;

    document.getElementById('resumen-noches').textContent = noches;
    document.getElementById('resumen-habitaciones').textContent =
        habitacionesSeleccionadas.join(', ');
    document.getElementById('resumen-personas').textContent = `${personas} persona(s)`;
    document.getElementById('resumen-total').textContent = `$${totalEstimado.toLocaleString()}`;
}

// CREAR RESERVA EN FIREBASE
async function crearReserva() {
    try {
        const submitBtn = document.getElementById('submit-reserva');
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        submitBtn.disabled = true;

        // Obtener datos del formulario
        const checkin = document.getElementById('checkin-date').value;
        const checkout = document.getElementById('checkout-date').value;
        const personas = document.getElementById('numero-personas').value;
        const notas = document.getElementById('notas-reserva').value;
        const metodoPago = document.getElementById('metodo-pago').value;
        const montoAdelanto = document.getElementById('monto-adelanto-input').value || 0;

        // Calcular noches y total
        const [year, month, day] = checkin.split('-');
        const fechaIn = new Date(year, month - 1, day);
        const [yearO, monthO, dayO] = checkout.split('-');
        const fechaOut = new Date(yearO, monthO - 1, dayO);

        const noches = Math.ceil((fechaOut - fechaIn) / (1000 * 60 * 60 * 24));

        let total = 0;
        const habitacionesDetalle = [];

        habitacionesSeleccionadas.forEach(habitacionNum => {
            const habitacion = habitaciones.find(h => h.numero === habitacionNum);
            if (habitacion) {
                const subtotal = (habitacion.precio_noche || 95000) * noches;
                total += subtotal;

                habitacionesDetalle.push({
                    numero: habitacionNum,
                    tipo: habitacion.tipo,
                    precio_noche: habitacion.precio_noche || 95000,
                    subtotal: subtotal
                });
            }
        });

        // ID único para la reserva
        const idReserva = `WEB-${Date.now()}-LOCAL`;

        // Crear objeto de reserva
        const nuevaReserva = {
            huesped_nombre: huespedSeleccionado?.nombre || 'Huésped nuevo',
            huesped_celular: huespedSeleccionado?.celular || '',
            numero_habitacion: habitacionesSeleccionadas[0], // Habitación principal
            habitaciones: habitacionesSeleccionadas,
            habitaciones_detalle: habitacionesDetalle,
            fecha_llegada: Timestamp.fromDate(fechaIn),
            fecha_salida: Timestamp.fromDate(fechaOut),
            fecha_creacion: Timestamp.now(),
            noches: noches,
            personas: parseInt(personas),
            monto_total: total,
            monto_pagado: parseFloat(montoAdelanto),
            metodo_pago: metodoPago,
            estado_sincro: 'PENDIENTE',
            estado_reserva: metodoPago === 'reservado' ? 'RESERVADO' : 'CONFIRMADA',
            notas: notas,
            id_reserva_ext: idReserva,
            usuario_uid_creacion: 'dashboard-local', // En producción usarías el UID del usuario
            canal: 'directo'
        };

        console.log('Creando reserva:', nuevaReserva);

        // Guardar en Firebase
        const docRef = await addDoc(collection(db, 'reservas_activas'), nuevaReserva);

        console.log('Reserva creada con ID:', docRef.id);

        // Mostrar mensaje de éxito
        alert('✅ Reserva creada exitosamente');

        // Cerrar modal
        cerrarModalReserva();

        // Recargar calendario para mostrar la nueva reserva
        await recargarCalendario();

    } catch (error) {
        console.error('Error creando reserva:', error);
        alert('❌ Error al crear la reserva: ' + error.message);

        const submitBtn = document.getElementById('submit-reserva');
        submitBtn.innerHTML = '<i class="fas fa-check-circle"></i> Confirmar Reserva';
        submitBtn.disabled = false;
    }
}

// ==========================================================================
// INTEGRACIÓN CON LA VISTA PRINCIPAL
// ==========================================================================

// Agregar estas funciones al objeto global
window.abrirModalNuevaReserva = abrirModalNuevaReserva;
window.cerrarModalReserva = cerrarModalReserva;
window.buscarHuespedes = buscarHuespedes;
window.cambiarPaso = cambiarPaso;
window.removerHabitacion = removerHabitacion;

// Modificar la función configurarEventos para incluir el botón de nueva reserva



// EXPORTAR FUNCIONES PARA USO GLOBAL
window.recargarCalendario = recargarCalendario;
window.enviarWhatsApp = enviarWhatsApp;