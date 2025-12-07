// scripts/auth.js
// Gestión de autenticación de usuarios (Login, Registro, Recuperación).

// Obtiene el usuario actual y sus datos extendidos desde Firestore
function getCurrentUser() {
    return new Promise(resolve => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            unsubscribe();
            if (user) {
                const doc = await db.collection('users').doc(user.uid).get();
                if (doc.exists) {
                    resolve({ uid: user.uid, ...doc.data() });
                } else {
                    resolve({ uid: user.uid, email: user.email, role: 'unknown' });
                }
            } else {
                resolve(null);
            }
        });
    });
}

// Registro de nuevos usuarios en Firebase Auth y Firestore
async function registerUser(username, matricula, password, grupo, email, role) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const uid = userCredential.user.uid;

        // El grupo no aplica para roles administrativos o docentes
        const grupoFinal = (role === 'doctor' || role === 'coordinador') ? 'N/A' : grupo;

        await db.collection('users').doc(uid).set({
            username,
            matricula,
            grupo: grupoFinal,
            email,
            role,
            uid
        });
        return true;
    } catch (error) {
        alert("Error al registrar usuario: " + error.message);
        return false;
    }
}

async function loginUser(email, password) {
    try {
        await auth.signInWithEmailAndPassword(email, password);
        return true;
    } catch (error) {
        console.error("Error de credenciales:", error);
        return false;
    }
}

// Envía correo de recuperación (RF-03)
async function resetPassword(email) {
    try {
        await auth.sendPasswordResetEmail(email);
        return true;
    } catch (error) {
        console.error("Error al enviar correo de recuperación:", error);
        alert("Error: " + error.message);
        return false;
    }
}

function logoutUser() {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
}

// Middleware de protección de rutas en el frontend
async function checkAuth(requiredRole) {
    const user = await getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return null;
    }
    if (requiredRole && user.role !== requiredRole) {
        alert("No tienes permisos para acceder a esta sección.");
        window.location.href = 'dashboard.html';
        return null;
    }
    return user;
}