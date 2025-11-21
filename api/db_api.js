// api/db_api.js (VERSIÓN CON GESTIÓN DE USUARIOS)
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

        // GET
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

        // POST: Prácticas
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

        if (action === 'update_practice_content') {
            await db.collection('practices').doc(data.practiceId).update(data.content);
            return res.status(200).json({ message: 'OK' });
        }

        if (action === 'delete_practice') {
            await db.collection('practices').doc(data.practiceId).delete();
            return res.status(200).json({ message: 'Práctica eliminada' });
        }

        // POST: Gestión de Alumnos en Prácticas
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

        if (action === 'unenroll_student') {
            await db.collection('practices').doc(data.practiceId).update({
                [`students.${data.studentUid}`]: admin.firestore.FieldValue.delete()
            });
            return res.status(200).json({ message: 'Alumno desinscrito' });
        }

        // POST: Gestión de Perfiles (NUEVO)
        
        // Actualizar datos del alumno (excepto matrícula)
        if (action === 'update_user_profile') {
            if (!data.uid || !data.updateData) throw new Error("Faltan datos.");
            
            // Filtramos para que NO se pueda cambiar la matrícula ni el rol por seguridad
            const { matricula, role, uid, ...allowedUpdates } = data.updateData;
            
            // Actualizamos Firestore
            await db.collection('users').doc(data.uid).update(allowedUpdates);
            
            // Si cambió el email, intentamos actualizarlo en Auth también
            if (allowedUpdates.email) {
                try {
                    await admin.auth().updateUser(data.uid, { email: allowedUpdates.email });
                } catch(e) {
                    console.warn("No se pudo actualizar el email en Auth (puede requerir re-login):", e);
                }
            }
            return res.status(200).json({ message: 'Perfil actualizado' });
        }

        // Eliminar usuario completo (Docente)
        if (action === 'delete_user') {
            if (!data.uid) throw new Error("Falta el UID.");
            
            // 1. Borrar de Authentication (Login)
            try {
                await admin.auth().deleteUser(data.uid);
            } catch (e) {
                console.warn("Usuario no encontrado en Auth o ya borrado:", e);
            }

            // 2. Borrar de Firestore (Datos)
            await db.collection('users').doc(data.uid).delete();
            
            return res.status(200).json({ message: 'Usuario eliminado correctamente del sistema' });
        }

        // POST: Acciones del Alumno
        if (action === 'submit_report') {
            await db.collection('practices').doc(data.practiceId).update({
                [`students.${data.studentUid}.reportUrl`]: data.reportUrl,
                [`students.${data.studentUid}.status`]: 'Reporte Entregado'
            });
            return res.status(200).json({ message: 'OK' });
        }

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