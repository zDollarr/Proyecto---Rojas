import { StackScreenProps } from '@react-navigation/stack';
export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
}
export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
};
export interface LoginFormData {
  username: string;
  password: string;
}
export const COLORS = {
  primary: "#dfdfdfff", 
  background: "#f2f0ebf5", 
  surface: "#fcf9f7ff", 
  text: "#000000ff", 
  textSecondary: "#65707aff", 
  error: "#D32F2F", 
  botonAlertNo: "#9c6a6a6e",
  botonAlertSi: "#94afa4ff",
  profile: "#4a7864ff"
};

export const FONT_SIZES = {
  xsmall: 10,
  small: 12,
  medium: 16,
  large: 20,
  xlarge: 28,
};

export type LoginScreenProps = StackScreenProps<RootStackParamList, 'Login'>;
export type HomeScreenProps = StackScreenProps<RootStackParamList, 'Home'>;