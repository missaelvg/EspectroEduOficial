// api/db_api.js (VERSIÓN CON BORRADO Y EDICIÓN)
const admin = require('firebase-admin');

let db;

// Inicialización de Firebase (solo una vez)
if (!admin.apps.length) {
    try {
        if (!process.env.FIREBASE_ADMIN_CREDENTIALS) {
            throw new Error("Falta la variable de entorno FIREBASE_ADMIN_CREDENTIALS");
        }
        const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        db = admin.firestore();
    } catch (e) {
        console.error('Error al inicializar Firebase:', e);
    }
} else {
    db = admin.firestore();
}

module.exports = async (req, res) => {
    // 1. Manejo de CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (!db) {
        return res.status(500).json({ error: "Error crítico: No se pudo conectar a la base de datos." });
    }

    try {
        let action, data;

        if (req.method === 'POST') {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            action = body.action;
            data = body.data;
        } else { // GET
            action = req.query.action;
            data = req.query;
        }

        if (!action) {
            return res.status(400).json({ error: "No se especificó ninguna acción." });
        }

        // --- LÓGICA DE LA BASE DE DATOS ---

        // GET: Obtener Prácticas
        if (action === 'get_all_practices') {
            const snapshot = await db.collection('practices').get();
            const practices = {};
            snapshot.forEach(doc => { practices[doc.id] = { id: doc.id, ...doc.data() }; });
            return res.status(200).json({ practices });
        }

        // GET: Obtener Usuarios
        if (action === 'get_all_users') {
            const snapshot = await db.collection('users').get();
            const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return res.status(200).json({ users });
        }

        // POST: Crear Práctica
        if (action === 'create_practice') {
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
            return res.status(200).json({ practiceId: ref.id });
        }

        // POST: Actualizar Contenido
        if (action === 'update_practice_content') {
            await db.collection('practices').doc(data.practiceId).update({ generatedContent: data.content });
            return res.status(200).json({ message: 'OK' });
        }

        // POST: Inscribir Alumno
        if (action === 'enroll_student_to_practice') {
            await db.collection('practices').doc(data.practiceId).update({
                [`students.${data.studentUid}`]: { 
                    status: 'Inscrito', 
                    reportUrl: null, 
                    quizScore: null, 
                    completed: false 
                }
            });
            return res.status(200).json({ message: 'OK' });
        }

        // POST: Desinscribir Alumno (NUEVO)
        if (action === 'unenroll_student') {
            if (!data.practiceId || !data.studentUid) throw new Error("Faltan datos.");
            // Usamos FieldValue.delete() para borrar la clave del mapa
            await db.collection('practices').doc(data.practiceId).update({
                [`students.${data.studentUid}`]: admin.firestore.FieldValue.delete()
            });
            return res.status(200).json({ message: 'Alumno desinscrito correctamente' });
        }

        // POST: Borrar Práctica (NUEVO)
        if (action === 'delete_practice') {
            if (!data.practiceId) throw new Error("Falta el ID de la práctica.");
            await db.collection('practices').doc(data.practiceId).delete();
            return res.status(200).json({ message: 'Práctica eliminada' });
        }

        // POST: Entregar Reporte
        if (action === 'submit_report') {
            await db.collection('practices').doc(data.practiceId).update({
                [`students.${data.studentUid}.reportUrl`]: data.reportUrl,
                [`students.${data.studentUid}.status`]: 'Reporte Entregado'
            });
            return res.status(200).json({ message: 'OK' });
        }

        // POST: Entregar Cuestionario/Finalizar
        if (action === 'submit_quiz') {
            await db.collection('practices').doc(data.practiceId).update({
                [`students.${data.studentUid}.quizScore`]: data.score,
                [`students.${data.studentUid}.status`]: 'Práctica Finalizada',
                [`students.${data.studentUid}.completed`]: true
            });
            return res.status(200).json({ message: 'OK', finalGrade: data.score });
        }

        return res.status(400).json({ error: `Acción desconocida: ${action}` });

    } catch (error) {
        console.error("API Error:", error);
        return res.status(500).json({ error: error.message });
    }
};