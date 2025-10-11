// scripts/dashboard_views.js (VERSIÓN FINAL Y CORREGIDA)

// Almacén de estado simple
const AppState = {
    user: null,
};

// ====================================================
// RENDERIZADO PRINCIPAL Y NAVEGACIÓN
// ====================================================

function renderDoctorLayout(user) {
    AppState.user = user;
    document.getElementById('header-title').textContent = `Dr. ${user.username}`;
    const navbar = document.getElementById('navbar');
    navbar.innerHTML = `
        <button class="active" onclick="setActive(this); renderDoctorDashboard();">Dashboard</button>
        <button onclick="setActive(this); renderCreatePracticeView();">Crear Práctica</button>
        <button onclick="setActive(this); renderManageStudentsView();">Gestionar Alumnos</button>
        <button onclick="setActive(this); renderDoctorGradesView();">Ver Calificaciones</button> 
    `;
    renderDoctorDashboard();
}

function renderStudentLayout(user) {
    AppState.user = user;
    document.getElementById('header-title').textContent = `Alumno: ${user.username}`;
    const navbar = document.getElementById('navbar');
    navbar.innerHTML = `
        <button class="active" onclick="setActive(this); renderStudentDashboard();">Dashboard</button>
        <button onclick="setActive(this); renderStudentPracticesView();">Mis Prácticas</button>
        <button onclick="setActive(this); renderStudentGradesView();">Mis Calificaciones</button>
    `;
    renderStudentDashboard();
}

function setActive(button) {
    document.querySelectorAll('#navbar button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
}

// ====================================================
// VISTAS DEL DOCTOR
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

// --- NUEVA VISTA DE DOCTOR ---
async function renderDoctorGradesView() {
    const contentDiv = document.getElementById('main-content');
    contentDiv.innerHTML = `<h2>Calificaciones por Práctica</h2><div id="grades-by-practice">Cargando...</div>`;
    try {
        const [practices, users] = await Promise.all([getPractices(), getAllUsers()]);
        const usersMap = new Map(users.map(u => [u.uid, u]));

        let html = '';
        if (Object.keys(practices).length === 0) {
            html = '<p>Aún no hay prácticas creadas.</p>';
        } else {
            for (const practice of Object.values(practices)) {
                html += `<div class="card"><h4>${practice.title}</h4>`;
                const students = practice.students || {};
                if (Object.keys(students).length === 0) {
                    html += '<p>No hay alumnos inscritos en esta práctica.</p>';
                } else {
                    html += '<ul>';
                    for (const studentId in students) {
                        const studentData = students[studentId];
                        const studentInfo = usersMap.get(studentId);
                        const name = studentInfo ? `${studentInfo.username} (${studentInfo.matricula})` : `ID: ${studentId}`;
                        const grade = studentData.completed ? `<strong>${studentData.quizScore}/10</strong>` : '<i>Pendiente</i>';
                        html += `<li>${name} - Calificación: ${grade}</li>`;
                    }
                    html += '</ul>';
                }
                html += `</div>`;
            }
        }
        document.getElementById('grades-by-practice').innerHTML = html;

    } catch (e) {
        contentDiv.innerHTML = `<p class="alert-error">Error al cargar calificaciones: ${e.message}</p>`;
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
        const practiceData = { 
            title, 
            students: {}, 
            generatedContent: null, 
            creatorId: AppState.user.uid, // Guardamos quién creó la práctica
            createdAt: new Date()
        };
        const practiceId = await createPractice(practiceData);
        logDiv.innerHTML = `2/5: Subiendo archivos a la nube...`;
        const [slidesPdfUrl, standardPdfUrl] = await Promise.all([
            uploadFile(slidesFile, `practices/${practiceId}`),
            uploadFile(standardFile, `practices/${practiceId}`)
        ]);
        logDiv.innerHTML = '3/5: Extrayendo texto de las diapositivas...';
        const slidesText = await extractTextFromPDF(slidesFile);
        
        logDiv.innerHTML = '4/5: Generando contenido con IA (esto puede tardar)...';
        const generatedContent = await callAIGenerate(slidesText);

        await savePracticeContent(practiceId, { slidesPdfUrl, standardPdfUrl, slidesText, generatedContent });

        logDiv.innerHTML = '<p class="alert-success">✅ ¡Práctica creada con éxito!</p>';
        setTimeout(() => {
            document.querySelector('#navbar button').click(); // Volver al dashboard
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
        alert("No hay prácticas disponibles.");
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
            <p>Usa la barra de navegación para acceder a tus prácticas y ver tus calificaciones.</p>
        </div>`;
}

async function renderStudentPracticesView() {
    const contentDiv = document.getElementById('main-content');
    contentDiv.innerHTML = '<h2>Mis Prácticas</h2><div id="student-practices-list">Cargando...</div>';
    try {
        const practices = await getPractices();
        const myPractices = Object.values(practices).filter(p => p.students && p.students[AppState.user.uid]);

        if (myPractices.length === 0) {
            document.getElementById('student-practices-list').innerHTML = '<p>Aún no has sido inscrito en ninguna práctica.</p>';
            return;
        }

        const html = myPractices.map(p => {
            const statusData = p.students[AppState.user.uid];
            let content = `<h4>${p.title}</h4><p><strong>Estado:</strong> ${statusData.status}</p>`;

            if (statusData.completed) { // FASE 4: Finalizada
                content += `<p>¡Felicidades! Has completado esta práctica. Puedes ver tu resultado en "Mis Calificaciones".</p>`;
            
            } else if (statusData.status === 'Crucigrama Pendiente') { // FASE 3: Crucigrama
                content += `<div id="crossword-container-${p.id}"></div>`;
                setTimeout(() => renderCrossword(p), 0);

            } else if (statusData.reportUrl) { // FASE 2: Cuestionario
                content += `<div id="quiz-container-${p.id}"></div>`;
                setTimeout(() => renderQuiz(p), 0);

            } else { // FASE 1: Subir reporte
                content += `
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
        document.getElementById('student-practices-list').innerHTML = `<p class="alert-error">Error: ${e.message}</p>`;
    }
}

async function renderStudentGradesView() {
    const contentDiv = document.getElementById('main-content');
    contentDiv.innerHTML = '<h2>Mis Calificaciones</h2><div id="grades-list">Cargando...</div>';
    try {
        const gradesListDiv = document.getElementById('grades-list');
        const practices = await getPractices();
        const completedPractices = Object.values(practices)
            .filter(p => p.students?.[AppState.user.uid]?.completed === true);

        if (completedPractices.length === 0) {
            gradesListDiv.innerHTML = '<p>Aún no has completado ninguna práctica.</p>';
            return;
        }

        const html = completedPractices.map(p => {
            const studentData = p.students[AppState.user.uid];
            const score = studentData.quizScore ?? 'N/A';
            return `
                <div class="card">
                    <h4>${p.title}</h4>
                    <p class="score">Calificación Final: <strong>${score}/10</strong></p>
                </div>`;
        }).join('');
        gradesListDiv.innerHTML = html;
    } catch (e) {
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
    
    logDiv.textContent = "Subiendo archivo...";
    button.disabled = true;
    try {
        const reportUrl = await uploadFile(reportFile, `reports/${practiceId}/${AppState.user.uid}`);
        await submitStudentReport(practiceId, AppState.user.uid, reportUrl);
        alert("¡Reporte entregado! Ahora puedes continuar con el cuestionario.");
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

    let quizHtml = `<h5>Fase 2: Cuestionario</h5><p>Responde las siguientes preguntas.</p>`;
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
            } else { // Pregunta abierta (simplificado: se califica si tiene contenido)
                if (inputs[0] && inputs[0].value.trim().length > 10) {
                    correctAnswers++;
                }
            }
        });

        const quizScore = Math.round((correctAnswers / questions.length) * 10);

        // Guardar el progreso y pasar al crucigrama
        await updateStudentProgress(practiceId, AppState.user.uid, 'Crucigrama Pendiente', quizScore);
        alert(`¡Cuestionario entregado! Tu puntaje parcial es: ${quizScore}/10. Ahora, el crucigrama.`);
        renderStudentPracticesView();

    } catch(e) {
        alert(`Error al entregar el cuestionario: ${e.message}`);
        button.disabled = false;
        button.textContent = "Entregar Cuestionario";
    }
}


// --- LÓGICA DEL CRUCIGRAMA ---

function renderCrossword(practice) {
    const container = document.getElementById(`crossword-container-${practice.id}`);
    const crosswordData = practice.generatedContent?.crucigrama;

    if (!crosswordData) {
        container.innerHTML = "<p class='alert-error'>Error: El crucigrama no está disponible.</p>";
        return;
    }
    const gridSize = 12;
    let grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    const words = crosswordData.map(w => ({...w, word: w.word.toUpperCase()}));

    let placedWords = [];
    try {
        words.forEach((wordObj, i) => {
            let placed = false;
            // Intenta colocar horizontal
            if (i % 2 === 0) {
                if (1 + wordObj.word.length < gridSize) {
                    const row = i + 1;
                    const col = 1;
                    for (let j = 0; j < wordObj.word.length; j++) {
                        grid[row][col + j] = { char: wordObj.word[j], num: j === 0 ? i + 1 : null };
                    }
                    placed = true;
                }
            } else { // Intenta colocar vertical
                 if (1 + wordObj.word.length < gridSize) {
                    const row = 1;
                    const col = i + 1;
                    for (let j = 0; j < wordObj.word.length; j++) {
                        grid[row + j][col] = { char: wordObj.word[j], num: j === 0 ? i + 1 : null };
                    }
                    placed = true;
                }
            }
             if(placed) placedWords.push({...wordObj, number: i+1});
        });
    } catch(e) { console.error("Error al colocar palabras en el crucigrama", e)}


    let gridHtml = '<table>';
    for (let r = 0; r < gridSize; r++) {
        gridHtml += '<tr>';
        for (let c = 0; c < gridSize; c++) {
            gridHtml += `<td class="${grid[r][c] ? '' : 'empty'}" style="position:relative;">`;
            if (grid[r][c]) {
                gridHtml += `
                    <input type="text" maxlength="1" data-correct="${grid[r][c].char}" class="crossword-cell">
                    ${grid[r][c].num ? `<span style="position:absolute; top:1px; left:1px; font-size:9px; z-index:1; color: #333;">${grid[r][c].num}</span>` : ''}
                `;
            }
             gridHtml += '</td>';
        }
        gridHtml += '</tr>';
    }
    gridHtml += '</table>';

    let cluesHtml = '<h5>Pistas</h5>';
    placedWords.forEach(w => {
         cluesHtml += `<p><strong>${w.number}.</strong> ${w.clue}</p>`;
    });

    container.innerHTML = `
        <h5>Fase 3: Crucigrama</h5>
        <div class="crossword-container">
            <div class="crossword-grid">${gridHtml}</div>
            <div class="crossword-clues">${cluesHtml}</div>
        </div>
        <br>
        <button onclick="handleCrosswordSubmit(event, '${practice.id}')">Finalizar Práctica</button>
    `;
}

async function handleCrosswordSubmit(event, practiceId) {
    const button = event.target;
    button.disabled = true;
    button.textContent = "Calculando Calificación Final...";

    try {
        const practices = await getPractices();
        const practice = practices[practiceId];
        const quizScore = practice.students[AppState.user.uid].quizScore || 0;

        let correctCrosswordCells = 0;
        let totalCrosswordCells = 0;
        const cells = document.querySelectorAll(`#crossword-container-${practiceId} .crossword-cell`);
        cells.forEach(cell => {
            totalCrosswordCells++;
            if (cell.value.toUpperCase() === cell.dataset.correct) {
                correctCrosswordCells++;
                cell.style.backgroundColor = '#d4edda'; // Verde para correcto
            } else {
                 cell.style.backgroundColor = '#f8d7da'; // Rojo para incorrecto
            }
        });

        const crosswordScore = (totalCrosswordCells > 0) ? Math.round((correctCrosswordCells / totalCrosswordCells) * 10) : 10;
        
        const finalGrade = Math.round((quizScore * 0.7) + (crosswordScore * 0.3));

        await submitStudentQuiz(practiceId, AppState.user.uid, finalGrade);
        alert(`¡Práctica finalizada! Tu calificación final es: ${finalGrade}/10.`);
        renderStudentPracticesView();

    } catch (e) {
        alert(`Error al finalizar la práctica: ${e.message}`);
        button.disabled = false;
        button.textContent = "Finalizar Práctica";
    }
}