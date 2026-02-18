// src/screens/home/HomeScreen.tsx

// IMPORTACIONES
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  TextInput,
  FlatList,
  Image,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { CommonActions, useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/StackNavigator";
import { COLORS, FONT_SIZES } from "../../types";
import { auth, db } from "../../firebaseConfig";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useFavorites } from "../../context/FavoritesContext";

import { useProductViewModel } from "../../hooks/useProductViewModel";
import { Product } from "../../services/ProductService";

let RNExitApp: any;
if (Platform.OS === "android" || Platform.OS === "ios") {
  try {
    RNExitApp = require("react-native-exit-app");
  } catch (error) {
    console.log("RNExitApp no disponible en Expo Go");
  }
}

const CATEGORIES = [
  "Planta",
  "Maceta",
  "Fertilizante",
  "Herramienta",
  "Semillas",
  "Decoración",
  "Otros",
];

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Home">;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
const { products, loading, refreshing, onRefresh, error } = useProductViewModel();

  // ESTADOS DE INTERFAZ
  const [menuVisible, setMenuVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  // ESTADOS DE DATOS LOCALES (Filtros de UI)
  const [searchText, setSearchText] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  // 'filteredProducts' sigue siendo necesario para la UI (búsqueda instantánea)
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  
  // ESTADOS DE USUARIO Y CONEXIÓN
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<"client" | "owner" | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Si el hook reporta error, asumimos que estamos offline o falló la red
  useEffect(() => {
    if (error) setIsOnline(false);
    else setIsOnline(true);
  }, [error]);

  // HOOKS Y REFERENCIAS
  const { toggleFavorite, isFavorite, canUseFavorites } = useFavorites();
  const inputRef = useRef<TextInput | null>(null);

  // ESTADO DE ALERTAS
  const [customAlert, setCustomAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons?: { text: string; onPress: () => void; style?: "cancel" | "destructive" }[];
  }>({ visible: false, title: "", message: "" });

  // GESTIÓN DEL TECLADO
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardOpen(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // GESTIÓN DE SESIÓN (Esto se mantiene igual por ahora)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        setIsLoggedIn(true);
        const userDocRef = doc(db, "users", user.uid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const roleRaw = (userData as any).role;
            const roleClean = roleRaw ? String(roleRaw).trim().toLowerCase() : "client";

            if (roleClean === "owner") {
              setUserRole("owner");
            } else {
              setUserRole("client");
            }
          } else {
            setUserRole("client");
          }
        } catch (error) {
          console.log("Error auth offline:", error);
          setUserRole("client");
        }
      } else {
        setIsLoggedIn(false);
        setUserRole(null);
      }
    });
    return unsubscribe;
  }, []);

  // === SINCRONIZACIÓN DE DATOS ===
  // Cada vez que el ViewModel nos de nuevos productos, actualizamos la lista filtrada
  useEffect(() => {
    applyFilters(searchText, selectedCategories, products);
  }, [products]); // Se ejecuta cuando 'products' cambia desde el hook

  // GESTIÓN DE ALERTAS PERSONALIZADAS
  const showCustomAlert = (
    title: string,
    message: string,
    buttons?: { text: string; onPress: () => void; style?: "cancel" | "destructive" }[]
  ) => {
    setCustomAlert({ visible: true, title, message, buttons });
  };

  const closeCustomAlert = () => {
    setCustomAlert((prev) => ({ ...prev, visible: false, buttons: [] }));
  };

  // LÓGICA DE FILTRADO (UI Logic)
  const applyFilters = (text: string, categories: string[], list: Product[] = products) => {
    let result = list;
    if (categories.length > 0) {
      result = result.filter((p) => categories.includes(p.category));
    }
    if (text !== "") {
      result = result.filter((p) => p.name.toLowerCase().includes(text.toLowerCase()));
    }
    setFilteredProducts(result);
  };

  const handleSearch = (text: string) => {
    setSearchText(text);
    applyFilters(text, selectedCategories, products);
  };

  const toggleCategory = (category: string) => {
    let newCategories: string[];
    if (selectedCategories.includes(category)) {
      newCategories = selectedCategories.filter((c) => c !== category);
    } else {
      newCategories = [...selectedCategories, category];
    }
    setSelectedCategories(newCategories);
    applyFilters(searchText, newCategories, products);
  };

  const clearCategories = () => {
    setSelectedCategories([]);
    applyFilters(searchText, [], products);
    setFilterModalVisible(false);
  };

  // NAVEGACIÓN Y ACCIONES DE MENÚ
  const handleGoBackPress = (): void => {
    showCustomAlert(" E s p e r a", "¿Seguro que quieres abandonar la App?", [
      { text: "No", onPress: () => closeCustomAlert(), style: "cancel" },
      {
        text: "Sí",
        onPress: () => {
          closeCustomAlert();
          if (Platform.OS === "android" || Platform.OS === "ios") {
            try {
              RNExitApp?.exitApp?.();
            } catch (error) {
              showCustomAlert("A v i s o", "No se puede cerrar la app dentro de Expo Go.");
            }
          } else {
            showCustomAlert("A v i s o", "Esta acción cerrará la app en producción.");
          }
        },
      },
    ]);
  };

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const handleOpenFavorites = () => {
    setMenuVisible(false);
    (navigation as any).navigate("Favorites");
  };

  const handleOpenCart = () => {
    setMenuVisible(false);
    (navigation as any).navigate("Cart");
  };

  const handleProfile = () => {
    setMenuVisible(false);
    if (!isLoggedIn) {
      showCustomAlert("Aviso", "Inicia sesión para ver tu perfil.");
      return;
    }
    navigation.navigate("Profile");
  };

  const handleLogout = () => {
    setMenuVisible(false);
    auth.signOut().then(() => {
      setIsLoggedIn(false);
      setUserRole(null);
      showCustomAlert("Sesión Cerrada", "Ahora estás navegando como invitado.", [
        {
          text: "OK",
          onPress: () => {
            closeCustomAlert();
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: "Home" }]
              })
            );
          }
        }
      ]);
    });
  };

  const handleFavoritePress = (id: string) => {
    if (keyboardOpen) return;
    if (!canUseFavorites) {
        showCustomAlert("Aviso", "Inicia sesión para usar favoritos.");
        return;
    }
    void toggleFavorite(id);
  };

  const handleFilterPress = () => {
    if (keyboardOpen) return;
    setFilterModalVisible(true);
  };

  const handleDismissKeyboard = () => {
    if (keyboardOpen) {
      Keyboard.dismiss();
      inputRef.current?.blur();
    }
  };

  const handleAddProduct = () => {
    navigation.navigate("AddProduct");
  };

  // RENDERIZADO DE ELEMENTOS
  const renderProductItem = ({ item }: { item: Product }) => {
    const imageSource = item.image ? { uri: item.image } : require("../../../assets/planta.png");

    return (
      <TouchableOpacity
        style={styles.productCard}
        activeOpacity={0.8}
        onPress={() => navigation.navigate("ProductDetail", { product: item, userRole: userRole })}
      >
        <Image source={imageSource} style={styles.productImage} resizeMode="cover" />
        <Text style={styles.productName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.productPrice}>{item.price.toLocaleString()} $ mxn</Text>

        <TouchableOpacity
          style={styles.heartButton}
          onPress={() => handleFavoritePress(item.id)}
          activeOpacity={keyboardOpen ? 1 : 0.7}
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

  // COMPONENTE DE ALERTA
  const CustomAlert: React.FC = () => {
    const alertButtons =
      customAlert.buttons && customAlert.buttons.length > 0
        ? customAlert.buttons
        : [{ text: "OK", onPress: closeCustomAlert }];

    return (
      <Modal
        animationType="fade"
        transparent
        visible={customAlert.visible}
        onRequestClose={closeCustomAlert}
      >
        <Pressable style={styles.alertOverlay} onPress={closeCustomAlert}>
          <Pressable style={styles.alertContainer} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.alertTitle}>{customAlert.title}</Text>
            <Text style={styles.alertMessage}>{customAlert.message}</Text>
            <View style={styles.alertButtonContainer}>
              {alertButtons.map((button, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.alertButton,
                    button.style === "cancel" && styles.alertCancelButton,
                    button.style === "destructive" && styles.alertDestructiveButton
                  ]}
                  onPress={button.onPress}
                >
                  <Text
                    style={[
                      styles.alertButtonText,
                      button.style === "cancel" && styles.alertCancelButtonText,
                      button.style === "destructive" && { color: "#fff" }
                    ]}
                  >
                    {button.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  // RENDERIZADO PRINCIPAL
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={{ flex: 1 }}>
          {keyboardOpen && (
            <TouchableWithoutFeedback onPress={handleDismissKeyboard}>
              <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]} />
            </TouchableWithoutFeedback>
          )}

          <StatusBar style="dark" />

          <View style={styles.figmaHeaderContainer}>
            <TouchableOpacity style={styles.figmaBackButton} onPress={handleGoBackPress}>
              <MaterialIcons name="arrow-back" size={22} color={COLORS.text} />
            </TouchableOpacity>

            {/* Indicador de estado de conexión */}
            <View style={{ alignItems: 'center', top: 25 }}>
                <View style={[
                    styles.statusIndicator, 
                    { backgroundColor: isOnline ? '#e8f5e9' : '#ffebee' } 
                ]}>
                    <View style={[
                        styles.statusDot, 
                        { backgroundColor: isOnline ? '#4CAF50' : '#F44336' }
                    ]} />
                    <Text style={styles.statusText}>
                        {isOnline ? 'Conectado' : 'Desconectado'}
                    </Text>
                </View>
            </View>

            <TouchableOpacity style={styles.figmaProfileButton} onPress={openMenu}>
              <FontAwesome5 name="user-friends" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <CustomAlert />

          {/* Modal de Filtros */}
          <Modal
            animationType="fade"
            transparent
            visible={filterModalVisible}
            onRequestClose={() => setFilterModalVisible(false)}
          >
            <Pressable style={styles.menuOverlay} onPress={() => setFilterModalVisible(false)}>
              <View style={styles.menuContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.menuTitle}>F i l t r a r   C a t e g o r í a s</Text>
                  <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                    <Text style={{ color: "#717171ff", fontFamily: "KalamBold", fontSize: 16 }}>
                      Listo
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.categoryOption, { marginBottom: 5 }]}
                  onPress={clearCategories}
                >
                  <Text style={[styles.categoryOptionText, { color: "#ff4444" }]}>
                    Ninguna / Limpiar
                  </Text>
                  <MaterialIcons name="close" size={20} color="#ff4444" />
                </TouchableOpacity>

                <FlatList
                  data={CATEGORIES}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.categoryOption} onPress={() => toggleCategory(item)}>
                      <Text
                        style={[
                          styles.categoryOptionText,
                          selectedCategories.includes(item) && {
                            color: "#a6a6a6ff",
                            fontFamily: "KalamBold",
                          },
                        ]}
                      >
                        {item}
                      </Text>
                      {selectedCategories.includes(item) && (
                        <MaterialIcons name="check" size={20} color="#a6a6a6ff" />
                      )}
                    </TouchableOpacity>
                  )}
                />
              </View>
            </Pressable>
          </Modal>

          {/* Modal de Menú de Usuario */}
          <Modal
            animationType="fade"
            transparent
            visible={menuVisible}
            onRequestClose={closeMenu}
          >
            <Pressable style={styles.menuOverlay} onPress={closeMenu}>
              <Pressable style={styles.menuContainer} onPress={(e) => e.stopPropagation()}>
                <Text style={styles.menuTitle}>C U E N T A</Text>

                {isLoggedIn && (
                  <>
                    <Pressable style={styles.menuOption} onPress={handleProfile}>
                      <MaterialIcons name="person" size={20} color={"#025a25ff"} />
                      <Text style={styles.menuText}>Mi Perfil</Text>
                    </Pressable>

                    <Pressable style={styles.menuOption} onPress={handleOpenCart}>
                      <MaterialIcons name="shopping-cart" size={20} color={"#916e07ff"} />
                      <Text style={styles.menuText}>Carrito</Text>
                    </Pressable>

                    <Pressable style={styles.menuOption} onPress={handleOpenFavorites}>
                      <MaterialIcons name="favorite" size={20} color={"#b22222ff"} />
                      <Text style={styles.menuText}>Favoritos</Text>
                    </Pressable>

                    <Pressable style={styles.menuOption} onPress={handleLogout}>
                      <MaterialIcons name="logout" size={20} color={COLORS.error} />
                      <Text style={[styles.menuText, { color: COLORS.error }]}>Cerrar Sesión</Text>
                    </Pressable>
                  </>
                )}

                {!isLoggedIn && (
                  <Pressable
                    style={styles.menuOption}
                    onPress={() => {
                      setMenuVisible(false);
                      navigation.navigate("Login");
                    }}
                  >
                    <MaterialIcons name="person" size={20} color={(COLORS as any).profile} />
                    <Text style={[styles.menuText, { color: COLORS.text }]}>Iniciar sesión</Text>
                  </Pressable>
                )}

                <Pressable style={styles.closeMenuButton} onPress={closeMenu}>
                  <Text style={styles.closeMenuText}>Cancelar</Text>
                </Pressable>
              </Pressable>
            </Pressable>
          </Modal>

          <View style={styles.contentContainer}>
            <Text style={styles.welcomeText}>¡Bienvenido!</Text>

            <Text style={styles.instructionText}>¿Qué te gustaría comprar hoy?</Text>

            <View style={styles.searchRow}>
              <View style={styles.searchContainer}>
                {searchText === "" && (
                  <View style={styles.placeholderContainer} pointerEvents="none">
                    <Text style={styles.placeholderText}>Busca tus productos . . .</Text>
                  </View>
                )}
                <TextInput
                  ref={inputRef}
                  style={styles.searchInput}
                  value={searchText}
                  onChangeText={handleSearch}
                  onFocus={() => setKeyboardOpen(true)}
                  onBlur={() => setKeyboardOpen(false)}
                  blurOnSubmit
                  returnKeyType="done"
                />
                <MaterialIcons name="search" size={24} color="#999" style={styles.searchIcon} />
              </View>

              <TouchableOpacity
                style={[
                  styles.filterCircle,
                  selectedCategories.length > 0 && { backgroundColor: "#d2d2d2ff" },
                ]}
                onPress={handleFilterPress}
                activeOpacity={keyboardOpen ? 1 : 0.7}
              >
                <MaterialIcons
                  name="tune"
                  size={28}
                  color={selectedCategories.length > 0 ? "#fff" : COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {userRole === "owner" && (
              <TouchableOpacity style={styles.addProductButton} onPress={handleAddProduct}>
                <MaterialIcons name="add" size={24} color="#fff" />
                <Text style={styles.addProductText}>Agregar Producto</Text>
              </TouchableOpacity>
            )}

            {selectedCategories.length > 0 && (
              <View style={{ marginBottom: 10, paddingHorizontal: 20 }}>
                <Text style={{ fontFamily: "KalamBold", color: COLORS.text, textAlign: "center" }}>
                  Filtrando por:
                </Text>
                <Text
                  style={{ fontFamily: "KalamBold", color: COLORS.textSecondary, textAlign: "center" }}
                >
                  {selectedCategories.join(", ")}
                </Text>
              </View>
            )}

            <View style={styles.resultsContainer}>
              {loading ? (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={{ fontFamily: "KalamBold", marginTop: 10, color: "#666" }}>
                    Cargando vivero...
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredProducts}
                  renderItem={renderProductItem}
                  keyExtractor={(item) => item.id}
                  numColumns={2}
                  columnWrapperStyle={styles.row}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 30 }}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={onRefresh}
                      colors={[COLORS.primary]}
                    />
                  }
                  ListHeaderComponent={
                    <Text style={styles.resultsCount}>
                      {filteredProducts.length} resultados encontrados
                    </Text>
                  }
                  ListEmptyComponent={
                    <View style={{ alignItems: "center", marginTop: 50 }}>
                      <FontAwesome5 name="leaf" size={40} color="#ccc" />
                      <Text
                        style={{
                          fontFamily: "KalamBold",
                          color: "#999",
                          marginTop: 10,
                          fontSize: 16,
                        }}
                      >
                        No se encontraron productos.
                      </Text>
                    </View>
                  }
                />
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ESTILOS DE PANTALLA
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  figmaHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  figmaBackButton: {
    backgroundColor: COLORS.surface,
    top: 25,
    padding: 8,
    borderRadius: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
  },
  figmaProfileButton: {
    backgroundColor: COLORS.surface,
    top: 25,
    padding: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
  },
  statusIndicator: {
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 }
  },
  statusDot: {
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    marginRight: 6
  },
  statusText: {
    fontSize: 12, 
    color: '#555', 
    fontFamily: 'KalamBold'
  },
  contentContainer: {
    flex: 1,
    paddingTop: 20,
  },
  welcomeText: {
    fontSize: FONT_SIZES.xlarge,
    color: "black",
    textAlign: "center",
    marginBottom: 8,
    fontFamily: "Pacifico",
  },
  instructionText: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "Pacifico",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 2,
    marginBottom: 20,
    justifyContent: "center",
    width: "97%",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    width: "76%",
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 2,
    borderRadius: 22,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  filterCircle: {
    marginLeft: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 9,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  searchInput: {
    flex: 1,
    fontSize: 18,
    color: COLORS.text,
    fontFamily: "KalamBold",
    backgroundColor: "transparent",
  },
  searchIcon: {
    marginLeft: 10,
  },
  placeholderContainer: {
    position: "absolute",
    left: 30,
    right: 50,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    zIndex: -1,
  },
  placeholderText: {
    fontSize: FONT_SIZES.medium,
    color: "#00000028",
    fontFamily: "KalamBold",
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 2,
  },
  resultsCount: {
    fontSize: 23.9,
    color: COLORS.text,
    fontFamily: "Pacifico",
    left: 45,
    marginBottom: 25,
    marginLeft: 3,
    top: -10,
  },
  productCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "space-between",
    minWidth: 150,
    maxWidth: 165,
    flex: 1,
    marginHorizontal: 6,
    paddingVertical: 17,
    paddingHorizontal: 8,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 13,
    aspectRatio: 0.7,
  },
  productImage: {
    width: 125,
    height: 125,
    borderRadius: 12,
    marginBottom: 15,
    marginTop: 8,
    backgroundColor: "#fdfdfdff",
  },
  productName: {
    marginTop: 1,
    fontSize: 17.5,
    color: COLORS.text,
    fontFamily: "KalamBold",
    textAlign: "center",
    marginBottom: 1,
    paddingHorizontal: 1,
    top: -5,
  },
  productPrice: {
    fontSize: 17,
    color: "#51575dff",
    fontFamily: "KalamBold",
    marginBottom: 17,
    marginTop: 2,
    top: -5,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 14,
  },
  heartButton: {
    position: "absolute",
    top: 12,
    right: 10,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 6,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  menuContainer: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: 200,
  },
  menuContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    maxHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  menuTitle: {
    fontSize: FONT_SIZES.large,
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "Pacifico",
  },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 5,
  },
  menuText: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.text,
    marginLeft: 15,
    fontWeight: "500",
    fontFamily: "KalamBold",
  },
  closeMenuButton: {
    alignSelf: "center",
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  closeMenuText: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.textSecondary,
    fontWeight: "500",
    fontFamily: "Pacifico",
  },
  categoryOption: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryOptionText: {
    fontSize: 16,
    fontFamily: "KalamBold",
    color: COLORS.text,
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertContainer: {
    width: "80%",
    backgroundColor: COLORS.surface,
    padding: 25,
    borderRadius: 15,
    elevation: 10,
    shadowColor: COLORS.text,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  alertTitle: {
    fontSize: FONT_SIZES.large,
    color: COLORS.error,
    textAlign: "center",
    marginBottom: 10,
    fontFamily: "KalamBold",
  },
  alertMessage: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "KalamBold",
  },
  alertButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: 15,
    paddingHorizontal: 10,
  },
  alertButton: {
    backgroundColor: (COLORS as any).botonAlertSi,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 20,
    minWidth: 100,
    alignItems: "center",
    flex: 1,
    maxWidth: 120,
    marginHorizontal: 5,
  },
  alertCancelButton: {
    backgroundColor: (COLORS as any).botonAlertNo,
  },
  alertDestructiveButton: {
    backgroundColor: "#ff4444",
  },
  alertButtonText: {
    color: COLORS.text,
    fontSize: FONT_SIZES.medium,
    textAlign: "center",
    fontFamily: "KalamBold",
    fontWeight: "600",
  },
  alertCancelButtonText: {
    color: COLORS.text,
  },
  addProductButton: {
    flexDirection: "row",
    backgroundColor: "#51af36",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignSelf: "center",
    marginBottom: 15,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  addProductText: {
    color: "#fff",
    marginLeft: 8,
    fontFamily: "KalamBold",
    fontSize: 16,
  },
});

// EXPORTACIÓN
export default HomeScreen;