// scripts/firebase_config.js (VERSIÓN FINAL Y CORRECTA)

// Your web app's Firebase configuration con la clave API corregida
const firebaseConfig = {
  apiKey: "AIzaSyBSGXbBCCwMC1L-t96ATtfVOfdtpiPWWjw", // <-- ESTA ES LA CLAVE CORRECTA
  authDomain: "espectroedu-e8856.firebaseapp.com",
  projectId: "espectroedu-e8856",
  storageBucket: "espectroedu-e8856.appspot.com", // Corregido para que coincida con el estándar
  messagingSenderId: "207748203701",
  appId: "1:207748203701:web:953df6a7ccd3f686b7eafc",
  measurementId: "G-Z2J9XT9PHC"
};

// Initialize Firebase using the correct V8 syntax
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();