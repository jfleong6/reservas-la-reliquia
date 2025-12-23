import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCp3oscTZSuU82ZwOdHOL03uibtgCZoc-w",
  authDomain: "hotel-la-reliquia.firebaseapp.com",
  projectId: "hotel-la-reliquia",
  storageBucket: "hotel-la-reliquia.firebasestorage.app",
  messagingSenderId: "318030903600",
  appId: "1:318030903600:web:bacc5e923f02231c2870f5",
  measurementId: "G-ZDQX7Y4QRM"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);