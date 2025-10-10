// scripts/firebase_config.js

// 🚨 ELIMINA TODAS LAS LÍNEAS DE 'IMPORT' QUE INCLUYE LA PLANTILLA DE FIREBASE 🚨

// Tu configuración de Firebase (Claves Públicas)
const firebaseConfig = {
  // Estos valores son los que Netlify leerá de tu archivo
  apiKey: "AIzaSyBSGXbBCCwMC1L-t96ATtfVOfdtpiPWWjw",
  authDomain: "espectroedu-e8856.firebaseapp.com",
  projectId: "espectroedu-e8856",
  storageBucket: "espectroedu-e8856.firebasestorage.app",
  messagingSenderId: "207748203701",
  appId: "1:207748203701:web:953df6a7ccd3f686b7eafc",
  measurementId: "G-Z2J9XT9PHC"
};

// Inicializar Firebase (Sintaxis V8: usa la variable global 'firebase')
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(); // Conexión a la base de datos
const auth = firebase.auth();     // Conexión a la autenticación