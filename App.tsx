import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { ActivityIndicator, View } from "react-native";
import StackNavigator from "./src/navigation/StackNavigator";

// Fuentes
import {
  useFonts,
  Pacifico_400Regular
} from "@expo-google-fonts/pacifico";
import {
  Kalam_400Regular,
  Kalam_700Bold
} from "@expo-google-fonts/kalam";
import {
  Courgette_400Regular
} from "@expo-google-fonts/courgette";

import { FavoritesProvider } from "./src/context/FavoritesContext";
import { CartProvider } from "./src/context/CartContext";

const App: React.FC = () => {
  const [fontsLoaded] = useFonts({
    Pacifico: Pacifico_400Regular,
    Kalam: Kalam_400Regular,
    KalamBold: Kalam_700Bold,
    Courgette: Courgette_400Regular
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FavoritesProvider>
      <CartProvider>
        <NavigationContainer>
          <StackNavigator />
        </NavigationContainer>
      </CartProvider>
    </FavoritesProvider>
  );
};

export default App;