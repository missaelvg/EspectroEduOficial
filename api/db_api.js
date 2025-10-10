// netlify/functions/db_api.js (Ejemplo de API de DB segura)

// **NECESITAS INSTALAR EL PAQUETE FIREBASE-ADMIN EN NETLIFY**
// (Generalmente con un package.json, o configurando el build)
const admin = require('firebase-admin');

// Netlify inyectará las credenciales del Admin SDK (archivo JSON)
// como una Variable de Entorno: FIREBASE_ADMIN_CREDENTIALS
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
        const { action, data, matricula, practiceId } = (event.httpMethod === 'POST') ? JSON.parse(event.body) : event.queryStringParameters;
        
        // --- LÓGICA CENTRAL DE LA BASE DE DATOS ---

        if (action === 'get_all_users') {
            const usersSnapshot = await db.collection('users').get();
            const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return { statusCode: 200, body: JSON.stringify({ users }) };
        }
        
        if (action === 'create_practice' && data) {
            const practiceRef = await db.collection('practices').add(data);
            return { statusCode: 200, body: JSON.stringify({ practiceId: practiceRef.id }) };
        }
        
        // ... Otras acciones como get_practices, enroll_student, save_score, etc. ...

        return { statusCode: 400, body: JSON.stringify({ error: "Acción no válida." }) };

    } catch (error) {
        console.error("DB_API Fallo:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Error en el servidor de la base de datos." }) };
    }
};