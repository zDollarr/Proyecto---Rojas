// IMPORTACIONES
import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  FlatList, 
  Image, 
  Modal, 
  Pressable, 
  ActivityIndicator 
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../../navigation/StackNavigator";
import { COLORS, FONT_SIZES } from "../../types";
import { doc, getDoc, runTransaction } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useCart, CartItem } from "../../context/CartContext";

// DEFINICIÓN DE TIPOS
type Props = StackScreenProps<RootStackParamList, "Cart">;

// COMPONENTE PRINCIPAL (CARRITO DE COMPRAS)
// Gestiona la visualización del carrito, la sincronización de stock con Firebase y el proceso de compra.
const CartScreen: React.FC<Props> = ({ navigation }) => {
  
  // HOOKS DE CONTEXTO
  const { cart, removeFromCart, updateQuantity, total, clearCart, refreshCart } = useCart();
  
  // ESTADOS DE INTERFAZ
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); 

  // ESTADO DE ALERTAS
  const [customAlert, setCustomAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons?: { text: string; onPress: () => void; style?: "cancel" | "destructive" }[];
  }>({ visible: false, title: "", message: "" });

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

  // SINCRONIZACIÓN DE INVENTARIO
  // Verifica el stock y precios actuales en Firebase al abrir el carrito para asegurar la consistencia de datos.
  useEffect(() => {
    const syncCartWithFirebase = async () => {
      if (cart.length === 0) return;
      
      setIsRefreshing(true);
      let changesDetected = false;
      const updatedCartItems: CartItem[] = [];

      try {
        for (const item of cart) {
          const productRef = doc(db, "products", item.product.id);
          const productSnap = await getDoc(productRef);

          if (productSnap.exists()) {
            const freshData = productSnap.data();
            const freshProduct = { id: productSnap.id, ...freshData } as any;

            const currentStock = (item.product as any).stock ?? 0;
            const freshStock = freshProduct.stock ?? 0;

            if (freshProduct.price !== item.product.price || 
                freshProduct.name !== item.product.name ||
                freshStock !== currentStock) {
              
              changesDetected = true;
              updatedCartItems.push({
                product: freshProduct,
                // Ajuste automático de cantidad si el stock es menor a lo solicitado
                quantity: item.quantity > freshStock ? freshStock : item.quantity
              });
            } else {
              updatedCartItems.push(item);
            }
          } else {
            // El producto fue eliminado de la base de datos
            changesDetected = true; 
          }
        }

        if (changesDetected) {
           refreshCart(updatedCartItems);
           showCustomAlert(
            "Inventario Actualizado", 
            "La disponibilidad o precios de algunos productos han cambiado.",
            [{ text: "Entendido", onPress: closeCustomAlert }]
           );
        }

      } catch (error) {
        console.error("Error sincronizando carrito:", error);
      } finally {
        setIsRefreshing(false);
      }
    };

    syncCartWithFirebase();
  }, []); 

  // PROCESO DE COMPRA (TRANSACCIONES)
  // Ejecuta una transacción atómica en Firestore para descontar stock de manera segura.
  const handleCheckout = async () => {
    if (cart.length === 0) return;

    setIsProcessing(true);

    try {
      await runTransaction(db, async (transaction) => {
        const updates = [];

        // Fase de Lectura: Verifica existencia y stock suficiente para todos los items
        for (const item of cart) {
            const productRef = doc(db, "products", item.product.id);
            const productDoc = await transaction.get(productRef);

            if (!productDoc.exists()) {
                throw new Error(`El producto "${item.product.name}" ya no existe.`);
            }

            const currentStock = productDoc.data().stock || 0; 
            
            if (currentStock < item.quantity) {
                throw new Error(`No hay suficiente stock de "${item.product.name}". Disponibles: ${currentStock}`);
            }

            const newStock = currentStock - item.quantity;
            updates.push({ ref: productRef, newStock });
        }

        // Fase de Escritura: Aplica los cambios si todas las lecturas fueron exitosas
        for (const update of updates) {
            transaction.update(update.ref, { stock: update.newStock });
        }
      });

      setIsProcessing(false);
      showCustomAlert("¡Pedido Exitoso!", "Tu compra ha sido procesada.", [
        { 
          text: "Genial", 
          onPress: () => {
            clearCart();
            closeCustomAlert();
            navigation.navigate("Home" as any);
          } 
        }
      ]);

    } catch (e: any) {
      setIsProcessing(false);
      console.error("Error en checkout:", e);
      showCustomAlert("Error en la compra", e.message || "Ocurrió un problema al procesar el pedido.", [
          { text: "Entendido", onPress: closeCustomAlert }
      ]);
    }
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

  // RENDERIZADO DE ITEM
  const renderItem = ({ item }: { item: CartItem }) => {
    const imageSource = item.product.image 
        ? { uri: item.product.image } 
        : require("../../../assets/planta.png");

    const itemSubtotal = item.product.price * item.quantity;
    const stock = (item.product as any).stock !== undefined ? (item.product as any).stock : 0;
    const isMaxReached = item.quantity >= stock;

    return (
      <View style={styles.cartItem}>
        <Image source={imageSource} style={styles.productImage} />
        
        <View style={styles.itemInfo}>
            <Text style={styles.itemTitle} numberOfLines={1}>{item.product.name}</Text>
            <Text style={styles.itemPrice}>${item.product.price} mxn c/u</Text>
            
            <Text style={{
                fontSize: 12, 
                fontFamily: 'KalamBold', 
                color: stock > 0 ? '#4CAF50' : '#ff4444',
                marginBottom: 5
            }}>
                {stock > 0 ? `Disponibles: ${stock}` : "Agotado"}
            </Text>

            <View style={styles.controlsRow}>
                <TouchableOpacity 
                    style={styles.controlBtn} 
                    onPress={() => updateQuantity(item.product.id, 'decrease')}
                >
                    <MaterialIcons name="remove" size={18} color={COLORS.text} />
                </TouchableOpacity>
                
                <Text style={styles.qtyText}>{item.quantity}</Text>
                
                <TouchableOpacity 
                    style={[styles.controlBtn, isMaxReached && { opacity: 0.3, backgroundColor: '#ddd' }]} 
                    onPress={() => !isMaxReached && updateQuantity(item.product.id, 'increase')}
                    disabled={isMaxReached}
                >
                    <MaterialIcons name="add" size={18} color={COLORS.text} />
                </TouchableOpacity>
            </View>
        </View>

        <View style={styles.rightColumn}>
            <Text style={styles.subtotalText}>${itemSubtotal} mxn</Text>
            <TouchableOpacity onPress={() => removeFromCart(item.product.id)}>
                <MaterialIcons name="delete-outline" size={24} color="#ff4444" />
            </TouchableOpacity>
        </View>
      </View>
    );
  };

  // RENDERIZADO PRINCIPAL
  return (
    <SafeAreaView style={styles.container}>
      <CustomAlert />
      
      {isProcessing && (
        <View style={styles.loadingOverlay}>
            <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Procesando compra...</Text>
            </View>
        </View>
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>

        <Text style={styles.title}>Carrito</Text>

        <TouchableOpacity style={styles.iconButton} onPress={clearCart}>
            <MaterialIcons name="remove-shopping-cart" size={20} color="#ff4444" />
        </TouchableOpacity>
      </View>

      {isRefreshing && (
          <View style={{padding: 5, alignItems: 'center'}}>
              <Text style={{fontFamily:'KalamBold', color:'#888', fontSize: 12}}>Sincronizando inventario...</Text>
          </View>
      )}

      {cart.length === 0 ? (
        <View style={styles.content}>
          <MaterialIcons name="shopping-cart" size={52} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>Tu carrito está vacío</Text>
          <Text style={styles.emptyText}>Agrega productos desde el catálogo.</Text>

          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryBtnText}>Volver al catálogo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
            <FlatList
                data={cart}
                keyExtractor={(item) => item.product.id}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            />
            
            <View style={styles.footer}>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Total a pagar:</Text>
                    <Text style={styles.totalAmount}>${total.toLocaleString()} mxn</Text>
                </View>
                <TouchableOpacity 
                    style={[styles.checkoutBtn, isProcessing && { opacity: 0.7 }]} 
                    onPress={handleCheckout}
                    disabled={isProcessing}
                >
                    <Text style={styles.checkoutBtnText}>
                        {isProcessing ? "Procesando..." : "Confirmar Compra"}
                    </Text>
                </TouchableOpacity>
            </View>
        </>
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
    marginBottom: 20
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2
  },
  title: {
    fontSize: FONT_SIZES.large, 
    color: COLORS.text,
    fontFamily: "Pacifico",
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
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 30,
  },
  primaryBtnText: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.medium,
    fontFamily: "KalamBold",
  },
  cartItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }
  },
  productImage: {
    width: 65,
    height: 65,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: "#f5f5f5"
  },
  itemInfo: {
    flex: 1,
    justifyContent: "center"
  },
  itemTitle: {
    fontSize: 16,
    fontFamily: "KalamBold",
    color: COLORS.text,
    marginBottom: 4
  },
  itemPrice: {
    fontSize: 14,
    fontFamily: "KalamBold",
    color: "#444", 
    marginBottom: 6
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  controlBtn: {
    backgroundColor: "#eee",
    borderRadius: 8,
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center"
  },
  qtyText: {
    marginHorizontal: 10,
    fontSize: 16,
    fontFamily: "KalamBold"
  },
  rightColumn: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 65
  },
  subtotalText: {
    fontSize: 16,
    fontFamily: "KalamBold",
    color: "#444",
    marginBottom: 5
  },
  footer: {
    backgroundColor: COLORS.surface,
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    alignItems: "center"
  },
  totalLabel: {
    fontSize: 18,
    fontFamily: "KalamBold",
    color: COLORS.text
  },
  totalAmount: {
    fontSize: 22,
    fontFamily: "KalamBold",
    color: "#333" 
  },
  checkoutBtn: {
    backgroundColor: "#4CAF50",
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center"
  },
  checkoutBtnText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: "KalamBold"
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999
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
  },
  loadingOverlay: {
      position: 'absolute',
      top: 0, bottom: 0, left: 0, right: 0,
      backgroundColor: 'rgba(255,255,255,0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
  },
  loadingBox: {
      backgroundColor: '#fff',
      padding: 20,
      borderRadius: 15,
      elevation: 5,
      alignItems: 'center',
      gap: 10
  },
  loadingText: {
      fontFamily: 'KalamBold',
      fontSize: 16,
      color: COLORS.text
  }
});

// EXPORTACIÓN
export default CartScreen;
