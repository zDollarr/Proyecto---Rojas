import React, { useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Dimensions } from "react-native";
import { COLORS, FONT_SIZES } from "../../types";
import { MaterialIcons } from "@expo/vector-icons";
import { StackScreenProps } from "@react-navigation/stack";
import { RootStackParamList } from "../../navigation/StackNavigator";

type Props = StackScreenProps<RootStackParamList, 'Start'>;

const onboardingSlides = [
  {
    image: require("../../../assets/herramientas.png"),
    text: "Conoce nuestro\ncatalogo de\nplantas"
  },
  {
    image: require("../../../assets/cara.png"),
    text: "Encuentra especies\núnicas para tu hogar"
  },
  {
    image: require("../../../assets/planta.png"),
    text: "Recibe asesoría\npersonalizada"
  }
];

const { width } = Dimensions.get("window");

const StartScreen: React.FC<Props> = ({ navigation }) => {
  const [slide, setSlide] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleNext = () => {
    if (slide < onboardingSlides.length - 1) {
      scrollRef.current?.scrollTo({ x: width * (slide + 1), animated: true });
    } else {
      navigation.replace("Home");
    }
  };

  const onScroll = (event: any) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollX / width);
    setSlide(index);
  };

  return (
    <View style={styles.container}>
      {/* Botón Saltar */}
      <TouchableOpacity 
        style={styles.skipButton}
        onPress={() => navigation.replace("Home")}
      >
        <Text style={styles.skipText}>Saltar</Text>
      </TouchableOpacity>

      <View style={styles.centeredContent}>
        {/* Imagen + texto deslizable */}
        <ScrollView
          horizontal
          pagingEnabled
          ref={scrollRef}
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          bounces={false}
          contentContainerStyle={{ alignItems: "center" }}
          style={{ flexGrow: 0 }}
        >
          {onboardingSlides.map((slideData, idx) => (
            <View key={idx} style={{ width, alignItems: "center", justifyContent: "center" }}>
              <Image
                source={slideData.image}
                style={styles.image}
                resizeMode="contain"
              />
              <Text style={styles.mainText}>{slideData.text}</Text>
            </View>
          ))}
        </ScrollView>
        {/* Puntos indicador slide */}
        <View style={styles.dotsContainer}>
          {onboardingSlides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                slide === i && styles.activeDot
              ]}
            />
          ))}
        </View>
        {/* Botón verde con flecha */}
        <TouchableOpacity style={styles.circleButton} onPress={handleNext}>
          <MaterialIcons name="arrow-forward" size={32} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    position: "relative",
  },
  skipButton: {
    position: "absolute",
    top: 60,
    right: 17,
    padding: 8,
    zIndex: 10,
  },
  skipText: {
    fontSize: 20,
    textDecorationLine: 'underline',
    color: COLORS.textSecondary,
    fontFamily: "KalamBold",
    textShadowColor: "#4f4f4f16",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  centeredContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 50,
  },
  image: {
    width: 140,
    height: 140,
    marginBottom: 40,
  },
  mainText: {
    marginTop: 10,
    fontSize: FONT_SIZES.xlarge,
    color: COLORS.text,
    textAlign: "center",
    fontFamily: "KalamBold",
    marginBottom: 18,
    lineHeight: 34,
    textShadowColor: "#0000002e",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 1,
    marginTop: 0
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#bbb",
    marginHorizontal: 7,
    opacity: 0.4,
  },
  activeDot: {
    backgroundColor: COLORS.text,
    opacity: 0.8,
    width: 10.2,
    height: 10.2,
  },
  circleButton: {
    marginTop: 28,
    backgroundColor: "#74ba56ff",
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
  },
});

export default StartScreen;
