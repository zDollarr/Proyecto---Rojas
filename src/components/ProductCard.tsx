import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { COLORS, FONT_SIZES } from '../types';
import { FontAwesome } from '@expo/vector-icons';

export type ProductCardProps = {
  item: {
    id: string;
    name: string;
    price: number;
    image: any; 
  };
  onPress: () => void;
};

const ProductCard = ({ item, onPress }: ProductCardProps) => {
  return (
    <TouchableOpacity style={styles.cardContainer} onPress={onPress}>
      <Image source={item.image} style={styles.image} resizeMode="cover" />
      <Text style={styles.productName}>{item.name}</Text>
      <View style={styles.footer}>
        <Text style={styles.priceText}>${item.price.toFixed(2)} mxn</Text>
        <TouchableOpacity>
          <FontAwesome name="heart-o" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    flex: 1,
    backgroundColor: COLORS.surface, // Blanco
    borderRadius: 15,
    margin: 8,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  image: {
    width: '100%',
    height: 130,
    borderRadius: 10,
    marginBottom: 10,
  },
  productName: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.text,
    // fontFamily: FONTS.sansBold, // (Lo activas al cargar fuentes)
    fontWeight: '600',
    marginBottom: 5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  priceText: {
    fontSize: FONT_SIZES.medium,
    color: COLORS.text,
    // fontFamily: FONTS.sansRegular, // (Lo activas al cargar fuentes)
    fontWeight: '500',
  },
});

export default ProductCard;