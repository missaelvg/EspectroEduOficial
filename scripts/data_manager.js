// scripts/data_manager.js

const DB_API_FUNCTION_URL = "/api/db_api";

// --- Función de Utilidad ---
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
                throw new Error(result.error || `Error lógico del servidor: ${response.status}`);
            }
            return result;
        } else {
            const text = await response.text();
            console.error("Respuesta crítica del servidor (No JSON):", text);
            throw new Error(`Error de Servidor (${response.status}). Posible falta de credenciales en Vercel.`);
        }

    } catch (e) {
        console.error(`Fallo en callDB [${action}]:`, e);
        throw e;
    }
}

// --- GESTIÓN DE ARCHIVOS ---
async function uploadFile(file, path) {
    if (!file) throw new Error("Archivo no proporcionado.");
    const storageRef = firebase.storage().ref();
    const fileRef = storageRef.child(`${path}/${file.name}`);
    await fileRef.put(file);
    return await fileRef.getDownloadURL();
}

// --- API DE DOCTOR ---
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

// NUEVO: Sacar a un alumno de una práctica
async function unenrollStudent(practiceId, studentUid) {
    await callDB('unenroll_student', { practiceId, studentUid });
}

// NUEVO: Borrar práctica
async function deletePractice(practiceId) {
    await callDB('delete_practice', { practiceId });
}

async function getAllUsers() {
    const result = await callDB('get_all_users', {}, 'GET');
    return result.users || [];
}

// --- API DE ALUMNO ---
async function submitStudentReport(practiceId, studentUid, reportUrl) {
    await callDB('submit_report', { practiceId, studentUid, reportUrl });
}

async function updateStudentProgress(practiceId, studentUid, status, quizScore) {
    await callDB('update_student_progress', { practiceId, studentUid, status, quizScore });
}

async function submitStudentQuiz(practiceId, studentUid, score) {
    const result = await callDB('submit_quiz', { practiceId, studentUid, score });
    return result.finalGrade;
}

// --- API GENERAL ---
async function getPractices() {
    const result = await callDB('get_all_practices', {}, 'GET');
    return result.practices || {};
}