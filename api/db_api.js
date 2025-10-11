// api/db_api.js (Servidor Vercel)

const admin = require('firebase-admin');

// Inicializa Firebase Admin SDK (Vercel/Netlify inyectan las credenciales desde las variables de entorno)
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
    // Permitir CORS para peticiones desde el frontend
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers };
    }
    
    if (event.httpMethod !== 'POST' && event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Método no permitido', headers };
    }

    try {
        let action, data;
        
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            action = body.action;
            data = body.data;
        } else { // GET
            action = event.queryStringParameters.action;
            // Potencialmente pasar data via query params si es necesario para GET
            data = event.queryStringParameters;
        }
        
        // --- LÓGICA CENTRAL DE LA BASE DE DATOS ---

        switch (action) {
            case 'get_all_practices': {
                const practicesSnapshot = await db.collection('practices').get();
                const practices = {};
                practicesSnapshot.forEach(doc => {
                    practices[doc.id] = { id: doc.id, ...doc.data() };
                });
                return { statusCode: 200, headers, body: JSON.stringify({ practices }) };
            }

            case 'get_all_users': {
                const usersSnapshot = await db.collection('users').get();
                const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                return { statusCode: 200, headers, body: JSON.stringify({ users }) };
            }
            
            case 'create_practice': {
                if (!data) throw new Error("Faltan datos para crear la práctica.");
                const practiceRef = await db.collection('practices').add(data);
                return { statusCode: 200, headers, body: JSON.stringify({ practiceId: practiceRef.id }) };
            }

            case 'update_practice_content': {
                 if (!data || !data.practiceId || !data.content) throw new Error("Datos incompletos para actualizar práctica.");
                 await db.collection('practices').doc(data.practiceId).update({
                     generatedContent: data.content
                 });
                 return { statusCode: 200, headers, body: JSON.stringify({ message: 'Contenido actualizado' }) };
            }
            
            case 'enroll_student_to_practice': {
                if (!data || !data.practiceId || !data.studentUid) throw new Error("Faltan datos para inscribir.");

                const practiceRef = db.collection('practices').doc(data.practiceId);
                // Usamos notación de punto para actualizar un campo específico en un mapa (objeto)
                await practiceRef.update({
                    [`students.${data.studentUid}`]: {
                        enrolled: true,
                        status: 'Inscrito',
                        reportUrl: null,
                        quizScore: null,
                        completed: false
                    }
                });
                return { statusCode: 200, headers, body: JSON.stringify({ message: 'Alumno inscrito' }) };
            }

            default:
                return { statusCode: 400, headers, body: JSON.stringify({ error: `Acción no válida: ${action}` }) };
        }

    } catch (error) {
        console.error("DB_API Fallo:", error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: `Error en el servidor: ${error.message}` }) };
    }
};