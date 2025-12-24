import { db } from './firebase-config.js';
import { collection, doc, setDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const menuCompleto = {
    desayunos: [
        {
            nombre: "Tradicional",
            precio: 12000,
            foto: "static/img/menu-digital/tradicional.png",
            desc: "Caldito con huevos al gusto, chocolate, pan, queso y jugo.",
            calificacion: 5,
            disponibles: 15,
            activo: true
        },
        {
            nombre: "Carne Bistec",
            precio: 12000,
            foto: "static/img/menu-digital/carne-bistec.png",
            desc: "Arroz, carne en bistec con huevos fritos, jugo, queso, pan y chocolate.",
            calificacion: 5,
            disponibles: 10,
            activo: true
        },
        {
            nombre: "Tamal Tolimense",
            precio: 15000,
            foto: "static/img/menu-digital/tamal.png",
            desc: "Delicioso tamal tolimense con chocolate, pan y queso.",
            calificacion: 5,
            disponibles: 8,
            activo: false
        }
    ],

    almuerzos: [
        {
            nombre: "Churrasco",
            precio: 17000,
            foto: "static/img/menu-digital/churrasco.png",
            desc: "Incluye guarnición, ensalada del día, sopa y limonada.",
            calificacion: 5,
            disponibles: 12,
            activo: true
        },
        {
            nombre: "Lomo de cerdo",
            precio: 17000,
            foto: "static/img/menu-digital/lomo.png",
            desc: "Lomo de cerdo jugoso acompañado de arroz, ensalada y sopa.",
            calificacion: 5,
            disponibles: 10,
            activo: true
        },
        {
            nombre: "Chuleta a la plancha",
            precio: 17000,
            foto: "static/img/menu-digital/chuleta",
            desc: "Chuleta de cerdo a la plancha con guarnición, sopa y limonada.",
            calificacion: 5,
            disponibles: 9,
            activo: true
        },
        {
            nombre: "Sobrebarriga",
            precio: 17000,
            foto: "static/img/menu-digital/sobrebarriga.png.png",
            desc: "Sobrebarriga suave y jugosa acompañada de arroz y ensalada.",
            calificacion: 5,
            disponibles: 7,
            activo: true
        },
        {
            nombre: "Lengua",
            precio: 17000,
            foto: "static/img/menu-digital/lengua.png",
            desc: "Lengua en salsa tradicional con arroz, sopa y ensalada.",
            calificacion: 5,
            disponibles: 5,
            activo: true
        },
        {
            nombre: "Trucha a la plancha",
            precio: 17000,
            foto: "static/img/menu-digital/trucha.png",
            desc: "Trucha fresca regional a la plancha con acompañamientos.",
            calificacion: 5,
            disponibles: 6,
            activo: true
        },
        {
            nombre: "Mojarra frita",
            precio: 17000,
            foto: "static/img/menu-digital/mojarra.png",
            desc: "Mojarra frita crocante con arroz, patacón y ensalada.",
            calificacion: 5,
            disponibles: 8,
            activo: true
        },
        {
            nombre: "Bagre",
            precio: 17000,
            foto: "static/img/menu-digital/bagre.png",
            desc: "Bagre en salsa o frito acompañado de arroz y ensalada.",
            calificacion: 5,
            disponibles: 4,
            activo: true
        },
        {
            nombre: "Pechuga",
            precio: 17000,
            foto: "static/img/menu-digital/pechuga.png",
            desc: "Pechuga de pollo a la plancha con guarnición y sopa.",
            calificacion: 5,
            disponibles: 11,
            activo: true
        },
        {
            nombre: "Pierna Pernil",
            precio: 17000,
            foto: "static/img/menu-digital/piernapernil.png",
            desc: "Pierna pernil horneada con arroz, ensalada y sopa.",
            calificacion: 5,
            disponibles: 6,
            activo: true
        },
        {
            nombre: "Gallina",
            precio: 17000,
            foto: "static/img/menu-digital/gallina,.png",
            desc: "Gallina criolla cocinada lentamente con acompañamientos.",
            calificacion: 5,
            disponibles: 3,
            activo: true
        }
    ]

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