import { initializeApp, getApp, getApps } from "firebase/app";
// @ts-ignore
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore, initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";

// Configuración principal de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA_Gy9ArgMva2Uk0CRTIQ9XC3Ggbz0LJtU",
  authDomain: "joife-9007e.firebaseapp.com",
  projectId: "joife-9007e",
  storageBucket: "joife-9007e.firebasestorage.app",
  messagingSenderId: "670097166482",
  appId: "1:670097166482:web:f2b82613d1c0546e90164b",
  measurementId: "G-3RLHWFSZ0T",
};

// Inicializa la app de Firebase (evita múltiples instancias)
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Configuración de autenticación con persistencia AsyncStorage (React Native)
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  // Fallback para entornos donde initializeAuth no está disponible
  auth = getAuth(app);
}

// Inicialización de Firestore con caché offline ilimitado
let db;
try {
  db = initializeFirestore(app, {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
  });
} catch (e) {
  // Fallback si initializeFirestore ya fue llamado o no está disponible
  db = getFirestore(app);
}

export default app;
export { auth, db };
