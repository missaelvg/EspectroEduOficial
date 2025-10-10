// scripts/data_manager.js

// 🚨 CORRECCIÓN: URL CAMBIADA DE NETLIFY A VERCEL/API 🚨
const DB_API_FUNCTION_URL = "/api/db_api"; 

// --- Funciones de Utilidad de Base de Datos ---

// Función genérica para llamar al backend
async function callDB(action, data = {}, method = 'POST') {
    const options = { method };
    if (method === 'POST' && data) {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify({ action, ...data });
    } else if (method === 'GET') {
        // En Vercel, es mejor usar POST para todo el tráfico de la DB.
    }

    const response = await fetch(DB_API_FUNCTION_URL, options);
    if (!response.ok) {
        throw new Error(`DB Error ${response.status}: Fallo al ejecutar acción: ${action}`);
    }
    return response.json();
}

// --- Implementación de Funciones de Práctica y Usuarios (Llaman al backend) ---

async function getPractices() {
    // LLama a la función db_api.js para obtener las prácticas desde Firestore
    const result = await callDB('get_all_practices', {}, 'GET');
    return result.practices || {};
}

async function createPractice(practiceData) {
    // Llama a db_api.js para crear una práctica
    const result = await callDB('create_practice', { data: practiceData });
    return result.practiceId;
}

async function getAllUsers() {
    // Llama a db_api.js para obtener todos los perfiles de alumno
    const result = await callDB('get_all_users', {}, 'GET');
    return result.users || [];
}

async function enrollStudent(studentUid, practiceId) {
    // Llama a db_api.js para inscribir al alumno en la práctica
    const result = await callDB('enroll_student', { studentUid, practiceId });
    return result.success;
}

async function saveStudentResults(studentUid, practiceId, results) {
    // Llama al backend para guardar los resultados del alumno (reporte, cuestionario, etc.)
    const result = await callDB('save_results', { studentUid, practiceId, results });
    return result.success;
}