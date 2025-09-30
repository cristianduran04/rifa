// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage"; // <- agregado

const firebaseConfig = {
  apiKey: "AIzaSyBcT13uZhxnJpvCgQNsTNUZy26CkeLHMYo",
  authDomain: "rifas-f3e00.firebaseapp.com",
  projectId: "rifas-f3e00",
  storageBucket: "rifas-f3e00.appspot.com", // <- corregido
  messagingSenderId: "257248373785",
  appId: "1:257248373785:web:56882db477fd3ce03bce88",
  measurementId: "G-T0YDHCDETP"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
export const storage = getStorage(app); // <- exportado
