// scripts/firebase_config.js

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBSGXbBCCwMC1L-t96ATtfVOfdtpiPWWjw",
  authDomain: "espectroedu-e8856.firebaseapp.com",
  projectId: "espectroedu-e8856",
  storageBucket: "espectroedu-e8856.firebasestorage.app",
  messagingSenderId: "207748203701",
  appId: "1:207748203701:web:953df6a7ccd3f686b7eafc",
  measurementId: "G-Z2J9XT9PHC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Inicializar Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(); // Base de datos (Prácticas, Perfiles de Usuario)
const auth = firebase.auth();     // Autenticación (Login, Registro)