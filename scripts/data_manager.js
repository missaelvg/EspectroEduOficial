// scripts/data_manager.js

// Asegúrate de que tu firebase_config.js también inicializa storage
// const storage = firebase.storage();

const DB_API_FUNCTION_URL = "/api/db_api";

// --- Funciones de Utilidad de Base de Datos ---

async function callDB(action, data = {}, method = 'POST') {
    const options = { method };
    let url = DB_API_FUNCTION_URL;

    if (method === 'POST') {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify({ action, data });
    } else { // GET
        url = `${DB_API_FUNCTION_URL}?action=${action}`;
        // Podrías añadir más parámetros si fuera necesario
    }

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`DB Error ${response.status}: ${errorData.error}`);
        }
        return response.json();
    } catch (e) {
        console.error(`Fallo al ejecutar acción [${action}]:`, e);
        throw e; // Relanzar el error para que la función que llama lo maneje
    }
}


// --- GESTIÓN DE ARCHIVOS ---

/**
 * Sube un archivo a Firebase Storage.
 * @param {File} file - El archivo a subir.
 * @param {string} path - La ruta en Storage donde se guardará (ej. 'practices/practiceId').
 * @returns {Promise<string>} La URL de descarga del archivo.
 */
async function uploadFile(file, path) {
    if (!file) throw new Error("Archivo no proporcionado.");
    const storageRef = firebase.storage().ref();
    const fileRef = storageRef.child(`${path}/${file.name}`);
    await fileRef.put(file);
    const url = await fileRef.getDownloadURL();
    return url;
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


// --- API GENERAL ---

async function getPractices() {
    const result = await callDB('get_all_practices', {}, 'GET');
    return result.practices || {};
}