import { StackScreenProps } from '@react-navigation/stack';

// ==========================================
// TEMA DE LA APLICACIÓN (NUEVO DISEÑO FIGMA)
// ==========================================

export const COLORS = {
  primary: "#519b57ff",   // Verde fuerte
  background: "#F5F5F5", // Gris claro de fondo
  surface: "#FFFFFF",    // Blanco para tarjetas
  text: "#333333",       // Texto principal
  textSecondary: "#65707aff", // Texto gris
  border: "#E0E0E0",
  error: "#dc3545",
};

export const FONT_SIZES = {
  small: 14,
  medium: 16,
  large: 20,
  xlarge: 28,
};

export const FONTS = {
  script: 'FontScript', 
  sansRegular: 'FontSansRegular', 
  sansBold: 'FontSansBold', 
};

// ==========================================
// TIPOS PARA NAVEGACIÓN
// ==========================================

export type RootStackParamList = {
    Login: undefined;
    Home: undefined;
    ProductDetail: { productId: string }; // Pantalla de detalle
};

// ==========================================
// PROPS PARA PANTALLAS
// ==========================================

export type LoginScreenProps = StackScreenProps<RootStackParamList, 'Login'>;
export type HomeScreenProps = StackScreenProps<RootStackParamList, 'Home'>;
export type ProductDetailScreenProps = StackScreenProps<RootStackParamList, 'ProductDetail'>;