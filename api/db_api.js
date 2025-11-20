// api/db_api.js (VERSIÓN BLINDADA)
const admin = require('firebase-admin');

let db;
let initError = null;

// Inicialización segura fuera del handler
if (!admin.apps.length) {
    try {
        if (!process.env.FIREBASE_ADMIN_CREDENTIALS) {
            throw new Error("La variable de entorno FIREBASE_ADMIN_CREDENTIALS falta.");
        }

        // 1. Parsear el JSON
        const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);

        // 2. CORRECCIÓN CRÍTICA PARA VERCEL: Arreglar los saltos de línea en la clave privada
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        // 3. Inicializar
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        db = admin.firestore(); 
        console.log("Firebase Admin inicializado correctamente.");

    } catch (e) {
        console.error('CRASH DE INICIALIZACIÓN:', e.message);
        // Guardamos el error para devolverlo al cliente sin romper el servidor
        initError = e.message;
    }
} else {
    db = admin.firestore();
}

exports.handler = async (event) => {
    // Headers para permitir CORS (Conexión desde cualquier sitio)
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json' // Forzamos JSON siempre
    };

    // Manejo de Preflight request (CORS)
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers, body: '' };
    }

    // Si la base de datos falló al iniciar, devolvemos el error en JSON (no HTML)
    if (initError) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: `Error de Configuración Backend: ${initError}` })
        };
    }

    try {
        let action, data;
        
        // Parseo de parámetros (GET vs POST)
        if (event.httpMethod === 'POST') {
            if (!event.body) throw new Error("El cuerpo de la petición está vacío.");
            const body = JSON.parse(event.body);
            action = body.action;
            data = body.data;
        } else { 
            action = event.queryStringParameters?.action;
            data = event.queryStringParameters;
        }

        if (!action) throw new Error("No se especificó ninguna acción.");

        // --- RUTAS DE LA BASE DE DATOS ---
        
        // 1. Obtener Prácticas
        if (action === 'get_all_practices') {
            const snapshot = await db.collection('practices').get();
            const practices = {};
            snapshot.forEach(doc => { practices[doc.id] = { id: doc.id, ...doc.data() }; });
            return { statusCode: 200, headers, body: JSON.stringify({ practices }) };
        }

        // 2. Obtener Usuarios
        if (action === 'get_all_users') {
            const snapshot = await db.collection('users').get();
            const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return { statusCode: 200, headers, body: JSON.stringify({ users }) };
        }

        // 3. Crear Práctica
        if (action === 'create_practice') {
            // Validación básica
            if (!data || !data.title) throw new Error("Datos inválidos para crear práctica.");
            // Aseguramos campos mínimos
            const cleanData = {
                title: data.title,
                students: {},
                generatedContent: null,
                slidesPdfUrl: data.slidesPdfUrl || "",
                standardPdfUrl: data.standardPdfUrl || "",
                slidesText: data.slidesText || "",
                createdAt: new Date().toISOString()
            };
            const ref = await db.collection('practices').add(cleanData);
            return { statusCode: 200, headers, body: JSON.stringify({ practiceId: ref.id }) };
        }

        // 4. Actualizar Contenido (IA)
        if (action === 'update_practice_content') {
            if (!data.practiceId || !data.content) throw new Error("Faltan ID o contenido.");
            await db.collection('practices').doc(data.practiceId).update({ generatedContent: data.content });
            return { statusCode: 200, headers, body: JSON.stringify({ message: 'OK' }) };
        }

        // 5. Inscribir Alumno
        if (action === 'enroll_student_to_practice') {
            if (!data.practiceId || !data.studentUid) throw new Error("Faltan datos de inscripción.");
            await db.collection('practices').doc(data.practiceId).update({
                [`students.${data.studentUid}`]: { 
                    status: 'Inscrito', 
                    reportUrl: null, 
                    quizScore: null, 
                    completed: false 
                }
            });
            return { statusCode: 200, headers, body: JSON.stringify({ message: 'OK' }) };
        }

        // 6. Entregar Reporte
        if (action === 'submit_report') {
            await db.collection('practices').doc(data.practiceId).update({
                [`students.${data.studentUid}.reportUrl`]: data.reportUrl,
                [`students.${data.studentUid}.status`]: 'Reporte Entregado'
            });
            return { statusCode: 200, headers, body: JSON.stringify({ message: 'OK' }) };
        }

        // 7. Entregar Cuestionario/Finalizar
        if (action === 'submit_quiz') {
            await db.collection('practices').doc(data.practiceId).update({
                [`students.${data.studentUid}.quizScore`]: data.score,
                [`students.${data.studentUid}.status`]: 'Práctica Finalizada',
                [`students.${data.studentUid}.completed`]: true
            });
            return { statusCode: 200, headers, body: JSON.stringify({ message: 'OK', finalGrade: data.score }) };
        }

        // 8. Acción desconocida
        return { statusCode: 400, headers, body: JSON.stringify({ error: `Acción desconocida: ${action}` }) };

    } catch (error) {
        console.error("API ERROR:", error);
        // Devolver el error como JSON para que el frontend lo entienda
        return { 
            statusCode: 500, 
            headers, 
            body: JSON.stringify({ error: error.message || "Error interno del servidor" }) 
        };
    }
};