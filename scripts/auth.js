// scripts/auth.js

// Usa las variables globales de firebase_config.js: db y auth

/**
 * Obtiene el usuario actualmente autenticado y su perfil de Firestore.
 * @returns {Promise<Object|null>} Una promesa que se resuelve con el objeto del usuario o null.
 */
function getCurrentUser() {
    return new Promise(resolve => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            unsubscribe(); // Detiene el listener para evitar múltiples ejecuciones
            if (user) {
                // Obtener perfil de Firestore
                const doc = await db.collection('users').doc(user.uid).get();
                if (doc.exists) {
                    resolve({ uid: user.uid, ...doc.data() });
                } else {
                    // Si el perfil de Firestore no existe (caso muy raro)
                    // Se resolverá, pero la app no encontrará su rol.
                    resolve({ uid: user.uid, email: user.email, role: 'unknown' });
                }
            } else {
                resolve(null);
            }
        });
    });
}

/**
 * Registra un nuevo usuario en Firebase Authentication y guarda su perfil en Firestore.
 * @param {string} username - Nombre completo.
 * @param {string} matricula - Matrícula del alumno.
 * @param {string} password - Contraseña.
 * @param {string} grupo - Grupo del alumno.
 * @param {string} email - Correo electrónico.
 * @param {string} role - Rol del usuario (ej. 'alumno').
 * @returns {Promise<boolean>} True si el registro fue exitoso, false en caso contrario.
 */
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

/**
 * Inicia sesión de un usuario con correo y contraseña.
 * @param {string} email - Correo electrónico.
 * @param {string} password - Contraseña.
 * @returns {Promise<boolean>} True si el inicio de sesión fue exitoso, false en caso contrario.
 */
async function loginUser(email, password) {
    try {
        await auth.signInWithEmailAndPassword(email, password);
        return true;
    } catch (error) {
        console.error("Error de inicio de sesión:", error);
        return false;
    }
}

/**
 * Cierra la sesión del usuario y redirige al index.
 */
function logoutUser() {
    auth.signOut().then(() => {
        window.location.href = 'index.html';
    });
}

/**
 * Verifica si un usuario está autenticado. Si no, lo redirige al login.
 * Opcionalmente, puede verificar si el usuario tiene un rol específico.
 * @param {string} [requiredRole] - El rol requerido para acceder a la página.
 * @returns {Promise<Object|null>} El objeto del usuario si está autenticado y cumple el rol, de lo contrario null.
 */
async function checkAuth(requiredRole) {
    const user = await getCurrentUser();
    if (!user) {
        window.location.href = 'index.html';
        return null;
    }
    if (requiredRole && user.role !== requiredRole) {
        alert("Acceso denegado. No tienes los permisos necesarios.");
        // Lo ideal sería redirigir a una página de "acceso denegado" o al dashboard principal.
        window.location.href = 'dashboard.html';
        return null;
    }
    return user;
}