// scripts/dashboard_views.js

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
    navbar.innerHTML = `
        <button onclick="renderDoctorDashboard()">Dashboard</button>
        <button onclick="renderCreatePracticeView()">Crear Práctica</button>
        <button onclick="renderManageStudentsView()">Gestionar Alumnos</button>
    `;
    renderDoctorDashboard(); // Vista inicial
}

function renderStudentLayout(user) {
    AppState.user = user;
    document.getElementById('header-title').textContent = `Alumno: ${user.username}`;
    const navbar = document.getElementById('navbar');
    navbar.innerHTML = `
        <button onclick="renderStudentDashboard()">Dashboard</button>
        <button onclick="renderStudentPracticesView()">Mis Prácticas</button>
        <button onclick="renderStudentGradesView()">Mis Calificaciones</button>
    `;
    renderStudentDashboard(); // Vista inicial
}

// ====================================================
// VISTAS DEL DOCTOR
// ====================================================

async function renderDoctorDashboard() {
    const contentDiv = document.getElementById('main-content');
    contentDiv.innerHTML = `<h2>Dashboard del Doctor</h2><div id="practices-summary">Cargando prácticas...</div>`;

    try {
        AppState.practices = await getPractices();
        const practicesList = Object.values(AppState.practices);
        
        let summaryHtml = `<p>Tienes ${practicesList.length} práctica(s) creada(s).</p>`;
        practicesList.forEach(p => {
            const studentCount = Object.keys(p.students || {}).length;
            summaryHtml += `
                <div class="card">
                    <h4>${p.title}</h4>
                    <p>${studentCount} alumno(s) inscrito(s).</p>
                    <a href="${p.slidesPdfUrl}" target="_blank" class="btn btn-secondary">Ver Diapositivas</a>
                    <a href="${p.standardPdfUrl}" target="_blank" class="btn btn-secondary">Ver Estándar</a>
                </div>
            `;
        });
        document.getElementById('practices-summary').innerHTML = summaryHtml;
    } catch (e) {
        contentDiv.innerHTML = `<p class="alert-error">Error al cargar el dashboard: ${e.message}</p>`;
    }
}

function renderCreatePracticeView() {
    const contentDiv = document.getElementById('main-content');
    contentDiv.innerHTML = `
        <h2>Crear Nueva Práctica</h2>
        <div class="card">
            <label for="practiceTitle">Título de la Práctica</label>
            <input type="text" id="practiceTitle" placeholder="Ej. Espectroscopía Óptica #1">
            
            <label for="slidesFile">Diapositivas de la Práctica (PDF)</label>
            <input type="file" id="slidesFile" accept="application/pdf">
            
            <label for="standardFile">Estándar del Reporte (PDF)</label>
            <input type="file" id="standardFile" accept="application/pdf">
            
            <button onclick="handlePracticeCreation()">GENERAR PRÁCTICA CON IA</button>
            <div id="creationLog" style="margin-top: 15px;"></div>
        </div>
    `;
}

async function renderManageStudentsView() {
    const contentDiv = document.getElementById('main-content');
    contentDiv.innerHTML = `<h2>Gestionar Alumnos</h2><div id="students-management-area">Cargando...</div>`;

    try {
        // Cargar todos los datos necesarios en paralelo
        const [practices, users] = await Promise.all([getPractices(), getAllUsers()]);
        AppState.practices = practices;
        AppState.users = users.filter(u => u.role === 'alumno'); // Solo alumnos

        let html = `<h3>Alumnos sin Práctica Asignada</h3>`;
        const assignedStudents = new Set();
        Object.values(AppState.practices).forEach(p => {
            Object.keys(p.students || {}).forEach(studentId => assignedStudents.add(studentId));
        });

        const unassignedStudents = AppState.users.filter(u => !assignedStudents.has(u.uid));

        if (unassignedStudents.length === 0) {
            html += `<p>Todos los alumnos ya están inscritos en al menos una práctica.</p>`;
        } else {
            unassignedStudents.forEach(student => {
                html += `
                    <div class="student-list-item">
                        <span>${student.username} (${student.matricula})</span>
                        <div>
                            <select id="practice-select-${student.uid}">
                                ${Object.values(AppState.practices).map(p => `<option value="${p.id}">${p.title}</option>`).join('')}
                            </select>
                            <button onclick="enrollStudentHandler('${student.uid}')">Inscribir</button>
                        </div>
                    </div>
                `;
            });
        }
        document.getElementById('students-management-area').innerHTML = html;
    } catch (e) {
        document.getElementById('students-management-area').innerHTML = `<p class="alert-error">Error al cargar alumnos: ${e.message}</p>`;
    }
}


// --- LÓGICA DE MANEJADORES (DOCTOR) ---

async function handlePracticeCreation() {
    const title = document.getElementById('practiceTitle').value;
    const slidesFile = document.getElementById('slidesFile').files[0];
    const standardFile = document.getElementById('standardFile').files[0];
    const logDiv = document.getElementById('creationLog');

    if (!title || !slidesFile || !standardFile) {
        logDiv.innerHTML = '<p class="alert-error">Por favor, rellena todos los campos.</p>';
        return;
    }
    
    logDiv.innerHTML = '1/5: Creando registro de la práctica...';
    try {
        // 1. Crear documento en Firestore para obtener un ID único
        const practiceId = await createPractice({
            title,
            slidesPdfUrl: '',
            standardPdfUrl: '',
            slidesText: '',
            students: {},
            generatedContent: null
        });

        // 2. Subir archivos a Storage
        logDiv.innerHTML = `2/5: Subiendo archivos a la carpeta ${practiceId}...`;
        const slidesPdfUrl = await uploadFile(slidesFile, `practices/${practiceId}`);
        const standardPdfUrl = await uploadFile(standardFile, `practices/${practiceId}`);
        
        // 3. Extraer texto del PDF de diapositivas
        logDiv.innerHTML = '3/5: Extrayendo texto de las diapositivas (puede tardar)...';
        const slidesText = await extractTextFromPDF(slidesFile);

        // 4. Actualizar el documento con las URLs y el texto extraído
        await db.collection('practices').doc(practiceId).update({ slidesPdfUrl, standardPdfUrl, slidesText });

        // 5. Generar contenido con IA
        logDiv.innerHTML = '4/5: Generando cuestionario y crucigrama con IA...';
        const generatedContent = await callAIGenerate(slidesText);
        await savePracticeContent(practiceId, generatedContent);
        
        logDiv.innerHTML = '<p class="alert-success">✅ ¡Práctica creada con éxito!</p>';
        setTimeout(() => renderDoctorDashboard(), 2000); // Redirigir al dashboard

    } catch (e) {
        logDiv.innerHTML = `<p class="alert-error">❌ ERROR: ${e.message}</p>`;
        console.error("Fallo completo en creación de práctica:", e);
    }
}

async function enrollStudentHandler(studentUid) {
    const select = document.getElementById(`practice-select-${studentUid}`);
    const practiceId = select.value;
    if (!practiceId) {
        alert("Por favor, selecciona una práctica.");
        return;
    }

    try {
        await enrollStudent(practiceId, studentUid);
        alert("¡Alumno inscrito con éxito!");
        renderManageStudentsView(); // Recargar la vista para reflejar el cambio
    } catch (e) {
        alert(`Error al inscribir al alumno: ${e.message}`);
    }
}

// ====================================================
// VISTAS DEL ALUMNO
// ====================================================

function renderStudentDashboard() {
    const contentDiv = document.getElementById('main-content');
    contentDiv.innerHTML = `
        <h2>Bienvenido a EspectroEdu</h2>
        <div class="card">
            <p>¡Hola, ${AppState.user.username}!</p>
            <p>Usa la barra de navegación de arriba para acceder a tus prácticas y ver tus calificaciones.</p>
            <p>Recuerda revisar las fechas de entrega y seguir los estándares para cada reporte.</p>
        </div>
    `;
}

async function renderStudentPracticesView() {
    const contentDiv = document.getElementById('main-content');
    contentDiv.innerHTML = '<h2>Mis Prácticas</h2><div id="student-practices-list">Cargando...</div>';

    try {
        const allPractices = await getPractices();
        const myPractices = Object.values(allPractices).filter(p => p.students && p.students[AppState.user.uid]);

        if (myPractices.length === 0) {
            document.getElementById('student-practices-list').innerHTML = '<p>Aún no has sido inscrito en ninguna práctica. Contacta a tu doctor.</p>';
            return;
        }

        let html = '';
        myPractices.forEach(p => {
            const myStatus = p.students[AppState.user.uid];
            // Aquí iría la lógica de las fases, por ahora es un placeholder
            html += `
                <div class="card">
                    <h4>${p.title}</h4>
                    <p><strong>Estado:</strong> ${myStatus.status}</p>
                    <a href="${p.slidesPdfUrl}" target="_blank" class="btn">Descargar Diapositivas</a>
                    <a href="${p.standardPdfUrl}" target="_blank" class="btn">Descargar Estándar</a>
                    <hr style="margin: 20px 0;">
                    
                    <h5>Fase 1: Sube tu Reporte</h5>
                    <input type="file" id="report-file-${p.id}" accept="application/pdf">
                    <button onclick="handleReportUpload('${p.id}')">Subir Reporte</button>
                    
                    <div id="practice-phase-2-${p.id}" style="display:none;">
                       <h5>Fase 2: Cuestionario</h5>
                       <p>¡Completa el cuestionario!</p>
                    </div>
                     <div id="practice-phase-3-${p.id}" style="display:none;">
                       <h5>Fase 3: Crucigrama</h5>
                       <p>¡Resuelve el crucigrama!</p>
                    </div>

                </div>
            `;
        });
        document.getElementById('student-practices-list').innerHTML = html;

    } catch (e) {
        document.getElementById('student-practices-list').innerHTML = `<p class="alert-error">Error al cargar tus prácticas: ${e.message}</p>`;
    }
}

function renderStudentGradesView() {
    const contentDiv = document.getElementById('main-content');
    contentDiv.innerHTML = `
        <h2>Mis Calificaciones</h2>
        <div class="card">
            <p>Esta sección mostrará un resumen de tus calificaciones una vez que completes las prácticas.</p>
            </div>
    `;
}

// --- LÓGICA DE MANEJADORES (ALUMNO) ---

async function handleReportUpload(practiceId) {
    const fileInput = document.getElementById(`report-file-${practiceId}`);
    const reportFile = fileInput.files[0];

    if (!reportFile) {
        alert("Por favor, selecciona tu reporte en PDF.");
        return;
    }

    try {
        // Lógica de subida del reporte...
        alert("Función de subir reporte aún no implementada. ¡Pero el flujo funciona!");
        // 1. Subir archivo a Storage:
        // const reportUrl = await uploadFile(reportFile, `reports/${practiceId}/${AppState.user.uid}`);
        
        // 2. Actualizar el estado en Firestore a través de una función en db_api.js
        // await callDB('submit_report', { practiceId, studentUid: AppState.user.uid, reportUrl });

        // 3. Desbloquear la siguiente fase en la UI
        // document.getElementById(`practice-phase-2-${practiceId}`).style.display = 'block';

    } catch (e) {
        alert(`Error al subir el reporte: ${e.message}`);
    }
}