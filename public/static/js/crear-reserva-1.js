import { db, auth } from './firebase-config.js';
import { collection, getDocs, addDoc, query, where, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


class NuevaReserva {
    constructor() {
        this.init();
    }
}