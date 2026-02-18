// IMPORTACIONES
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  Image,
  ActivityIndicator,
  TextInput,
  Modal,
  Pressable,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, FONT_SIZES } from '../types';

const { width, height } = Dimensions.get('window');

// COMPONENTE PRINCIPAL (PERFIL)
const ProfileScreen = () => {
  const navigation = useNavigation();

  // Datos originales para detectar cambios
  const [originalData, setOriginalData] = useState<{
    username: string;
    profileImage: string | null;
  }>({ username: '', profileImage: null });

  // Datos editables en el formulario
  const [username, setUsername] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Estado de carga y rol del usuario
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState('client');

  // Estado para alertas personalizadas
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    title: string;
    message: string;
    buttons?: { text: string; onPress: () => void; style?: 'cancel' | 'destructive' | 'default' }[];
  }>({ title: '', message: '' });

  // Estado para ver foto de perfil en grande
  const [fullImageVisible, setFullImageVisible] = useState(false);

  const user = auth.currentUser;

  // Carga el documento de usuario desde Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          const cleanUsername = data.username || '';
          const cleanImage = data.profileImage || null;

          setOriginalData({
            username: cleanUsername,
            profileImage: cleanImage,
          });

          setUsername(cleanUsername);
          setProfileImage(cleanImage);

          const roleRaw = data.role || 'client';
          setRole(roleRaw.trim());
        } else {
          // Si no existe el doc, se crea uno básico
          const initialData = {
            username: user.email?.split('@')[0] || 'Usuario',
            email: user.email,
            role: 'client',
          };
          await setDoc(docRef, initialData);

          setOriginalData({
            username: initialData.username,
            profileImage: null,
          });
          setUsername(initialData.username);
          setProfileImage(null);
          setRole('client');
        }
      } catch (error) {
        console.error('Error fetching user data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  // ALERTA PERSONALIZADA
  const showAlert = (
    title: string,
    message: string,
    buttons?: { text: string; onPress: () => void; style?: 'cancel' | 'destructive' | 'default' }[]
  ) => {
    setAlertConfig({ title, message, buttons });
    setAlertVisible(true);
  };

  const closeAlert = () => {
    setAlertVisible(false);
    setTimeout(() => setAlertConfig({ title: '', message: '', buttons: undefined }), 200);
  };

  // LÓGICA DE IMAGEN DE PERFIL
  const handleImagePress = () => {
    if (!profileImage) {
      showChangePhotoOptions();
      return;
    }

    showAlert('Foto de Perfil', '¿Qué te gustaría hacer con tu imagen?', [
      {
        text: 'Ver en grande',
        style: 'default',
        onPress: () => {
          closeAlert();
          setFullImageVisible(true);
        },
      },
      {
        text: 'Cambiar imagen',
        style: 'default',
        onPress: () => {
          closeAlert();
          setTimeout(showChangePhotoOptions, 300);
        },
      },
      { text: 'Cancelar', style: 'cancel', onPress: closeAlert },
    ]);
  };

  const showChangePhotoOptions = () => {
    showAlert('Cambiar Foto', 'Elige el origen de tu nueva imagen:', [
      { text: 'Usar Cámara', style: 'default', onPress: () => { closeAlert(); handleCamera(); } },
      { text: 'Abrir Galería', style: 'default', onPress: () => { closeAlert(); handleGallery(); } },
      { text: 'Cancelar', style: 'cancel', onPress: closeAlert },
    ]);
  };

  const handleCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      showAlert('Permiso denegado', 'Necesitas dar acceso a la cámara para tomar fotos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleGallery = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      showAlert('Permiso denegado', 'Necesitas dar acceso a la galería para elegir fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  // Guarda cambios en Firestore
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        username: username,
        profileImage: profileImage,
      });

      setOriginalData({ username, profileImage });
      showAlert('¡Todo listo!', 'Tu perfil se ha actualizado correctamente.');
    } catch (error) {
      showAlert('Error', 'Hubo un problema al guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  // Envía correo para restablecer contraseña
  const handleResetPassword = async () => {
    if (!user?.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      showAlert(
        'Correo Enviado',
        `Se envió un enlace a ${user.email} para restablecer tu contraseña.`
      );
    } catch (error) {
      showAlert('Error', 'No se pudo enviar el correo de recuperación.');
    }
  };

  // Cierra sesión y regresa al Home después de confirmar
  const handleLogout = () => {
    auth.signOut().then(() => {
      showAlert('Sesión Cerrada', 'Ahora estás navegando como invitado.', [
        {
          text: 'OK',
          style: 'default',
          onPress: () => {
            closeAlert();
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Home' as never }],
              })
            );
          },
        },
      ]);
    });
  };

  // Verifica si hay cambios entre el estado actual y el original
  const hasChanges =
    (username || '') !== (originalData.username || '') ||
    (profileImage || null) !== (originalData.profileImage || null);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const currentAlertButtons =
    alertConfig.buttons || [{ text: 'Entendido', onPress: closeAlert, style: 'default' }];

  return (
    <SafeAreaView style={styles.container}>
      {/* Modal para ver la imagen de perfil en grande */}
      <Modal
        visible={fullImageVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFullImageVisible(false)}
      >
        <Pressable
          style={styles.fullImageOverlay}
          onPress={() => setFullImageVisible(false)}
        >
          <Image
            source={{ uri: profileImage || '' }}
            style={styles.fullImage}
            resizeMode="contain"
          />
          <TouchableOpacity
            style={styles.closeImageButton}
            onPress={() => setFullImageVisible(false)}
          >
            <MaterialIcons name="close" size={30} color="#fff" />
          </TouchableOpacity>
        </Pressable>
      </Modal>

      {/* Modal de alerta personalizada */}
      <Modal
        animationType="fade"
        transparent
        visible={alertVisible}
        onRequestClose={closeAlert}
      >
        <Pressable style={styles.alertOverlay} onPress={closeAlert}>
          <Pressable style={styles.alertContainer} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.alertTitle}>{alertConfig.title}</Text>
            <Text style={styles.alertMessage}>{alertConfig.message}</Text>

            <View style={styles.alertButtonContainer}>
              {currentAlertButtons.map((btn, index) => {
                let btnStyle = styles.alertButtonDefault;
                let textStyle = styles.alertButtonTextDefault;

                if (btn.style === 'cancel') {
                  btnStyle = styles.alertButtonCancel;
                  textStyle = styles.alertButtonTextCancel;
                } else if (btn.style === 'destructive') {
                  btnStyle = styles.alertButtonDestructive;
                  textStyle = styles.alertButtonTextDestructive;
                }

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.alertButtonBase,
                      btnStyle,
                      currentAlertButtons.length > 2
                        ? { width: '100%', marginBottom: 8 }
                        : { flex: 1, marginHorizontal: 5 },
                    ]}
                    onPress={btn.onPress}
                  >
                    <Text style={[styles.alertButtonTextBase, textStyle]}>
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Encabezado con botón de regreso y título */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Avatar y botón de cámara */}
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={handleImagePress}
          activeOpacity={0.8}
        >
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.avatarImage} />
          ) : (
            <View
              style={[
                styles.avatarImage,
                { backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
              ]}
            >
              <MaterialIcons name="person" size={60} color="#aaa" />
            </View>
          )}
          <View style={styles.cameraButton}>
            <MaterialIcons name="camera-alt" size={20} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Badge con rol del usuario */}
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {role === 'owner' ? 'DUEÑO / ADMIN' : 'CLIENTE'}
          </Text>
        </View>

        {/* Campo de nombre de usuario */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Nombre de Usuario</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Ingresa tu nombre de usuario . . ."
          />
        </View>

        {/* Correo electrónico (solo lectura) */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Correo Electrónico (No editable)</Text>
          <TextInput
            style={[styles.input, styles.disabledInput]}
            value={user?.email || ''}
            editable={false}
          />
        </View>

        {/* ID de usuario (solo lectura) */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>ID de Usuario</Text>
          <TextInput
            style={[styles.input, styles.disabledInput, { fontSize: 12 }]}
            value={user?.uid || ''}
            editable={false}
          />
        </View>

        {/* Acción para enviar correo de restablecimiento */}
        <TouchableOpacity style={styles.passwordButton} onPress={handleResetPassword}>
          <MaterialIcons name="lock-reset" size={20} color={'#cba80bff'} />
          <Text style={[styles.passwordText, { color: '#cba80bff' }]}>
            Enviar correo para cambiar contraseña
          </Text>
        </TouchableOpacity>

        {/* Botón para guardar cambios (solo si hay cambios) */}
        {hasChanges && (
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Guardar Cambios</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Botón de cerrar sesión */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color="#fff" />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// ESTILOS DE PANTALLA
const styles = StyleSheet.create({
  container: {
    top: 30,
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'KalamBold',
    color: COLORS.text,
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#fff',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    padding: 10,
    borderRadius: 20,
    elevation: 4,
  },
  roleBadge: {
    backgroundColor: '#e0f2f1',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
    marginBottom: 25,
  },
  roleText: {
    color: '#00695c',
    fontFamily: 'KalamBold',
    fontSize: 14,
    fontWeight: 'bold',
  },
  formGroup: {
    width: '100%',
    marginBottom: 15,
  },
  label: {
    fontFamily: 'KalamBold',
    color: COLORS.textSecondary,
    marginBottom: 5,
    marginLeft: 5,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontFamily: 'KalamBold',
    fontSize: 16,
    color: COLORS.text,
    elevation: 1,
  },
  disabledInput: {
    backgroundColor: '#e9e9e9',
    color: '#888',
  },
  passwordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 20,
    padding: 10,
  },
  passwordText: {
    color: COLORS.primary,
    fontFamily: 'KalamBold',
    marginLeft: 10,
    textDecorationLine: 'underline',
  },
  saveButton: {
    backgroundColor: '#48a24fff',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    marginBottom: 15,
  },
  saveButtonText: {
    color: '#fff',
    fontFamily: 'KalamBold',
    fontSize: 18,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#ff4444',
    width: '100%',
    paddingVertical: 12,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  logoutText: {
    color: '#fff',
    fontFamily: 'KalamBold',
    fontSize: 16,
    marginLeft: 10,
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContainer: {
    width: '85%',
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 20,
    elevation: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  alertTitle: {
    fontSize: 22,
    fontFamily: 'KalamBold',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 16,
    fontFamily: 'KalamBold',
    textAlign: 'center',
    marginBottom: 25,
    color: '#666',
    lineHeight: 22,
  },
  alertButtonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
  },
  alertButtonBase: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  alertButtonTextBase: {
    fontFamily: 'KalamBold',
    fontSize: 16,
    fontWeight: '600',
  },
  alertButtonDefault: {
    backgroundColor: '#48a24fff',
  },
  alertButtonTextDefault: {
    color: '#fff',
  },
  alertButtonCancel: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  alertButtonTextCancel: {
    color: '#666',
  },
  alertButtonDestructive: {
    backgroundColor: '#ff4444',
  },
  alertButtonTextDestructive: {
    color: '#fff',
  },
  fullImageOverlay: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: width,
    height: height * 0.8,
  },
  closeImageButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
  },
});

// EXPORTACIÓN
export default ProfileScreen;
