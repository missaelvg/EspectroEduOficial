// scripts/dashboard_views.js (VERSIÓN FINAL Y CORREGIDA)

// Almacén de estado simple para evitar recargar datos innecesariamente
const AppState = {
    user: null,
    practices: null,
    users: null,
};

// ====================================================
// RENDERIZADO PRINCIPAL Y NAVEGACIÓN
// ====================================================

function renderDoctorLayout(user) {
    AppState.user = user;
    document.getElementById('header-title').textContent = `Dr. ${user.username}`;
    const navbar = document.getElementById('navbar');
    // **CORRECCIÓN 1/3: Se añade la clase 'active' por defecto al primer botón**
    navbar.innerHTML = `
        <button class="active" onclick="setActive(this); renderDoctorDashboard();">Dashboard</button>
        <button onclick="setActive(this); renderCreatePracticeView();">Crear Práctica</button>
        <button onclick="setActive(this); renderManageStudentsView();">Gestionar Alumnos</button>
    `;
    renderDoctorDashboard();
    // **CORRECCIÓN 2/3: Se elimina la línea que causaba el error**
    // setActive(navbar.children[0]); // Esta línea se ha borrado
}

function renderStudentLayout(user) {
    AppState.user = user;
    document.getElementById('header-title').textContent = `Alumno: ${user.username}`;
    const navbar = document.getElementById('navbar');
    // **CORRECCIÓN 1/3: Se añade la clase 'active' por defecto al primer botón**
    navbar.innerHTML = `
        <button class="active" onclick="setActive(this); renderStudentDashboard();">Dashboard</button>
        <button onclick="setActive(this); renderStudentPracticesView();">Mis Prácticas</button>
        <button onclick="setActive(this); renderStudentGradesView();">Mis Calificaciones</button>
    `;
    renderStudentDashboard();
    // **CORRECCIÓN 2/3: Se elimina la línea que causaba el error**
    // setActive(navbar.children[0]); // Esta línea se ha borrado
}

// **CORRECCIÓN 3/3: Función para resaltar el botón activo (ahora más robusta)**
function setActive(button) {
    // Primero, quita la clase 'active' de todos los botones de la barra de navegación
    document.querySelectorAll('#navbar button').forEach(btn => btn.classList.remove('active'));
    // Luego, añade la clase 'active' solo al botón que fue presionado
    button.classList.add('active');
}


// ====================================================
// VISTAS DEL DOCTOR (Sin cambios funcionales)
// ====================================================
async function renderDoctorDashboard() {
    const contentDiv = document.getElementById('main-content');
    contentDiv.innerHTML = `<h2>Dashboard del Doctor</h2><div id="practices-summary">Cargando...</div>`;
    try {
        const practices = await getPractices();
        const practicesList = Object.values(practices);
        let html = `<p>Tienes ${practicesList.length} práctica(s) creada(s).</p>`;
        if (practicesList.length === 0) {
            html += `<p>Ve a "Crear Práctica" para empezar.</p>`;
        } else {
            practicesList.forEach(p => {
                const studentCount = Object.keys(p.students || {}).length;
                html += `
                    <div class="card">
                        <h4>${p.title}</h4>
                        <p>${studentCount} alumno(s) inscrito(s).</p>
                        <a href="${p.slidesPdfUrl}" target="_blank" class="btn btn-secondary">Diapositivas</a>
                        <a href="${p.standardPdfUrl}" target="_blank" class="btn btn-secondary">Estándar</a>
                    </div>`;
            });
        }
        document.getElementById('practices-summary').innerHTML = html;
    } catch (e) {
        contentDiv.innerHTML = `<p class="alert-error">Error al cargar el dashboard: ${e.message}</p>`;
    }
}

function renderCreatePracticeView() {
    document.getElementById('main-content').innerHTML = `
        <h2>Crear Nueva Práctica</h2>
        <div class="card">
            <label for="practiceTitle">Título de la Práctica</label>
            <input type="text" id="practiceTitle" placeholder="Ej. Espectroscopía Óptica #1">
            <label for="slidesFile">Diapositivas (PDF)</label>
            <input type="file" id="slidesFile" accept="application/pdf">
            <label for="standardFile">Estándar del Reporte (PDF)</label>
            <input type="file" id="standardFile" accept="application/pdf">
            <button onclick="handlePracticeCreation()">GENERAR PRÁCTICA CON IA</button>
            <div id="creationLog" style="margin-top: 15px;"></div>
        </div>`;
}

async function renderManageStudentsView() {
    const contentDiv = document.getElementById('main-content');
    contentDiv.innerHTML = `<h2>Gestionar Alumnos</h2><div id="students-management-area">Cargando...</div>`;
    try {
        const [practices, users] = await Promise.all([getPractices(), getAllUsers()]);
        const allStudents = users.filter(u => u.role === 'alumno');
        
        const assignedStudents = new Set();
        Object.values(practices).forEach(p => Object.keys(p.students || {}).forEach(id => assignedStudents.add(id)));
        
        const unassignedStudents = allStudents.filter(u => !assignedStudents.has(u.uid));
        
        let html = `<h3>Alumnos sin Práctica Asignada</h3>`;
        if (Object.keys(practices).length === 0) {
            html += `<p>Primero debes crear al menos una práctica para poder inscribir alumnos.</p>`;
        } else if (unassignedStudents.length === 0) {
            html += `<p>Todos los alumnos ya están inscritos en al menos una práctica.</p>`;
        } else {
            unassignedStudents.forEach(student => {
                html += `
                    <div class="student-list-item">
                        <span>${student.username} (${student.matricula})</span>
                        <div>
                            <select id="practice-select-${student.uid}">${Object.values(practices).map(p => `<option value="${p.id}">${p.title}</option>`).join('')}</select>
                            <button onclick="enrollStudentHandler('${student.uid}')">Inscribir</button>
                        </div>
                    </div>`;
            });
        }
        document.getElementById('students-management-area').innerHTML = html;
    } catch (e) {
        document.getElementById('students-management-area').innerHTML = `<p class="alert-error">Error al cargar alumnos: ${e.message}</p>`;
    }
}

// --- MANEJADORES DE LÓGICA DEL DOCTOR ---
async function handlePracticeCreation() {
    const title = document.getElementById('practiceTitle').value;
    const slidesFile = document.getElementById('slidesFile').files[0];
    const standardFile = document.getElementById('standardFile').files[0];
    const logDiv = document.getElementById('creationLog');
    const button = logDiv.previousElementSibling;

    if (!title || !slidesFile || !standardFile) {
        logDiv.innerHTML = '<p class="alert-error">Por favor, rellena todos los campos.</p>';
        return;
    }
    
    button.disabled = true;
    logDiv.innerHTML = '1/5: Creando registro de la práctica...';
    try {
        const practiceId = await createPractice({ title, students: {}, generatedContent: null });
        logDiv.innerHTML = `2/5: Subiendo archivos a la nube...`;
        const [slidesPdfUrl, standardPdfUrl] = await Promise.all([
            uploadFile(slidesFile, `practices/${practiceId}`),
            uploadFile(standardFile, `practices/${practiceId}`)
        ]);
        logDiv.innerHTML = '3/5: Extrayendo texto de las diapositivas...';
        const slidesText = await extractTextFromPDF(slidesFile);
        await db.collection('practices').doc(practiceId).update({ slidesPdfUrl, standardPdfUrl, slidesText });
        logDiv.innerHTML = '4/5: Generando contenido con IA (esto puede tardar)...';
        const generatedContent = await callAIGenerate(slidesText);
        await savePracticeContent(practiceId, generatedContent);
        logDiv.innerHTML = '<p class="alert-success">✅ ¡Práctica creada con éxito!</p>';
        setTimeout(() => {
            const firstButton = document.querySelector('#navbar button');
            setActive(firstButton);
            renderDoctorDashboard();
        }, 2000);
    } catch (e) {
        logDiv.innerHTML = `<p class="alert-error">❌ ERROR: ${e.message}</p>`;
        button.disabled = false;
    }
}

async function enrollStudentHandler(studentUid) {
    const select = document.getElementById(`practice-select-${studentUid}`);
    const practiceId = select.value;
    if (!practiceId) {
        alert("No hay prácticas disponibles para inscribir al alumno.");
        return;
    }
    try {
        await enrollStudent(practiceId, studentUid);
        alert("¡Alumno inscrito con éxito!");
        renderManageStudentsView();
    } catch (e) {
        alert(`Error al inscribir al alumno: ${e.message}`);
    }
}

// ====================================================
// VISTAS DEL ALUMNO
// ====================================================

function renderStudentDashboard() {
    document.getElementById('main-content').innerHTML = `
        <h2>Bienvenido a EspectroEdu</h2>
        <div class="card">
            <p>¡Hola, ${AppState.user.username}!</p>
            <p>Usa la barra de navegación de arriba para acceder a tus prácticas y ver tus calificaciones.</p>
        </div>`;
}

async function renderStudentPracticesView() {
    const contentDiv = document.getElementById('main-content');
    contentDiv.innerHTML = '<h2>Mis Prácticas</h2><div id="student-practices-list">Cargando...</div>';
    try {
        const practices = await getPractices();
        const myPractices = Object.values(practices).filter(p => p.students && p.students[AppState.user.uid]);

        if (myPractices.length === 0) {
            document.getElementById('student-practices-list').innerHTML = '<p>Aún no has sido inscrito en ninguna práctica. Contacta a tu doctor.</p>';
            return;
        }

        const html = myPractices.map(p => {
            const status = p.students[AppState.user.uid];
            let content;

            if (status.completed) { // FASE 3: Finalizada
                content = `<h4>${p.title}</h4><p><strong>Estado:</strong> ${status.status}</p><p>¡Felicidades! Has completado esta práctica. Puedes ver tu resultado en "Mis Calificaciones".</p>`;
            } else if (status.reportUrl) { // FASE 2: Cuestionario
                content = `<h4>${p.title}</h4><p><strong>Estado:</strong> ${status.status}</p><div id="quiz-container-${p.id}"></div>`;
                setTimeout(() => renderQuiz(p), 0);
            } else { // FASE 1: Subir reporte
                content = `
                    <h4>${p.title}</h4><p><strong>Estado:</strong> ${status.status}</p>
                    <p>Descarga los materiales y sube tu reporte en PDF para continuar.</p>
                    <a href="${p.slidesPdfUrl}" target="_blank" class="btn">Descargar Diapositivas</a>
                    <a href="${p.standardPdfUrl}" target="_blank" class="btn">Descargar Estándar</a>
                    <hr style="margin: 20px 0;">
                    <h5>Sube tu Reporte</h5>
                    <input type="file" id="report-file-${p.id}" accept="application/pdf">
                    <button onclick="handleReportUpload('${p.id}')">Entregar Reporte</button>
                    <div class="upload-log" id="log-${p.id}"></div>`;
            }
            return `<div class="card">${content}</div>`;
        }).join('');
        document.getElementById('student-practices-list').innerHTML = html;
    } catch (e) {
        document.getElementById('student-practices-list').innerHTML = `<p class="alert-error">Error al cargar prácticas: ${e.message}</p>`;
    }
}

async function renderStudentGradesView() {
    const contentDiv = document.getElementById('main-content');
    contentDiv.innerHTML = '<h2>Mis Calificaciones</h2><div id="grades-list">Cargando...</div>';
    
    try {
        const gradesListDiv = document.getElementById('grades-list');
        const practices = await getPractices();
        const completedPractices = Object.values(practices).filter(p => p.students?.[AppState.user.uid]?.completed === true);

        if (completedPractices.length === 0) {
            gradesListDiv.innerHTML = '<p>Aún no has completado ninguna práctica.</p>';
            return;
        }

        const html = completedPractices.map(p => {
            const studentData = p.students[AppState.user.uid];
            const score = typeof studentData.quizScore !== 'undefined' ? studentData.quizScore : 'N/A';
            return `
                <div class="card">
                    <h4>${p.title}</h4>
                    <p class="score">Calificación Final: <strong>${score}/10</strong></p>
                </div>`;
        }).join('');
        gradesListDiv.innerHTML = html;
    } catch (e) {
        console.error("Error en renderStudentGradesView:", e);
        contentDiv.innerHTML = `<p class="alert-error">Error al cargar calificaciones: ${e.message}</p>`;
    }
}

// --- MANEJADORES DE LÓGICA DEL ALUMNO ---
async function handleReportUpload(practiceId) {
    const fileInput = document.getElementById(`report-file-${practiceId}`);
    const reportFile = fileInput.files[0];
    const logDiv = document.getElementById(`log-${practiceId}`);
    const button = fileInput.nextElementSibling;

    if (!reportFile) {
        alert("Por favor, selecciona tu reporte en PDF.");
        return;
    }
    
    logDiv.textContent = "Subiendo archivo, por favor espera...";
    button.disabled = true;
    try {
        const reportUrl = await uploadFile(reportFile, `reports/${practiceId}/${AppState.user.uid}`);
        await submitStudentReport(practiceId, AppState.user.uid, reportUrl);
        logDiv.textContent = "";
        alert("¡Reporte entregado con éxito! Ahora puedes continuar con el cuestionario.");
        renderStudentPracticesView();
    } catch (e) {
        logDiv.textContent = `Error: ${e.message}`;
        button.disabled = false;
    }
}

function renderQuiz(practice) {
    const container = document.getElementById(`quiz-container-${practice.id}`);
    const questions = practice.generatedContent?.cuestionario;

    if (!questions || !Array.isArray(questions)) {
        container.innerHTML = "<p class='alert-error'>Error: El cuestionario no está disponible.</p>";
        return;
    }

    let quizHtml = `<h5>Fase 2: Cuestionario</h5><p>Responde las siguientes preguntas para finalizar.</p>`;
    questions.forEach((q, index) => {
        const inputName = `q-${practice.id}-${index}`;
        quizHtml += `<div class="question"><p><strong>${index + 1}. ${q.pregunta}</strong></p>`;
        if (q.tipo === 'opcion' && q.opciones) {
            q.opciones.forEach(op => {
                quizHtml += `<label><input type="radio" name="${inputName}" value="${op}"> ${op}</label><br>`;
            });
        } else {
            quizHtml += `<textarea name="${inputName}" rows="3" placeholder="Escribe tu respuesta..."></textarea>`;
        }
        quizHtml += `</div>`;
    });
    quizHtml += `<button onclick="handleQuizSubmit(event, '${practice.id}')">Entregar Cuestionario</button>`;
    container.innerHTML = quizHtml;
}

async function handleQuizSubmit(event, practiceId) {
    const button = event.target;
    button.disabled = true;
    button.textContent = "Calificando...";

    try {
        const practices = await getPractices();
        const practice = practices[practiceId];
        const questions = practice.generatedContent.cuestionario;
        let correctAnswers = 0;
        
        questions.forEach((q, index) => {
            const inputName = `q-${practice.id}-${index}`;
            const inputs = document.getElementsByName(inputName);
            if (q.tipo === 'opcion') {
                const checkedInput = Array.from(inputs).find(i => i.checked);
                if (checkedInput && checkedInput.value.trim().toLowerCase() === q.correcta.trim().toLowerCase()) {
                    correctAnswers++;
                }
            } else {
                if (inputs[0] && inputs[0].value.trim().length > 10) {
                    correctAnswers++;
                }
            }
        });

        const finalScore = Math.round((correctAnswers / questions.length) * 10);

        await submitStudentQuiz(practiceId, AppState.user.uid, finalScore);
        alert(`¡Cuestionario entregado! Tu calificación es: ${finalScore}/10.`);
        renderStudentPracticesView();
    } catch(e) {
        alert(`Error al entregar el cuestionario: ${e.message}`);
        button.disabled = false;
        button.textContent = "Entregar Cuestionario";
    }
}