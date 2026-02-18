// IMPORTACIONES
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

// DEFINICIÓN DE TIPOS
// Se definen las estructuras de datos para el mapa de favoritos y las funciones expuestas por el contexto.
type FavoritesMap = Record<string, boolean>;

type FavoritesContextType = {
  favorites: FavoritesMap;
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => Promise<void>;
  canUseFavorites: boolean;
};

// INICIALIZACIÓN DEL CONTEXTO
// Se crea el contexto inicial con valor nulo.
const FavoritesContext = createContext<FavoritesContextType | null>(null);

// PROVEEDOR DE FAVORITOS
// Este componente gestiona el estado global de favoritos y la sincronización en tiempo real con Firebase.
export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  
  // ESTADO
  // Almacena el mapa de favoritos locales y el ID del usuario actual.
  const [favorites, setFavorites] = useState<FavoritesMap>({});
  const [uid, setUid] = useState<string | null>(null);

  // DETECCIÓN DE SESIÓN
  // Se observa el estado de autenticación. Si el usuario cierra sesión, se limpia la lista de favoritos visualmente.
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setUid(null);
        setFavorites({}); 
        return;
      }
      setUid(user.uid);
    });
    return unsub;
  }, []);

  // SINCRONIZACIÓN CON FIREBASE
  // Si hay un usuario autenticado, se escucha en tiempo real la colección de favoritos en la base de datos.
  useEffect(() => {
    if (!uid) return;

    const favCol = collection(db, "users", uid, "favorites");
    const unsub = onSnapshot(favCol, (snap) => {
      const map: FavoritesMap = {};
      snap.forEach((d) => (map[d.id] = true));
      setFavorites(map);
    });

    return unsub;
  }, [uid]);

  // LÓGICA DE VERIFICACIÓN
  // Variables y funciones para consultar el estado de un producto o permisos.
  const canUseFavorites = !!uid;

  const isFavorite = (productId: string) => !!favorites[productId];

  // MANEJO DE FAVORITOS
  // Agrega o elimina un producto de la base de datos dependiendo de su estado actual.
  const toggleFavorite = async (productId: string) => {
    if (!uid) return; 
    const ref = doc(db, "users", uid, "favorites", productId);

    if (favorites[productId]) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, { createdAt: serverTimestamp() }, { merge: true });
    }
  };

  // RENDERIZADO
  // Se memoriza el valor del contexto para evitar renderizados innecesarios y se provee a los componentes hijos.
  const value = useMemo(
    () => ({ favorites, isFavorite, toggleFavorite, canUseFavorites }),
    [favorites, uid]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

// HOOK PERSONALIZADO
// Permite acceder al contexto de favoritos desde cualquier componente de la aplicación.
export const useFavorites = () => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites debe usarse dentro de FavoritesProvider");
  return ctx;
};
