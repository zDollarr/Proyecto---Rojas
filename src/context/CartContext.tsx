// IMPORTACIONES
import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebaseConfig"; 
import { Product } from "../types"; 

// DEFINICIÓN DE TIPOS
// Aquí se define qué estructura tendrá cada producto en el carrito y qué funciones podrán usar los componentes.
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

// INICIALIZACIÓN DEL CONTEXTO
// El "canal" por donde viajarán los datos del carrito a toda la aplicación. Empieza vacío "undefined".
const CartContext = createContext<CartContextProps | undefined>(undefined);

// COMPONENTE PRINCIPAL DEL CARRITO
// Este es el "cerebro" del carrito. Envuelve a toda la app para que cualquier pantalla pueda leer o modificar el carrito.
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  
  // VARIABLES DE ESTADO
  // Aquí se guarda la lista de productos "cart", quién es el usuario actual "userId" y si ya terminamos de cargar los datos "isLoaded".
  const [cart, setCart] = useState<CartItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // DETECCIÓN DE USUARIO
  // Se observa a Firebase en tiempo real. Si el usuario entra, guardamos su ID. Si sale, borramos su ID y limpiamos el carrito visual.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        setCart([]); 
      }
    });
    return unsubscribe;
  }, []);

  // RECUPERACIÓN DE DATOS GUARDADOS
  // Cuando se detecta un usuario, se busca en el celular si dejó un carrito guardado anteriormente y se restaura.
  useEffect(() => {
    const loadCart = async () => {
      setIsLoaded(false); 
      if (userId) {
        try {
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
      setIsLoaded(true);
    };

    loadCart();
  }, [userId]);

  // GUARDADO AUTOMÁTICO
  // Cada vez que se agrega o quita algo del carrito, esto lo guarda automáticamente en la memoria del celular.
  useEffect(() => {
    const saveCart = async () => {
      if (!isLoaded || !userId) return; 
      
      try {
        await AsyncStorage.setItem(`cart_${userId}`, JSON.stringify(cart));
      } catch (error) {
        console.log("Error guardando carrito:", error);
      }
    };

    saveCart();
  }, [cart, userId, isLoaded]);

  // FUNCIONES DE MANEJO DEL CARRITO
  // Aquí se aplica una suma de x cantidad si ya existe el producto al igual que eliminarlos o vaciar todo.
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

  // CÁLCULO DE TOTALES
  // Se calcula cuánto dinero es el total y cuántos productos hay en total.
  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // RENDERIZADO
  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, refreshCart, total, cartCount }}>
      {children}
    </CartContext.Provider>
  );
};

// HOOK PERSONALIZADO
// Esta función permite usar el carrito en cualquier pantalla con solo escribir `useCart()`.
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart debe usarse dentro de CartProvider");
  return context;
};
