// api/db_api.js (Servidor Vercel)

const admin = require('firebase-admin');

// Inicializa Firebase Admin SDK
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
            data = event.queryStringParameters;
        }
        
        switch (action) {
            // ... (casos 'get_all_practices', 'get_all_users', etc. se mantienen igual)

            case 'get_all_practices': {
                const snapshot = await db.collection('practices').get();
                const practices = {};
                snapshot.forEach(doc => {
                    practices[doc.id] = { id: doc.id, ...doc.data() };
                });
                return { statusCode: 200, headers, body: JSON.stringify({ practices }) };
            }

            case 'get_all_users': {
                const snapshot = await db.collection('users').get();
                const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                return { statusCode: 200, headers, body: JSON.stringify({ users }) };
            }
            
            case 'create_practice': {
                if (!data) throw new Error("Faltan datos.");
                const ref = await db.collection('practices').add(data);
                return { statusCode: 200, headers, body: JSON.stringify({ practiceId: ref.id }) };
            }

            case 'update_practice_content': {
                 if (!data || !data.practiceId || !data.content) throw new Error("Datos incompletos.");
                 await db.collection('practices').doc(data.practiceId).update({ generatedContent: data.content });
                 return { statusCode: 200, headers, body: JSON.stringify({ message: 'Contenido actualizado' }) };
            }
            
            case 'enroll_student_to_practice': {
                if (!data || !data.practiceId || !data.studentUid) throw new Error("Faltan datos.");
                const practiceRef = db.collection('practices').doc(data.practiceId);
                await practiceRef.update({
                    [`students.${data.studentUid}`]: { status: 'Inscrito', reportUrl: null, quizScore: null, completed: false }
                });
                return { statusCode: 200, headers, body: JSON.stringify({ message: 'Alumno inscrito' }) };
            }

            case 'submit_report': {
                if (!data || !data.practiceId || !data.studentUid || !data.reportUrl) throw new Error("Datos incompletos.");
                const practiceRef = db.collection('practices').doc(data.practiceId);
                await practiceRef.update({
                    [`students.${data.studentUid}.reportUrl`]: data.reportUrl,
                    [`students.${data.studentUid}.status`]: 'Reporte Entregado. Cuestionario pendiente.'
                });
                return { statusCode: 200, headers, body: JSON.stringify({ message: 'Reporte entregado' }) };
            }
            
            // --- NUEVA ACCIÓN ---
            case 'update_student_progress': {
                if (!data || !data.practiceId || !data.studentUid || !data.status) throw new Error("Datos incompletos.");
                const practiceRef = db.collection('practices').doc(data.practiceId);
                const updateData = { [`students.${data.studentUid}.status`]: data.status };
                if(typeof data.quizScore !== 'undefined') {
                    updateData[`students.${data.studentUid}.quizScore`] = data.quizScore;
                }
                await practiceRef.update(updateData);
                return { statusCode: 200, headers, body: JSON.stringify({ message: 'Progreso actualizado' }) };
            }


            case 'submit_quiz': { // Esta acción ahora es el paso final
                if (!data || !data.practiceId || !data.studentUid || typeof data.score === 'undefined') throw new Error("Datos incompletos.");
                const practiceRef = db.collection('practices').doc(data.practiceId);
                const finalGrade = data.score; 

                await practiceRef.update({
                    [`students.${data.studentUid}.quizScore`]: finalGrade, // Se guarda la calificación final
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