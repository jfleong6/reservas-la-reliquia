// dashboard-interfaz-reserva.js

import { db } from './firebase-config.js';
import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

class DashboardReservas {
    constructor() {
        this.currentDate = new Date();
        this.reservas = [];
        this.habitaciones = [];
        this.vistaActual = 'mensual';
        this.coloresGrupos = new Map();
        this.reservaSeleccionada = null;
        this.diaSeleccionado = null;

        // Configuración Colombia
        this.ZONA_HORARIA = 'America/Bogota';
        this.LOCALE = 'es-CO';
        this.DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        this.MESES = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];

        this.init();
    }

    // ============================================================================
    // 1. INICIALIZACIÓN PRINCIPAL
    // ============================================================================

    async init() {
        try {
            console.log('Inicializando Dashboard de Reservas...');
            this.mostrarLoading(true);

            // Cargar datos iniciales
            await this.cargarHabitaciones();
            await this.cargarReservasMes(this.currentDate);

            // Configurar eventos
            this.configurarEventos();

            // Generar vista inicial
            // this.generarVistaSemanal();

            // Actualizar interfaz
            this.actualizarTituloPeriodo();
            this.mostrarLoading(false);
            this.cambiarVista("semanal");

            console.log('Dashboard inicializado correctamente');

        } catch (error) {
            console.error('Error inicializando dashboard:', error);
            this.mostrarError('Error cargando las reservas');
            this.mostrarLoading(false);
        }
    }

    // ============================================================================
    // 2. UTILIDADES Y HELPERS
    // ============================================================================

    ajustarFechaColombia(fecha) {
        return new Date(fecha.toLocaleString('en-US', { timeZone: this.ZONA_HORARIA }));
    }

    obtenerInicioSemana(fecha) {
        const inicio = new Date(fecha);
        const dia = inicio.getDay();
        const diff = inicio.getDate() - dia + (dia === 0 ? -6 : 1);
        inicio.setDate(diff);
        inicio.setHours(0, 0, 0, 0);
        return this.ajustarFechaColombia(inicio);
    }

    obtenerFinSemana(fecha) {
        const inicioSemana = this.obtenerInicioSemana(fecha);
        const finSemana = new Date(inicioSemana);
        finSemana.setDate(inicioSemana.getDate() + 6);
        finSemana.setHours(23, 59, 59, 999);
        return finSemana;
    }

    formatearFecha(fecha) {
        return fecha.toLocaleDateString(this.LOCALE, {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }

    formatearFechaCorta(fecha) {
        return fecha.toLocaleDateString(this.LOCALE, {
            day: 'numeric',
            month: 'short'
        });
    }

    sonMismoDia(fecha1, fecha2) {
        return fecha1.getDate() === fecha2.getDate() &&
            fecha1.getMonth() === fecha2.getMonth() &&
            fecha1.getFullYear() === fecha2.getFullYear();
    }

    generarColorGrupo(idReserva) {
        if (!this.coloresGrupos.has(idReserva)) {
            const hash = this.hashString(idReserva);
            const hue = hash % 360;
            const color = `hsl(${hue}, 70%, 80%)`;
            this.coloresGrupos.set(idReserva, color);
        }
        return this.coloresGrupos.get(idReserva);
    }

    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return Math.abs(hash);
    }

    // ============================================================================
    // 3. CARGA DE DATOS
    // ============================================================================

    async cargarHabitaciones() {
        try {
            console.log('Cargando habitaciones...');
            const querySnapshot = await getDocs(collection(db, 'habitaciones'));
            this.habitaciones = [];

            querySnapshot.forEach(doc => {
                const habitacion = {
                    id: doc.id,
                    ...doc.data()
                };
                this.habitaciones.push(habitacion);
            });

            this.habitaciones.sort((a, b) => parseInt(a.numero) - parseInt(b.numero));
            console.log(`${this.habitaciones.length} habitaciones cargadas`);

        } catch (error) {
            console.error('Error cargando habitaciones:', error);
            throw error;
        }
    }

    async cargarReservasMes(fecha) {
        try {
            const inicioMes = this.ajustarFechaColombia(new Date(fecha.getFullYear(), fecha.getMonth(), 1));
            const finMes = this.ajustarFechaColombia(new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0));

            inicioMes.setHours(0, 0, 0, 0);
            finMes.setHours(23, 59, 59, 999);

            console.log(`Cargando reservas del mes: ${this.MESES[fecha.getMonth()]} ${fecha.getFullYear()}`);

            const q = query(
                collection(db, 'reservas_activas'),
                where('fecha_llegada', '<=', Timestamp.fromDate(finMes)),
                where('fecha_salida', '>=', Timestamp.fromDate(inicioMes)),
                orderBy('fecha_llegada')
            );

            const querySnapshot = await getDocs(q);
            this.reservas = [];

            querySnapshot.forEach(doc => {
                const reservaData = doc.data();
                const reserva = {
                    id: doc.id,
                    ...reservaData,
                    fecha_llegada: reservaData.fecha_llegada?.toDate(),
                    fecha_salida: reservaData.fecha_salida?.toDate(),
                    fecha_creacion: reservaData.fecha_creacion?.toDate()
                };
                this.reservas.push(reserva);
            });

            console.log(`${this.reservas.length} reservas cargadas para el mes`);

        } catch (error) {
            console.error('Error cargando reservas:', error);
            throw error;
        }
    }

    async cargarReservasSemana(fecha) {
        try {
            const inicioSemana = this.obtenerInicioSemana(fecha);
            const finSemana = this.obtenerFinSemana(fecha);

            const q = query(
                collection(db, 'reservas_activas'),
                where('fecha_llegada', '<=', Timestamp.fromDate(finSemana)),
                where('fecha_salida', '>=', Timestamp.fromDate(inicioSemana)),
                orderBy('fecha_llegada')
            );

            const querySnapshot = await getDocs(q);
            this.reservas = [];

            querySnapshot.forEach(doc => {
                const reservaData = doc.data();
                const reserva = {
                    id: doc.id,
                    ...reservaData,
                    fecha_llegada: reservaData.fecha_llegada?.toDate(),
                    fecha_salida: reservaData.fecha_salida?.toDate()
                };
                this.reservas.push(reserva);
            });

            console.log(`${this.reservas.length} reservas cargadas para la semana`);

        } catch (error) {
            console.error('Error cargando reservas de la semana:', error);
            throw error;
        }
    }

    // ============================================================================
    // 4. VISTA MENSUAL
    // ============================================================================

    generarVistaMensual() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        const primerDia = new Date(year, month, 1);
        const ultimoDia = new Date(year, month + 1, 0);

        let primerDiaSemana = primerDia.getDay();
        primerDiaSemana = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;

        const totalDias = primerDiaSemana + ultimoDia.getDate();
        const totalSemanas = Math.ceil(totalDias / 7);
        const totalCeldas = totalSemanas * 7;

        const calendarioElement = document.getElementById('div-calendario-mensual');
        if (!calendarioElement) return;

        calendarioElement.innerHTML = '';

        // Días del mes anterior
        for (let i = 0; i < primerDiaSemana; i++) {
            const fechaDia = new Date(primerDia);
            fechaDia.setDate(primerDia.getDate() - (primerDiaSemana - i));
            this.crearDiaCalendario(fechaDia, true, calendarioElement);
        }

        // Días del mes actual
        for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
            const fechaDia = new Date(year, month, dia);
            this.crearDiaCalendario(fechaDia, false, calendarioElement);
        }

        // Días del mes siguiente
        const diasRestantes = totalCeldas - totalDias;
        for (let i = 1; i <= diasRestantes; i++) {
            const fechaDia = new Date(ultimoDia);
            fechaDia.setDate(ultimoDia.getDate() + i);
            this.crearDiaCalendario(fechaDia, true, calendarioElement);
        }
    }

    crearDiaCalendario(fecha, esOtroMes, container) {
        const diaElement = document.createElement('div');
        diaElement.className = 'calendario-dia';
        diaElement.dataset.fecha = fecha.toISOString().split('T')[0];

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const fechaComparar = new Date(fecha);
        fechaComparar.setHours(0, 0, 0, 0);

        if (esOtroMes) {
            diaElement.classList.add('otro-mes');
        } else {
            if (fechaComparar < hoy) {
                diaElement.classList.add('pasado');
            }
            if (this.sonMismoDia(fechaComparar, hoy)) {
                diaElement.classList.add('hoy');
            }

            // Agregar número del día
            const numeroElement = document.createElement('div');
            numeroElement.className = 'calendario-dia-numero';
            numeroElement.textContent = fecha.getDate();
            diaElement.appendChild(numeroElement);

            // Agregar eventos/reservas del día
            const reservasDia = this.obtenerReservasDelDia(fecha);
            if (reservasDia.length > 0) {
                const eventosContainer = document.createElement('div');
                eventosContainer.className = 'eventos-dia';

                reservasDia.forEach(reserva => {
                    const evento = document.createElement('div');
                    evento.className = 'evento-reserva';
                    evento.style.backgroundColor = this.generarColorGrupo(reserva.id);
                    evento.textContent = reserva.huesped_nombre?.substring(0, 10) || 'Reserva';
                    evento.title = `${reserva.huesped_nombre} - Hab: ${reserva.habitaciones?.join(', ')}`;
                    evento.dataset.reservaId = reserva.id;

                    evento.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.mostrarDetallesReserva(reserva);
                    });

                    eventosContainer.appendChild(evento);
                });

                diaElement.appendChild(eventosContainer);
            }

            // Hacer clickeable solo si no es pasado
            if (!diaElement.classList.contains('pasado')) {
                diaElement.addEventListener('click', () => {
                    this.mostrarModalReservasDia(fecha);
                });
            }
        }

        container.appendChild(diaElement);
    }

    obtenerReservasDelDia(fecha) {
        const fechaComparar = new Date(fecha);
        fechaComparar.setHours(0, 0, 0, 0);

        return this.reservas.filter(reserva => {
            const llegada = new Date(reserva.fecha_llegada);
            const salida = new Date(reserva.fecha_salida);

            llegada.setHours(0, 0, 0, 0);
            salida.setHours(0, 0, 0, 0);

            return fechaComparar >= llegada && fechaComparar < salida;
        });
    }

    // ============================================================================
    // 5. VISTA SEMANAL
    // ============================================================================

    generarVistaSemanal() {
        const inicioSemana = this.obtenerInicioSemana(this.currentDate);
        const vistaSemanalElement = document.getElementById('vista-semanal');

        if (!vistaSemanalElement) return;

        vistaSemanalElement.innerHTML = '';

        // Crear tabla
        const table = document.createElement('table');
        table.className = 'tabla-semanal';

        // Crear encabezado con días
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        // Celda vacía para habitaciones
        const thHabitaciones = document.createElement('th');
        thHabitaciones.textContent = 'Habitaciones';
        headerRow.appendChild(thHabitaciones);

        // Encabezados para cada día
        for (let i = 0; i < 7; i++) {
            const fechaDia = new Date(inicioSemana);
            fechaDia.setDate(inicioSemana.getDate() + i);

            const th = document.createElement('th');
            th.textContent = `${this.DIAS_SEMANA[i]} ${fechaDia.getDate()}`;
            th.dataset.fecha = fechaDia.toISOString().split('T')[0];
            headerRow.appendChild(th);
        }

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Cuerpo de la tabla con habitaciones
        const tbody = document.createElement('tbody');

        this.habitaciones.forEach(habitacion => {
            const fila = this.crearFilaHabitacion(habitacion, inicioSemana);
            tbody.appendChild(fila);
        });

        table.appendChild(tbody);
        vistaSemanalElement.appendChild(table);
    }

    crearFilaHabitacion(habitacion, inicioSemana) {
        const tr = document.createElement('tr');

        // Celda de habitación
        const tdHabitacion = document.createElement('td');
        tdHabitacion.className = 'celda-habitacion';
        tdHabitacion.textContent = habitacion.numero;
        tr.appendChild(tdHabitacion);

        // Celdas para cada día de la semana
        for (let i = 0; i < 7; i++) {
            const fechaDia = new Date(inicioSemana);
            fechaDia.setDate(inicioSemana.getDate() + i);

            const td = document.createElement('td');
            td.className = 'celda-dia';
            td.dataset.fecha = fechaDia.toISOString().split('T')[0];
            td.dataset.habitacion = habitacion.numero;

            // Buscar reservas para esta habitación en este día
            const reservasDia = this.obtenerReservasParaHabitacionDia(habitacion.numero, fechaDia);

            if (reservasDia.length > 0) {
                reservasDia.forEach(reserva => {
                    const spanReserva = document.createElement('span');
                    spanReserva.className = 'reserva-celda';
                    spanReserva.style.backgroundColor = this.generarColorGrupo(reserva.id);
                    spanReserva.textContent = reserva.huesped_nombre?.substring(0, 12) || 'Reserva';
                    spanReserva.title = `${reserva.huesped_nombre}\nCheck-in: ${this.formatearFecha(reserva.fecha_llegada)}\nCheck-out: ${this.formatearFecha(reserva.fecha_salida)}`;
                    spanReserva.dataset.reservaId = reserva.id;

                    spanReserva.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.mostrarDetallesReserva(reserva);
                    });

                    td.appendChild(spanReserva);
                });
            }

            tr.appendChild(td);
        }

        return tr;
    }

    obtenerReservasParaHabitacionDia(numeroHabitacion, fecha) {
        const fechaComparar = new Date(fecha);
        fechaComparar.setHours(0, 0, 0, 0);

        return this.reservas.filter(reserva => {
            // Verificar si la reserva incluye esta habitación
            const incluyeHabitacion = reserva.habitaciones?.includes(numeroHabitacion) ||
                reserva.numero_habitacion === numeroHabitacion;

            if (!incluyeHabitacion) return false;

            // Verificar si la fecha está dentro del rango de la reserva
            const llegada = new Date(reserva.fecha_llegada);
            const salida = new Date(reserva.fecha_salida);

            llegada.setHours(0, 0, 0, 0);
            salida.setHours(0, 0, 0, 0);

            return fechaComparar >= llegada && fechaComparar < salida;
        });
    }

    // ============================================================================
    // 6. MODALES
    // ============================================================================

    mostrarModalReservasDia(fecha) {
        this.diaSeleccionado = fecha;
        const reservasDia = this.obtenerReservasDelDia(fecha);

        const modalHTML = `
            <div class="modal-overlay-reservas" id="modal-reservas-dia">
                <div class="modal modal-kanban">
                    <div class="modal-header">
                        <h3>Reservas del ${this.formatearFecha(fecha)}</h3>
                        <button class="btn-cerrar-modal">&times;</button>
                    </div>
                    <div class="modal-body kanban-container">
                        <div class="kanban-columna">
                            <h4>Reservas (${reservasDia.length})</h4>
                            <div class="lista-reservas" id="lista-reservas-dia">
                                ${reservasDia.map(reserva => `
                                    <div class="reserva-item ${this.reservaSeleccionada?.id === reserva.id ? 'seleccionada' : ''}" 
                                         data-reserva-id="${reserva.id}">
                                        <div class="reserva-color" style="background-color: ${this.generarColorGrupo(reserva.id)}"></div>
                                        <div class="reserva-info-mini">
                                            <div class="reserva-nombre">${reserva.huesped_nombre || 'Sin nombre'}</div>
                                            <div class="reserva-habitaciones">${reserva.habitaciones?.join(', ') || reserva.numero_habitacion}</div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="kanban-columna">
                            <h4>Detalles de la Reserva</h4>
                            <div class="detalles-reserva" id="detalles-reserva-kanban">
                                ${this.reservaSeleccionada ? this.generarDetallesReservaHTML(this.reservaSeleccionada) :
                '<p class="sin-seleccion">Selecciona una reserva para ver sus detalles</p>'}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary btn-cerrar-modal">Cerrar</button>
                    </div>
                </div>
            </div>
        `;

        // Agregar modal al DOM
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer.firstElementChild);

        // Configurar eventos
        this.configurarEventosModalDia(reservasDia);
    }

    configurarEventosModalDia(reservasDia) {
        const modal = document.getElementById('modal-reservas-dia');
        if (!modal) return;

        // Cerrar modal
        modal.querySelectorAll('.btn-cerrar-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.remove();
            });
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Seleccionar reserva
        const listaReservas = document.getElementById('lista-reservas-dia');
        if (listaReservas) {
            listaReservas.addEventListener('click', (e) => {
                const reservaItem = e.target.closest('.reserva-item');
                if (reservaItem) {
                    const reservaId = reservaItem.dataset.reservaId;
                    const reserva = reservasDia.find(r => r.id === reservaId);

                    if (reserva) {
                        // Actualizar selección visual
                        document.querySelectorAll('.reserva-item').forEach(item => {
                            item.classList.remove('seleccionada');
                        });
                        reservaItem.classList.add('seleccionada');

                        // Mostrar detalles
                        this.mostrarDetallesEnKanban(reserva);
                    }
                }
            });
        }

        // Seleccionar primera reserva por defecto
        if (reservasDia.length > 0 && !this.reservaSeleccionada) {
            const primeraReserva = reservasDia[0];
            const primerItem = listaReservas?.querySelector('.reserva-item');
            if (primerItem) {
                primerItem.classList.add('seleccionada');
                this.mostrarDetallesEnKanban(primeraReserva);
            }
        } else if (this.reservaSeleccionada) {
            this.mostrarDetallesEnKanban(this.reservaSeleccionada);
        }
    }

    mostrarDetallesEnKanban(reserva) {
        this.reservaSeleccionada = reserva;
        const detallesElement = document.getElementById('detalles-reserva-kanban');
        if (detallesElement) {
            detallesElement.innerHTML = this.generarDetallesReservaHTML(reserva);
        }
    }

    generarDetallesReservaHTML(reserva) {


        return `
            <div class="detalles-reserva-card" style="border-left-color: ${this.generarColorGrupo(reserva.id)}">
                <div class="detalle-item">
                    <span class="detalle-label">Huésped:</span>
                    <span class="detalle-valor">${reserva.huesped_nombre || 'No especificado'}</span>
                </div>
                <div class="detalle-item">
                    <span class="detalle-label">Teléfono:</span>
                    <span class="detalle-valor">${reserva.huesped_celular || 'No especificado'}</span>
                </div>
                <div class="detalle-item">
                    <span class="detalle-label">Habitaciones:</span>
                    <span class="detalle-valor">${Array.isArray(reserva.habitaciones) ? reserva.habitaciones.join(', ') : reserva.habitaciones || 'No especificado'}</span>
                </div>
                <div class="detalle-item">
                    <span class="detalle-label">Check-in:</span>
                    <span class="detalle-valor">${reserva.fecha_llegada ? this.formatearFecha(reserva.fecha_llegada) : 'No especificado'}</span>
                </div>
                <div class="detalle-item">
                    <span class="detalle-label">Check-out:</span>
                    <span class="detalle-valor">${reserva.fecha_salida ? this.formatearFecha(reserva.fecha_salida) : 'No especificado'}</span>
                </div>
                <div class="detalle-item">
                    <span class="detalle-label">Noches:</span>
                    <span class="detalle-valor">${reserva.noches || 'No especificado'}</span>
                </div>
                <div class="detalle-item">
                    <span class="detalle-label">Personas:</span>
                    <span class="detalle-valor">${reserva.personas || 'No especificado'}</span>
                </div>
                <div class="detalle-item">
                    <span class="detalle-label">Total:</span>
                    <span class="detalle-valor">$${(reserva.monto_total || 0).toLocaleString()}</span>
                </div>
                <div class="detalle-item">
                    <span class="detalle-label">Pagado:</span>
                    <span class="detalle-valor">$${(reserva.monto_pagado || 0).toLocaleString()}</span>
                </div>
                <div class="detalle-item">
                    <span class="detalle-label">Método Pago:</span>
                    <span class="detalle-valor">${reserva.metodo_pago || 'No especificado'}</span>
                </div>
                <div class="detalle-item">
                    <span class="detalle-label">Estado:</span>
                    <span class="detalle-valor estado-${reserva.estado_reserva?.toLowerCase() || 'pendiente'}">
                        ${reserva.estado_reserva || 'PENDIENTE'}
                    </span>
                </div>
                ${reserva.notas ? `
                    <div class="detalle-item">
                        <span class="detalle-label">Notas:</span>
                        <span class="detalle-valor">${reserva.notas}</span>
                    </div>
                ` : ''}
                ${reserva.servicios && reserva.servicios.length > 0 ? `
                    <div class="detalle-item">
                        <span class="detalle-label">Servicios:</span>
                        <span class="detalle-valor">
                            <ul class="lista-servicios">
                                ${reserva.servicios.map(servicio => `
                                    <li>${servicio.nombre || servicio.id_servicio} - $${servicio.precio || 0} (${servicio.personas || 0} personas)</li>
                                `).join('')}
                            </ul>
                        </span>
                    </div>
                ` : ''}
                <div class="acciones-reserva">
                    <button class="btn-primary" onclick="dashboardReservas.enviarWhatsApp('${reserva.huesped_celular || ''}', '${reserva.huesped_nombre || ''}', '${reserva.fecha_llegada ? this.formatearFecha(reserva.fecha_llegada) : ''}', '${reserva.fecha_salida ? this.formatearFecha(reserva.fecha_salida) : ''}')">
                        <i class="fab fa-whatsapp"></i> WhatsApp
                    </button>
                </div>
            </div>
        `;
    }

    mostrarDetallesReserva(reserva) {
        this.reservaSeleccionada = reserva;

        const modalHTML = `
            <div class="modal-overlay-reservas" id="modal-detalles-reserva">
                <div class="modal">
                    <div class="modal-header">
                        <h3>Detalles de Reserva</h3>
                        <button class="btn-cerrar-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        ${this.generarDetallesReservaHTML(reserva)}
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary btn-cerrar-modal">Cerrar</button>
                    </div>
                </div>
            </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer.firstElementChild);

        const modal = document.getElementById('modal-detalles-reserva');
        modal.querySelectorAll('.btn-cerrar-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.remove();
            });
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    // ============================================================================
    // 7. NAVEGACIÓN Y EVENTOS
    // ============================================================================

    configurarEventos() {
        // Navegación por meses/semanas
        document.getElementById('prev-date')?.addEventListener('click', () => {
            this.navegarPeriodo(-1);
        });

        document.getElementById('next-date')?.addEventListener('click', () => {
            this.navegarPeriodo(1);
        });

        // Ir a hoy
        document.getElementById('btn-today')?.addEventListener('click', () => {
            this.irAHoy();
        });

        // Cambiar entre vistas
        document.querySelectorAll('.view-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const view = tab.dataset.view;
                this.cambiarVista(view);
            });
        });

        // Botón de nueva reserva
        document.getElementById('nueva-reserva-btn')?.addEventListener('click', () => {
            this.abrirModalNuevaReserva();
        });
    }

    cambiarVista(vista) {
        this.vistaActual = vista;

        // Actualizar tabs activos
        document.querySelectorAll('.view-tab').forEach(t => {
            t.classList.remove('active');
            if (t.dataset.view === vista) {
                t.classList.add('active');
            }
        });

        // Mostrar vista correspondiente
        document.querySelectorAll('.calendario-vista').forEach(v => {
            console.log(v.id);
            console.log(vista);

            v.classList.remove('active');
            if (v.id === `vista-${vista}` || (vista === 'mensual' && v.id === 'calendario-mensual')) {
                v.classList.add('active');
            }
        });

        // Generar vista
        if (vista === 'mensual') {
            this.generarVistaMensual();
        } else if (vista === 'semanal') {
            this.generarVistaSemanal();
        }

        this.actualizarTituloPeriodo();
    }

    navegarPeriodo(direccion) {
        if (this.vistaActual === 'mensual') {
            this.currentDate.setMonth(this.currentDate.getMonth() + direccion);
            this.cargarReservasMes(this.currentDate).then(() => {
                this.generarVistaMensual();
                this.actualizarTituloPeriodo();
            });
        } else if (this.vistaActual === 'semanal') {
            const dias = direccion * 7;
            this.currentDate.setDate(this.currentDate.getDate() + dias);
            this.cargarReservasSemana(this.currentDate).then(() => {
                this.generarVistaSemanal();
                this.actualizarTituloPeriodo();
            });
        }
    }

    irAHoy() {
        this.currentDate = new Date();
        if (this.vistaActual === 'mensual') {
            this.cargarReservasMes(this.currentDate).then(() => {
                this.generarVistaMensual();
                this.actualizarTituloPeriodo();
            });
        } else if (this.vistaActual === 'semanal') {
            this.cargarReservasSemana(this.currentDate).then(() => {
                this.generarVistaSemanal();
                this.actualizarTituloPeriodo();
            });
        }
    }

    actualizarTituloPeriodo() {
        const periodElement = document.getElementById('current-period');
        if (!periodElement) return;

        if (this.vistaActual === 'mensual') {
            periodElement.textContent = `${this.MESES[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
        } else if (this.vistaActual === 'semanal') {
            const inicioSemana = this.obtenerInicioSemana(this.currentDate);
            const finSemana = new Date(inicioSemana);
            finSemana.setDate(inicioSemana.getDate() + 6);

            periodElement.textContent =
                `${this.formatearFechaCorta(inicioSemana)} - ${this.formatearFechaCorta(finSemana)}`;
        }
    }

    // ============================================================================
    // 8. FUNCIONALIDADES ADICIONALES
    // ============================================================================

    enviarWhatsApp(telefono, nombre, fechaLlegada, fechaSalida) {
        if (!telefono) {
            alert('No hay número de teléfono disponible');
            return;
        }

        const numeroLimpio = telefono.toString().replace(/\D/g, '');

        const mensaje = `Hola *${nombre}*

        Te escribimos desde *Hotel La Reliquia* para confirmarte que tu *reserva ha sido registrada y confirmada exitosamente*

        * *Fecha de llegada:* ${fechaLlegada}
        * *Fecha de salida:* ${fechaSalida}


        Si tienes alguna pregunta, deseas agregar un servicio adicional o necesitas apoyo antes de tu llegada, no dudes en escribirnos.

        ¡Será un gusto recibirte!
        `;


        const url = `https://wa.me/57${numeroLimpio}?text=${encodeURIComponent(mensaje)}`;
        window.open(url, '_blank');
    }

    abrirModalNuevaReserva() {
        // Esta función se implementará en dashboard-nueva-reserva.js
        console.log('Abrir modal de nueva reserva');
        // Aquí llamarías a la función del otro archivo
    }

    // ============================================================================
    // 9. UI HELPERS
    // ============================================================================

    mostrarLoading(mostrar) {
        let loadingElement = document.getElementById('loading-reservas');

        if (!loadingElement) {
            loadingElement = document.createElement('div');
            loadingElement.id = 'loading-reservas';
            loadingElement.className = 'loading-overlay';
            loadingElement.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner-large"></div>
                    <p>Cargando reservas...</p>
                </div>
            `;
            document.getElementById('view-reservas').appendChild(loadingElement);
        }

        loadingElement.style.display = mostrar ? 'flex' : 'none';
    }

    mostrarError(mensaje) {
        const errorAnterior = document.getElementById('error-reservas');
        if (errorAnterior) errorAnterior.remove();

        const errorDiv = document.createElement('div');
        errorDiv.id = 'error-reservas';
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <div class="error-content">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${mensaje}</p>
                <button onclick="dashboardReservas.recargarVista()">Reintentar</button>
            </div>
        `;

        const reservasContainer = document.querySelector('.reservas-container');
        if (reservasContainer) {
            reservasContainer.prepend(errorDiv);
        }
    }

    recargarVista() {
        if (this.vistaActual === 'mensual') {
            this.cargarReservasMes(this.currentDate).then(() => {
                this.generarVistaMensual();
            });
        } else if (this.vistaActual === 'semanal') {
            this.cargarReservasSemana(this.currentDate).then(() => {
                this.generarVistaSemanal();
            });
        }
    }
}

// Crear instancia global
const dashboardReservas = new DashboardReservas();

// Exportar para uso global
window.dashboardReservas = dashboardReservas;