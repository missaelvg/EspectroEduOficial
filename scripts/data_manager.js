async function callDB(action, data = {}, method = 'POST') {
    try {
        if (action === 'get_all_practices') {
            const snapshot = await db.collection('practices').get();
            const practices = {};
            snapshot.forEach(doc => { practices[doc.id] = { id: doc.id, ...doc.data() }; });
            return { practices };
        }
        if (action === 'create_practice') {
            const cleanData = {
                title: data.title, students: {}, generatedContent: null,
                slidesPdfUrl: "", standardPdfUrl: "", slidesText: "", standardText: "",
                createdAt: new Date().toISOString()
            };
            const ref = await db.collection('practices').add(cleanData);
            return { practiceId: ref.id };
        }
        if (action === 'update_practice_content') {
            await db.collection('practices').doc(data.practiceId).update(data.content);
            return { message: 'OK' };
        }
        if (action === 'get_all_users') {
            const snapshot = await db.collection('users').get();
            const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            return { users };
        }
        if (action === 'enroll_student_to_practice') {
            await db.collection('practices').doc(data.practiceId).update({
                [`students.${data.studentUid}`]: { status: 'Inscrito', reportUrl: null, quizScore: null, crosswordScore: null, reportScore: null, reportFeedback: null, completed: false }
            });
            return { message: 'OK' };
        }
        if (action === 'unenroll_student') {
            await db.collection('practices').doc(data.practiceId).update({
                [`students.${data.studentUid}`]: firebase.firestore.FieldValue.delete()
            });
            return { message: 'OK' };
        }
        if (action === 'delete_practice') {
            await db.collection('practices').doc(data.practiceId).delete();
            return { message: 'OK' };
        }
        if (action === 'delete_user') {
            await db.collection('users').doc(data.uid).delete(); 
            return { message: 'OK' };
        }
        if (action === 'submit_report') {
            const updateData = {
                [`students.${data.studentUid}.reportUrl`]: data.reportUrl,
                [`students.${data.studentUid}.status`]: 'Reporte Evaluado',
                [`students.${data.studentUid}.reportSubmittedAt`]: new Date().toISOString()
            };
            if (data.reportScore !== undefined && data.reportScore !== null) updateData[`students.${data.studentUid}.reportScore`] = data.reportScore;
            if (data.reportFeedback !== undefined && data.reportFeedback !== null) updateData[`students.${data.studentUid}.reportFeedback`] = data.reportFeedback;
            await db.collection('practices').doc(data.practiceId).update(updateData);
            return { message: 'OK' };
        }
        if (action === 'update_student_progress') {
            const updateData = {};
            if (data.status) updateData[`students.${data.studentUid}.status`] = data.status;
            if (data.quizScore !== undefined) updateData[`students.${data.studentUid}.quizScore`] = data.quizScore;
            if (data.crosswordScore !== undefined) updateData[`students.${data.studentUid}.crosswordScore`] = data.crosswordScore;
            if (data.completed !== undefined) {
                updateData[`students.${data.studentUid}.completed`] = data.completed;
                if (data.completed === true) updateData[`students.${data.studentUid}.completedAt`] = new Date().toISOString();
            }
            await db.collection('practices').doc(data.practiceId).update(updateData);
            return { message: 'OK' };
        }
        if (action === 'update_user_profile') {
            const { matricula, role, uid, ...allowedUpdates } = data.updateData;
            await db.collection('users').doc(data.uid).update(allowedUpdates);
            return { message: 'OK' };
        }
        throw new Error(`Acción desconocida: ${action}`);
    } catch (e) {
        console.error(`Fallo en callDB local [${action}]:`, e);
        throw e;
    }
}

async function uploadFile(file, path) {
    if (!file) throw new Error("Archivo no seleccionado.");
    const storageRef = firebase.storage().ref();
    const fileRef = storageRef.child(`${path}/${file.name}`);
    await fileRef.put(file);
    return await fileRef.getDownloadURL();
}

async function createPractice(practiceData) { return (await callDB('create_practice', practiceData)).practiceId; }
async function savePracticeContent(practiceId, content) { await callDB('update_practice_content', { practiceId, content }); }
async function enrollStudent(practiceId, studentUid) { await callDB('enroll_student_to_practice', { practiceId, studentUid }); }
async function unenrollStudent(practiceId, studentUid) { await callDB('unenroll_student', { practiceId, studentUid }); }
async function deletePractice(practiceId) { await callDB('delete_practice', { practiceId }); }
async function deleteUser(uid) { await callDB('delete_user', { uid }); }
async function getAllUsers() { return (await callDB('get_all_users', {}, 'GET')).users || []; }
async function submitStudentReport(practiceId, studentUid, reportUrl) { await callDB('submit_report', { practiceId, studentUid, reportUrl }); }
async function updateStudentProgress(practiceId, studentUid, data) { await callDB('update_student_progress', { practiceId, studentUid, ...data }); }
async function updateUserProfile(uid, updateData) { await callDB('update_user_profile', { uid, updateData }); }
async function getPractices() { return (await callDB('get_all_practices', {}, 'GET')).practices || {}; }

async function descargarBitacoraAuditoria() {
    try {
        const practices = await getPractices();
        let accessLogs = [];
        try {
            const snapshot = await db.collection('access_logs').orderBy('timestamp', 'desc').limit(100).get();
            accessLogs = snapshot.docs.map(doc => doc.data());
        } catch (e) {}
        
        let csvContent = "\ufeff--- REPORTE DE TRAZABILIDAD ACADÉMICA ---\nPráctica,ID Alumno,Estado,Fecha Actividad,Nota IA\n";
        Object.values(practices).forEach(p => {
            if (p.students) {
                Object.entries(p.students).forEach(([uid, data]) => {
                    csvContent += `${p.title.replace(/,/g, "")},${uid},${data.status},${data.reportSubmittedAt || data.completedAt || "N/A"},${data.reportScore || 0}\n`;
                });
            }
        });

        csvContent += "\n--- REGISTRO DE INICIOS DE SESIÓN ---\nID Usuario,Evento,Fecha y Hora\n";
        accessLogs.forEach(log => { csvContent += `${log.uid},${log.event},${log.timestamp}\n`; });

        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
        link.download = `auditoria_espectroedu_${new Date().getTime()}.csv`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } catch (e) { alert("Error al generar el reporte: " + e.message); }
}
