// api/db_api.js (VERSIÓN CON FECHAS DE ENTREGA)
const admin = require('firebase-admin');

let db;

if (!admin.apps.length) {
    try {
        if (!process.env.FIREBASE_ADMIN_CREDENTIALS) {
            throw new Error("Falta variable de entorno FIREBASE_ADMIN_CREDENTIALS");
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
        console.error('Error inicialización Firebase:', e);
    }
} else {
    db = admin.firestore();
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (!db) return res.status(500).json({ error: "Error DB conexión" });

    try {
        let action, data;
        if (req.method === 'POST') {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            action = body.action; data = body.data;
        } else { 
            action = req.query.action; data = req.query;
        }

        if (!action) return res.status(400).json({ error: "Sin acción" });

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
                slidesPdfUrl: "", standardPdfUrl: "", slidesText: "", standardText: "",
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

        // --- ALUMNOS ---
        if (action === 'enroll_student_to_practice') {
            await db.collection('practices').doc(data.practiceId).update({
                [`students.${data.studentUid}`]: { 
                    status: 'Inscrito', reportUrl: null, quizScore: null, crosswordScore: null, 
                    reportScore: null, reportFeedback: null, completed: false 
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

        if (action === 'update_user_profile') {
            const { matricula, role, uid, ...allowedUpdates } = data.updateData;
            await db.collection('users').doc(data.uid).update(allowedUpdates);
            return res.status(200).json({ message: 'OK' });
        }

        if (action === 'delete_user') {
            try { await admin.auth().deleteUser(data.uid); } catch (e) {}
            await db.collection('users').doc(data.uid).delete();
            return res.status(200).json({ message: 'OK' });
        }

        // --- PROGRESO CON FECHAS ---
        if (action === 'submit_report') {
            const updateData = {
                [`students.${data.studentUid}.reportUrl`]: data.reportUrl,
                [`students.${data.studentUid}.status`]: 'Reporte Evaluado',
                [`students.${data.studentUid}.reportSubmittedAt`]: new Date().toISOString() // FECHA REPORTE
            };
            if (data.reportScore) updateData[`students.${data.studentUid}.reportScore`] = data.reportScore;
            if (data.reportFeedback) updateData[`students.${data.studentUid}.reportFeedback`] = data.reportFeedback;

            await db.collection('practices').doc(data.practiceId).update(updateData);
            return res.status(200).json({ message: 'OK' });
        }

        if (action === 'update_student_progress') {
            const practiceRef = db.collection('practices').doc(data.practiceId);
            const updateData = {};
            if (data.status) updateData[`students.${data.studentUid}.status`] = data.status;
            if (data.quizScore !== undefined) updateData[`students.${data.studentUid}.quizScore`] = data.quizScore;
            if (data.crosswordScore !== undefined) updateData[`students.${data.studentUid}.crosswordScore`] = data.crosswordScore;
            
            if (data.completed !== undefined) {
                updateData[`students.${data.studentUid}.completed`] = data.completed;
                if (data.completed === true) {
                    updateData[`students.${data.studentUid}.completedAt`] = new Date().toISOString(); // FECHA FINALIZACIÓN
                }
            }
            
            await practiceRef.update(updateData);
            return res.status(200).json({ message: 'OK' });
        }

        if (action === 'submit_quiz') {
            await db.collection('practices').doc(data.practiceId).update({
                [`students.${data.studentUid}.quizScore`]: data.score,
                [`students.${data.studentUid}.status`]: 'Práctica Finalizada',
                [`students.${data.studentUid}.completed`]: true,
                [`students.${data.studentUid}.completedAt`]: new Date().toISOString() // FECHA FINALIZACIÓN
            });
            return res.status(200).json({ message: 'OK' });
        }

        return res.status(400).json({ error: `Acción desconocida: ${action}` });

    } catch (error) {
        console.error("API Error:", error);
        return res.status(500).json({ error: error.message });
    }
};