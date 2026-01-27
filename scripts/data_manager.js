// scripts/data_manager.js
// Capa de abstracción para comunicarse con la API Backend (db_api.js).

const DB_API_FUNCTION_URL = "/api/db_api";

// Función genérica para hacer peticiones a la API unificada
async function callDB(action, data = {}, method = 'POST') {
    const options = { method };
    let url = DB_API_FUNCTION_URL;

    if (method === 'POST') {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify({ action, data });
    } else { // GET
        const params = new URLSearchParams({ action, ...data });
        url = `${DB_API_FUNCTION_URL}?${params.toString()}`;
    }

    try {
        const response = await fetch(url, options);
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || `Error del servidor: ${response.status}`);
            }
            return result;
        } else {
            const text = await response.text();
            throw new Error(`Error crítico del servidor (${response.status}).`);
        }
    } catch (e) {
        console.error(`Fallo en callDB [${action}]:`, e);
        throw e;
    }
}

// Subida de archivos a Firebase Storage
async function uploadFile(file, path) {
    if (!file) throw new Error("Archivo no seleccionado.");
    const storageRef = firebase.storage().ref();
    const fileRef = storageRef.child(`${path}/${file.name}`);
    await fileRef.put(file);
    return await fileRef.getDownloadURL();
}

// --- MÉTODOS PÚBLICOS DEL DATA MANAGER ---

// Docente
async function createPractice(practiceData) {
    const result = await callDB('create_practice', practiceData);
    return result.practiceId;
}
async function savePracticeContent(practiceId, content) {
    await callDB('update_practice_content', { practiceId, content });
}
async function enrollStudent(practiceId, studentUid) {
    await callDB('enroll_student_to_practice', { practiceId, studentUid });
}
async function unenrollStudent(practiceId, studentUid) {
    await callDB('unenroll_student', { practiceId, studentUid });
}
async function deletePractice(practiceId) {
    await callDB('delete_practice', { practiceId });
}
async function deleteUser(uid) {
    await callDB('delete_user', { uid });
}
async function getAllUsers() {
    const result = await callDB('get_all_users', {}, 'GET');
    return result.users || [];
}

// Alumno
async function submitStudentReport(practiceId, studentUid, reportUrl) {
    await callDB('submit_report', { practiceId, studentUid, reportUrl });
}
async function updateStudentProgress(practiceId, studentUid, data) {
    await callDB('update_student_progress', { practiceId, studentUid, ...data });
}
async function updateUserProfile(uid, updateData) {
    await callDB('update_user_profile', { uid, updateData });
}

// General
async function getPractices() {
    const result = await callDB('get_all_practices', {}, 'GET');
    return result.practices || {};
}

async function descargarBitacoraCompleta() {
    try {
        const practices = await getPractices();
        // Intentar obtener logs de acceso si creaste la colección
        const accessSnapshot = await db.collection('access_logs').orderBy('timestamp', 'desc').limit(100).get();
        
        let csvContent = "\ufeff"; // BOM para que Excel reconozca tildes
        
        // SECCIÓN 1: ACTIVIDAD ACADÉMICA
        csvContent += "--- REPORTE DE ACTIVIDAD ACADÉMICA ---\n";
        csvContent += "Práctica,ID Alumno,Estado,Última Actividad,Calificación IA\n";
        
        Object.values(practices).forEach(p => {
            if (p.students) {
                Object.entries(p.students).forEach(([uid, data]) => {
                    csvContent += `${p.title},${uid},${data.status},${data.reportSubmittedAt || data.completedAt || 'N/A'},${data.reportScore || 0}\n`;
                });
            }
        });

        // SECCIÓN 2: AUDITORÍA DE ACCESOS
        csvContent += "\n--- HISTORIAL DE ACCESOS (SEGURIDAD) ---\n";
        csvContent += "ID Usuario,Evento,Fecha y Hora\n";
        
        accessSnapshot.forEach(doc => {
            const log = doc.data();
            csvContent += `${log.uid},${log.event},${log.timestamp}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `auditoria_completa_espectroedu.csv`;
        link.click();
    } catch (e) {
        console.error("Error al generar reporte:", e);
    }
}