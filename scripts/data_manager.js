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
        url = `${DB_API_FUNCTION_URL}?action=${action}`;
    }

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Error de API: ${errorData.error || 'Fallo desconocido'}`);
        }
        return response.json();
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

async function getAllUsers() {
    const result = await callDB('get_all_users', {}, 'GET');
    return result.users || [];
}

// --- API DE ALUMNO ---
async function submitStudentReport(practiceId, studentUid, reportUrl) {
    await callDB('submit_report', { practiceId, studentUid, reportUrl });
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