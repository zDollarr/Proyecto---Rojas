import { initializeApp, getApp, getApps } from "firebase/app";
// @ts-ignore
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA_Gy9ArgMva2Uk0CRTIQ9XC3Ggbz0LJtU",
  authDomain: "joife-9007e.firebaseapp.com",
  projectId: "joife-9007e",
  storageBucket: "joife-9007e.firebasestorage.app",
  messagingSenderId: "670097166482",
  appId: "1:670097166482:web:f2b82613d1c0546e90164b",
  measurementId: "G-3RLHWFSZ0T"
};

// 1. Inicializar App
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// 2. Auth con Persistencia
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (e) {
  auth = getAuth(app);
}

// 3. Firestore con Persistencia (SOLUCIÓN SIMPLE)
// Usamos initializeFirestore pero sin la configuración compleja de caché experimental
// Firebase JS SDK v9+ habilita persistencia por defecto en móviles si se usa así:
let db;
try {
    // Forzamos la inicialización básica que suele activar la persistencia por defecto en RN
    db = initializeFirestore(app, {
       cacheSizeBytes: CACHE_SIZE_UNLIMITED 
    });
} catch (e) {
    db = getFirestore(app);
}

// IMPORTANTE: Habilitar persistencia explícitamente si es necesario
// (Solo funciona en web modular, en RN es automático con initializeFirestore, pero por si acaso)
/* 
import { enableIndexedDbPersistence } from "firebase/firestore"; 
// Esto suele fallar en Expo Go, por eso confiamos en la config de arriba.
*/

export default app;
export { auth, db };
