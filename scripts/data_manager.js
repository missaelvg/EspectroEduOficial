// scripts/data_manager.js

// URL de la función Netlify que se comunica con Firestore
const DB_API_FUNCTION_URL = "/.netlify/functions/db_api"; 

// --- Funciones de Utilidad de Base de Datos ---

// Función genérica para llamar al backend
async function callDB(action, data = {}, method = 'POST') {
    const options = { method };
    if (method === 'POST' && data) {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify({ action, ...data });
    } else if (method === 'GET') {
        // En un GET, codificamos la acción en la URL si es necesario
        // Pero usaremos POST para simplificar la API de Netlify
    }

    const response = await fetch(DB_API_FUNCTION_URL, options);
    if (!response.ok) {
        throw new Error(`DB Error ${response.status}: Fallo al ejecutar acción: ${action}`);
    }
    return response.json();
}

// --- Implementación de Funciones de Práctica y Usuarios ---

async function getPractices() {
    // Llama al backend para obtener todas las prácticas
    const result = await callDB('get_all_practices', {}, 'GET');
    return result.practices || {};
}

async function createPractice(title, standardPdfUrl, slidesPdfUrl, slidesText) {
    const data = { title, standardPdfUrl, slidesPdfUrl, slidesText };
    // Llama al backend para crear una práctica
    const result = await callDB('create_practice', { data });
    return result.practiceId;
}

async function getAllUsers() {
    // Llama al backend para obtener todos los perfiles de alumno
    const result = await callDB('get_all_users');
    return result.users || [];
}

async function enrollStudent(studentUid, practiceId) {
    // Llama al backend para inscribir al alumno en la práctica
    const result = await callDB('enroll_student', { studentUid, practiceId });
    return result.success;
}

async function saveStudentResults(studentUid, practiceId, results) {
    // Llama al backend para guardar los resultados del alumno (reporte, cuestionario, etc.)
    const result = await callDB('save_results', { studentUid, practiceId, results });
    return result.success;
}