import { db, auth } from './firebase-config.js';
import { collection, getDocs, addDoc, query, where, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


class NuevaReserva {
    constructor() {
        this.intit();
        const btnBuscarHuesped = document.getElementById('nueva-reserva-btn-buscar');
        btnBuscarHuesped.addEventListener('click', () => this.renderTabla());
        const inputBuscarHuesped = document.getElementById('nueva-reserva-buscar-input');
        inputBuscarHuesped.addEventListener('keyup', () => this.renderTabla());
    }
    intit() {
        this.obtenerHuespedes();
    }
    async obtenerHuespedes() {
        const huespedesCol = collection(db, 'clientes');
        const huespedesSnapshot = await getDocs(huespedesCol);
        this.huespedesList = huespedesSnapshot.docs.map(doc => doc.data());
        // console.log(this.huespedesList);

    }



    renderTabla() {
        console.log('vamos bien');
        // Renderizar la tabla de huespedes
        const tablaContainer = document.getElementById('nueva-reserva-resultados-huesped');
        const inputFiltro = document.getElementById('nueva-reserva-buscar-input').value;
        const filtro = document.getElementById('nueva-reserva-buscar-por').value;
        tablaContainer.innerHTML = ``;
        this.huespedesList.forEach(huesped => {
            if (!huesped[filtro].toLowerCase().includes(inputFiltro.toLowerCase())) {
                return;
            }
            const row = document.createElement('tr');
            row.classList.add('nueva-reserva__fila-huesped');
            row.innerHTML = `
                    <td>${huesped.documento}</td>
                    <td>${huesped.nombre}</td>
                    <td>${huesped.apellido}</td>
                    <td>${huesped.correo}</td>
                    <td>${huesped.celular}</td>
            `;
            tablaContainer.appendChild(row);
        });
    }
}


export const reservaModal = new NuevaReserva();