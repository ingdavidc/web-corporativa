import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Reemplaza los valores por los de tu proyecto de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAuJtE7VKOm1wG5BEd_pde8_9aDaq33j8E",
  authDomain: "dc-telematica-auditoria.firebaseapp.com",
  projectId: "dc-telematica-auditoria",
  storageBucket: "dc-telematica-auditoria.firebasestorage.app",
  messagingSenderId: "1052355352106",
  appId: "1:1052355352106:web:8d9a81c06959bda325d553"
};

// Esta línea evita que Next.js abra múltiples conexiones por error
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };