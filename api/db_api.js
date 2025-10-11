// api/db_api.js (Servidor Vercel con Diagnóstico Mejorado)

const admin = require('firebase-admin');

// Función para inicializar Firebase Admin de forma segura
function initializeFirebaseAdmin() {
    // Comprobación CRÍTICA: ¿Existe la variable de entorno?
    if (!process.env.FIREBASE_ADMIN_CREDENTIALS) {
        // Si no existe, lanzamos un error claro.
        throw new Error('La variable de entorno FIREBASE_ADMIN_CREDENTIALS no está configurada en Vercel.');
    }

    // Solo inicializamos si no se ha hecho antes
    if (!admin.apps.length) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } catch (e) {
            // Si el JSON es inválido, lanzamos un error específico.
            throw new Error('Fallo al parsear FIREBASE_ADMIN_CREDENTIALS. Asegúrate de copiar el contenido completo del archivo JSON. Error original: ' + e.message);
        }
    }
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers };
    }

    try {
        // Intentamos inicializar Firebase Admin en cada llamada.
        // La función interna evitará que se reinicie si ya está activa.
        initializeFirebaseAdmin();
        const db = admin.firestore();

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
            
            // ... (el resto de los casos se mantienen igual)
            case 'create_practice': {
                if (!data) throw new Error("Faltan datos.");
                const ref = await db.collection('practices').add(data);
                return { statusCode: 200, headers, body: JSON.stringify({ practiceId: ref.id }) };
            }

            case 'update_practice_content': {
                 if (!data || !data.practiceId || !data.content) throw new Error("Datos incompletos.");
                 await db.collection('practices').doc(data.practiceId).update({ 'generatedContent': data.content, 'slidesPdfUrl': data.slidesPdfUrl, 'standardPdfUrl': data.standardPdfUrl });
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
        // Si algo falla, ahora devolveremos un JSON con el mensaje de error claro.
        console.error("DB_API Fallo:", error);
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ error: `Error en el servidor: ${error.message}` }) 
        };
    }
};