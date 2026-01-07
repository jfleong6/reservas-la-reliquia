import { db, auth } from './firebase-config.js';
import { collection, getDocs, addDoc, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export class ReservaModal {
    constructor() {
        // Control de modal único
        this.modalAbierto = false;
        this.modalElement = null;

        // Etapas del proceso
        this.etapaActual = 1;
        this.etapasCompletadas = {};

        // Datos de la reserva
        this.datosReserva = {
            canal: "directo",
            estado_reserva: "pendiente",
            estado_sincrono: "PENDIENTE",
            fecha_creacion: new Date().toISOString(),
            habitaciones: [],
            servicios: [],
            tipo_tarifa: "",
            metodo_pago: "",
            monto_pagado: 0,
            monto_total: 0,
            noches: 0,
            personas: { adultos: 0, niños: 0 },
            observaciones: "",
            id_usuario_creado: auth.currentUser?.uid || ""
        };

        // Datos temporales
        this.clienteEncontrado = null;
        this.serviciosDisponibles = [];
        this.mediosPago = [];
        this.plataformas = [];

        // Inicializar
        this.inicializarEventos();
    }

    // Método principal para abrir el modal
    abrirModal() {
        if (this.modalAbierto) {
            // console.log("El modal ya está abierto");
            return;
        }

        this.crearModal();
        this.cargarDatosIniciales();
        this.mostrarEtapa(1);
        this.modalAbierto = true;
    }

    // Crear la estructura HTML del modal
    crearModal() {
        // Crear elemento modal
        this.modalElement = document.createElement('div');
        this.modalElement.className = 'reserva-modal';
        this.modalElement.innerHTML = `
            <div class="modal-contenido">
                <!-- Cabecera -->
                <div class="modal-cabecera">
                    <h2>Nueva Reserva</h2>
                    <div class="info-reserva">
                        <span id="numero-reserva">RES-${Date.now()}</span>
                        <div class="fechas">
                            <input type="date" id="fecha-llegada" placeholder="Fecha llegada">
                            <input type="date" id="fecha-salida" placeholder="Fecha salida">
                        </div>
                        <input type="text" id="habitacion-principal" placeholder="Habitación principal">
                    </div>
                    <button class="cerrar-modal">&times;</button>
                </div>
                
                <!-- Indicador de etapas -->
                <div class="etapas">
                    <div class="etapa activo" data-etapa="1">1. Cliente</div>
                    <div class="etapa" data-etapa="2">2. Pago</div>
                    <div class="etapa" data-etapa="3">3. Servicios</div>
                    <div class="etapa" data-etapa="4">4. Información</div>
                </div>
                
                <!-- Contenido de etapas -->
                <div class="contenido-etapas">
                    <!-- Etapa 1: Cliente -->
                    <div id="etapa-1" class="etapa-contenido activo">
                        <div class="busqueda-cliente">
                            <h3>Buscar Cliente</h3>
                            <div class="busqueda-inputs">
                                <input type="text" id="busqueda-cedula" placeholder="Cédula">
                                <input type="text" id="busqueda-celular" placeholder="Celular">
                                <input type="text" id="busqueda-nombre" placeholder="Nombre">
                                <button id="btn-buscar-cliente">Buscar</button>
                            </div>
                            <div id="resultados-cliente" class="resultados-busqueda"></div>
                        </div>
                        
                        <div class="opciones-cliente">
                            <h3>Opciones</h3>
                            <div class="opciones-botones">
                                <button id="btn-nuevo-cliente" class="opcion-btn">Nuevo Cliente</button>
                                <button id="btn-cliente-sin-info" class="opcion-btn">Cliente Sin Información</button>
                            </div>
                        </div>
                        
                        <!-- Formulario Nuevo Cliente (oculto inicialmente) -->
                        <div id="form-nuevo-cliente" class="formulario-cliente" style="display: none;">
                            <h4>Registrar Nuevo Cliente</h4>
                            <input type="text" id="nuevo-cedula" placeholder="Cédula" required>
                            <input type="text" id="nuevo-nombre" placeholder="Nombre Completo" required>
                            <input type="email" id="nuevo-correo" placeholder="Correo electrónico">
                            <input type="text" id="nuevo-celular" placeholder="Celular" required>
                            <div class="form-botones">
                                <button id="btn-guardar-cliente">Guardar Cliente</button>
                                <button id="btn-cancelar-cliente">Cancelar</button>
                            </div>
                        </div>
                        
                        <!-- Formulario Cliente Sin Info (oculto inicialmente) -->
                        <div id="form-cliente-sin-info" class="formulario-cliente" style="display: none;">
                            <h4>Cliente Sin Información</h4>
                            <input type="text" id="sininfo-nombre" placeholder="Nombre" required>
                            <input type="text" id="sininfo-celular" placeholder="Celular" required>
                            <input type="email" id="sininfo-correo" placeholder="Correo electrónico">
                            <div class="form-botones">
                                <button id="btn-guardar-sininfo">Continuar</button>
                                <button id="btn-cancelar-sininfo">Cancelar</button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Etapa 2: Pago (solo si cliente registrado) -->
                    <div id="etapa-2" class="etapa-contenido">
                        <h3>Información de Pago</h3>
                        <div id="contenido-pago">
                            <!-- Se cargará dinámicamente -->
                        </div>
                    </div>
                    
                    <!-- Etapa 3: Servicios -->
                    <div id="etapa-3" class="etapa-contenido">
                        <div class="configuracion-servicios">
                            <h3>Configuración de Servicios</h3>
                            <!-- Secciones se cargarán dinámicamente -->
                        </div>
                    </div>
                    
                    <!-- Etapa 4: Información adicional -->
                    <div id="etapa-4" class="etapa-contenido">
                        <h3>Información Adicional</h3>
                        <!-- Se cargará dinámicamente -->
                    </div>
                </div>
                
                <!-- Pie del modal -->
                <div class="modal-pie">
                    <div class="controles-navegacion">
                        <button id="btn-atras" disabled>Atrás</button>
                        <button id="btn-siguiente">Siguiente</button>
                        <button id="btn-crear-reserva" style="display: none;">Crear Reserva</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.modalElement);
        this.agregarEventosModal();
    }

    // Inicializar eventos principales
    inicializarEventos() {
        // Aquí irían eventos globales si los hay
    }

    // Agregar eventos al modal
    agregarEventosModal() {
        // Cerrar modal
        this.modalElement.querySelector('.cerrar-modal').addEventListener('click', () => {
            this.cerrarModal();
        });

        // Navegación entre etapas
        this.modalElement.querySelector('#btn-siguiente').addEventListener('click', () => {
            this.siguienteEtapa();
        });

        this.modalElement.querySelector('#btn-atras').addEventListener('click', () => {
            this.anteriorEtapa();
        });

        // Buscar cliente
        this.modalElement.querySelector('#btn-buscar-cliente').addEventListener('click', () => {
            this.buscarCliente();
        });

        // Opciones de cliente
        this.modalElement.querySelector('#btn-nuevo-cliente').addEventListener('click', () => {
            this.mostrarFormularioNuevoCliente();
        });

        this.modalElement.querySelector('#btn-cliente-sin-info').addEventListener('click', () => {
            this.mostrarFormularioSinInfo();
        });

        // También permitir búsqueda con Enter
        ['#busqueda-cedula', '#busqueda-celular', '#busqueda-nombre'].forEach(selector => {
            this.modalElement.querySelector(selector).addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.buscarCliente();
            });
        });
    }

    // Método para cerrar el modal
    cerrarModal() {
        if (this.modalElement) {
            document.body.removeChild(this.modalElement);
            this.modalElement = null;
        }
        this.modalAbierto = false;
        this.etapaActual = 1;
        this.datosReserva = this.resetearDatosReserva();
    }

    // Navegación entre etapas
    siguienteEtapa() {
        if (this.validarEtapaActual()) {
            this.etapasCompletadas[this.etapaActual] = true;
            this.etapaActual++;
            this.mostrarEtapa(this.etapaActual);
        }
    }

    anteriorEtapa() {
        if (this.etapaActual > 1) {
            this.etapaActual--;
            this.mostrarEtapa(this.etapaActual);
        }
    }

    // Mostrar etapa específica
    mostrarEtapa(numeroEtapa) {
        // Actualizar indicadores visuales
        document.querySelectorAll('.etapa').forEach((etapa, index) => {
            etapa.classList.toggle('activo', index + 1 === numeroEtapa);
        });

        // Mostrar contenido de la etapa
        document.querySelectorAll('.etapa-contenido').forEach((contenido, index) => {
            contenido.classList.toggle('activo', index + 1 === numeroEtapa);
        });

        // Actualizar botones de navegación
        const btnAtras = this.modalElement.querySelector('#btn-atras');
        const btnSiguiente = this.modalElement.querySelector('#btn-siguiente');
        const btnCrear = this.modalElement.querySelector('#btn-crear-reserva');

        btnAtras.disabled = numeroEtapa === 1;
        btnSiguiente.style.display = numeroEtapa < 4 ? 'block' : 'none';
        btnCrear.style.display = numeroEtapa === 4 ? 'block' : 'none';

        // Cargar datos específicos de la etapa
        switch (numeroEtapa) {
            case 2:
                this.cargarContenidoPago();
                break;
            case 3:
                this.cargarContenidoServicios();
                break;
            case 4:
                this.cargarContenidoInformacion();
                break;
        }
    }

    // Validar etapa actual antes de avanzar
    validarEtapaActual() {
        switch (this.etapaActual) {
            case 1:
                return this.validarEtapaCliente();
            case 2:
                return this.validarEtapaPago();
            case 3:
                return this.validarEtapaServicios();
            case 4:
                return this.validarEtapaInformacion();
            default:
                return false;
        }
    }

    // ===== MÉTODOS DE CARGA DE DATOS =====

    async cargarDatosIniciales() {
        try {
            await Promise.all([
                this.cargar_servicios(),
                this.cargar_medios_pagos(),
                this.cargar_plataformas()
            ]);
        } catch (error) {
            console.error("Error cargando datos iniciales:", error);
        }
    }

    async cargar_clientes(busqueda = {}) {
        try {
            const ref = collection(db, 'clientes');
            let q;

            if (busqueda.cedula) {
                q = query(ref, where('documento', '==', busqueda.cedula));

            } else if (busqueda.celular) {
                q = query(ref, where('celular', '==', busqueda.celular));

            } else if (busqueda.nombre) {
                q = query(
                    ref,
                    where('nombre', '>=', busqueda.nombre.toLowerCase()),
                    where('nombre', '<=', busqueda.nombre.toLowerCase() + '\uf8ff')
                );
            } else {
                // si no hay búsqueda, traer todos
                q = ref;
            }

            const snapshot = await getDocs(q);

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

        } catch (error) {
            console.error("Error cargando clientes:", error);
            return [];
        }
    }


    async cargar_servicios() {
        try {
            const querySnapshot = await getDocs(collection(db, 'servicios'));
            this.serviciosDisponibles = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            return this.serviciosDisponibles;
        } catch (error) {
            console.error("Error cargando servicios:", error);
            return [];
        }
    }

    async cargar_medios_pagos() {
        try {
            const querySnapshot = await getDocs(collection(db, 'medios_pagos'));
            this.mediosPago = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // console.log("Medios de pago cargados:", this.mediosPago);
            return this.mediosPago;
        } catch (error) {
            console.error("Error cargando medios de pago:", error);
            return [];
        }
    }

    async cargar_plataformas() {
        try {
            const querySnapshot = await getDocs(collection(db, 'plataforma'));
            this.plataformas = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            return this.plataformas;
        } catch (error) {
            console.error("Error cargando plataformas:", error);
            return [];
        }
    }

    // ===== MÉTODOS DE LAS ETAPAS =====

    async buscarCliente() {
        const cedula = this.modalElement.querySelector('#busqueda-cedula').value;
        const celular = this.modalElement.querySelector('#busqueda-celular').value;
        const nombre = this.modalElement.querySelector('#busqueda-nombre').value;

        const busqueda = {};
        if (cedula) busqueda.cedula = cedula;
        if (celular) busqueda.celular = celular;
        if (nombre) busqueda.nombre = nombre;

        const resultados = await this.cargar_clientes(busqueda);
        this.mostrarResultadosClientes(resultados);
    }

    mostrarResultadosClientes(clientes) {
        const contenedor = this.modalElement.querySelector('#resultados-cliente');

        if (clientes.length === 0) {
            contenedor.innerHTML = '<p class="sin-resultados">No se encontraron clientes</p>';
            return;
        }

        contenedor.innerHTML = clientes.map(cliente => `
            <div class="cliente-item" data-id="${cliente.id}">
                <div class="cliente-info">
                    <strong>${cliente.nombre || 'Sin nombre'}</strong>
                    <div class="cliente-detalles">
                        <span>Cédula: ${cliente.documento || 'No registrada'}</span>
                        <span>Celular: ${cliente.celular || 'No registrado'}</span>
                        <span>Correo: ${cliente.correo || 'No registrado'}</span>
                    </div>
                </div>
                <button class="seleccionar-cliente">Seleccionar</button>
            </div>
        `).join('');

        // Agregar eventos a los botones de selección
        contenedor.querySelectorAll('.seleccionar-cliente').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const clienteId = e.target.closest('.cliente-item').dataset.id;
                const cliente = clientes.find(c => c.id === clienteId);
                this.seleccionarCliente(cliente);
            });
        });
    }

    seleccionarCliente(cliente) {
        this.clienteEncontrado = cliente;
        this.datosReserva.huesped_nombre = cliente.nombre;
        this.datosReserva.huesped_celular = cliente.celular;
        this.datosReserva.huesped_correo = cliente.correo;
        this.datosReserva.huesped_cedula = cliente.documento;

        // Marcar etapa como completada
        this.etapasCompletadas[1] = true;

        // Mostrar confirmación
        const contenedor = this.modalElement.querySelector('#resultados-cliente');
        contenedor.innerHTML = `
            <div class="cliente-seleccionado">
                <p><strong>Cliente seleccionado:</strong> ${cliente.nombre}</p>
                <p>Cédula: ${cliente.cedula || 'No registrada'}</p>
                <p>Celular: ${cliente.celular || 'No registrado'}</p>
            </div>
        `;
    }

    mostrarFormularioNuevoCliente() {
        this.modalElement.querySelector('#form-nuevo-cliente').style.display = 'block';
        this.modalElement.querySelector('#form-cliente-sin-info').style.display = 'none';

        // Agregar eventos al formulario
        const btnGuardar = this.modalElement.querySelector('#btn-guardar-cliente');
        btnGuardar.onclick = () => this.guardarNuevoCliente();

        const btnCancelar = this.modalElement.querySelector('#btn-cancelar-cliente');
        btnCancelar.onclick = () => {
            this.modalElement.querySelector('#form-nuevo-cliente').style.display = 'none';
        };
    }

    mostrarFormularioSinInfo() {
        this.modalElement.querySelector('#form-cliente-sin-info').style.display = 'block';
        this.modalElement.querySelector('#form-nuevo-cliente').style.display = 'none';

        // Agregar eventos al formulario
        const btnGuardar = this.modalElement.querySelector('#btn-guardar-sininfo');
        btnGuardar.onclick = () => this.guardarClienteSinInfo();

        const btnCancelar = this.modalElement.querySelector('#btn-cancelar-sininfo');
        btnCancelar.onclick = () => {
            this.modalElement.querySelector('#form-cliente-sin-info').style.display = 'none';
        };
    }

    async guardarNuevoCliente() {
        const nuevoCliente = {
            cedula: this.modalElement.querySelector('#nuevo-cedula').value,
            nombre: this.modalElement.querySelector('#nuevo-nombre').value,
            correo: this.modalElement.querySelector('#nuevo-correo').value,
            celular: this.modalElement.querySelector('#nuevo-celular').value,
            fecha_registro: new Date().toISOString()
        };

        try {
            const docRef = await addDoc(collection(db, 'clientes'), nuevoCliente);
            nuevoCliente.id = docRef.id;

            this.seleccionarCliente(nuevoCliente);
            this.modalElement.querySelector('#form-nuevo-cliente').style.display = 'none';
        } catch (error) {
            console.error("Error guardando cliente:", error);
            alert("Error al guardar el cliente");
        }
    }

    guardarClienteSinInfo() {
        const clienteSinInfo = {
            nombre: this.modalElement.querySelector('#sininfo-nombre').value,
            celular: this.modalElement.querySelector('#sininfo-celular').value,
            correo: this.modalElement.querySelector('#sininfo-correo').value || '',
            tipo: "sin_informacion"
        };

        this.clienteEncontrado = clienteSinInfo;
        this.datosReserva.huesped_nombre = clienteSinInfo.nombre;
        this.datosReserva.huesped_celular = clienteSinInfo.celular;
        this.datosReserva.huesped_correo = clienteSinInfo.correo;

        // Si es cliente sin información, saltar etapa de pago
        this.etapasCompletadas[1] = true;
        this.etapasCompletadas[2] = true; // Marcar etapa de pago como completada automáticamente

        this.modalElement.querySelector('#form-cliente-sin-info').style.display = 'none';

        // Mostrar confirmación
        const contenedor = this.modalElement.querySelector('#resultados-cliente');
        contenedor.innerHTML = `
            <div class="cliente-seleccionado">
                <p><strong>Cliente sin información registrado</strong></p>
                <p>Nombre: ${clienteSinInfo.nombre}</p>
                <p>Celular: ${clienteSinInfo.celular}</p>
            </div>
        `;
    }

    // ===== VALIDACIONES =====

    validarEtapaCliente() {
        if (!this.clienteEncontrado) {
            alert("Debe seleccionar o registrar un cliente primero");
            return false;
        }
        return true;
    }

    validarEtapaPago() {
        // Si es cliente sin información, la etapa de pago se salta
        if (this.clienteEncontrado?.tipo === "sin_informacion") {
            return true;
        }

        // Validar que se haya seleccionado un método de pago
        if (!this.datosReserva.metodo_pago) {
            alert("Debe seleccionar un método de pago");
            return false;
        }

        return true;
    }

    validarEtapaServicios() {
        // Validar que se haya seleccionado al menos un servicio
        if (this.datosReserva.servicios.length === 0) {
            alert("Debe seleccionar al menos un servicio");
            return false;
        }

        // Validar que se haya especificado cantidad de personas
        if (this.datosReserva.personas.adultos === 0) {
            alert("Debe especificar al menos un adulto");
            return false;
        }

        return true;
    }

    validarEtapaInformacion() {
        // Validaciones básicas de la etapa 4
        if (!this.datosReserva.fecha_llegada || !this.datosReserva.fecha_salida) {
            alert("Debe especificar las fechas de llegada y salida");
            return false;
        }

        return true;
    }

    // ===== MÉTODOS PARA CARGAR CONTENIDO DINÁMICO =====

    cargarContenidoPago() {
        const contenedor = this.modalElement.querySelector('#contenido-pago');

        // Si es cliente sin información, mostrar mensaje
        if (this.clienteEncontrado?.tipo === "sin_informacion") {
            contenedor.innerHTML = `
                <div class="info-sin-pago">
                    <p>Cliente sin información - No se requiere pago inicial</p>
                    <p>La reserva se creará con estado "Pendiente de pago"</p>
                </div>
            `;
            this.datosReserva.estado_reserva = "pendiente";
            return;
        }

        // Generar opciones de medios de pago
        const opcionesMedios = this.mediosPago.map(medio =>
            `<option value="${medio.nombre}">${medio.nombre}</option>`
        ).join('');

        contenedor.innerHTML = `
            <div class="form-pago">
                <div class="campo">
                    <label>Método de Pago:</label>
                    <select id="select-metodo-pago">
                        <option value="">Seleccionar...</option>
                        ${opcionesMedios}
                    </select>
                </div>
                
                <div class="campo">
                    <label>Tipo de Pago:</label>
                    <select id="select-tipo-pago">
                        <option value="anticipo">Anticipo</option>
                        <option value="total">Pago Total</option>
                    </select>
                </div>
                
                <div class="campo">
                    <label>Monto a Pagar:</label>
                    <input type="number" id="input-monto-pago" min="0" step="0.01">
                </div>
                
                <div class="campo">
                    <label>Estado de la Reserva:</label>
                    <select id="select-estado-reserva">
                        <option value="confirmada">Confirmada</option>
                        <option value="pendiente">Pendiente</option>
                        <option value="por_confirmar">Por Confirmar</option>
                    </select>
                </div>
            </div>
        `;

        // Agregar eventos
        contenedor.querySelector('#select-metodo-pago').addEventListener('change', (e) => {
            this.datosReserva.metodo_pago = e.target.value;
        });

        contenedor.querySelector('#select-tipo-pago').addEventListener('change', (e) => {
            this.datosReserva.tipo_pago = e.target.value;
        });

        contenedor.querySelector('#input-monto-pago').addEventListener('input', (e) => {
            this.datosReserva.monto_pagado = parseFloat(e.target.value) || 0;
        });

        contenedor.querySelector('#select-estado-reserva').addEventListener('change', (e) => {
            this.datosReserva.estado_reserva = e.target.value;
        });
    }

    cargarContenidoServicios() {
        const contenedor = this.modalElement.querySelector('.configuracion-servicios');

        // Generar opciones de servicios
        const opcionesServicios = this.serviciosDisponibles.map(servicio =>
            `<option value="${servicio.id}">${servicio.nombre} - $${servicio.precio}</option>`
        ).join('');

        contenedor.innerHTML = `
            <div class="seleccion-servicio">
                <div class="campo">
                    <label>Servicio:</label>
                    <select id="select-servicio">
                        <option value="">Seleccionar servicio...</option>
                        ${opcionesServicios}
                    </select>
                    <button id="btn-agregar-servicio">Agregar Servicio</button>
                </div>
                
                <div id="lista-servicios" class="lista-servicios">
                    <!-- Servicios agregados aparecerán aquí -->
                </div>
            </div>
            
            <div class="configuracion-huespedes">
                <h4>Configuración de Huéspedes</h4>
                
                <div class="campo">
                    <label>Tipo de Huésped:</label>
                    <select id="select-tipo-huesped">
                        <option value="independiente">Independiente</option>
                        <option value="grupo">Grupo</option>
                    </select>
                </div>
                
                <div class="campo">
                    <label>Tipo de Tarifa:</label>
                    <select id="select-tipo-tarifa">
                        <option value="por_persona">Por Persona</option>
                        <option value="por_habitacion">Por Habitación</option>
                    </select>
                </div>
                
                <div class="cantidad-personas">
                    <div class="campo">
                        <label>Adultos:</label>
                        <input type="number" id="input-adultos" min="1" value="1">
                    </div>
                    
                    <div class="campo">
                        <label>Niños:</label>
                        <input type="number" id="input-ninos" min="0" value="0">
                    </div>
                </div>
                
                <div id="seccion-habitaciones-grupo" style="display: none;">
                    <h5>Habitaciones del Grupo</h5>
                    <div id="lista-habitaciones"></div>
                    <button id="btn-agregar-habitacion">+ Agregar Habitación</button>
                </div>
            </div>
            
            <div class="resumen-precios">
                <h4>Resumen de Precios</h4>
                <div id="detalle-precios"></div>
                <div class="total">
                    <strong>Total Estimado: $<span id="total-estimado">0</span></strong>
                </div>
            </div>
        `;

        // Inicializar eventos para esta etapa
        this.inicializarEventosServicios();
    }

    inicializarEventosServicios() {
        // Tipo de huésped
        this.modalElement.querySelector('#select-tipo-huesped').addEventListener('change', (e) => {
            const esGrupo = e.target.value === 'grupo';
            this.modalElement.querySelector('#seccion-habitaciones-grupo').style.display =
                esGrupo ? 'block' : 'none';
            this.datosReserva.tipo_huesped = e.target.value;
        });

        // Tipo de tarifa
        this.modalElement.querySelector('#select-tipo-tarifa').addEventListener('change', (e) => {
            this.datosReserva.tipo_tarifa = e.target.value;
            this.actualizarResumenPrecios();
        });

        // Cantidad de personas
        this.modalElement.querySelector('#input-adultos').addEventListener('input', (e) => {
            this.datosReserva.personas.adultos = parseInt(e.target.value) || 0;
            this.actualizarResumenPrecios();
        });

        this.modalElement.querySelector('#input-ninos').addEventListener('input', (e) => {
            this.datosReserva.personas.niños = parseInt(e.target.value) || 0;
            this.actualizarResumenPrecios();
        });

        // Agregar servicio
        this.modalElement.querySelector('#btn-agregar-servicio').addEventListener('click', () => {
            this.agregarServicio();
        });

        // Agregar habitación (para grupos)
        this.modalElement.querySelector('#btn-agregar-habitacion').addEventListener('click', () => {
            this.agregarHabitacion();
        });
    }

    agregarServicio() {
        const selectServicio = this.modalElement.querySelector('#select-servicio');
        const servicioId = selectServicio.value;

        if (!servicioId) {
            alert("Seleccione un servicio primero");
            return;
        }

        const servicio = this.serviciosDisponibles.find(s => s.id === servicioId);
        if (!servicio) return;

        // Crear objeto de servicio para la reserva
        const servicioReserva = {
            id_servicio: servicio.id,
            nombre: servicio.nombre,
            precio_base: servicio.precio,
            precio_actual: servicio.precio, // Inicialmente igual al base
            descuento: 0,
            personas: 1 // Por defecto
        };

        this.datosReserva.servicios.push(servicioReserva);
        this.mostrarServiciosAgregados();
        this.actualizarResumenPrecios();

        // Resetear selección
        selectServicio.value = '';
    }

    mostrarServiciosAgregados() {
        const contenedor = this.modalElement.querySelector('#lista-servicios');

        contenedor.innerHTML = this.datosReserva.servicios.map((servicio, index) => `
            <div class="servicio-item" data-index="${index}">
                <div class="servicio-info">
                    <strong>${servicio.nombre}</strong>
                    <div class="servicio-controles">
                        <div class="campo-pequeno">
                            <label>Precio: $</label>
                            <input type="number" class="precio-servicio" 
                                   value="${servicio.precio_actual}" 
                                   min="0" step="0.01"
                                   data-index="${index}">
                        </div>
                        <div class="campo-pequeno">
                            <label>Descuento: $</label>
                            <input type="number" class="descuento-servicio" 
                                   value="${servicio.descuento}" 
                                   min="0" step="0.01"
                                   data-index="${index}">
                        </div>
                        <button class="eliminar-servicio" data-index="${index}">×</button>
                    </div>
                </div>
            </div>
        `).join('');

        // Agregar eventos a los controles
        contenedor.querySelectorAll('.precio-servicio').forEach(input => {
            input.addEventListener('input', (e) => {
                const index = parseInt(e.target.dataset.index);
                const nuevoPrecio = parseFloat(e.target.value) || 0;
                this.datosReserva.servicios[index].precio_actual = nuevoPrecio;
                this.actualizarResumenPrecios();
            });
        });

        contenedor.querySelectorAll('.descuento-servicio').forEach(input => {
            input.addEventListener('input', (e) => {
                const index = parseInt(e.target.dataset.index);
                const descuento = parseFloat(e.target.value) || 0;
                this.datosReserva.servicios[index].descuento = descuento;

                // Actualizar precio actual restando descuento
                const precioBase = this.datosReserva.servicios[index].precio_base;
                this.datosReserva.servicios[index].precio_actual = precioBase - descuento;
                this.actualizarResumenPrecios();
            });
        });

        contenedor.querySelectorAll('.eliminar-servicio').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.datosReserva.servicios.splice(index, 1);
                this.mostrarServiciosAgregados();
                this.actualizarResumenPrecios();
            });
        });
    }

    agregarHabitacion() {
        const nuevaHabitacion = {
            numero: `HAB-${this.datosReserva.habitaciones.length + 1}`,
            tipo: "estandar",
            precio: 0,
            capacidad: 2,
            huespedes: []
        };

        this.datosReserva.habitaciones.push(nuevaHabitacion);
        this.mostrarHabitaciones();
    }

    mostrarHabitaciones() {
        const contenedor = this.modalElement.querySelector('#lista-habitaciones');

        contenedor.innerHTML = this.datosReserva.habitaciones.map((hab, index) => `
            <div class="habitacion-item">
                <div class="habitacion-header">
                    <strong>Habitación ${index + 1}</strong>
                    <button class="eliminar-habitacion" data-index="${index}">×</button>
                </div>
                <div class="habitacion-controles">
                    <div class="campo-pequeno">
                        <label>Número:</label>
                        <input type="text" class="numero-habitacion" 
                               value="${hab.numero}" data-index="${index}">
                    </div>
                    <div class="campo-pequeno">
                        <label>Precio: $</label>
                        <input type="number" class="precio-habitacion" 
                               value="${hab.precio}" min="0" step="0.01"
                               data-index="${index}">
                    </div>
                    <div class="campo-pequeno">
                        <label>Capacidad:</label>
                        <input type="number" class="capacidad-habitacion" 
                               value="${hab.capacidad}" min="1"
                               data-index="${index}">
                    </div>
                </div>
            </div>
        `).join('');

        // Agregar eventos a las habitaciones
        contenedor.querySelectorAll('.numero-habitacion').forEach(input => {
            input.addEventListener('input', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.datosReserva.habitaciones[index].numero = e.target.value;
            });
        });

        contenedor.querySelectorAll('.precio-habitacion').forEach(input => {
            input.addEventListener('input', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.datosReserva.habitaciones[index].precio = parseFloat(e.target.value) || 0;
                this.actualizarResumenPrecios();
            });
        });

        contenedor.querySelectorAll('.capacidad-habitacion').forEach(input => {
            input.addEventListener('input', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.datosReserva.habitaciones[index].capacidad = parseInt(e.target.value) || 1;
            });
        });

        contenedor.querySelectorAll('.eliminar-habitacion').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.datosReserva.habitaciones.splice(index, 1);
                this.mostrarHabitaciones();
                this.actualizarResumenPrecios();
            });
        });
    }

    actualizarResumenPrecios() {
        let totalServicios = this.datosReserva.servicios.reduce(
            (sum, s) => sum + (s.precio_actual || 0), 0
        );

        let totalHabitaciones = this.datosReserva.habitaciones.reduce(
            (sum, h) => sum + (h.precio || 0), 0
        );

        let total = totalServicios + totalHabitaciones;

        // Ajustar por tipo de tarifa y cantidad de personas
        if (this.datosReserva.tipo_tarifa === 'por_persona') {
            const totalPersonas = (this.datosReserva.personas.adultos || 0) +
                (this.datosReserva.personas.niños || 0);
            total *= totalPersonas;
        }

        this.datosReserva.monto_total = total;

        const contenedor = this.modalElement.querySelector('#detalle-precios');
        contenedor.innerHTML = `
            <p>Servicios: $${totalServicios.toFixed(2)}</p>
            ${totalHabitaciones > 0 ? `<p>Habitaciones: $${totalHabitaciones.toFixed(2)}</p>` : ''}
            <p>Tipo de tarifa: ${this.datosReserva.tipo_tarifa || 'No especificado'}</p>
            <p>Personas: ${(this.datosReserva.personas.adultos || 0) + (this.datosReserva.personas.niños || 0)}</p>
        `;

        this.modalElement.querySelector('#total-estimado').textContent = total.toFixed(2);
    }

    cargarContenidoInformacion() {
        const contenedor = this.modalElement.querySelector('#etapa-4');

        // Generar opciones de plataformas
        const opcionesPlataformas = this.plataformas.map(plataforma =>
            `<option value="${plataforma.nombre}">${plataforma.nombre}</option>`
        ).join('');

        // Obtener usuario actual
        const usuarioActual = auth.currentUser;
        const nombreUsuario = usuarioActual?.displayName || usuarioActual?.email || "Usuario";

        contenedor.innerHTML = `
            <div class="form-informacion-adicional">
                <div class="campo">
                    <label>Realizado por:</label>
                    <input type="text" id="input-realizado-por" 
                           value="${nombreUsuario}" readonly>
                </div>
                
                <div class="campo">
                    <label>Plataforma/Medio:</label>
                    <select id="select-plataforma">
                        <option value="">Seleccionar...</option>
                        ${opcionesPlataformas}
                    </select>
                </div>
                
                <div class="campo">
                    <label>Observaciones:</label>
                    <textarea id="textarea-observaciones" 
                              rows="4" 
                              placeholder="Notas adicionales..."></textarea>
                </div>
                
                <div class="campo">
                    <label>Fechas de la reserva:</label>
                    <div class="fechas-reserva">
                        <input type="date" id="fecha-llegada-final" 
                               placeholder="Fecha llegada">
                        <input type="date" id="fecha-salida-final" 
                               placeholder="Fecha salida">
                    </div>
                </div>
                
                <div class="campo">
                    <label>Noches estimadas:</label>
                    <input type="number" id="input-noches" min="1" value="1">
                </div>
            </div>
            
            <div class="resumen-final">
                <h4>Resumen de la Reserva</h4>
                <div id="resumen-detallado"></div>
            </div>
        `;

        // Inicializar eventos para esta etapa
        this.inicializarEventosInformacion();
        this.actualizarResumenFinal();
    }

    inicializarEventosInformacion() {
        // Fechas
        this.modalElement.querySelector('#fecha-llegada-final').addEventListener('change', (e) => {
            this.datosReserva.fecha_llegada = e.target.value;
            this.calcularNoches();
        });

        this.modalElement.querySelector('#fecha-salida-final').addEventListener('change', (e) => {
            this.datosReserva.fecha_salida = e.target.value;
            this.calcularNoches();
        });

        // Noches
        this.modalElement.querySelector('#input-noches').addEventListener('input', (e) => {
            this.datosReserva.noches = parseInt(e.target.value) || 0;
        });

        // Plataforma
        this.modalElement.querySelector('#select-plataforma').addEventListener('change', (e) => {
            this.datosReserva.plataforma = e.target.value;
        });

        // Observaciones
        this.modalElement.querySelector('#textarea-observaciones').addEventListener('input', (e) => {
            this.datosReserva.observaciones = e.target.value;
        });

        // Evento para el botón de crear reserva
        this.modalElement.querySelector('#btn-crear-reserva').addEventListener('click', () => {
            this.crearReserva();
        });
    }

    calcularNoches() {
        const llegada = this.modalElement.querySelector('#fecha-llegada-final').value;
        const salida = this.modalElement.querySelector('#fecha-salida-final').value;

        if (llegada && salida) {
            const fechaLlegada = new Date(llegada);
            const fechaSalida = new Date(salida);
            const diffTime = Math.abs(fechaSalida - fechaLlegada);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            this.datosReserva.noches = diffDays;
            this.modalElement.querySelector('#input-noches').value = diffDays;
        }
    }

    actualizarResumenFinal() {
        const contenedor = this.modalElement.querySelector('#resumen-detallado');

        const resumen = `
            <div class="resumen-item">
                <strong>Cliente:</strong> ${this.datosReserva.huesped_nombre || 'No especificado'}
            </div>
            <div class="resumen-item">
                <strong>Celular:</strong> ${this.datosReserva.huesped_celular || 'No especificado'}
            </div>
            <div class="resumen-item">
                <strong>Servicios:</strong> ${this.datosReserva.servicios.length}
            </div>
            <div class="resumen-item">
                <strong>Personas:</strong> ${(this.datosReserva.personas.adultos || 0) + (this.datosReserva.personas.niños || 0)}
                (${this.datosReserva.personas.adultos || 0} adultos, ${this.datosReserva.personas.niños || 0} niños)
            </div>
            <div class="resumen-item">
                <strong>Total Estimado:</strong> $${this.datosReserva.monto_total.toFixed(2)}
            </div>
            <div class="resumen-item">
                <strong>Estado:</strong> ${this.datosReserva.estado_reserva || 'pendiente'}
            </div>
        `;

        contenedor.innerHTML = resumen;
    }

    // ===== CREAR RESERVA FINAL =====

    async crearReserva() {
        try {
            // Validar todos los datos
            if (!this.validarDatosCompletos()) {
                alert("Faltan datos por completar");
                return;
            }

            // Generar ID de reserva
            const reservaId = `RES-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            this.datosReserva.id_reserva = reservaId;

            // Asegurar que el usuario esté logueado
            if (auth.currentUser) {
                this.datosReserva.id_usuario_creado = auth.currentUser.uid;
            }
            // console.log("Usuario que crea la reserva:", this.datosReserva);
            // Guardar en Firestore
            const docRef = await addDoc(collection(db, 'reservas_activas'), this.datosReserva);

            console.log("Reserva creada con ID:", docRef.id);
            console.log("Datos de la reserva:", this.datosReserva);

            // Mostrar vista de impresión
            this.mostrarVistaImpresion();

        } catch (error) {
            console.error("Error creando reserva:", error);
            alert("Error al crear la reserva: " + error.message);
        }
    }

    validarDatosCompletos() {
        const camposRequeridos = [
            'huesped_nombre',
            'huesped_celular',
            'fecha_llegada',
            'fecha_salida',
            'monto_total'
        ];

        for (const campo of camposRequeridos) {
            if (!this.datosReserva[campo]) {
                // console.log(`Falta campo: ${campo}`);
                return false;
            }
        }

        return true;
    }

    mostrarVistaImpresion() {
        // Crear nueva ventana para impresión
        const ventanaImpresion = window.open('', '_blank');

        const htmlImpresion = `
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Reserva ${this.datosReserva.id_reserva}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                        color: #333;
                    }
                    .encabezado {
                        text-align: center;
                        border-bottom: 2px solid #000;
                        padding-bottom: 20px;
                        margin-bottom: 30px;
                    }
                    .info-reserva {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 20px;
                        margin-bottom: 30px;
                    }
                    .seccion {
                        margin-bottom: 25px;
                    }
                    .seccion h3 {
                        background-color: #f0f0f0;
                        padding: 10px;
                        border-left: 4px solid #007bff;
                    }
                    .campo {
                        margin: 8px 0;
                    }
                    .campo strong {
                        display: inline-block;
                        width: 150px;
                    }
                    .tabla-servicios {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 20px 0;
                    }
                    .tabla-servicios th,
                    .tabla-servicios td {
                        border: 1px solid #ddd;
                        padding: 10px;
                        text-align: left;
                    }
                    .tabla-servicios th {
                        background-color: #f5f5f5;
                    }
                    .total {
                        text-align: right;
                        font-size: 1.2em;
                        font-weight: bold;
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 2px solid #000;
                    }
                    .firma {
                        margin-top: 100px;
                        text-align: center;
                        border-top: 1px solid #000;
                        padding-top: 20px;
                    }
                    @media print {
                        .no-print {
                            display: none;
                        }
                        body {
                            margin: 0;
                            padding: 20px;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="encabezado">
                    <h1>HOJA DE RESERVA</h1>
                    <h2>Número: ${this.datosReserva.id_reserva}</h2>
                    <p>Fecha creación: ${new Date(this.datosReserva.fecha_creacion).toLocaleDateString()}</p>
                </div>
                
                <div class="info-reserva">
                    <div>
                        <h3>Información del Cliente</h3>
                        <div class="campo"><strong>Nombre:</strong> ${this.datosReserva.huesped_nombre}</div>
                        <div class="campo"><strong>Celular:</strong> ${this.datosReserva.huesped_celular}</div>
                        <div class="campo"><strong>Correo:</strong> ${this.datosReserva.huesped_correo || 'No especificado'}</div>
                        ${this.datosReserva.huesped_cedula ?
                `<div class="campo"><strong>Cédula:</strong> ${this.datosReserva.huesped_cedula}</div>` : ''}
                    </div>
                    
                    <div>
                        <h3>Detalles de la Reserva</h3>
                        <div class="campo"><strong>Llegada:</strong> ${this.datosReserva.fecha_llegada}</div>
                        <div class="campo"><strong>Salida:</strong> ${this.datosReserva.fecha_salida}</div>
                        <div class="campo"><strong>Noches:</strong> ${this.datosReserva.noches}</div>
                        <div class="campo"><strong>Estado:</strong> ${this.datosReserva.estado_reserva}</div>
                    </div>
                </div>
                
                <div class="seccion">
                    <h3>Personas</h3>
                    <div class="campo"><strong>Adultos:</strong> ${this.datosReserva.personas.adultos || 0}</div>
                    <div class="campo"><strong>Niños:</strong> ${this.datosReserva.personas.niños || 0}</div>
                    <div class="campo"><strong>Tipo tarifa:</strong> ${this.datosReserva.tipo_tarifa}</div>
                    <div class="campo"><strong>Tipo huésped:</strong> ${this.datosReserva.tipo_huesped || 'independiente'}</div>
                </div>
                
                ${this.datosReserva.habitaciones.length > 0 ? `
                    <div class="seccion">
                        <h3>Habitaciones (${this.datosReserva.habitaciones.length})</h3>
                        <table class="tabla-servicios">
                            <thead>
                                <tr>
                                    <th>Número</th>
                                    <th>Precio</th>
                                    <th>Capacidad</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.datosReserva.habitaciones.map(hab => `
                                    <tr>
                                        <td>${hab.numero}</td>
                                        <td>$${hab.precio.toFixed(2)}</td>
                                        <td>${hab.capacidad} personas</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}
                
                <div class="seccion">
                    <h3>Servicios (${this.datosReserva.servicios.length})</h3>
                    <table class="tabla-servicios">
                        <thead>
                            <tr>
                                <th>Servicio</th>
                                <th>Precio Base</th>
                                <th>Descuento</th>
                                <th>Precio Final</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.datosReserva.servicios.map(servicio => `
                                <tr>
                                    <td>${servicio.nombre}</td>
                                    <td>$${servicio.precio_base.toFixed(2)}</td>
                                    <td>$${servicio.descuento.toFixed(2)}</td>
                                    <td>$${servicio.precio_actual.toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <div class="seccion">
                    <h3>Pago</h3>
                    <div class="campo"><strong>Método:</strong> ${this.datosReserva.metodo_pago || 'No especificado'}</div>
                    <div class="campo"><strong>Monto pagado:</strong> $${this.datosReserva.monto_pagado.toFixed(2)}</div>
                    <div class="campo"><strong>Estado pago:</strong> ${this.datosReserva.estado_reserva}</div>
                </div>
                
                <div class="seccion">
                    <h3>Información Adicional</h3>
                    <div class="campo"><strong>Realizado por:</strong> ${this.datosReserva.id_usuario_creado}</div>
                    <div class="campo"><strong>Plataforma:</strong> ${this.datosReserva.plataforma || 'Directo'}</div>
                    <div class="campo"><strong>Observaciones:</strong></div>
                    <p>${this.datosReserva.observaciones || 'Ninguna'}</p>
                </div>
                
                <div class="total">
                    TOTAL RESERVA: $${this.datosReserva.monto_total.toFixed(2)}
                </div>
                
                <div class="firma">
                    <p>_________________________</p>
                    <p>Firma del Cliente</p>
                </div>
                
                <div class="no-print" style="margin-top: 50px; text-align: center;">
                    <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px;">
                        Imprimir
                    </button>
                    <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; margin-left: 20px;">
                        Cerrar
                    </button>
                </div>
                
                <script>
                    // Auto-print option
                    // window.onload = function() {
                    //     window.print();
                    // }
                </script>
            </body>
            </html>
        `;

        ventanaImpresion.document.write(htmlImpresion);
        ventanaImpresion.document.close();

        // Cerrar el modal después de crear la reserva
        setTimeout(() => {
            this.cerrarModal();
        }, 1000);
    }

    resetearDatosReserva() {
        return {
            canal: "directo",
            estado_reserva: "pendiente",
            estado_sincrono: "PENDIENTE",
            fecha_creacion: new Date().toISOString(),
            habitaciones: [],
            servicios: [],
            tipo_tarifa: "",
            metodo_pago: "",
            monto_pagado: 0,
            monto_total: 0,
            noches: 0,
            personas: { adultos: 0, niños: 0 },
            observaciones: "",
            id_usuario_creado: auth.currentUser?.uid || ""
        };
    }
}

// Exportar también una instancia única si se desea
export const reservaModal = new ReservaModal();