// api/db_api.js (Servidor Vercel)

const admin = require('firebase-admin');

// Netlify/Vercel inyectará las credenciales del Admin SDK desde la Variable de Entorno
if (!admin.apps.length) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (e) {
        console.error("Fallo al inicializar Firebase Admin:", e);
    }
}
const db = admin.firestore();

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Método no permitido' };
    }

    try {
        let action, data;
        
        // 🚨 CRÍTICO: Manejar peticiones GET y POST para obtener la acción 🚨
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            action = body.action;
            data = body.data;
        } else { // GET request
            action = event.queryStringParameters.action;
        }
        
        // --- LÓGICA CENTRAL DE LA BASE DE DATOS ---

        // 1. OBTENER TODAS LAS PRÁCTICAS (Usado por loadDoctorView)
        if (action === 'get_all_practices') {
            const practicesSnapshot = await db.collection('practices').get();
            const practices = {};
            practicesSnapshot.forEach(doc => {
                practices[doc.id] = { id: doc.id, ...doc.data() };
            });
            return { statusCode: 200, body: JSON.stringify({ practices }) };
        }

        // 2. OBTENER TODOS LOS USUARIOS (Ejemplo para gestión)
        if (action === 'get_all_users') {
            const usersSnapshot = await db.collection('users').get();
            const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return { statusCode: 200, body: JSON.stringify({ users }) };
        }
        
        // 3. CREAR UNA PRÁCTICA (Usado por handlePracticeCreation)
        if (action === 'create_practice' && data) {
            const practiceRef = await db.collection('practices').add(data);
            return { statusCode: 200, body: JSON.stringify({ practiceId: practiceRef.id }) };
        }
        
        // --- ACCIÓN NO VÁLIDA ---
        return { statusCode: 400, body: JSON.stringify({ error: `Acción no válida o no implementada: ${action}` }) };

    } catch (error) {
        console.error("DB_API Fallo:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Error en el servidor de la base de datos. (Ver logs de Vercel)." }) };
    }
};