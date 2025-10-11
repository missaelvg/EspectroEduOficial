// api/db_api.js (VERSIÓN CORREGIDA Y ROBUSTA)
const admin = require('firebase-admin');

let db;
let initError = null;

if (!admin.apps.length) {
    try {
        if (!process.env.FIREBASE_ADMIN_CREDENTIALS) {
            throw new Error("La variable de entorno FIREBASE_ADMIN_CREDENTIALS no está definida.");
        }
        const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        db = admin.firestore(); // Solo definimos 'db' si la inicialización fue exitosa
    } catch (e) {
        console.error('Error CRÍTICO al inicializar Firebase Admin:', e.message);
        initError = `Fallo en la inicialización de Firebase Admin: ${e.message}. ¿Está la variable de entorno configurada correctamente en Vercel?`;
    }
} else {
    db = admin.firestore();
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };

    // Si hubo un error en la inicialización, detenemos cualquier ejecución y devolvemos el error.
    if (initError) {
        return { statusCode: 500, headers, body: JSON.stringify({ error: initError }) };
    }

    try {
        let action, data;
        if (event.httpMethod === 'POST') {
            const body = JSON.parse(event.body);
            action = body.action; data = body.data;
        } else {
            action = event.queryStringParameters.action; data = event.queryStringParameters;
        }
        
        // El resto de tu switch case va aquí...
        switch (action) {
            case 'get_all_practices': {
                const snapshot = await db.collection('practices').get();
                const practices = {};
                snapshot.forEach(doc => { practices[doc.id] = { id: doc.id, ...doc.data() }; });
                return { statusCode: 200, headers, body: JSON.stringify({ practices }) };
            }
            // ... (copia aquí el resto de tus 'case' del archivo original)
            case 'get_all_users': {
                const snapshot = await db.collection('users').get();
                const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                return { statusCode: 200, headers, body: JSON.stringify({ users }) };
            }
            case 'create_practice': {
                const ref = await db.collection('practices').add(data);
                return { statusCode: 200, headers, body: JSON.stringify({ practiceId: ref.id }) };
            }
            case 'update_practice_content': {
                 if (!data || !data.practiceId || !data.content) throw new Error("Datos incompletos.");
                 await db.collection('practices').doc(data.practiceId).update(data.content);
                 return { statusCode: 200, headers, body: JSON.stringify({ message: 'Contenido actualizado' }) };
            }
            case 'enroll_student_to_practice': {
                const practiceRef = db.collection('practices').doc(data.practiceId);
                await practiceRef.update({
                    [`students.${data.studentUid}`]: { status: 'Inscrito', reportUrl: null, quizScore: null, completed: false }
                });
                return { statusCode: 200, headers, body: JSON.stringify({ message: 'Alumno inscrito' }) };
            }
            case 'submit_report': {
                const practiceRef = db.collection('practices').doc(data.practiceId);
                await practiceRef.update({
                    [`students.${data.studentUid}.reportUrl`]: data.reportUrl,
                    [`students.${data.studentUid}.status`]: 'Reporte Entregado. Cuestionario pendiente.'
                });
                return { statusCode: 200, headers, body: JSON.stringify({ message: 'Reporte entregado' }) };
            }
            case 'update_student_progress': {
                const practiceRef = db.collection('practices').doc(data.practiceId);
                const updateData = { [`students.${data.studentUid}.status`]: data.status };
                if(typeof data.quizScore !== 'undefined') {
                    updateData[`students.${data.studentUid}.quizScore`] = data.quizScore;
                }
                await practiceRef.update(updateData);
                return { statusCode: 200, headers, body: JSON.stringify({ message: 'Progreso actualizado' }) };
            }
            case 'submit_quiz': {
                const practiceRef = db.collection('practices').doc(data.practiceId);
                const finalGrade = data.score; 
                await practiceRef.update({
                    [`students.${data.studentUid}.quizScore`]: finalGrade,
                    [`students.${data.studentUid}.status`]: 'Práctica Finalizada',
                    [`students.${data.studentUid}.completed`]: true
                });
                return { statusCode: 200, headers, body: JSON.stringify({ message: 'Práctica finalizada', finalGrade }) };
            }
            default:
                return { statusCode: 400, headers, body: JSON.stringify({ error: `Acción no válida: ${action}` }) };
        }

    } catch (error) {
        console.error("DB_API Fallo:", error);
        return { statusCode: 500, headers, body: JSON.stringify({ error: `Error en el servidor: ${error.message}` }) };
    }
};