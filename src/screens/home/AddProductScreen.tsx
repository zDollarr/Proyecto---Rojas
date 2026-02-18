// IMPORTACIONES
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Modal,
  Pressable,
  FlatList,
  BackHandler
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebaseConfig'; 
import { COLORS, FONT_SIZES } from '../../types';
import { RootStackParamList } from '../../navigation/StackNavigator';

// CONSTANTES Y TIPOS
// Se definen las categorías disponibles y las interfaces para los productos y los parámetros de navegación.
const CATEGORIES = [
  "Planta",
  "Maceta",
  "Fertilizante",
  "Herramienta",
  "Semillas",
  "Decoración",
  "Otros"
];

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  image?: string;
  stock?: number; 
}

type AddProductParams = {
  AddProduct: {
    productToEdit?: Product;
  };
};

type AddProductRouteProp = RouteProp<AddProductParams, 'AddProduct'>;

// COMPONENTE PRINCIPAL
// Pantalla encargada de crear nuevos productos o editar los existentes.
const AddProductScreen = () => {
  
  // HOOKS DE NAVEGACIÓN
  const navigation = useNavigation();
  const route = useRoute<AddProductRouteProp>();
  
  const productToEdit = route.params?.productToEdit;
  const isEditing = !!productToEdit;

  // ESTADO DEL FORMULARIO
  // Se inicializan los estados locales para cada campo del producto y el control de la interfaz.
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState(''); 
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalCategoriesVisible, setModalCategoriesVisible] = useState(false);

  // ESTADO DE ALERTAS
  const [customAlert, setCustomAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons?: { text: string; onPress: () => void; style?: 'cancel' | 'destructive' }[];
  }>({ visible: false, title: '', message: '' });

  // CARGA DE DATOS INICIAL
  // Si se recibe un producto para editar, se rellenan los campos con su información.
  useEffect(() => {
    if (isEditing && productToEdit) {
        setName(productToEdit.name);
        setPrice(String(productToEdit.price)); 
        setStock(productToEdit.stock !== undefined ? String(productToEdit.stock) : '0');
        setCategory(productToEdit.category);
        setDescription(productToEdit.description || '');
        setImageUri(productToEdit.image || null);
        
        navigation.setOptions({ title: 'Editar Producto' });
    }
  }, [isEditing, productToEdit]);

  // GESTIÓN DE ALERTAS PERSONALIZADAS
  const showCustomAlert = (
    title: string,
    message: string,
    buttons?: { text: string; onPress: () => void; style?: 'cancel' | 'destructive' }[]
  ) => {
    setCustomAlert({ visible: true, title, message, buttons });
  };

  const closeCustomAlert = () => {
    setCustomAlert({ ...customAlert, visible: false, buttons: [] });
  };

  // PROTECCIÓN DE NAVEGACIÓN
  // Se verifica si hay cambios sin guardar antes de permitir que el usuario salga de la pantalla.
  const hasUnsavedChanges = () => {
    if (isEditing && productToEdit) {
        return (
            name !== productToEdit.name ||
            price !== String(productToEdit.price) ||
            stock !== String(productToEdit.stock || 0) || 
            category !== productToEdit.category ||
            description !== (productToEdit.description || '') ||
            imageUri !== (productToEdit.image || null)
        );
    } else {
        return (
            name.trim() !== '' || 
            price.trim() !== '' || 
            stock.trim() !== '' ||
            category !== '' || 
            imageUri !== null
        );
    }
  };

  const handleBackPress = () => {
    if (hasUnsavedChanges()) {
        showCustomAlert(
            "¿Descartar cambios?",
            "Si sales ahora, perderás la información que has ingresado.",
            [
                { text: "Seguir editando", style: 'cancel', onPress: closeCustomAlert },
                { 
                    text: "Salir", 
                    style: 'destructive', 
                    onPress: () => {
                        closeCustomAlert();
                        navigation.goBack();
                    } 
                }
            ]
        );
        return true;
    } else {
        navigation.goBack();
        return true;
    }
  };

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      handleBackPress
    );
    return () => backHandler.remove();
  }, [name, price, stock, category, description, imageUri]);

  // COMPONENTE VISUAL DE ALERTA
  const CustomAlert: React.FC = () => {
    const alertButtons = customAlert.buttons && customAlert.buttons.length > 0
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
                    button.style === 'cancel' && styles.alertCancelButton,
                    button.style === 'destructive' && styles.alertDestructiveButton
                  ]}
                  onPress={button.onPress}
                >
                  <Text
                    style={[
                      styles.alertButtonText,
                      button.style === 'cancel' && styles.alertCancelButtonText,
                      button.style === 'destructive' && { color: '#fff' }
                    ]}>
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

  // GESTIÓN DE IMÁGENES
  // Funciones para seleccionar imágenes desde la cámara o la galería del dispositivo.
  const handleCamera = async () => {
    closeCustomAlert(); 
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      setTimeout(() => {
          showCustomAlert("Permiso requerido", "Necesitas dar permiso para usar la cámara.");
      }, 500);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.5,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const handleGallery = async () => {
    closeCustomAlert();
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      setTimeout(() => {
        showCustomAlert("Permiso requerido", "Necesitas dar permiso para acceder a la galería.");
      }, 500);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.5, 
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const pickImage = () => {
    showCustomAlert(
      "Subir Foto",
      "¿Desde dónde quieres agregar la imagen?",
      [
        { text: "Cámara", onPress: handleCamera },
        { text: "Galería", onPress: handleGallery },
      ]
    );
  };

  // GUARDADO DE DATOS
  // Se validan los campos obligatorios y se envía la información a Firestore (creación o actualización).
  const handleSave = async () => {
    if (!name || !price) {
      showCustomAlert("Faltan datos", "Por favor completa nombre y precio.");
      return;
    }

    setLoading(true);

    const finalCategory = category || "Otros";
    const productData = {
        name: name,
        price: parseFloat(price),
        stock: parseInt(stock) || 0,
        category: finalCategory, 
        description: description || '',
        image: imageUri || '',
    };
    
    try {
      if (isEditing && productToEdit) {
        const productRef = doc(db, "products", productToEdit.id);
        
        updateDoc(productRef, productData)
            .catch(e => console.log("Sincronización pendiente:", e));

        setLoading(false); 
        showCustomAlert(
            "¡Actualizado!", 
            "Los cambios se han guardado correctamente.",
            [{ 
               text: "OK", 
               onPress: () => {
                 closeCustomAlert();
                 navigation.goBack();
               } 
            }]
          );

      } else {
        const newProduct = { ...productData, createdAt: new Date() };
        
        addDoc(collection(db, "products"), newProduct)
            .catch(e => console.log("Sincronización pendiente:", e));

        setLoading(false);
        showCustomAlert(
            "¡Éxito!", 
            "Producto agregado correctamente.",
            [{ 
               text: "Genial", 
               onPress: () => {
                 closeCustomAlert();
                 setName(''); 
                 setPrice('');
                 setStock('');
                 navigation.goBack();
               } 
            }]
          );
      }

    } catch (error) {
      console.error("Error al iniciar guardado:", error);
      setLoading(false);
      showCustomAlert("Error", "Ocurrió un problema inesperado.");
    }
  };

  // RENDERIZADO VISUAL
  return (
    <SafeAreaView style={styles.container}>
        <CustomAlert />

        {/* Modal de selección de categorías */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalCategoriesVisible}
          onRequestClose={() => setModalCategoriesVisible(false)}
        >
          <Pressable 
            style={styles.modalOverlay} 
            onPress={() => setModalCategoriesVisible(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Elige una categoría</Text>
              
              <TouchableOpacity
                style={[styles.categoryOption, { marginBottom: 5 }]}
                onPress={() => {
                  setCategory(''); 
                  setModalCategoriesVisible(false);
                }}
              >
                <Text style={[styles.categoryOptionText, { color: '#ff4444' }]}>
                  Ninguna / Limpiar
                </Text>
                <MaterialIcons name="close" size={20} color="#ff4444" />
              </TouchableOpacity>

              <FlatList
                data={CATEGORIES}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.categoryOption}
                    onPress={() => {
                      setCategory(item);
                      setModalCategoriesVisible(false);
                    }}
                  >
                    <Text style={styles.categoryOptionText}>{item}</Text>
                    {category === item && (
                      <MaterialIcons name="check" size={20} color="#48a24fff" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </Pressable>
        </Modal>

        {/* Formulario principal */}
        <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        >
        <View style={styles.figmaHeaderContainer}>
            <TouchableOpacity 
                style={styles.figmaBackButton} 
                onPress={handleBackPress} 
            >
                <MaterialIcons name="arrow-back" size={22} color={COLORS.text} />
            </TouchableOpacity>
            
            <Text style={styles.figmaHeaderTitle}>
                {isEditing ? "Editar Producto" : "Nuevo Producto"}
            </Text>
            
            <View style={{ width: 40 }} /> 
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            <Text style={styles.sectionTitle}>Foto del producto</Text>
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.8}>
            {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
            ) : (
                <View style={styles.placeholderContainer}>
                <MaterialIcons name="add-a-photo" size={45} color={COLORS.textSecondary} />
                <Text style={styles.placeholderText}>Toca para elegir</Text>
                </View>
            )}
            </TouchableOpacity>

            <View style={styles.formContainer}>
                <Text style={styles.label}>Nombre</Text>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Nombre del producto . . ."
                        placeholderTextColor="#00000040"
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                <View style={{flexDirection: 'row', gap: 10}}>
                    {/* Campo de Precio */}
                    <View style={{flex: 1}}>
                        <Text style={styles.label}>Precio</Text>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="$ mxn"
                                placeholderTextColor="#00000040"
                                value={price}
                                onChangeText={setPrice}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    {/* Campo de Stock */}
                    <View style={{flex: 1}}>
                        <Text style={styles.label}>Stock</Text>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Cant."
                                placeholderTextColor="#00000040"
                                value={stock}
                                onChangeText={setStock}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>
                </View>

                <Text style={styles.label}>Categoría</Text>
                <TouchableOpacity 
                  style={styles.inputContainer}
                  onPress={() => setModalCategoriesVisible(true)}
                  activeOpacity={0.8}
                >
                    <Text style={[styles.input, !category && { color: "#00000040" }]}>
                      {category || "Por defecto: Otros"}
                    </Text>
                    <MaterialIcons 
                      name="arrow-drop-down" 
                      size={24} 
                      color={COLORS.textSecondary} 
                      style={{ position: 'absolute', right: 15, top: 15 }}
                    />
                </TouchableOpacity>

                <Text style={styles.label}>Descripción</Text>
                <View style={[styles.inputContainer, styles.textAreaContainer]}>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Opcional . . ."
                        placeholderTextColor="#00000040"
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                    />
                </View>
            </View>

            <TouchableOpacity 
                style={[styles.saveButton, loading && styles.disabledButton]} 
                onPress={handleSave}
                disabled={loading}
                activeOpacity={0.8}
            >
            {loading ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <Text style={styles.saveButtonText}>
                    {isEditing ? "Guardar Cambios" : "Publicar Producto"}
                </Text>
            )}
            </TouchableOpacity>

        </ScrollView>
        </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ESTILOS DE PANTALLA
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  figmaHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  figmaBackButton: {
    backgroundColor: COLORS.surface,
    top: 10,
    padding: 8,
    borderRadius: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    marginTop: 25,
  },
  figmaHeaderTitle: {
    fontSize: 24,
    color: COLORS.text,
    top: 15,
    marginTop: 20,
    fontFamily: "KalamBold",
    textAlign: "center",
  },
  scrollContent: {
    paddingHorizontal: 25,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    color: COLORS.text,
    fontFamily: "KalamBold",
    marginBottom: 10,
    marginLeft: 5,
  },
  imagePicker: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    marginBottom: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
    opacity: 0.97
  },
  placeholderContainer: {
    alignItems: 'center',
    opacity: 0.7,
  },
  placeholderText: {
    color: COLORS.textSecondary,
    marginTop: 8,
    fontFamily: "KalamBold",
    fontSize: 16,
  },
  formContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 6,
    marginLeft: 10,
    fontFamily: "KalamBold",
  },
  inputContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    marginBottom: 18,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    justifyContent: 'center'
  },
  input: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
    fontFamily: "KalamBold",
  },
  textAreaContainer: {
    borderRadius: 20,
    paddingVertical: 5,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
    fontFamily: "KalamBold",
  },
  saveButton: {
    backgroundColor: '#48a24fff',
    paddingVertical: 10,
    borderRadius: 25,
    marginTop: 10,
    alignItems: 'center',
    elevation: 5,
    shadowColor: "#05050585",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    marginBottom: 30,
  },
  disabledButton: {
    backgroundColor: '#a5d6a7',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 20,
    fontFamily: "KalamBold",
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
    color: COLORS.error || '#f4061eff',
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
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 15,
    paddingHorizontal: 5,
  },
  alertButton: {
    backgroundColor: '#48a24fff',
    left: -15,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 20,
    minWidth: 130,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  alertCancelButton: {
    backgroundColor: '#888888',
  },
  alertDestructiveButton: {
    backgroundColor: '#ff4444',
  },
  alertButtonText: {
    color: '#fff',
    fontSize: 15,
    textAlign: "center",
    fontFamily: "KalamBold",
    fontWeight: '600',
  },
  alertCancelButtonText: {
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    maxHeight: '50%',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'KalamBold',
    marginBottom: 15,
    textAlign: 'center',
    color: COLORS.text,
  },
  categoryOption: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryOptionText: {
    fontSize: 16,
    fontFamily: 'KalamBold',
    color: COLORS.text,
  },
});

// EXPORTACIÓN
export default AddProductScreen;
