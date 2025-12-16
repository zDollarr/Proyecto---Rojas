import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

type FavoritesMap = Record<string, boolean>;

type FavoritesContextType = {
  favorites: FavoritesMap;
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => Promise<void>;
  canUseFavorites: boolean;
};

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<FavoritesMap>({});
  const [uid, setUid] = useState<string | null>(null);

  // 1) Detecta login/logout
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setUid(null);
        setFavorites({}); // <- clave: al cerrar sesión ya no quedan favoritos
        return;
      }
      setUid(user.uid);
    });
    return unsub;
  }, []);

  // 2) Escucha favoritos del usuario (en tiempo real)
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

  const canUseFavorites = !!uid;

  const isFavorite = (productId: string) => !!favorites[productId];

  const toggleFavorite = async (productId: string) => {
    if (!uid) return; // invitado: no hace nada
    const ref = doc(db, "users", uid, "favorites", productId);

    if (favorites[productId]) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, { createdAt: serverTimestamp() }, { merge: true });
    }
  };

  const value = useMemo(
    () => ({ favorites, isFavorite, toggleFavorite, canUseFavorites }),
    [favorites, uid]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

export const useFavorites = () => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites debe usarse dentro de FavoritesProvider");
  return ctx;
};
