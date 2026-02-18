// IMPORTACIONES
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../navigation/StackNavigator";
import { COLORS, FONT_SIZES } from "../../../types/index";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import app from "../../firebaseConfig";
import { MaterialIcons } from "@expo/vector-icons";

// DEFINICIÓN DE TIPOS E INTERFACES
// Se definen las props para la navegación y el formulario de recuperación.
interface CustomAlertProps {
  title: string;
  message: string;
  visible: boolean;
  onClose: () => void;
}

type ResetPasswordScreenNavigationProp = StackNavigationProp<RootStackParamList, keyof RootStackParamList>;

interface ResetPasswordScreenProps { 
    navigation: ResetPasswordScreenNavigationProp; 
}

interface FormData {
  email: string;
}

// COMPONENTES AUXILIARES
// Componente modal para mostrar alertas personalizadas.
const CustomAlert: React.FC<CustomAlertProps> = ({ title, message, visible, onClose }) => (
  <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
    <Pressable style={customStyles.alertOverlay} onPress={onClose}>
      <Pressable style={customStyles.alertContainer} onPress={(e) => e.stopPropagation()}>
        <Text style={customStyles.alertTitle}>{title}</Text>
        <Text style={customStyles.alertMessage}>{message}</Text>
        <TouchableOpacity style={customStyles.alertButton} onPress={onClose}>
          <Text style={customStyles.alertButtonText}>Cerrar</Text>
        </TouchableOpacity>
      </Pressable>
    </Pressable>
  </Modal>
);

// COMPONENTE PRINCIPAL DE RECUPERACIÓN
const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ navigation }) => {
  
  // ESTADO DEL COMPONENTE
  // Se maneja el correo ingresado, el estado de carga y la visibilidad de alertas.
  const [formData, setFormData] = useState<FormData>({
    email: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [customAlert, setCustomAlert] = useState({
    visible: false,
    title: "",
    message: "",
  });

  // GESTIÓN DE ALERTAS
  const showCustomAlert = (title: string, message: string) =>
    setCustomAlert({ visible: true, title, message });
    
  const closeCustomAlert = () => setCustomAlert({ ...customAlert, visible: false });

  // MANEJO DE FORMULARIO
  const updateFormData = (field: keyof FormData, value: string) =>
    setFormData((prevData) => ({ ...prevData, [field]: value }));

  // LÓGICA DE RECUPERACIÓN
  // Se valida el correo y se envía la solicitud de restablecimiento a Firebase.
  const handleResetPassword = async () => {
    if (!formData.email.trim()) {
      showCustomAlert("Recuperar contraseña", "Por favor, ingresa tu correo electrónico.");
      return;
    }
    if (!formData.email.includes("@") || !formData.email.includes(".")) {
      showCustomAlert("Recuperar contraseña", "Correo electrónico no válido.");
      return;
    }
    setIsLoading(true);
    try {
      const auth = getAuth(app);
      await sendPasswordResetEmail(auth, formData.email.trim());
      setIsLoading(false);
      showCustomAlert(
        "Correo enviado",
        "Revisa tu bandeja de entrada, recibirás un enlace para restablecer tu contraseña. Si no lo ves, revisa la bandeja de spam."
      );
    } catch (error: any) {
      setIsLoading(false);
      let msg = "No se pudo enviar el correo. Inténtalo más tarde.";
      if (error.code === "auth/user-not-found") {
        msg = "No existe una cuenta con ese correo.";
      }
      showCustomAlert("Recuperar contraseña", msg);
    }
  };

  // RENDERIZADO VISUAL
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.replace("Home")}
      >
        <MaterialIcons name="close" size={32} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <CustomAlert
        title={customAlert.title}
        message={customAlert.message}
        visible={customAlert.visible}
        onClose={closeCustomAlert}
      />

      <View style={styles.content}>
        <Image
          source={require("../../../assets/login_image.png")}
          style={styles.loginImage}
        />
        <Text style={styles.title}>J o s s  L i f e</Text>
        <Text style={styles.subtitle}>Restablece tu contraseña</Text>
        
        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholderTextColor={COLORS.textSecondary}
            value={formData.email}
            onChangeText={(text) => updateFormData("email", text)}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
            placeholder="Correo electrónico"
            keyboardType="email-address"
          />

          <TouchableOpacity
            style={[styles.loginButton, { opacity: isLoading ? 0.6 : 1 }]}
            onPress={handleResetPassword}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? "Enviando..." : "Restablecer contraseña"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.linksContainer}>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>Volver a iniciar sesión</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

// ESTILOS DE PANTALLA
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EDE8E6",
  },
  closeButton: {
    position: "absolute",
    right: 14,
    top: 48,
    zIndex: 2,
    padding: 8,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  loginImage: {
    width: 170,
    height: 170,
    marginBottom: 20,
    borderRadius: 70,
  },
  title: {
    fontSize: 32,
    fontWeight: "400",
    color: "#3d7842ff",
    textAlign: "center",
    marginBottom: 8,
    fontFamily: "Pacifico",
  },
  subtitle: {
    fontSize: FONT_SIZES.large,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "Pacifico",
  },
  formContainer: {
    width: "100%",
    maxWidth: 300,
  },
  input: {
    height: 50,
    borderColor: COLORS.textSecondary,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: FONT_SIZES.medium,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    fontFamily: "KalamBold",
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    height: 50,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    elevation: 2,
    shadowColor: COLORS.text,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loginButtonText: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.medium,
    fontFamily: "Pacifico",
  },
  linksContainer: {
    marginTop: 30,
    alignItems: "center",
    gap: 15,
  },
  link: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZES.medium,
    textDecorationLine: "underline",
    fontFamily: "Pacifico",
  },
});

// ESTILOS DE ALERTAS
const customStyles = StyleSheet.create({
  alertOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  alertContainer: {
    width: '80%',
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
    textAlign: 'center',
    marginBottom: 10,
    fontFamily: "Pacifico",
  },
  alertMessage: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: "KalamBold",
  },
  alertButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 34,
    alignSelf: 'stretch',
  },
  alertButtonText: {
    color: COLORS.surface,
    fontSize: FONT_SIZES.medium,
    textAlign: 'center',
    fontFamily: "KalamBold",
  },
});

// EXPORTACIÓN
export default ResetPasswordScreen;
