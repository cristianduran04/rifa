// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Configuración de tu proyecto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBcT13uZhxnJpvCgQNsTNUZy26CkeLHMYo",
  authDomain: "rifas-f3e00.firebaseapp.com",
  projectId: "rifas-f3e00",
  storageBucket: "rifas-f3e00.firebasestorage.app",
  messagingSenderId: "257248373785",
  appId: "1:257248373785:web:56882db477fd3ce03bce88",
  measurementId: "G-T0YDHCDETP"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios que vamos a usar
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
