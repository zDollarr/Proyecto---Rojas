# App Vivero JossLife

Aplicación móvil para la gestión de un vivero: catálogo de productos, carrito de compras y administración básica de usuarios (cliente / dueño del vivero). Desarrollada con React Native (Expo) y Firebase.

# Funcionalidad principal

- Catálogo de productos con imagen, precio, categoría y stock.
- Búsqueda y filtrado por nombre y categoría.
- Carrito de compras.
- Autenticación con correo y contraseña (Firebase Auth).
- Roles: cliente y dueño (el dueño puede agregar productos).
- Favoritos por usuario.

# Tecnologías

- React Native + Expo
- TypeScript
- Firebase (Auth y Firestore)
- AsyncStorage (persistencia de sesión)
- Context API (carrito y favoritos)

# Cómo ejecutar el proyecto

1. Clonar el repositorio:
   - git clone https://github.com/zDollarr/Proyecto---Rojas
   - cd Proyecto---Rojas
   
3. Instalar dependencias:
   - npm install

3. Ejecutar en modo desarrollo:
   - npx expo start
