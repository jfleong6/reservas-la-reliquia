import { db } from './firebase-config.js';
import { collection, doc, setDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const menuCompleto = {
    "desayunos": [
        { nombre: "Tradicional", precio: 12000, foto: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800", desc: "Caldito con huevos al gusto, chocolate, pan, queso y jugo.", calificacion: 5 },
        { nombre: "Carne Bistec", precio: 12000, foto: "https://images.unsplash.com/photo-1594041680534-e8c8cdebd659?w=800", desc: "Arroz, carne en bistec con huevos fritos, jugo, queso, pan y chocolate.", calificacion: 5 },
        { nombre: "Tamal Tolimense", precio: 15000, foto: "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=800", desc: "Delicioso tamal tolimense con chocolate, pan y queso.", calificacion: 5 }
    ],
    "almuerzos": [
        { nombre: "Churrasco", precio: 25000, foto: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800", desc: "Incluye: Guarnición, ensalada del día, sopa y limonada.", calificacion: 5 },
        { nombre: "Trucha a la Plancha", precio: 28000, foto: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800", desc: "Trucha fresca regional.", calificacion: 5 }
    ]
    // Puedes seguir agregando las demás categorías aquí
};

async function subirMenuJerarquico() {
    console.log("🚀 Iniciando carga jerárquica...");

    for (const [categoriaNombre, platos] of Object.entries(menuCompleto)) {
        try {
            // 1. Crear o referenciar el documento de la categoría
            const categoriaRef = doc(db, "categorias", categoriaNombre);
            await setDoc(categoriaRef, { nombre: categoriaNombre.toUpperCase() });

            // 2. Crear la subcolección "platos" dentro de ese documento
            const platosSubColRef = collection(categoriaRef, "platos");

            for (const plato of platos) {
                await addDoc(platosSubColRef, plato);
                console.log(`✅ ${plato.nombre} subido a ${categoriaNombre}`);
            }
        } catch (error) {
            console.error(`❌ Error en categoría ${categoriaNombre}:`, error);
        }
    }
    alert("¡Carga completa! Revisa tu consola de Firestore.");
}

subirMenuJerarquico();