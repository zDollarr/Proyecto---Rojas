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

// 1. Inicialización de Instancia de Firebase
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// 2. Configuración de Autenticación con Persistencia Local (AsyncStorage)
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (e) {
  auth = getAuth(app); // Fallback para entorno web/debug
}

// 3. Inicialización de Base de Datos con Caché Offline
let db;
try {
    db = initializeFirestore(app, {
       cacheSizeBytes: CACHE_SIZE_UNLIMITED // Habilita caché persistente para modo offline
    });
} catch (e) {
    db = getFirestore(app);
}

export default app;
export { auth, db };
