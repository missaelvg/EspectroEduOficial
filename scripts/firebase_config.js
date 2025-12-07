// scripts/firebase_config.js
// Configuración de conexión al proyecto Firebase (Frontend)

const firebaseConfig = {
  apiKey: "AIzaSyBSGXbBCCwMC1L-t96ATtfVOfdtpiPWWjw",
  authDomain: "espectroedu-e8856.firebaseapp.com",
  projectId: "espectroedu-e8856",
  storageBucket: "espectroedu-e8856.firebasestorage.app", 
  messagingSenderId: "207748203701",
  appId: "1:207748203701:web:953df6a7ccd3f686b7eafc",
  measurementId: "G-Z2J9XT9PHC"
};

// Inicializa Firebase SDK
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();