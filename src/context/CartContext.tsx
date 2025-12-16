import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebaseConfig"; 
import { Product } from "../types"; 

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextProps {
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, action: 'increase' | 'decrease') => void;
  clearCart: () => void;
  refreshCart: (newCart: CartItem[]) => void;
  total: number;
  cartCount: number;
}

const CartContext = createContext<CartContextProps | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false); // Evita sobrescribir antes de cargar

  // 1. Escuchar quién está logueado
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        setCart([]); // Si se desloguea, limpiamos el carrito visualmente
      }
    });
    return unsubscribe;
  }, []);

  // 2. Cargar el carrito específico de ese usuario
  useEffect(() => {
    const loadCart = async () => {
      setIsLoaded(false); // Bloqueamos guardado mientras cargamos
      if (userId) {
        try {
          // Usamos una clave ÚNICA por usuario
          const storedCart = await AsyncStorage.getItem(`cart_${userId}`);
          if (storedCart) {
            setCart(JSON.parse(storedCart));
          } else {
            setCart([]);
          }
        } catch (error) {
          console.log("Error cargando carrito:", error);
        }
      } else {
        setCart([]);
      }
      setIsLoaded(true); // Ya cargó, liberamos el guardado
    };

    loadCart();
  }, [userId]);

  // 3. Guardar el carrito en la clave de ese usuario
  useEffect(() => {
    const saveCart = async () => {
      // Solo guardamos si ya terminamos de cargar y hay un usuario
      if (!isLoaded || !userId) return; 
      
      try {
        await AsyncStorage.setItem(`cart_${userId}`, JSON.stringify(cart));
      } catch (error) {
        console.log("Error guardando carrito:", error);
      }
    };

    saveCart();
  }, [cart, userId, isLoaded]);

  const addToCart = (product: Product) => {
    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.product.id === product.id);
      if (existingItem) {
        return currentCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...currentCart, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((currentCart) => currentCart.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, action: 'increase' | 'decrease') => {
    setCart((currentCart) => {
      return currentCart.map((item) => {
        if (item.product.id === productId) {
          const newQuantity = action === 'increase' ? item.quantity + 1 : item.quantity - 1;
          return { ...item, quantity: Math.max(1, newQuantity) };
        }
        return item;
      });
    });
  };

  const clearCart = () => setCart([]);

  const refreshCart = (newCart: CartItem[]) => {
      setCart(newCart);
  };

  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, refreshCart, total, cartCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart debe usarse dentro de CartProvider");
  return context;
};
