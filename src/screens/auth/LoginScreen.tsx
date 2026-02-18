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
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import app from "../../firebaseConfig";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { MaterialIcons } from "@expo/vector-icons";

// DEFINICIÓN DE TIPOS E INTERFACES
// Se definen las props para la navegación, el formulario y las alertas personalizadas.
interface CustomAlertProps {
  title: string;
  message: string;
  visible: boolean;
  onClose: () => void;
}

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, "Login">;

interface LoginFormData {
  email: string;
  password: string;
}

interface LoginScreenProps {
  navigation: LoginScreenNavigationProp;
}

// RECURSOS ESTÁTICOS
const loginImage = require("../../../assets/login_image.png");

// COMPONENTES AUXILIARES
// Componente modal para mostrar alertas personalizadas en lugar de las nativas.
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

// COMPONENTE PRINCIPAL DE INICIO DE SESIÓN
const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  
  // ESTADO DEL COMPONENTE
  // Gestión de datos del formulario, carga, visibilidad de contraseña y alertas.
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState(false);
  const [customAlert, setCustomAlert] = useState({
    visible: false,
    title: "",
    message: "",
  });

  // GESTIÓN DE ALERTAS
  const showCustomAlert = (title: string, message: string): void => {
    setCustomAlert({ visible: true, title, message });
  };

  const closeCustomAlert = (): void => {
    setCustomAlert({ ...customAlert, visible: false });
  };

  // MANEJO DE FORMULARIO
  const updateFormData = (field: keyof LoginFormData, value: string): void => {
    setFormData((prevData: LoginFormData) => ({
      ...prevData,
      [field]: value,
    }));
  };

  // VALIDACIÓN DE DATOS
  // Se verifica que los campos no estén vacíos y cumplan requisitos mínimos antes de enviar.
  const validateForm = (): boolean => {
    if (!formData.email.trim()) {
      showCustomAlert("E R R O R", "Por favor, ingresa tu usuario o correo electrónico.");
      return false;
    }
    if (!formData.password.trim()) {
      showCustomAlert("E R R O R", "Por favor, ingresa una contraseña.");
      return false;
    }
    if (formData.password.length < 3) {
      showCustomAlert("E R R O R", "La contraseña debe tener al menos 3 caracteres");
      return false;
    }
    return true;
  };

  // LÓGICA DE AUTENTICACIÓN
  // Maneja el inicio de sesión. Si el input no es un correo, busca el nombre de usuario en Firestore primero.
  const handleLogin = async () => {
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      let emailToLogin = formData.email.trim();
      
      if (!emailToLogin.includes("@")) {
        const db = getFirestore(app);
        const usersCol = collection(db, "users");
        const q = query(usersCol, where("username", "==", emailToLogin));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setIsLoading(false);
          showCustomAlert("E R R O R", "No existe una cuenta con ese nombre de usuario.");
          return;
        }
        emailToLogin = querySnapshot.docs[0].data().email;
      }

      const auth = getAuth(app);
      await signInWithEmailAndPassword(auth, emailToLogin, formData.password);

      setIsLoading(false);
      navigation.replace("Home");
    } catch (error: any) {
      setIsLoading(false);

      let errorMsg = "Ocurrió un error. Intenta de nuevo.";
      if (error.code === "auth/user-not-found") {
        errorMsg = "No existe una cuenta con esos datos.";
      } else if (error.code === "auth/wrong-password") {
        errorMsg = "La contraseña es incorrecta.";
      } else if (error.code === "auth/too-many-requests") {
        errorMsg = "Demasiados intentos fallidos. Intenta más tarde.";
      } else if (error.code === "auth/invalid-email") {
        errorMsg = "Correo electrónico no válido.";
      } else if (
        error.code === "auth/configuration-not-found" ||
        error.code === "auth/network-request-failed"
      ) {
        errorMsg = "Error de conexión con el servidor. Intenta más tarde.";
      }
      showCustomAlert("ERROR", errorMsg);
    }
  };

  // RECUPERACIÓN DE CONTRASEÑA
  // Envía un correo de restablecimiento si el usuario olvidó su contraseña.
  const handleForgotPassword = async () => {
    if (!formData.email.trim()) {
      showCustomAlert("Recuperar contraseña", "Por favor, ingresa tu correo electrónico en el campo de usuario.");
      return;
    }
    
    if (!formData.email.includes("@") || !formData.email.includes(".")) {
      showCustomAlert("Recuperar contraseña", "Ingresa un correo electrónico válido.");
      return;
    }
    try {
      const auth = getAuth(app);
      await sendPasswordResetEmail(auth, formData.email.trim());
      showCustomAlert(
        "Correo enviado",
        "Revisa tu bandeja de entrada. Recibirás un enlace para restablecer tu contraseña."
      );
    } catch (error: any) {
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
          source={loginImage}
          style={styles.loginImage}
        />
        <Text style={styles.title}>J o s s  L i f e</Text>
        <Text style={styles.subtitle}>Iniciar Sesión</Text>
        
        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholderTextColor={COLORS.textSecondary}
            value={formData.email}
            onChangeText={(text) => updateFormData("email", text)}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
            placeholder="Usuario o correo electrónico"
          />

          <View style={{ position: "relative" }}>
            <TextInput
              style={styles.input}
              placeholderTextColor={COLORS.textSecondary}
              value={formData.password}
              onChangeText={(text) => updateFormData("password", text)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              placeholder="Contraseña"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword((prev) => !prev)}
            >
              <MaterialCommunityIcons
                name={showPassword ? "eye" : "eye-off"}
                size={26}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, { opacity: isLoading ? 0.6 : 1 }]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.linksContainer}>
          <TouchableOpacity onPress={() => navigation.navigate('ResetPassword')}>
            <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.link}>Regístrate</Text>
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
  eyeButton: {
    position: "absolute",
    right: 15,
    top: 12,
    padding: 5,
    zIndex: 1,
  },
  placeholder: {
    position: "absolute",
    fontFamily: "Pacifico",
    fontSize: FONT_SIZES.medium,
    color: COLORS.textSecondary,
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

// ESTILOS DE COMPONENTES PERSONALIZADOS
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
export default LoginScreen;
