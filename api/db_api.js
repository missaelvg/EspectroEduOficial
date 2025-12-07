// api/db_api.js
// API Central para interactuar con Firebase Firestore de manera segura (Server-Side).
const admin = require('firebase-admin');

let db;

// Inicialización de Firebase Admin usando variables de entorno para seguridad
if (!admin.apps.length) {
    try {
        if (!process.env.FIREBASE_ADMIN_CREDENTIALS) {
            throw new Error("Credenciales de administración no encontradas.");
        }
        const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIALS);
        // Corrección de formato de llave privada para entornos Vercel
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        db = admin.firestore();
    } catch (e) {
        console.error('Error inicialización Firebase Admin:', e);
    }
} else {
    db = admin.firestore();
}

module.exports = async (req, res) => {
    // Configuración de CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (!db) return res.status(500).json({ error: "Error de conexión con Base de Datos" });

    try {
        // Unificación de entrada de datos (body para POST, query para GET)
        let action, data;
        if (req.method === 'POST') {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            action = body.action; data = body.data;
        } else { 
            action = req.query.action; data = req.query;
        }

        if (!action) return res.status(400).json({ error: "Acción no especificada" });

        // --- BLOQUE 1: GESTIÓN DE PRÁCTICAS Y USUARIOS (Docente/Admin) ---
        
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
            // Estructura inicial de una práctica (RF-05)
            const cleanData = {
                title: data.title,
                students: {},
                generatedContent: null,
                slidesPdfUrl: "", standardPdfUrl: "", manualPdfUrl: "", 
                slidesText: "", standardText: "",
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

        // --- BLOQUE 2: GESTIÓN DE ALUMNOS (Inscripción) ---

        if (action === 'enroll_student_to_practice') {
            // Inicializa el estado del estudiante en la práctica
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
            // Protege matrícula y rol, solo permite actualizar otros datos (RF-04)
            const { matricula, role, uid, ...allowedUpdates } = data.updateData;
            await db.collection('users').doc(data.uid).update(allowedUpdates);
            return res.status(200).json({ message: 'OK' });
        }

        if (action === 'delete_user') {
            try { await admin.auth().deleteUser(data.uid); } catch (e) {}
            await db.collection('users').doc(data.uid).delete();
            return res.status(200).json({ message: 'OK' });
        }

        // --- BLOQUE 3: PROGRESO DEL ESTUDIANTE (Entregas y Notas) ---

        if (action === 'submit_report') {
            // Actualiza el reporte y la nota asignada por la IA (RF-10)
            const updateData = {
                [`students.${data.studentUid}.reportUrl`]: data.reportUrl,
                [`students.${data.studentUid}.status`]: 'Reporte Evaluado',
                [`students.${data.studentUid}.reportSubmittedAt`]: new Date().toISOString()
            };
            if (data.reportScore) updateData[`students.${data.studentUid}.reportScore`] = data.reportScore;
            if (data.reportFeedback) updateData[`students.${data.studentUid}.reportFeedback`] = data.reportFeedback;

            await db.collection('practices').doc(data.practiceId).update(updateData);
            return res.status(200).json({ message: 'OK' });
        }

        if (action === 'update_student_progress') {
            // Actualización genérica de progreso (Cuestionarios/Crucigramas)
            const practiceRef = db.collection('practices').doc(data.practiceId);
            const updateData = {};
            if (data.status) updateData[`students.${data.studentUid}.status`] = data.status;
            if (data.quizScore !== undefined) updateData[`students.${data.studentUid}.quizScore`] = data.quizScore;
            if (data.crosswordScore !== undefined) updateData[`students.${data.studentUid}.crosswordScore`] = data.crosswordScore;
            
            if (data.completed !== undefined) {
                updateData[`students.${data.studentUid}.completed`] = data.completed;
                if (data.completed === true) {
                    updateData[`students.${data.studentUid}.completedAt`] = new Date().toISOString();
                }
            }
            
            await practiceRef.update(updateData);
            return res.status(200).json({ message: 'OK' });
        }

        return res.status(400).json({ error: `Acción desconocida: ${action}` });

    } catch (error) {
        console.error("API Error:", error);
        return res.status(500).json({ error: error.message });
    }
};