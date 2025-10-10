// scripts/dashboard_views.js

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
        logDiv.innerHTML = '1/4: Extrayendo texto de las diapositivas (puede tardar)...';
        const slidesText = await extractTextFromPDF(slidesFile);
        
        // 2. CREAR LA PRÁCTICA EN FIRESTORE Y OBTENER ID
        logDiv.innerHTML = '2/4: Creando práctica en la base de datos...';
        const newPracticeData = {
            title,
            standardPdfUrl: 'URL_DEL_STANDAR_SIMULADA', // En un proyecto real, subirías el PDF a Firebase Storage
            slidesPdfUrl: 'URL_DE_SLIDES_SIMULADA',
            slidesText: slidesText,
            students: {}, 
            generatedContent: null
        };
        const practiceId = await createPractice(newPracticeData);
        
        // 3. GENERAR CUESTIONARIO Y CRUCIGRAMA CON IA
        logDiv.innerHTML = '3/4: Generando cuestionario y crucigrama con IA (¡No cierres esta ventana!)...';
        const generatedContent = await callAIGenerate(slidesText, practiceId); // Llama a netlify/functions/generate_content.js

        // 4. GUARDAR CONTENIDO GENERADO EN LA BASE DE DATOS
        logDiv.innerHTML = '4/4: Guardando contenido generado en Firestore...';
        
        // Esta función necesita ser implementada en db_api.js para actualizar un documento
        // await savePracticeContent(practiceId, generatedContent); 
        
        logDiv.innerHTML = '✅ Práctica creada y contenido generado. Actualizando lista.';
        loadDoctorView();

    } catch (e) {
        logDiv.innerHTML = `<span class="alert-error">❌ ERROR: Fallo al crear la práctica o al conectar con la IA. Revise logs. Detalle: ${e.message}</span>`;
        console.error("Fallo completo en creación de práctica:", e);
    }
}

async function loadDoctorView() {
    const contentDiv = document.getElementById('roleSpecificContent');
    
    // Contenido HTML estático...
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
        <div id="doctorPracticesList">Cargando prácticas...</div>
    `;
    
    // Lista de prácticas (Lectura desde la DB)
    const practices = await getPractices(); 
    const practicesListDiv = document.getElementById('doctorPracticesList');
    practicesListDiv.innerHTML = '<h4>Prácticas Creadas:</h4>';
    
    // Muestra todas las prácticas creadas
    for (const id in practices) {
        const p = practices[id];
        const studentCount = Object.keys(p.students || {}).length;
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

// Las funciones loadStudentView, showStudentTab, renderStudentPractices, renderStudentScores
// DEBEN ser actualizadas para llamar a las funciones asíncronas de getPractices() en data_manager.js
// y usar el UID del alumno de Firebase.