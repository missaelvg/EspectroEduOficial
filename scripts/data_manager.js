// scripts/data_manager.js (VERSIÓN ROBUSTA Y SEGURA)

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
        
        // Verificar el tipo de contenido de la respuesta
        const contentType = response.headers.get("content-type");
        
        if (contentType && contentType.includes("application/json")) {
            // Es JSON, procedemos normalmente
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || `Error del servidor: ${response.status}`);
            }
            return result;
        } else {
            // NO es JSON (probablemente es la página de error "A server error...")
            const text = await response.text();
            console.error("Respuesta no-JSON del servidor:", text);
            throw new Error(`Fallo crítico del servidor (${response.status}). Revisa los logs de Vercel. Detalle: ${text.substring(0, 100)}...`);
        }

    } catch (e) {
        console.error(`Fallo en callDB [${action}]:`, e);
        throw e; // Re-lanzar para que la vista lo maneje
    }
}

// --- GESTIÓN DE ARCHIVOS ---
async function uploadFile(file, path) {
    if (!file) throw new Error("Archivo no proporcionado.");
    // Asegurarse de que storage esté inicializado
    if (!firebase.storage) throw new Error("Firebase Storage no está disponible.");
    
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
