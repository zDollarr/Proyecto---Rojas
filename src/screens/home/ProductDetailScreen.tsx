// IMPORTACIONES
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StatusBar,
  ScrollView,
  Modal,
  Pressable,
  ActivityIndicator
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { StackScreenProps } from "@react-navigation/stack";
import ImageViewing from "react-native-image-viewing";
import { RootStackParamList } from "../../navigation/StackNavigator";
import { db, auth } from "../../firebaseConfig";
import { doc, deleteDoc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

// IMPORTACIÓN DE CONTEXTOS
import { useFavorites } from "../../context/FavoritesContext";
import { useCart } from "../../context/CartContext";

// DEFINICIÓN DE TIPOS
type Props = StackScreenProps<RootStackParamList, "ProductDetail">;

// COMPONENTE PRINCIPAL (DETALLE DE PRODUCTO)
// Muestra la información completa de un producto, permitiendo agregarlo al carrito, marcarlo como favorito o editarlo si se es dueño.
const ProductDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  
  // OBTENCIÓN DE DATOS
  const { product, userRole } = route.params as { product: any; userRole?: string };
  const [currentProduct, setCurrentProduct] = useState(product);

  // ESTADOS DE INTERFAZ
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isGalleryVisible, setIsGalleryVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ESTADO DE ALERTAS
  const [customAlert, setCustomAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons?: { text: string; onPress: () => void; style?: "cancel" | "destructive" }[];
  }>({ visible: false, title: "", message: "" });

  // CONSTANTES DE ACCESO
  const isOwner = userRole === "owner";

  // HOOKS DE CONTEXTO
  const { toggleFavorite, isFavorite } = useFavorites();
  const { addToCart } = useCart();

  // GESTIÓN DE SESIÓN
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return unsub;
  }, []);

  const productId = (currentProduct as any)?.id ?? (product as any)?.id;

  const favoriteActive = useMemo(() => {
    if (!productId) return false;
    return isFavorite(productId);
  }, [productId, isFavorite]);

  // SINCRONIZACIÓN EN TIEMPO REAL
  // Se escuchan los cambios del producto en Firestore para mantener la vista actualizada (stock, precios, etc).
  useEffect(() => {
    const productRef = doc(db, "products", product.id);
    const unsubscribe = onSnapshot(productRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        setCurrentProduct({ id: docSnapshot.id, ...docSnapshot.data() });
      }
    });
    return () => unsubscribe();
  }, [product.id]);

  // GESTIÓN DE ALERTAS
  const showCustomAlert = (
    title: string,
    message: string,
    buttons?: { text: string; onPress: () => void; style?: "cancel" | "destructive" }[]
  ) => {
    setCustomAlert({ visible: true, title, message, buttons });
  };

  const closeCustomAlert = () => {
    setCustomAlert({ ...customAlert, visible: false, buttons: [] });
  };

  // VALIDACIÓN DE STOCK
  const currentStock = (currentProduct as any).stock !== undefined ? (currentProduct as any).stock : 0;
  const isOutOfStock = currentStock <= 0;

  // LÓGICA DE COMPRA
  // Verifica el stock disponible y añade el producto al carrito global.
  const handleConfirmAddToCart = () => {
    if (quantity > currentStock) {
        showCustomAlert("Stock Insuficiente", `Solo quedan ${currentStock} unidades disponibles.`);
        return;
    }

    for (let i = 0; i < quantity; i++) {
        addToCart(currentProduct);
    }
    setBubbleVisible(false);
    
    const productName = currentProduct.name;
    const finalName = quantity > 1 ? `${productName}s` : productName;
    const verb = quantity > 1 ? "agregaron" : "agregó";

    showCustomAlert("¡Excelente!", `Se ${verb} ${quantity} ${finalName} al carrito.`);
    
    setQuantity(1);
  };

  // ELIMINACIÓN DE PRODUCTO
  // Solo accesible para el dueño. Borra el documento de Firestore de forma permanente.
  const handleDeleteProduct = () => {
    showCustomAlert(
      "Eliminar Producto",
      "¿Estás seguro de que quieres borrar este producto? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", onPress: closeCustomAlert, style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            closeCustomAlert();
            setDeleting(true);
            try {
              await deleteDoc(doc(db, "products", product.id));
              navigation.goBack();
            } catch (error) {
              console.error("Error borrando:", error);
              setDeleting(false);
              setTimeout(() => {
                showCustomAlert("Error", "No se pudo eliminar el producto.");
              }, 500);
            }
          }
        }
      ]
    );
  };

  // COMPONENTE VISUAL DE ALERTA
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

  // PREPARACIÓN DE RECURSOS VISUALES
  const imageSource = currentProduct.image
    ? { uri: currentProduct.image }
    : require("../../../assets/planta.png");

  const images = [imageSource];

  const defaultText = "Este producto no tiene una descripción detallada.";
  const descriptionText = (currentProduct as any).description
    ? (currentProduct as any).description
    : defaultText;

  const isDefaultDescription = !(currentProduct as any).description;

  const shouldShowARButton =
    currentProduct.category &&
    [
      "planta", "arbol", "flor", "maceta", "cactus",
      "suculenta", "interior", "exterior", "decorativa"
    ].some((tag: string) => currentProduct.category.toLowerCase().includes(tag));

  // RENDERIZADO PRINCIPAL
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <CustomAlert />

      {isGalleryVisible && <StatusBar hidden />}

      {bubbleVisible && (
        <TouchableWithoutFeedback onPress={() => setBubbleVisible(false)}>
          <View style={styles.overlay} pointerEvents="box-none" />
        </TouchableWithoutFeedback>
      )}

      {/* Visor de imágenes a pantalla completa */}
      <ImageViewing
        images={images}
        imageIndex={0}
        visible={isGalleryVisible}
        onRequestClose={() => setIsGalleryVisible(false)}
        swipeToCloseEnabled={true}
        doubleTapToZoomEnabled={true}
        presentationStyle="overFullScreen"
        animationType="fade"
        HeaderComponent={() => (
          <View style={styles.galleryHeader}>
            <TouchableOpacity
              style={styles.closeGalleryButton}
              onPress={() => setIsGalleryVisible(false)}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
              <MaterialIcons name="close" size={30} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
        FooterComponent={() => <View style={{ height: 40 }} />}
      />

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <MaterialIcons name="arrow-back" size={22} color="#222" />
      </TouchableOpacity>

      {/* Botones de navegación superior (Solo logueados) */}
      {isLoggedIn && (
        <TouchableOpacity
          style={styles.favoritesTopButton}
          onPress={() => navigation.navigate("Favorites")}
        >
          <MaterialIcons name="favorite" size={23} color="#222" />
        </TouchableOpacity>
      )}

      {isLoggedIn && (
        <TouchableOpacity 
          style={styles.cartButton} 
          onPress={() => navigation.navigate("Cart")} 
        >
          <MaterialIcons name="shopping-cart" size={23} color="#222" />
        </TouchableOpacity>
      )}

      {/* Tarjeta principal del producto */}
      <View style={styles.card}>
        <TouchableOpacity onPress={() => setIsGalleryVisible(true)} activeOpacity={0.9}>
          <Image source={imageSource} style={styles.cardImage} resizeMode="cover" />
        </TouchableOpacity>

        <Text style={styles.cardName}>{currentProduct.name}</Text>

        {currentProduct.category && <Text style={styles.cardCategory}>{currentProduct.category}</Text>}
        
        <Text style={[styles.stockText, isOutOfStock ? {color: '#ff4444'} : {color: '#4CAF50'}]}>
              {isOutOfStock ? "Agotado" : `Disponibles: ${currentStock}`}
        </Text>

        <View style={styles.row}>
          <Text style={styles.cardPrice}>{Number(currentProduct.price).toLocaleString()} $ mxn</Text>

          {/* Botón de añadir (Flotante) */}
          <View style={{ position: "relative" }}>
            
            {isOutOfStock ? (
                <View style={[styles.addButton, {backgroundColor: '#eee'}]}>
                    <MaterialIcons name="block" size={24} color="#aaa" />
                </View>
            ) : (
                <TouchableOpacity
                style={styles.addButton}
                onPress={() => {
                    if (!isLoggedIn) {
                    showCustomAlert("Aviso", "Inicia sesión para poder comprar.");
                    return;
                    }
                    setBubbleVisible((v) => !v);
                }}
                >
                <MaterialIcons name={bubbleVisible ? "close" : "add"} size={24} color="#51575d" />
                </TouchableOpacity>
            )}

            {bubbleVisible && !isOutOfStock && (
              <TouchableWithoutFeedback>
                <View style={styles.addCard}>
                    <Text style={styles.addCardTitle}>Elige la cantidad deseada.</Text>
                    
                    <View style={styles.qtyRow}>
                        <TouchableOpacity 
                            style={styles.qtyCircle} 
                            onPress={() => setQuantity(q => (q > 1 ? q - 1 : 1))}
                        >
                            <MaterialIcons name="remove" size={22} color="#333" />
                        </TouchableOpacity>

                        <Text style={styles.qtyNumber}>{quantity}</Text>

                        <TouchableOpacity 
                            style={[styles.qtyCircle, quantity >= currentStock && { opacity: 0.3 }]}
                            onPress={() => setQuantity(q => q < currentStock ? q + 1 : q)}
                            disabled={quantity >= currentStock}
                        >
                            <MaterialIcons name="add" size={22} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.confirmFullBtn}
                        onPress={handleConfirmAddToCart}
                    >
                        <Text style={styles.confirmFullText}>Agregar al carrito</Text>
                    </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            )}
          </View>

          <TouchableOpacity
            style={styles.heartButtonSmall}
            onPress={() => {
              if (!isLoggedIn) {
                showCustomAlert("Aviso", "Inicia sesión para usar favoritos.");
                return;
              }
              if (!productId) return;
              toggleFavorite(productId);
            }}
          >
            <MaterialIcons
              name={favoriteActive ? "favorite" : "favorite-border"}
              size={24}
              color={favoriteActive ? "#f4061e" : "#0000009f"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Botones de acción secundaria (AR y Edición) */}
      <View style={styles.actionButtonsContainer}>
        {shouldShowARButton && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              isOwner
                ? { width: "45%", backgroundColor: "#fff" }
                : { width: "65%", backgroundColor: "#fff" }
            ]}
            onPress={() => navigation.navigate("PlantCamera", { product: currentProduct })}
          >
            <Text style={styles.actionButtonText}>Ver en mi espacio</Text>
          </TouchableOpacity>
        )}

        {isOwner && (
          <TouchableOpacity
            style={[
              styles.actionButton,
              styles.editButton,
              shouldShowARButton ? { width: "45%" } : { width: "65%" }
            ]}
            onPress={() => (navigation as any).navigate("AddProduct", { productToEdit: currentProduct })}
          >
            <Text style={[styles.actionButtonText, styles.editButtonText]}>Editar producto</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Descripción del producto */}
      <View style={styles.infoCard}>
        <Text style={[styles.infoText, isDefaultDescription && { color: "#c5c5c5ff" }]}>
          {descriptionText}
        </Text>
      </View>

      {/* Botón de eliminación (Solo dueño) */}
      {isOwner && (
        <TouchableOpacity
          style={[styles.deleteButton, deleting && { opacity: 0.7 }]}
          onPress={handleDeleteProduct}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialIcons name="delete-outline" size={24} color="#fff" />
              <Text style={styles.deleteButtonText}>Eliminar Producto</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

// ESTILOS DE PANTALLA
const styles = StyleSheet.create({
  container: {
    top: 2,
    flex: 1,
    backgroundColor: "#e9e5daff"
  },
  scrollContent: {
    padding: 24,
    paddingTop: 40
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    zIndex: 100
  },
  galleryHeader: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 1000,
    width: "100%",
    alignItems: "flex-end",
    paddingHorizontal: 20
  },
  closeGalleryButton: {
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 30
  },
  backButton: {
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    position: "absolute",
    left: 20,
    top: 40,
    zIndex: 50
  },
  favoritesTopButton: {
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    position: "absolute",
    right: 70, 
    top: 40,
    zIndex: 50
  },
  cartButton: {
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    position: "absolute",
    right: 20,
    top: 40,
    zIndex: 50
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    shadowColor: "#000",
    shadowOpacity: 0.13,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 5,
    alignSelf: "center",
    marginTop: 60,
    paddingBottom: 23,
    paddingTop: 10,
    paddingHorizontal: 20,
    position: "relative",
    overflow: "visible",
    width: "100%"
  },
  cardImage: {
    width: "100%",
    height: 280,
    borderRadius: 10,
    alignSelf: "center",
    marginBottom: 15,
    marginTop: 20,
    backgroundColor: "#f5f5f5"
  },
  cardName: {
    fontSize: 22,
    color: "#222",
    fontFamily: "KalamBold",
    textAlign: "center",
    marginBottom: 2,
    marginTop: 5
  },
  cardCategory: {
    fontSize: 16,
    color: "#888",
    fontFamily: "KalamBold",
    textAlign: "center",
    marginBottom: 5 
  },
  stockText: {
    fontSize: 14,
    fontFamily: "KalamBold",
    textAlign: "center",
    marginBottom: 10
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
    marginBottom: 1
  },
  cardPrice: {
    fontSize: 18,
    color: "#51575dff",
    fontFamily: "KalamBold",
    marginRight: 25,
    textAlign: "center",
    minWidth: 98,
    right: 6
  },
  addButton: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 3,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    left: 2,
    height: 48,
    width: 48,
    alignItems: "center",
    justifyContent: "center"
  },
  heartButtonSmall: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 3,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    left: 20,
    height: 48,
    width: 48,
    alignItems: "center",
    justifyContent: "center"
  },
  addCard: {
    position: "absolute",
    bottom: 60,
    right: -85, 
    width: 230, 
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 15,
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    zIndex: 200,
    alignItems: 'center'
  },
  addCardTitle: {
    fontFamily: "KalamBold",
    fontSize: 14,
    color: "#888",
    marginBottom: 10,
    alignSelf: 'flex-start',
    marginLeft: 5
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 15
  },
  qtyCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f2f2f2',
    justifyContent: 'center',
    alignItems: 'center'
  },
  qtyNumber: {
    fontSize: 22,
    fontFamily: "KalamBold",
    color: "#222"
  },
  confirmFullBtn: {
    backgroundColor: "#4CAF50",
    width: '100%',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center'
  },
  confirmFullText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "KalamBold"
  },
  actionButtonsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
    width: "100%",
    gap: 10
  },
  actionButton: {
    alignSelf: "center",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 12,
    elevation: 3,
    marginHorizontal: 5
  },
  actionButtonText: {
    color: "#050505ff",
    fontSize: 17.3,
    fontFamily: "KalamBold",
    textAlign: "center"
  },
  editButton: {
    backgroundColor: "#8dd7ffff"
  },
  editButtonText: {
    color: "#000"
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 19,
    paddingVertical: 22,
    paddingHorizontal: 17,
    marginTop: 18,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOpacity: 0.13,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 4,
    minWidth: 230,
    width: "100%",
    position: "relative"
  },
  infoText: {
    fontSize: 17,
    fontFamily: "KalamBold",
    color: "#222",
    textAlign: "center",
    lineHeight: 23.5,
    marginRight: 2
  },
  deleteButton: {
    flexDirection: "row",
    backgroundColor: "#ff4444",
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 20,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 25,
    width: "80%",
    alignSelf: "center",
    elevation: 3
  },
  deleteButtonText: {
    color: "#fff",
    fontFamily: "KalamBold",
    fontSize: 16,
    marginLeft: 8
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center"
  },
  alertContainer: {
    width: "80%",
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 15,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10
  },
  alertTitle: {
    fontSize: 20,
    color: "#502323ff",
    textAlign: "center",
    marginBottom: 10,
    fontFamily: "KalamBold"
  },
  alertMessage: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "KalamBold"
  },
  alertButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: 15,
    paddingHorizontal: 10
  },
  alertButton: {
    backgroundColor: "#48a24fff",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    minWidth: 130,
    alignItems: "center",
    marginHorizontal: 5
  },
  alertCancelButton: {
    backgroundColor: "#b2b2b2ff",
    left: -20
  },
  alertDestructiveButton: {
    backgroundColor: "#ff4444",
    left: -20
  },
  alertButtonText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    fontFamily: "KalamBold",
    fontWeight: "600"
  },
  alertCancelButtonText: {
    color: "#000"
  }
});

// EXPORTACIÓN
export default ProductDetailScreen;
