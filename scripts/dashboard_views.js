// scripts/dashboard_views.js

// Función compartida para renderizar contenido de prácticas (incluye el Cuestionario y Crucigrama)
function renderPracticeContent(practice) {
    // Implementación compleja de la fase de Cuestionario y Crucigrama
    // Basada en los archivos CuestionarioOptica.html y CrucigramaOptica.html
    // ... (Este es el código más largo, se integraría aquí)
}

// ----------------------------------------------------
// VISTA DEL DOCTOR
// ----------------------------------------------------

async function handlePracticeCreation() {
    const title = document.getElementById('practiceTitle').value;
    const slidesFile = document.getElementById('slidesFile').files[0];
    const standardFile = document.getElementById('standardFile').files[0];
    const logDiv = document.getElementById('creationLog');
    logDiv.innerHTML = 'Procesando...';

    if (!title || !slidesFile || !standardFile) {
        logDiv.innerHTML = '<span class="alert-error">Por favor, rellena todos los campos.</span>';
        return;
    }
    
    try {
        // 1. EXTRAER TEXTO DE DIAPOSITIVAS
        logDiv.innerHTML = '1/3: Extrayendo texto de las diapositivas (puede tardar)...';
        const slidesText = await extractTextFromPDF(slidesFile);
        
        // 2. CREAR LA PRÁCTICA EN LOCALSTORAGE
        const practiceId = createPractice(title, 'URL_DEL_STANDAR_SIMULADA', 'URL_DE_SLIDES_SIMULADA', slidesText);
        
        // 3. GENERAR CUESTIONARIO Y CRUCIGRAMA CON IA
        logDiv.innerHTML = '2/3: Generando cuestionario y crucigrama con IA (¡No cierres esta ventana!)...';
        const generatedContent = await callAIGenerate(slidesText, practiceId);

        // 4. GUARDAR CONTENIDO GENERADO
        const practices = getPractices();
        practices[practiceId].generatedContent = generatedContent;
        savePractices(practices);
        
        logDiv.innerHTML = '3/3: Práctica creada y contenido generado. Actualizando lista.';
        loadDoctorView();

    } catch (e) {
        logDiv.innerHTML = `<span class="alert-error">ERROR: Fallo al crear la práctica o al conectar con la IA. Revise logs. Detalle: ${e.message}</span>`;
        console.error("Fallo completo en creación de práctica:", e);
    }
}

function loadDoctorView() {
    const contentDiv = document.getElementById('roleSpecificContent');
    contentDiv.innerHTML = `
        <h3>Crear Nueva Práctica</h3>
        <div class="card">
            <input type="text" id="practiceTitle" placeholder="Título de la Práctica (Ej. Espectroscopía Óptica #1)">
            <label>Diapositivas de la Práctica (PDF):</label>
            <input type="file" id="slidesFile" accept="application/pdf">
            <label>Estándar del Reporte (PDF):</label>
            <input type="file" id="standardFile" accept="application/pdf">
            <button onclick="handlePracticeCreation()">GENERAR PRÁCTICA E ITEMS CON IA</button>
            <div id="creationLog" style="margin-top: 10px;"></div>
        </div>

        <h3 style="margin-top: 30px;">Gestión de Alumnos y Calificaciones</h3>
        <div id="doctorPracticesList"></div>
    `;
    
    // Lista de alumnos y gestión (Lógica de inscripción y calificaciones iría aquí)
    const practices = getPractices();
    const practicesListDiv = document.getElementById('doctorPracticesList');
    practicesListDiv.innerHTML = '<h4>Prácticas Creadas:</h4>';
    
    // Muestra todas las prácticas creadas
    for (const id in practices) {
        const p = practices[id];
        const studentCount = Object.keys(p.students).length;
        practicesListDiv.innerHTML += `
            <div class="card" style="border-left-color: #f39c12;">
                <strong>${p.title}</strong> (${studentCount} alumnos inscritos)
                </div>
        `;
    }
}


// ----------------------------------------------------
// VISTA DEL ALUMNO
// ----------------------------------------------------

function loadStudentView() {
    const student = getCurrentUser();
    const contentDiv = document.getElementById('roleSpecificContent');
    contentDiv.innerHTML = `
        <div class="nav-tabs">
            <button onclick="showStudentTab('practicesTab')">Mis Prácticas</button>
            <button onclick="showStudentTab('scoresTab')">Mis Calificaciones</button>
        </div>
        <div id="practicesTab" class="tab-content"></div>
        <div id="scoresTab" class="tab-content" style="display:none;"></div>
    `;

    showStudentTab('practicesTab');
}

function showStudentTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.getElementById(tabId).style.display = 'block';

    if (tabId === 'practicesTab') {
        renderStudentPractices();
    } else if (tabId === 'scoresTab') {
        renderStudentScores();
    }
}

function renderStudentPractices() {
    const student = getCurrentUser();
    const practices = getPractices();
    const practicesDiv = document.getElementById('practicesTab');
    practicesDiv.innerHTML = '<h4>Prácticas Disponibles:</h4>';
    
    let availablePractices = 0;
    
    // Filtrar solo las prácticas donde el alumno está inscrito (simulación)
    for (const id in practices) {
        if (practices[id].students[student.matricula]) {
            const p = practices[id];
            const studentData = p.students[student.matricula];
            availablePractices++;
            
            practicesDiv.innerHTML += `
                <div class="card" style="border-left-color: #27ae60;">
                    <strong>${p.title}</strong> 
                    <p>Estado: ${studentData.finalScore ? 'Terminada' : 'Pendiente'}</p>
                    <button class="btn-primary" onclick="window.location.href='practice_detail.html?id=${id}'">
                        INICIAR PRÁCTICA
                    </button>
                </div>
            `;
        }
    }
    
    if (availablePractices === 0) {
        practicesDiv.innerHTML += '<p>No estás inscrito en ninguna práctica aún. Espera que tu doctor te asigne una.</p>';
    }
}

function renderStudentScores() {
    const student = getCurrentUser();
    const practices = getPractices();
    const scoresDiv = document.getElementById('scoresTab');
    
    let scoreHtml = '<h4>Calificaciones Finales:</h4>';
    let hasScores = false;
    
    for (const id in practices) {
        const studentData = practices[id].students[student.matricula];
        if (studentData && studentData.finalScore !== null) {
            hasScores = true;
            scoreHtml += `
                <p><strong>${practices[id].title}:</strong> 
                <span class="score">${studentData.finalScore}/10</span> 
                (Reporte: ${studentData.reportScore || 'N/A'})</p>
            `;
        }
    }
    
    scoresDiv.innerHTML = hasScores ? scoreHtml : '<p>Aún no tienes calificaciones finales disponibles.</p>';
}