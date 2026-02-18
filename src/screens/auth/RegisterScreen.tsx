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
import { auth, db } from "../../firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { MaterialIcons } from "@expo/vector-icons"; 

// DEFINICIÓN DE TIPOS E INTERFACES
// Se definen las props para la navegación y el formulario de registro.
interface CustomAlertProps {
  title: string;
  message: string;
  visible: boolean;
  onClose: () => void;
}

type RegisterScreenNavigationProp = StackNavigationProp<RootStackParamList, "Register">;

interface RegisterScreenProps { 
    navigation: RegisterScreenNavigationProp; 
}

interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
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

// COMPONENTE PRINCIPAL DE REGISTRO
const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  
  // ESTADO DEL COMPONENTE
  // Gestión de los campos del formulario, indicadores de carga y visibilidad de contraseñas.
  const [formData, setFormData] = useState<RegisterFormData>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
  const updateFormData = (field: keyof RegisterFormData, value: string) =>
    setFormData((prevData) => ({ ...prevData, [field]: value }));

  // VALIDACIÓN DE DATOS
  // Se comprueban requisitos como correo válido, longitud de contraseña y coincidencia entre contraseñas.
  const validateForm = (): boolean => {
    if (!formData.email.trim()) {
      showCustomAlert("ERROR", "Por favor, ingresa un correo electrónico.");
      return false;
    }
    if (!formData.email.includes("@") || !formData.email.includes(".")) {
      showCustomAlert("ERROR", "Correo electrónico no válido.");
      return false;
    }
    if (!formData.password.trim()) {
      showCustomAlert("ERROR", "Por favor, ingresa una contraseña.");
      return false;
    }
    if (formData.password.length < 6) {
      showCustomAlert("ERROR", "La contraseña debe tener al menos 6 caracteres.");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      showCustomAlert("ERROR", "Las contraseñas no coinciden.");
      return false;
    }
    if (!formData.username.trim()) {
      showCustomAlert("ERROR", "Por favor, ingresa un nombre de usuario.");
      return false;
    }
    return true;
  };

  // LÓGICA DE REGISTRO
  // Verifica si el nombre de usuario existe, crea la cuenta en Authentication y guarda los datos adicionales en Firestore.
  const handleRegister = async () => {
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      const usersCol = collection(db, "users");
      const q = query(usersCol, where("username", "==", formData.username));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setIsLoading(false);
        showCustomAlert("ERROR", "El nombre de usuario ya está en uso.");
        return;
      }

      const res = await createUserWithEmailAndPassword(auth, formData.email, formData.password);

      setDoc(doc(db, "users", res.user.uid), {
          username: formData.username,
          email: formData.email,
          role: "client" 
      })
      .catch((e) => console.log("Error guardando en background:", e));

      setIsLoading(false);
      navigation.replace("Home");

    } catch (error: any) {
      setIsLoading(false);
      let msg = "Ocurrió un error.";
      if (error.code === 'auth/email-already-in-use') msg = "El correo ya está registrado.";
      showCustomAlert("ERROR", msg);
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
        <Text style={styles.subtitle}>Registrar cuenta</Text>
        
        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholderTextColor={COLORS.textSecondary}
            value={formData.username}
            onChangeText={(text) => updateFormData("username", text)}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
            placeholder="Usuario"
          />
          <TextInput
            style={styles.input}
            placeholderTextColor={COLORS.textSecondary}
            value={formData.email}
            onChangeText={(text) => updateFormData("email", text)}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
            placeholder="Correo electrónico"
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
          
          <View style={{ position: "relative" }}>
            <TextInput
              style={styles.input}
              placeholderTextColor={COLORS.textSecondary}
              value={formData.confirmPassword}
              onChangeText={(text) => updateFormData("confirmPassword", text)}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              placeholder="Confirmar Contraseña"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword((prev) => !prev)}
            >
              <MaterialCommunityIcons
                name={showConfirmPassword ? "eye" : "eye-off"}
                size={26}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, { opacity: isLoading ? 0.6 : 1 }]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            <Text style={styles.loginButtonText}>
              {isLoading ? "Registrando..." : "Registrarse"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.linksContainer}>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.link}>¿Ya tienes cuenta?</Text>
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
export default RegisterScreen;
