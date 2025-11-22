// api/db_api.js (VERSIÓN DEFINITIVA PARA CALIFICACIONES DETALLADAS)
const admin = require('firebase-admin');

let db;

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
    // Headers CORS
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
        return res.status(500).json({ error: "Error crítico: Base de datos no conectada." });
    }

    try {
        let action, data;

        if (req.method === 'POST') {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            action = body.action;
            data = body.data;
        } else { 
            action = req.query.action;
            data = req.query;
        }

        if (!action) {
            return res.status(400).json({ error: "No se especificó ninguna acción." });
        }

        // --- RUTAS ---

        if (action === 'get_all_practices') {
            const snapshot = await db.collection('practices').get();
            const practices = {};
            snapshot.forEach(doc => { practices[doc.id] = { id: doc.id, ...doc.data() }; });
            return res.status(200).json({ practices });
        }

        if (action === 'get_all_users') {
            const snapshot = await db.collection('users').get();
            const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return res.status(200).json({ users });
        }

        if (action === 'create_practice') {
            const cleanData = {
                title: data.title,
                students: {},
                generatedContent: null,
                slidesPdfUrl: "", 
                standardPdfUrl: "",
                slidesText: "",
                createdAt: new Date().toISOString()
            };
            const ref = await db.collection('practices').add(cleanData);
            return res.status(200).json({ practiceId: ref.id });
        }

        if (action === 'update_practice_content') {
            await db.collection('practices').doc(data.practiceId).update(data.content);
            return res.status(200).json({ message: 'OK' });
        }

        if (action === 'delete_practice') {
            await db.collection('practices').doc(data.practiceId).delete();
            return res.status(200).json({ message: 'OK' });
        }

        // --- GESTIÓN DE ALUMNOS ---

        if (action === 'enroll_student_to_practice') {
            await db.collection('practices').doc(data.practiceId).update({
                [`students.${data.studentUid}`]: { 
                    status: 'Inscrito', 
                    reportUrl: null, 
                    quizScore: null,
                    crosswordScore: null,
                    completed: false 
                }
            });
            return res.status(200).json({ message: 'OK' });
        }

        if (action === 'unenroll_student') {
            await db.collection('practices').doc(data.practiceId).update({
                [`students.${data.studentUid}`]: admin.firestore.FieldValue.delete()
            });
            return res.status(200).json({ message: 'OK' });
        }

        // --- GESTIÓN DE PERFILES ---

        if (action === 'update_user_profile') {
            if (!data.uid || !data.updateData) throw new Error("Faltan datos.");
            const { matricula, role, uid, ...allowedUpdates } = data.updateData;
            await db.collection('users').doc(data.uid).update(allowedUpdates);
            return res.status(200).json({ message: 'OK' });
        }

        if (action === 'delete_user') {
            if (!data.uid) throw new Error("Falta el UID.");
            try { await admin.auth().deleteUser(data.uid); } catch (e) {}
            await db.collection('users').doc(data.uid).delete();
            return res.status(200).json({ message: 'OK' });
        }

        // --- PROGRESO DEL ALUMNO (ACTUALIZADO) ---

        if (action === 'submit_report') {
            await db.collection('practices').doc(data.practiceId).update({
                [`students.${data.studentUid}.reportUrl`]: data.reportUrl,
                [`students.${data.studentUid}.status`]: 'Reporte Entregado'
            });
            return res.status(200).json({ message: 'OK' });
        }

        if (action === 'update_student_progress') {
            const practiceRef = db.collection('practices').doc(data.practiceId);
            const updateData = {};
            
            // Actualizamos solo los campos que nos envíen
            if (data.status) updateData[`students.${data.studentUid}.status`] = data.status;
            if (typeof data.quizScore !== 'undefined') updateData[`students.${data.studentUid}.quizScore`] = data.quizScore;
            if (typeof data.crosswordScore !== 'undefined') updateData[`students.${data.studentUid}.crosswordScore`] = data.crosswordScore;
            if (typeof data.completed !== 'undefined') updateData[`students.${data.studentUid}.completed`] = data.completed;

            await practiceRef.update(updateData);
            return res.status(200).json({ message: 'OK' });
        }

        return res.status(400).json({ error: `Acción desconocida: ${action}` });

    } catch (error) {
        console.error("API Error:", error);
        return res.status(500).json({ error: error.message });
    }
};