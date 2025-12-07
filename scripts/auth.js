// scripts/auth.js
// Funciones de autenticación y gestión de usuarios.

// Obtiene el usuario actual y su rol desde la base de datos
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

async function registerUser(username, matricula, password, grupo, email, role) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const uid = userCredential.user.uid;

        // Si es doctor o coordinador, el grupo es N/A
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
        alert("Error de registro: " + error.message);
        return false;
    }
}

async function loginUser(email, password) {
    try {
        await auth.signInWithEmailAndPassword(email, password);
        return true;
    } catch (error) {
        console.error("Error de inicio de sesión:", error);
        return false;
    }
}

async function resetPassword(email) {
    try {
        await auth.sendPasswordResetEmail(email);
        return true;
    } catch (error) {
        console.error("Error al enviar correo:", error);
        alert("Error: " + error.message);
        return false;
    }
}

function logoutUser() {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
}

// Verifica permisos al cargar la página
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