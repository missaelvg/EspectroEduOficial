// scripts/auth.js

// Usa las variables globales de firebase_config.js: db y auth

function getCurrentUser() {
    return new Promise(resolve => {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                // Obtener perfil de Firestore
                const doc = await db.collection('users').doc(user.uid).get();
                if (doc.exists) {
                    resolve({ uid: user.uid, ...doc.data() });
                } else {
                    // Si el perfil de Firestore no existe (ej. Doctor por primera vez)
                    resolve({ uid: user.uid, email: user.email, role: 'unknown' }); 
                }
            } else {
                resolve(null);
            }
        });
    });
}

async function registerUser(username, matricula, password, grupo, email, role) {
    try {
        // 1. Crear usuario en Firebase Authentication
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const uid = userCredential.user.uid;

        // 2. Guardar perfil en Firestore
        await db.collection('users').doc(uid).set({
            username,
            matricula,
            grupo,
            email,
            role,
            uid
        });
        return true;
    } catch (error) {
        alert("Error de registro: " + error.message);
        return false;
    }
}

async function loginUser(email, password) {
    try {
        // Lógica especial para el Doctor
        if (email === 'doc123@espectro.edu' && password === 'doc123') {
             // Si el Doctor no existe en Firestore, lo registra y luego inicia sesión
             let doctorSnapshot = await db.collection('users').where('matricula', '==', 'doc123').get();
             if (doctorSnapshot.empty) {
                 await registerUser('Dr. Experto', 'doc123', 'doc123', 'N/A', 'doc123@espectro.edu', 'doctor');
             }
             await auth.signInWithEmailAndPassword('doc123@espectro.edu', 'doc123');
             return true;
        }

        // Login normal de Alumno
        await auth.signInWithEmailAndPassword(email, password);
        return true;
    } catch (error) {
        return false;
    }
}

function logoutUser() {
    auth.signOut();
    window.location.href = 'index.html';
}

async function checkAuth(requiredRole) {
    const user = await getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return null;
    }
    if (requiredRole && user.role !== requiredRole) {
        alert("Acceso denegado.");
        window.location.href = 'dashboard.html';
        return null;
    }
    return user;
}