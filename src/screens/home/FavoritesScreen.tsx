// IMPORTACIONES
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { StackScreenProps } from "@react-navigation/stack";
import { useFocusEffect } from "@react-navigation/native";

import { RootStackParamList } from "../../navigation/StackNavigator";
import { COLORS, FONT_SIZES } from "../../types";
import { db } from "../../firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

import { useFavorites } from "../../context/FavoritesContext";

// TIPOS DE NAVEGACIÓN
type Props = StackScreenProps<RootStackParamList, "Favorites">;

// MODELO DE PRODUCTO (CON STOCK OPCIONAL)
interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  description?: string;
  stock?: number;
}

// COMPONENTE PRINCIPAL (FAVORITOS)
const FavoritesScreen: React.FC<Props> = ({ navigation }) => {
  const { favorites, toggleFavorite, isFavorite } = useFavorites();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Carga todos los productos desde Firestore
  const fetchProducts = async () => {
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
          stock: data.stock !== undefined ? data.stock : 0,
        });
      });

      setProducts(productsList);
    } catch (e) {
      console.log("Error cargando favoritos:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Sincroniza la lista cuando la pantalla gana foco
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchProducts();
    }, [])
  );

  // Filtra solo los productos marcados como favoritos
  const favoriteProducts = useMemo(() => {
    return products.filter((p) => !!favorites[p.id]);
  }, [products, favorites]);

  // Refresco manual con Pull to Refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  // Renderiza cada tarjeta de producto favorito
  const renderItem = ({ item }: { item: Product }) => {
    const imageSource = item.image
      ? { uri: item.image }
      : require("../../../assets/planta.png");

    const currentStock = item.stock !== undefined ? item.stock : 0;
    const isOutOfStock = currentStock <= 0;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate("ProductDetail", { product: item, userRole: null })
        }
      >
        <Image source={imageSource} style={styles.image} resizeMode="cover" />

        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.price}>{item.price.toLocaleString()} $ mxn</Text>

          {/* Indicador de stock en la lista de favoritos */}
          <Text
            style={[
              styles.stockText,
              isOutOfStock ? { color: "#ff4444" } : { color: "#4CAF50" },
            ]}
          >
            {isOutOfStock ? "Agotado" : `Disponibles: ${currentStock}`}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.heartBtn}
          onPress={() => toggleFavorite(item.id)}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name={isFavorite(item.id) ? "favorite" : "favorite-border"}
            size={26}
            color={isFavorite(item.id) ? "#f4061eff" : "#0000009f"}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // Estado vacío cuando no hay favoritos
  const EmptyState = () => (
    <View style={styles.content}>
      <MaterialIcons name="favorite" size={52} color={COLORS.textSecondary} />
      <Text style={styles.emptyTitle}>Aún no hay favoritos</Text>
      <Text style={styles.emptyText}>
        Marca productos con el corazón para verlos aquí.
      </Text>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.primaryBtnText}>Volver al catálogo</Text>
      </TouchableOpacity>
    </View>
  );

  // Renderizado principal
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>

        <Text style={styles.title}>Favoritos</Text>

        <View style={styles.rightSpacer} />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loaderText}>Cargando favoritos...</Text>
        </View>
      ) : favoriteProducts.length === 0 ? (
        <EmptyState />
      ) : (
        <FlatList
          data={favoriteProducts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

// ESTILOS DE PANTALLA
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    top: 35,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: FONT_SIZES.large,
    color: COLORS.text,
    fontFamily: "Pacifico",
  },

  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  loaderText: {
    marginTop: 10,
    fontFamily: "KalamBold",
    color: COLORS.textSecondary,
  },

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 10,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.large,
    color: COLORS.text,
    fontFamily: "KalamBold",
    textAlign: "center",
    marginTop: 10,
  },
  emptyText: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.textSecondary,
    fontFamily: "KalamBold",
    textAlign: "center",
  },
  primaryBtn: {
    marginTop: 20,
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 30,
  },
  primaryBtnText: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.medium,
    fontFamily: "KalamBold",
  },

  card: {
    top: 25,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: "#fdfdfdff",
  },
  name: {
    fontFamily: "KalamBold",
    fontSize: 16,
    color: COLORS.text,
  },
  price: {
    fontFamily: "KalamBold",
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  stockText: {
    fontFamily: "KalamBold",
    fontSize: 12,
    marginTop: 4,
  },
  heartBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  rightSpacer: {
    width: 42,
    height: 42,
  },
});

// EXPORTACIÓN
export default FavoritesScreen;
