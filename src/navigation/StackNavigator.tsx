import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

import StartScreen from "../screens/start/start";
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import HomeScreen from "../screens/home/HomeScreen";
import ProductDetailScreen from "../screens/home/ProductDetailScreen";
import ResetPasswordScreen from "../screens/auth/ResetPasswordScreen";
import PlantOverlayCamera from "../screens/camera/PlantOverlayCamera";
import AddProductScreen from "../screens/home/AddProductScreen";
import ProfileScreen from "../screens/ProfileScreen";

// NUEVAS PANTALLAS
import CartScreen from "../screens/home/CartScreen";
import FavoritesScreen from "../screens/home/FavoritesScreen";

import type { Product } from "../types";

interface ProductToEdit extends Product {
  category: string;
}

export type RootStackParamList = {
  Start: undefined;
  Login: undefined;
  Register: undefined;
  Home: undefined;
  ProductDetail: { product: Product; userRole: "client" | "owner" | null };
  PlantCamera: { product: Product };
  ResetPassword: undefined;
  PlantOverlayCamera: undefined;
  AddProduct: { productToEdit?: ProductToEdit } | undefined;
  Profile: undefined;
  Cart: undefined;
  Favorites: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const StackNavigator: React.FC = () => (
  <Stack.Navigator
    initialRouteName="Start"
    screenOptions={{
      headerStyle: { backgroundColor: "#cdcdcdff", height: 33 },
      headerTintColor: "#ffffff",
      headerTitleStyle: { fontWeight: "bold", fontSize: 18 },
    }}
  >
    <Stack.Screen name="Start" component={StartScreen} options={{ headerShown: false }} />

    <Stack.Screen
      name="Login"
      component={LoginScreen}
      options={{ title: "Iniciar Sesión", headerShown: false }}
    />

    <Stack.Screen
      name="Register"
      component={RegisterScreen}
      options={{ title: "Registrarse", headerShown: false }}
    />

    <Stack.Screen
      name="Home"
      component={HomeScreen}
      options={{ title: "", headerLeft: () => null, headerShown: false }}
    />

    <Stack.Screen
      name="ProductDetail"
      component={ProductDetailScreen}
      options={{ title: "", headerLeft: () => null, headerShown: false }}
    />

    <Stack.Screen
      name="ResetPassword"
      component={ResetPasswordScreen}
      options={{ title: "Restablecer contraseña", headerShown: false }}
    />

    <Stack.Screen
      name="PlantCamera"
      component={PlantOverlayCamera}
      options={{ title: "Plant Overlay Camera", headerShown: false }}
    />

    <Stack.Screen
      name="AddProduct"
      component={AddProductScreen}
      options={{ headerShown: false, presentation: "modal" }}
    />

    <Stack.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ headerShown: false, presentation: "card" }}
    />

    {/* NUEVAS PANTALLAS */}
    <Stack.Screen name="Cart" component={CartScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Favorites" component={FavoritesScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);

export default StackNavigator;
