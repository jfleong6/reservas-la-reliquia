// 1. IMPORTACIONES: Reutilizamos tu configuración centralizada
import { db, auth } from './firebase-config.js';
import {
    collection,
    getDocs,
    query,
    where,
    orderBy,
    doc,
    writeBatch,
    serverTimestamp,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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
// 1. INICIALIZACIÓN Y AUTENTICACIÓN
// ==========================================
onAuthStateChanged(auth, user => {
    if (user) {
        if (userDisplay) userDisplay.textContent = user.email;
        initFiltros();
        cargarCatalogoHabitaciones();
    } else {
        window.location.href = 'login.html';
    }
});

if (logoutBtn) {
    logoutBtn.onclick = () => signOut(auth);
}

function initFiltros() {
    const selMes = document.getElementById('select-mes');
    const selAnio = document.getElementById('select-anio');
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    if (selMes && selAnio) {
        selMes.innerHTML = meses.map((m, i) => `<option value="${i}" ${i === mesActual ? 'selected' : ''}>${m}</option>`).join('');
        selAnio.innerHTML = [anioActual - 1, anioActual, anioActual + 1].map(a => `<option value="${a}" ${a === anioActual ? 'selected' : ''}>${a}</option>`).join('');
    }
    const display = document.getElementById('current-month-display');
    if (display) display.textContent = meses[mesActual] + " " + anioActual;
}

window.cambiarFechaFiltro = function () {
    mesActual = parseInt(document.getElementById('select-mes').value);
    anioActual = parseInt(document.getElementById('select-anio').value);
    initFiltros();
    cargarCatalogoHabitaciones();
};

// ==========================================
// 2. RENDERIZADO DEL CALENDARIO
// ==========================================
async function cargarCatalogoHabitaciones() {
    const header = document.getElementById('calendar-header');
    const body = document.getElementById('calendar-body');
    const loadingMessage = document.getElementById('loading-message');
    const numDays = new Date(anioActual, mesActual + 1, 0).getDate();
    const formatter = new Intl.DateTimeFormat('es', { weekday: 'short' });

    header.innerHTML = '<th class="room-header">Hab</th>';
    body.innerHTML = '';
    diasDelMes = [];
    habitacionesCatalogo = [];

    const hoyYMD = new Date().toLocaleDateString('sv-SE');

    for (let i = 1; i <= numDays; i++) {
        const d = new Date(anioActual, mesActual, i);
        const dateStr = d.toLocaleDateString('sv-SE');
        diasDelMes.push(dateStr);
        header.innerHTML += `<th>${formatter.format(d)}<br>${i}</th>`;
    }

    try {
        const q = query(collection(db, "habitaciones_catalogo"), orderBy("numero"));
        const snap = await getDocs(q);

        if (loadingMessage) loadingMessage.style.display = 'none';

        snap.forEach(docSnap => {
            const hab = docSnap.data();
            habitacionesCatalogo.push(hab);

            let row = document.createElement('tr');
            row.innerHTML = `<td class="room-number-cell">${hab.numero}</td>`;

            diasDelMes.forEach(dateStr => {
                const isToday = dateStr === hoyYMD ? 'today-cell' : '';
                const td = document.createElement('td');
                td.className = `day-cell state-available ${isToday}`;
                td.setAttribute('data-room', hab.numero);
                td.setAttribute('data-date', dateStr);
                td.onclick = () => handleDayClick(td);
                row.appendChild(td);
            });
            body.appendChild(row);
        });

        setTimeout(() => {
            const todayEl = document.querySelector('.today-cell');
            if (todayEl) todayEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }, 500);

        cargarReservas();
    } catch (error) {
        console.error("Error cargando habitaciones:", error);
    }
}

// ==========================================
// 3. LÓGICA DE RESERVAS Y COLORES
// ==========================================
function getColor(idGrupo) {
    if (!idGrupo) return '#fef3c7';
    const key = idGrupo.substring(0, 15);
    if (!coloresGrupos[key]) {
        coloresGrupos[key] = `hsl(${Math.floor(Math.random() * 360)}, 75%, 85%)`;
    }
    return coloresGrupos[key];
}

async function cargarReservas() {
    const inicioMes = Timestamp.fromDate(new Date(anioActual, mesActual, 1));
    const q = query(collection(db, "reservas_activas"), where('fecha_salida', '>=', inicioMes));

    try {
        const snap = await getDocs(q);
        snap.forEach(docSnap => {
            const res = docSnap.data();
            const color = getColor(res.id_reserva_ext);
            const cells = document.querySelectorAll(`[data-room="${res.numero_habitacion}"]`);

            cells.forEach(c => {
                const cDate = new Date(c.dataset.date + "T00:00:00");
                const resIn = res.fecha_llegada.toDate();
                const resOut = res.fecha_salida.toDate();

                resIn.setHours(0, 0, 0, 0);
                resOut.setHours(0, 0, 0, 0);

                if (cDate >= resIn && cDate < resOut) {
                    c.style.backgroundColor = color;
                    c.classList.remove('state-available');
                    c.innerHTML = `<div class="cell-content"><b>${res.numero_habitacion}</b><br>${res.huesped_nombre.split(' ')[0]}</div>`;
                    c.onclick = null;
                }
            });
        });
    } catch (error) {
        console.error("Error cargando reservas:", error);
    }
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

window.quitarDeGrupo = function (num) {
    if (currentReservationGroup.length === 1) return alert("Mínimo una habitación");
    currentReservationGroup = currentReservationGroup.filter(r => r.numero !== num);
    renderGrupo();
    actualizarTotal();
};

window.cerrarPanelReserva = function () {
    document.getElementById('reservation-modal').style.display = 'none';
    document.body.style.overflow = 'auto';
};

function actualizarTotal() {
    const inD = document.getElementById('res-check-in').textContent;
    const outD = document.getElementById('fecha_salida').value;
    if (!outD) return;

    const noches = Math.max(1, Math.ceil(Math.abs(new Date(outD) - new Date(inD)) / 86400000));
    const total = currentReservationGroup.reduce((s, h) => s + (h.precio_noche * noches), 0);
    document.getElementById('res-total-amount').textContent = `$${total.toLocaleString('es-CO')}`;
}

const fechaSalidaInput = document.getElementById('fecha_salida');
if (fechaSalidaInput) fechaSalidaInput.onchange = actualizarTotal;

// ==========================================
// 5. ENVÍO DE DATOS
// ==========================================
if (reservaForm) {
    reservaForm.onsubmit = async (e) => {
        e.preventDefault();
        const publishBtn = reservaForm.querySelector('button[type="submit"]');
        if (publishBtn) publishBtn.disabled = true;

        const batch = writeBatch(db);
        const idGrupo = `WEB-${Date.now()}`;
        const nombre = document.getElementById('huesped_nombre').value;
        const tel = document.getElementById('huesped_telefono').value;
        const fIn = document.getElementById('res-check-in').textContent;
        const fOut = document.getElementById('fecha_salida').value;

        try {
            currentReservationGroup.forEach(hab => {
                const ref = doc(collection(db, 'reservas_activas'));
                batch.set(ref, {
                    id_reserva_ext: idGrupo,
                    numero_habitacion: hab.numero,
                    huesped_nombre: nombre,
                    huesped_telefono: tel,
                    fecha_llegada: Timestamp.fromDate(new Date(fIn + "T14:00:00")),
                    fecha_salida: Timestamp.fromDate(new Date(fOut + "T11:00:00")),
                    estado_sincro: 'PENDIENTE',
                    fecha_creacion: serverTimestamp()
                });
            });

            await batch.commit();
            alert("✅ ¡Reserva Guardada con éxito!");
            window.cerrarPanelReserva();
            location.reload();
        } catch (err) {
            alert("Error: " + err.message);
            if (publishBtn) publishBtn.disabled = false;
        }
    };
}

window.abrirSelectorHabitacion = function () {
    const num = prompt("Número de habitación a añadir:");
    if (num) {
        agregarHabitacion(num);
        actualizarTotal();
    }
};

// --- EXPORTAR EXCEL ---
window.descargarExcel = async function () {
    const desde = document.getElementById('export-desde').value;
    const hasta = document.getElementById('export-hasta').value;

    if (!desde || !hasta) return alert("Selecciona rango de fechas");

    const fechaIn = new Date(desde + "T00:00:00");
    const fechaOut = new Date(hasta + "T00:00:00");

    const rows = [];
    const header = ["Hab"];

    let temp = new Date(fechaIn);
    while (temp <= fechaOut) {
        header.push(temp.getDate());
        temp.setDate(temp.getDate() + 1);
    }
    rows.push(header);

    const q = query(collection(db, "reservas_activas"), where('fecha_salida', '>=', Timestamp.fromDate(fechaIn)));
    const snap = await getDocs(q);
    const listaReservas = snap.docs.map(d => d.data());

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
};

function initExportDates() {
    const hoy = new Date().toISOString().split('T')[0];
    const exportDesde = document.getElementById('export-desde');
    if (exportDesde) exportDesde.value = hoy;

    const proximoMes = new Date();
    proximoMes.setMonth(proximoMes.getMonth() + 1);
    const exportHasta = document.getElementById('export-hasta');
    if (exportHasta) exportHasta.value = proximoMes.toISOString().split('T')[0];
}

initExportDates();