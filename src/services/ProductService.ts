// src/services/ProductService.ts

// Importamos la base de datos.
// Como tu firebaseConfig.ts está en 'src/', subimos un nivel con '../'
import { db } from "../firebaseConfig"; 
import { collection, getDocs } from "firebase/firestore";

// Definimos cómo se ve un producto (copiado de tu HomeScreen)
export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  description?: string;
  stock?: number;
}

// Este objeto solo se encargará de pedir datos a Firebase
export const ProductService = {
  getAllProducts: async (): Promise<Product[]> => {
    try {
      const productsRef = collection(db, "products");
      const querySnapshot = await getDocs(productsRef);

      const productsList: Product[] = [];
      querySnapshot.forEach((docSnap) => {
        const data: any = docSnap.data();
        productsList.push({
          id: docSnap.id,
          name: data.name || "Sin nombre",
          price: data.price || 0,
          category: data.category || "Otros",
          image: data.image || "",
          description: data.description,
          stock: data.stock,
        });
      });
      return productsList;
    } catch (error) {
      console.error("Error en ProductService:", error);
      throw error;
    }
  },
};