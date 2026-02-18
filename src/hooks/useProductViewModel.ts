// src/hooks/useProductViewModel.ts
import { useState, useEffect, useCallback } from 'react';
import { ProductService, Product } from '../services/ProductService';

export const useProductViewModel = () => {
  // Estados que antes estaban en tu HomeScreen
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lógica para pedir datos al Servicio
  const fetchProducts = useCallback(async () => {
    try {
      // Si no es refresh, podríamos poner loading en true, 
      // pero para UX a veces es mejor dejarlo como estaba si ya hay datos.
      const data = await ProductService.getAllProducts();
      setProducts(data);
      setError(null);
    } catch (err) {
      console.error("Error en ViewModel:", err);
      setError('No se pudieron cargar los productos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Cargar datos al iniciar
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Manejador para el "pull to refresh"
  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  // Retornamos todo lo que la vista necesita
  return {
    products,
    loading,
    refreshing,
    error,
    onRefresh,
  };
};