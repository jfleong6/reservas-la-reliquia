// public/js/reservas.js

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

const auth = firebase.auth();
const db = firebase.firestore();

// Variables Globales de Estado
const today = new Date();
let mesActual = today.getMonth();
let anioActual = today.getFullYear();
let diasDelMes = [];
let habitacionesCatalogo = [];
let coloresGrupos = {};
let currentReservationGroup = [];

const userDisplay = document.getElementById('user-display');
const logoutBtn = document.getElementById('logout-btn');
const reservaForm = document.getElementById('reserva-form');

// ==========================================
// 1. INICIALIZACIÓN Y AUTH
// ==========================================
auth.onAuthStateChanged(user => {
    if (user) {
        if (userDisplay) userDisplay.textContent = user.email;
        initFiltros();
        cargarCatalogoHabitaciones();
    } else {
        window.location.href = 'index.html';
    }
});

if (logoutBtn) {
    logoutBtn.onclick = () => auth.signOut();
}

function initFiltros() {
    const selMes = document.getElementById('select-mes');
    const selAnio = document.getElementById('select-anio');
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    if (selMes && selAnio) {
        selMes.innerHTML = meses.map((m, i) => `<option value="${i}" ${i === mesActual ? 'selected' : ''}>${m}</option>`).join('');
        selAnio.innerHTML = [anioActual-1, anioActual, anioActual + 1].map(a => `<option value="${a}" ${a === anioActual ? 'selected' : ''}>${a}</option>`).join('');
    }
    document.getElementById('current-month-display').textContent = meses[mesActual] + " " + anioActual;
}

function cambiarFechaFiltro() {
    mesActual = parseInt(document.getElementById('select-mes').value);
    anioActual = parseInt(document.getElementById('select-anio').value);
    initFiltros();
    cargarCatalogoHabitaciones();
}

// ==========================================
// 2. RENDERIZADO DEL CALENDARIO
// ==========================================
function cargarCatalogoHabitaciones() {
    const header = document.getElementById('calendar-header');
    const body = document.getElementById('calendar-body');
    const loadingMessage = document.getElementById('loading-message');
    const numDays = new Date(anioActual, mesActual + 1, 0).getDate();
    const formatter = new Intl.DateTimeFormat('es', { weekday: 'short' });

    header.innerHTML = '<th class="room-header">Hab</th>';
    body.innerHTML = '';
    diasDelMes = [];
    habitacionesCatalogo = []; // Limpiar catálogo para evitar duplicados

    const hoyYMD = new Date().toLocaleDateString('sv-SE'); // Formato YYYY-MM-DD

    // Generar días del mes para el encabezado
    for (let i = 1; i <= numDays; i++) {
        const d = new Date(anioActual, mesActual, i);
        const dateStr = d.toLocaleDateString('sv-SE');
        diasDelMes.push(dateStr);
        header.innerHTML += `<th>${formatter.format(d)}<br>${i}</th>`;
    }

    db.collection("habitaciones_catalogo").orderBy("numero").get().then(snap => {
        if (loadingMessage) loadingMessage.style.display = 'none';

        snap.forEach(doc => {
            const hab = doc.data();
            habitacionesCatalogo.push(hab);
            
            let row = document.createElement('tr');
            row.innerHTML = `<td class="room-number-cell">${hab.numero}</td>`;
            
            diasDelMes.forEach(dateStr => {
                const isToday = dateStr === hoyYMD ? 'today-cell' : '';
                const td = document.createElement('td');
                td.className = `day-cell state-available ${isToday}`;
                td.setAttribute('data-room', hab.numero);
                td.setAttribute('data-date', dateStr);
                td.onclick = (e) => handleDayClick(td);
                row.appendChild(td);
            });
            body.appendChild(row);
        });

        // Auto-centrar hoy
        setTimeout(() => {
            const todayEl = document.querySelector('.today-cell');
            if (todayEl) todayEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }, 500);

        cargarReservas();
    });
}

// ==========================================
// 3. LÓGICA DE RESERVAS Y COLORES
// ==========================================
function getColor(idGrupo) {
    if (!idGrupo) return '#fef3c7'; // Color default
    const key = idGrupo.substring(0, 15); 
    if (!coloresGrupos[key]) {
        coloresGrupos[key] = `hsl(${Math.floor(Math.random() * 360)}, 75%, 85%)`;
    }
    return coloresGrupos[key];
}

function cargarReservas() {
    const inicioMes = new Date(anioActual, mesActual, 1);
    db.collection("reservas_activas").where('fecha_salida', '>=', inicioMes).get().then(snap => {
        snap.forEach(doc => {
            const res = doc.data();
            const color = getColor(res.id_reserva_ext);
            const cells = document.querySelectorAll(`[data-room="${res.numero_habitacion}"]`);

            cells.forEach(c => {
                const cDate = new Date(c.dataset.date + "T00:00:00");
                const resLlegada = res.fecha_llegada.toDate();
                const resSalida = res.fecha_salida.toDate();

                // Normalizar fechas para comparación (solo YYYY-MM-DD)
                resLlegada.setHours(0,0,0,0);
                resSalida.setHours(0,0,0,0);

                if (cDate >= resLlegada && cDate < resSalida) {
                    c.classList.remove('state-available');
                    c.style.backgroundColor = color;
                    c.style.borderLeft = "1px solid rgba(0,0,0,0.05)";
                    c.innerHTML = `<div class="cell-content">${res.huesped_nombre.split(' ')[0]}</div>`;
                    c.onclick = null;
                }
            });
        });
    });
}

// ==========================================
// 4. MANEJO DEL MODAL Y GRUPOS
// ==========================================
function handleDayClick(el) {
    currentReservationGroup = [];
    document.getElementById('res-room-num').textContent = el.dataset.room;
    document.getElementById('res-check-in').textContent = el.dataset.date;

    agregarHabitacion(el.dataset.room);

    document.getElementById('reservation-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';

    const out = document.getElementById('fecha_salida');
    const m = new Date(el.dataset.date + "T12:00:00"); 
    m.setDate(m.getDate() + 1);
    out.value = m.toISOString().split('T')[0];
    actualizarTotal();
}

function agregarHabitacion(num) {
    if (currentReservationGroup.find(h => h.numero === num)) return;
    const hab = habitacionesCatalogo.find(h => h.numero === num) || { numero: num, precio_noche: 200000 };
    currentReservationGroup.push(hab);
    renderGrupo();
}

function renderGrupo() {
    const div = document.getElementById('room-group-list');
    div.innerHTML = currentReservationGroup.map(h => `
        <div class="room-tag">
            <span>Hab. ${h.numero}</span>
            <button type="button" class="btn-remove" onclick="quitarDeGrupo('${h.numero}')">&times;</button>
        </div>
    `).join('');
}

function quitarDeGrupo(num) {
    if (currentReservationGroup.length === 1) return alert("Mínimo una habitación");
    currentReservationGroup = currentReservationGroup.filter(r => r.numero !== num);
    renderGrupo();
    actualizarTotal();
}

function cerrarPanelReserva() { 
    document.getElementById('reservation-modal').style.display = 'none'; 
    document.body.style.overflow = 'auto';
}

function actualizarTotal() {
    const inD = document.getElementById('res-check-in').textContent;
    const outD = document.getElementById('fecha_salida').value;
    if (!outD) return;

    const noches = Math.max(1, Math.ceil(Math.abs(new Date(outD) - new Date(inD)) / 86400000));
    const total = currentReservationGroup.reduce((s, h) => s + (h.precio_noche * noches), 0);
    document.getElementById('res-total-amount').textContent = `$${total.toLocaleString('es-CO')}`;
}

document.getElementById('fecha_salida').onchange = actualizarTotal;

// ==========================================
// 5. ENVÍO DE DATOS
// ==========================================
reservaForm.onsubmit = async (e) => {
    e.preventDefault();
    const publishBtn = reservaForm.querySelector('button[type="submit"]');
    if (publishBtn) publishBtn.disabled = true;

    const batch = db.batch();
    const idGrupo = `WEB-${Date.now()}`;
    const nombre = document.getElementById('huesped_nombre').value;
    const tel = document.getElementById('huesped_telefono').value;
    const fIn = document.getElementById('res-check-in').textContent;
    const fOut = document.getElementById('fecha_salida').value;

    try {
        currentReservationGroup.forEach(hab => {
            const ref = db.collection('reservas_activas').doc();
            batch.set(ref, {
                id_reserva_ext: idGrupo,
                numero_habitacion: hab.numero,
                huesped_nombre: nombre,
                huesped_telefono: tel,
                fecha_llegada: new Date(fIn + "T14:00:00"),
                fecha_salida: new Date(fOut + "T11:00:00"),
                estado_sincro: 'PENDIENTE',
                fecha_creacion: firebase.firestore.FieldValue.serverTimestamp()
            });
        });

        await batch.commit();
        alert("✅ ¡Reserva Guardada con éxito!");
        cerrarPanelReserva();
        location.reload();
    } catch (err) {
        alert("Error: " + err.message);
        if (publishBtn) publishBtn.disabled = false;
    }
};

function abrirSelectorHabitacion() {
    const num = prompt("Número de habitación a añadir:");
    if (num) {
        agregarHabitacion(num);
        actualizarTotal();
    }
}

// --- FUNCIÓN PARA DESCARGAR EXCEL POR RANGO ---
async function descargarExcel() {
    const desde = document.getElementById('export-desde').value;
    const hasta = document.getElementById('export-hasta').value;

    if (!desde || !hasta) return alert("Selecciona rango de fechas");

    const fechaIn = new Date(desde + "T00:00:00");
    const fechaOut = new Date(hasta + "T00:00:00");
    
    // Crear la estructura del Excel (Matriz)
    const rows = [];
    const header = ["Hab"];
    
    // Generar encabezado de días para el rango
    let temp = new Date(fechaIn);
    while (temp <= fechaOut) {
        header.push(temp.getDate());
        temp.setDate(temp.getDate() + 1);
    }
    rows.push(header);

    // Obtener reservas del rango
    const snap = await db.collection("reservas_activas").where('fecha_salida', '>=', fechaIn).get();
    const listaReservas = snap.docs.map(d => d.data());

    // Construir filas por habitación
    habitacionesCatalogo.forEach(hab => {
        const fila = [hab.numero];
        let curr = new Date(fechaIn);
        while (curr <= fechaOut) {
            const resEncontrada = listaReservas.find(r => 
                r.numero_habitacion === hab.numero &&
                curr >= r.fecha_llegada.toDate() && curr < r.fecha_salida.toDate()
            );
            fila.push(resEncontrada ? resEncontrada.huesped_nombre : "");
            curr.setDate(curr.getDate() + 1);
        }
        rows.push(fila);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, `Hotel_Reliquia_${desde}_al_${hasta}.xlsx`);
}

// --- ACTUALIZACIÓN DE LA CARGA DE CALENDARIO PARA MOSTRAR NOMBRES ---
function cargarReservas() {
    const inicioMes = new Date(anioActual, mesActual, 1);
    db.collection("reservas_activas").where('fecha_salida', '>=', inicioMes).get().then(snap => {
        snap.forEach(doc => {
            const res = doc.data();
            const color = getColor(res.id_reserva_ext);
            const cells = document.querySelectorAll(`[data-room="${res.numero_habitacion}"]`);

            cells.forEach(c => {
                const cDate = new Date(c.dataset.date + "T00:00:00");
                const resIn = res.fecha_llegada.toDate();
                const resOut = res.fecha_salida.toDate();
                resIn.setHours(0,0,0,0);
                resOut.setHours(0,0,0,0);

                if (cDate >= resIn && cDate < resOut) {
                    c.style.backgroundColor = color;
                    c.classList.remove('state-available');
                    // Mostrar Nombre 901/Nombre
                    c.innerHTML = `<div class="cell-content"><b>${res.numero_habitacion}</b><br>${res.huesped_nombre.split(' ')[0]}</div>`;
                    c.onclick = null;
                }
            });
        });
    });
}

// --- INICIALIZAR FECHAS DE EXPORTACIÓN POR DEFECTO ---
function initExportDates() {
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('export-desde').value = hoy;
    
    const proximoMes = new Date();
    proximoMes.setMonth(proximoMes.getMonth() + 1);
    document.getElementById('export-hasta').value = proximoMes.toISOString().split('T')[0];
}

// Llamar al final del script
initExportDates();