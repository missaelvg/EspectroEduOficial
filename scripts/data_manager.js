// scripts/data_manager.js

const DB_API_FUNCTION_URL = "/api/db_api"; 

// --- Funciones de Utilidad de Base de Datos ---

async function callDB(action, data = {}, method = 'POST') {
    const options = { method };
    let url = DB_API_FUNCTION_URL;

    if (method === 'POST') {
        options.headers = { 'Content-Type': 'application/json' };
        options.body = JSON.stringify({ action, ...data });
    } else if (method === 'GET') {
        // 🚨 CORRECCIÓN: Construir la URL con el parámetro 'action'
        url = `${DB_API_FUNCTION_URL}?action=${action}`;
    }

    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`DB Error ${response.status}: Fallo al ejecutar acción: ${action}`);
    }
    return response.json();
}

// --- Implementación de Funciones de Práctica y Usuarios (Llaman al backend) ---

async function getPractices() {
    // LLama a la función db_api.js para obtener las prácticas desde Firestore (GET)
    const result = await callDB('get_all_practices', {}, 'GET'); 
    return result.practices || {};
}

// El resto de las funciones (createPractice, getAllUsers, etc.) permanece igual.
// ... (asegúrate de mantener el resto del archivo data_manager.js) ...