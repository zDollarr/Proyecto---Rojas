// IMPORTACIONES
import React, { useEffect } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Text } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/StackNavigator';
import { MaterialIcons } from "@expo/vector-icons";

// DEFINICIÓN DE TIPOS
// Se especifican las props que recibe esta pantalla desde la navegación.
type Props = StackScreenProps<RootStackParamList, "PlantCamera">;

// COMPONENTE PRINCIPAL
// Pantalla que muestra la cámara activa con una superposición de la imagen del producto para visualizarla en el entorno real (Realidad Aumentada simple).
const PlantOverlayCamera: React.FC<Props> = ({ navigation, route }) => {
  
  // OBTENCIÓN DE DATOS
  // Se recupera el producto enviado a través de los parámetros de la ruta.
  const { product } = route.params || {}; 
  
  // GESTIÓN DE PERMISOS
  // Hook de Expo para verificar y solicitar acceso a la cámara del dispositivo.
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  // CONFIGURACIÓN DE IMAGEN
  // Se determina qué imagen mostrar en la superposición (la del producto o una por defecto).
  const imageSource = product?.image 
    ? { uri: product.image } 
    : require('../../../assets/planta.png');

  // MANEJO DE ESTADOS DE PERMISO
  // Se muestra una vista vacía mientras carga o una pantalla de solicitud si el permiso fue denegado.
  if (!permission) return <View />;
  
  if (!permission.granted)
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>No hay acceso a la cámara</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
            <Text style={styles.permissionButtonText}>Dar Permiso</Text>
        </TouchableOpacity>
      </View>
    );

  // RENDERIZADO VISUAL
  return (
    <View style={{ flex: 1 }}>
      <CameraView style={{ flex: 1 }} facing="back" />
      
      <Image
        source={imageSource}
        style={styles.overlay}
        resizeMode="contain"
      />

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <MaterialIcons name="arrow-back" size={24} color="#222" />
      </TouchableOpacity>
    </View>
  );
};

// ESTILOS DE PANTALLA
const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: '50%',
    top: '40%',
    marginLeft: -150,
    marginTop: -125,
    width: 300,
    height: 300,
    opacity: 0.7,
    zIndex: 10,
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 50,
    zIndex: 50,
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 24,
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
  },
  permissionContainer: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  permissionText: {
    fontSize: 18,
    marginBottom: 20,
    fontFamily: 'KalamBold'
  },
  permissionButton: {
    backgroundColor: '#48a24fff',
    padding: 10,
    borderRadius: 10
  },
  permissionButtonText: {
    color: 'white',
    fontFamily: 'KalamBold'
  }
});

// EXPORTACIÓN
export default PlantOverlayCamera;
