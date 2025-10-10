// scripts/data_manager.js

// Manejo de Prácticas
const PRACTICES_KEY = 'practices';

function getPractices() {
    return JSON.parse(localStorage.getItem(PRACTICES_KEY)) || {};
}

function savePractices(practices) {
    localStorage.setItem(PRACTICES_KEY, JSON.stringify(practices));
}

// Manejo de Usuarios
function getAllUsers() {
    return JSON.parse(localStorage.getItem('users')) || [];
}

// Inscripción de alumno en práctica
function enrollStudent(matricula, practiceId) {
    const practices = getPractices();
    const users = getAllUsers();
    const student = users.find(u => u.matricula === matricula && u.role === 'alumno');

    if (!student) return false;

    practices[practiceId].students[matricula] = {
        name: student.username,
        score: null,
        reportStatus: 'pending',
        quizStatus: 'pending',
        crosswordStatus: 'pending',
        reportScore: null,
        finalScore: null
    };

    savePractices(practices);
    return true;
}

// Obtener los datos del alumno en una práctica específica
function getStudentPracticeData(matricula, practiceId) {
    const practices = getPractices();
    return practices[practiceId]?.students[matricula];
}

// Guardar los resultados de un alumno
function saveStudentResults(matricula, practiceId, results) {
    const practices = getPractices();
    if (!practices[practiceId] || !practices[practiceId].students[matricula]) return;

    // Actualiza solo los campos que cambian (score, status, etc.)
    Object.assign(practices[practiceId].students[matricula], results);
    savePractices(practices);
}