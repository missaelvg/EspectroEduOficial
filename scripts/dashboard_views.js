// scripts/dashboard_views.js (VERSIÓN FINAL CON CRUCIGRAMA COMPLETO)

const AppState = {
    user: null,
    practices: {},
    users: [],
};

// ====================================================
// RENDERIZADO PRINCIPAL
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
        <button onclick="setActive(this); renderStudentProfileView();">Mi Perfil</button>
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
        AppState.practices = practices;
        const practicesList = Object.values(practices);
        
        let html = `<p>Tienes ${practicesList.length} práctica(s) creada(s).</p>`;
        if (practicesList.length === 0) {
            html += `<p>Ve a "Crear Práctica" para empezar.</p>`;
        } else {
            practicesList.forEach(p => {
                const studentCount = Object.keys(p.students || {}).length;
                
                const slidesBtn = p.slidesPdfUrl && p.slidesPdfUrl.length > 5
                    ? `<a href="${p.slidesPdfUrl}" target="_blank" class="btn btn-secondary">Ver Diapositivas</a>`
                    : `<button class="btn btn-secondary" disabled style="opacity:0.5">Sin Diapositivas</button>`;

                const stdBtn = p.standardPdfUrl && p.standardPdfUrl.length > 5
                    ? `<a href="${p.standardPdfUrl}" target="_blank" class="btn btn-secondary">Ver Estándar</a>`
                    : `<button class="btn btn-secondary" disabled style="opacity:0.5">Sin Estándar</button>`;

                html += `
                    <div class="card">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <h4>${p.title}</h4>
                            <button onclick="handleDeletePractice('${p.id}')" style="background-color:#dc2626; font-size:0.8em; padding:5px 10px;">Borrar Práctica</button>
                        </div>
                        <p>${studentCount} alumno(s) inscrito(s).</p>
                        <div style="margin-top:10px; display:flex; gap:10px;">
                            ${slidesBtn}
                            ${stdBtn}
                        </div>
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
            <button onclick="handlePracticeCreation()">CREAR PRÁCTICA</button>
            <div id="creationLog" style="margin-top: 15px; font-family:monospace; font-size:0.9em;"></div>
        </div>`;
}

// --- LÓGICA DE CREACIÓN ---
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
    try {
        logDiv.innerHTML = '<span style="color:#3b82f6">1/4: Creando registro...</span>';
        const practiceData = { 
            title, students: {}, generatedContent: null, creatorId: AppState.user.uid, createdAt: new Date()
        };
        const practiceId = await createPractice(practiceData);

        logDiv.innerHTML = '<span style="color:#3b82f6">2/4: Subiendo archivos...</span>';
        const [slidesPdfUrl, standardPdfUrl] = await Promise.all([
            uploadFile(slidesFile, `practices/${practiceId}`),
            uploadFile(standardFile, `practices/${practiceId}`)
        ]);

        logDiv.innerHTML = '<span style="color:#3b82f6">3/4: Vinculando archivos...</span>';
        await savePracticeContent(practiceId, { slidesPdfUrl, standardPdfUrl });

        logDiv.innerHTML = '<span style="color:#eab308">4/4: Generando contenido inteligente...</span>';
        let slidesText = "";
        try { slidesText = await extractTextFromPDF(slidesFile); } catch (err) { console.warn("Error texto:", err); }

        if (slidesText && slidesText.length > 50) {
            try {
                const generatedContent = await callAIGenerate(slidesText);
                await savePracticeContent(practiceId, { slidesText, generatedContent });
                logDiv.innerHTML = '<p class="alert-success">✅ ¡Práctica lista!</p>';
            } catch (aiErr) {
                logDiv.innerHTML = '<p class="alert-success" style="color:#f59e0b;">⚠️ Práctica creada sin IA.</p>';
            }
        } else {
            logDiv.innerHTML = '<p class="alert-success" style="color:#f59e0b;">⚠️ Práctica creada (PDF sin texto).</p>';
        }

        setTimeout(() => {
            const firstNavButton = document.querySelector('#navbar button');
            setActive(firstNavButton);
            renderDoctorDashboard();
        }, 3000);

    } catch (e) {
        logDiv.innerHTML = `<p class="alert-error">❌ ERROR: ${e.message}</p>`;
        button.disabled = false;
    }
}

// --- GESTIÓN DE ALUMNOS ---
async function renderManageStudentsView() {
    const contentDiv = document.getElementById('main-content');
    contentDiv.innerHTML = `<h2>Gestionar Alumnos</h2><div class="card"><input type="text" id="studentSearchInput" placeholder="🔍 Buscar..." onkeyup="handleSearchStudent()" style="margin-bottom:0;"></div><div id="students-list-container">Cargando...</div>`;
    try {
        const [practices, users] = await Promise.all([getPractices(), getAllUsers()]);
        AppState.practices = practices;
        AppState.users = users.filter(u => u.role === 'alumno');
        renderStudentsList(AppState.users);
    } catch (e) { document.getElementById('students-list-container').innerHTML = `<p class="alert-error">${e.message}</p>`; }
}
function renderStudentsList(studentsToRender) {
    const container = document.getElementById('students-list-container');
    const studentPracticeMap = {};
    Object.values(AppState.practices).forEach(p => { Object.keys(p.students || {}).forEach(sid => studentPracticeMap[sid] = { id: p.id, title: p.title }); });
    let html = '';
    if (studentsToRender.length === 0) html = `<p>No se encontraron alumnos.</p>`;
    else {
        studentsToRender.forEach(student => {
            const currentPractice = studentPracticeMap[student.uid];
            const groupDisplay = student.grupo ? `| Grupo: ${student.grupo}` : '';
            html += `<div class="student-list-item"><div style="flex:1;"><strong>${student.username}</strong> <span style="color:#666; font-size:0.9em;">${groupDisplay}</span><br><small>${student.matricula}</small></div><div style="flex:1; text-align:right;">`;
            if (currentPractice) {
                html += `<span style="color:#16a34a; font-weight:bold; margin-right:10px;">Inscrito: ${currentPractice.title}</span><button onclick="handleUnenroll('${currentPractice.id}', '${student.uid}')" style="background-color:#f39c12; font-size:0.7em; padding:5px 8px;">Desinscribir</button>`;
            } else {
                if (Object.keys(AppState.practices).length > 0) {
                    html += `<select id="practice-select-${student.uid}" style="padding:5px; width:auto; margin-right:5px;"><option value="">Seleccionar...</option>${Object.values(AppState.practices).map(p => `<option value="${p.id}">${p.title}</option>`).join('')}</select><button onclick="enrollStudentHandler('${student.uid}')" style="font-size:0.7em; padding:5px 8px;">Inscribir</button>`;
                } else { html += `<span style="color:#7f8c8d;">Sin prácticas</span>`; }
            }
            html += `<button onclick="handleDeleteUser('${student.uid}')" style="background-color:#dc2626; font-size:0.7em; padding:5px 8px; margin-left:5px;">X</button></div></div>`;
        });
    }
    container.innerHTML = html;
}
function handleSearchStudent() {
    const query = document.getElementById('studentSearchInput').value.toLowerCase();
    const filtered = AppState.users.filter(u => (u.matricula||'').toLowerCase().includes(query) || (u.username||'').toLowerCase().includes(query));
    renderStudentsList(filtered);
}
async function renderDoctorGradesView() {
    const contentDiv = document.getElementById('main-content');
    contentDiv.innerHTML = `<h2>Calificaciones</h2><div id="grades-by-practice">Cargando...</div>`;
    try {
        const [practices, users] = await Promise.all([getPractices(), getAllUsers()]);
        const usersMap = new Map(users.map(u => [u.uid, u]));
        let html = '';
        for (const p of Object.values(practices)) {
            html += `<div class="card"><h4>${p.title}</h4>`;
            const studs = p.students || {};
            if (Object.keys(studs).length === 0) html += '<p>Sin alumnos.</p>';
            else {
                html += '<ul>';
                for (const sid in studs) {
                    const sData = studs[sid];
                    const sInfo = usersMap.get(sid);
                    const name = sInfo ? `${sInfo.username} (${sInfo.matricula})` : sid;
                    const grade = sData.completed ? `<strong>${sData.quizScore}/10</strong>` : '<i>Pendiente</i>';
                    html += `<li>${name} - Nota: ${grade}</li>`;
                }
                html += '</ul>';
            }
            html += `</div>`;
        }
        document.getElementById('grades-by-practice').innerHTML = html || '<p>No hay prácticas.</p>';
    } catch (e) { contentDiv.innerHTML = `<p class="alert-error">${e.message}</p>`; }
}
async function handleDeletePractice(pid) { if(confirm("¿Borrar práctica?")) { await deletePractice(pid); renderDoctorDashboard(); } }
async function handleDeleteUser(uid) { if(confirm("¿Borrar usuario?")) { await deleteUser(uid); renderManageStudentsView(); } }
async function handleUnenroll(pid, uid) { if(confirm("¿Desinscribir?")) { await unenrollStudent(pid, uid); delete AppState.practices[pid].students[uid]; handleSearchStudent(); } }
async function enrollStudentHandler(uid) {
    const pid = document.getElementById(`practice-select-${uid}`).value;
    if(!pid) return;
    await enrollStudent(pid, uid);
    if(!AppState.practices[pid].students) AppState.practices[pid].students = {};
    AppState.practices[pid].students[uid] = { status: 'Inscrito' };
    handleSearchStudent();
}

// ====================================================
// VISTAS DEL ALUMNO
// ====================================================

function renderStudentDashboard() {
    document.getElementById('main-content').innerHTML = `<h2>Bienvenido</h2><div class="card"><p>Hola, ${AppState.user.username}</p></div>`;
}
function renderStudentProfileView() {
    const u = AppState.user;
    document.getElementById('main-content').innerHTML = `<h2>Mi Perfil</h2><div class="card"><label>Matrícula (Fija):</label><input type="text" value="${u.matricula}" disabled style="background:#eee;"><label>Nombre:</label><input type="text" id="pName" value="${u.username}"><label>Grupo:</label><input type="text" id="pGroup" value="${u.grupo||''}"><label>Email:</label><input type="email" id="pEmail" value="${u.email}"><button onclick="handleUpdateProfile()">Guardar</button></div>`;
}
async function handleUpdateProfile() {
    const name = document.getElementById('pName').value, group = document.getElementById('pGroup').value, email = document.getElementById('pEmail').value;
    if(!name || !email) return alert("Faltan datos");
    await updateUserProfile(AppState.user.uid, { username: name, grupo: group, email: email });
    AppState.user.username = name; AppState.user.grupo = group; AppState.user.email = email;
    alert("Actualizado"); renderStudentProfileView();
}

async function renderStudentPracticesView() {
    const contentDiv = document.getElementById('main-content');
    contentDiv.innerHTML = '<h2>Mis Prácticas</h2><div id="student-practices-list">Cargando...</div>';
    try {
        const practices = await getPractices();
        const myPractices = Object.values(practices).filter(p => p.students && p.students[AppState.user.uid]);

        if (myPractices.length === 0) {
            document.getElementById('student-practices-list').innerHTML = '<p>No tienes prácticas asignadas.</p>';
            return;
        }

        const html = myPractices.map(p => {
            const statusData = p.students[AppState.user.uid];
            let content = `<h4>${p.title}</h4><p><strong>Estado:</strong> ${statusData.status}</p>`;

            if (statusData.completed) {
                content += `<p>¡Felicidades! Has completado esta práctica.</p>`;
            } else if (statusData.status === 'Crucigrama Pendiente') {
                content += `<div id="crossword-container-${p.id}"></div>`;
                setTimeout(() => renderCrossword(p), 0);
            } else if (statusData.reportUrl) {
                content += `<div id="quiz-container-${p.id}"></div>`;
                setTimeout(() => renderQuiz(p), 0);
            } else {
                content += `
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
    const div = document.getElementById('main-content');
    div.innerHTML = '<h2>Calificaciones</h2><div id="glist">Cargando...</div>';
    try {
        const practices = await getPractices();
        const comp = Object.values(practices).filter(p => p.students?.[AppState.user.uid]?.completed);
        if(comp.length===0) { document.getElementById('glist').innerHTML='<p>Sin notas.</p>'; return; }
        div.innerHTML = comp.map(p=>`<div class="card"><h4>${p.title}</h4><p class="score">${p.students[AppState.user.uid].quizScore}/10</p></div>`).join('');
    } catch(e) { div.innerHTML = `<p class="alert-error">${e.message}</p>`; }
}

async function handleReportUpload(practiceId) {
    const fileInput = document.getElementById(`report-file-${practiceId}`);
    const reportFile = fileInput.files[0];
    const logDiv = document.getElementById(`log-${practiceId}`);
    const button = fileInput.nextElementSibling;

    if (!reportFile) { alert("Selecciona un archivo."); return; }
    
    logDiv.textContent = "Subiendo archivo...";
    button.disabled = true;
    try {
        const reportUrl = await uploadFile(reportFile, `reports/${practiceId}/${AppState.user.uid}`);
        await submitStudentReport(practiceId, AppState.user.uid, reportUrl);
        alert("¡Reporte entregado! Ahora completa el cuestionario.");
        renderStudentPracticesView();
    } catch (e) {
        logDiv.textContent = `Error: ${e.message}`;
        button.disabled = false;
    }
}

function renderQuiz(practice) {
    const container = document.getElementById(`quiz-container-${practice.id}`);
    const questions = practice.generatedContent?.cuestionario;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
        container.innerHTML = "<p class='alert-error'>Error: El cuestionario no se generó correctamente.</p>";
        return;
    }

    let quizHtml = `<h5>Cuestionario</h5><p>Selecciona la respuesta correcta:</p>`;
    questions.forEach((q, index) => {
        const inputName = `q-${practice.id}-${index}`;
        quizHtml += `<div class="question"><p><strong>${index + 1}. ${q.pregunta}</strong></p>`;
        if (q.opciones && Array.isArray(q.opciones)) {
            q.opciones.forEach(op => {
                quizHtml += `<label style="display:block; margin-bottom:5px; cursor:pointer;"><input type="radio" name="${inputName}" value="${op}"> ${op}</label>`;
            });
        }
        quizHtml += `</div>`;
    });
    quizHtml += `<button onclick="handleQuizSubmit(event, '${practice.id}')">Enviar Cuestionario</button>`;
    container.innerHTML = quizHtml;
}

async function handleQuizSubmit(event, practiceId) {
    const button = event.target;
    const practice = AppState.practices[practiceId] || (await getPractices())[practiceId];
    const questions = practice.generatedContent.cuestionario;
    
    let answeredCount = 0;
    questions.forEach((q, index) => {
        const inputs = document.getElementsByName(`q-${practiceId}-${index}`);
        if(Array.from(inputs).some(i => i.checked)) answeredCount++;
    });

    if (answeredCount < questions.length) {
        alert(`Por favor responde todas las preguntas (${answeredCount}/${questions.length}).`);
        return;
    }

    button.disabled = true;
    button.textContent = "Calificando...";

    try {
        let correctAnswers = 0;
        questions.forEach((q, index) => {
            const inputs = document.getElementsByName(`q-${practiceId}-${index}`);
            const selected = Array.from(inputs).find(i => i.checked);
            if (selected && selected.value.trim().toLowerCase() === q.correcta.trim().toLowerCase()) {
                correctAnswers++;
            }
        });

        const quizScore = Math.round((correctAnswers / questions.length) * 10);
        await updateStudentProgress(practiceId, AppState.user.uid, 'Crucigrama Pendiente', quizScore);
        alert(`¡Cuestionario enviado! Puntaje: ${quizScore}/10. Ahora resuelve el crucigrama.`);
        renderStudentPracticesView();

    } catch(e) {
        alert(`Error: ${e.message}`);
        button.disabled = false;
    }
}

// --- LÓGICA DE CRUCIGRAMA ROBUSTA ---
function renderCrossword(practice) {
    const container = document.getElementById(`crossword-container-${practice.id}`);
    const crosswordData = practice.generatedContent?.crucigrama;

    if (!crosswordData || crosswordData.length === 0) {
        container.innerHTML = "<p class='alert-error'>Error: El crucigrama no está disponible.</p>";
        return;
    }

    const words = crosswordData.map(w => ({ word: w.word.toUpperCase().trim(), clue: w.clue }));
    const layout = generateCrosswordLayout(words); // AHORA SÍ LLAMA A LA FUNCIÓN REAL
    
    if (!layout) {
        container.innerHTML = "<p class='alert-error'>No se pudo generar la cuadrícula del crucigrama.</p>";
        return;
    }
    
    const { grid, placedWordsInfo } = layout;

    let gridHtml = '<table>';
    grid.forEach(row => {
        gridHtml += '<tr>';
        row.forEach(cell => {
            if (cell) {
                gridHtml += `<td style="position:relative;"><input type="text" maxlength="1" data-correct="${cell.char}" class="crossword-cell">${cell.num ? `<span class="crossword-number">${cell.num}</span>` : ''}</td>`;
            } else {
                gridHtml += '<td class="empty"></td>';
            }
        });
        gridHtml += '</tr>';
    });
    gridHtml += '</table>';
    
    let cluesHtml = '<h5>Pistas</h5>';
    placedWordsInfo.sort((a,b) => a.number - b.number).forEach(w => {
         cluesHtml += `<p><strong>${w.number}. ${w.orientation === 'across' ? 'H' : 'V'}</strong>: ${w.clue}</p>`;
    });

    container.innerHTML = `<h5>Crucigrama</h5><div class="crossword-container"><div class="crossword-grid">${gridHtml}</div><div class="crossword-clues">${cluesHtml}</div></div><br><button onclick="handleCrosswordSubmit(event, '${practice.id}')">Finalizar Práctica</button>`;
    
    const style = document.createElement('style');
    style.innerHTML = `.crossword-number { position:absolute; top:1px; left:1px; font-size:9px; z-index:1; color: #333; }`;
    container.appendChild(style);
}

// --- ALGORITMO DE CRUCIGRAMA REAL (No dummy) ---
function generateCrosswordLayout(words) {
    const gridSize = 20;
    let grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    let placedWords = [];

    // Ordenar: las palabras más largas primero para mejor anclaje
    words.sort((a, b) => b.word.length - a.word.length);
    
    // Colocar la primera palabra en el centro
    if(words.length === 0) return null;
    const firstWord = words.shift();
    const startRow = Math.floor(gridSize / 2);
    const startCol = Math.floor((gridSize - firstWord.word.length) / 2);

    for (let i = 0; i < firstWord.word.length; i++) {
        grid[startRow][startCol + i] = { char: firstWord.word[i] };
    }
    placedWords.push({ ...firstWord, row: startRow, col: startCol, orientation: 'across' });

    // Intentar colocar el resto
    let attempts = 0;
    while (words.length > 0 && attempts < 100) {
        const wordToPlace = words.shift();
        let placed = false;

        for (let i = 0; i < placedWords.length && !placed; i++) {
            const current = placedWords[i];
            for (let j = 0; j < current.word.length && !placed; j++) {
                for (let k = 0; k < wordToPlace.word.length && !placed; k++) {
                    if (current.word[j] === wordToPlace.word[k]) {
                        // Cruce encontrado
                        const newOrientation = current.orientation === 'across' ? 'down' : 'across';
                        let newRow, newCol;

                        if (current.orientation === 'across') {
                            newRow = current.row - k;
                            newCol = current.col + j;
                        } else { 
                            newRow = current.row + j;
                            newCol = current.col - k;
                        }

                        if (canPlaceWord(grid, wordToPlace.word, newRow, newCol, newOrientation)) {
                            for (let l = 0; l < wordToPlace.word.length; l++) {
                                let r = newRow + (newOrientation==='down'?l:0);
                                let c = newCol + (newOrientation==='across'?l:0);
                                grid[r][c] = { char: wordToPlace.word[l] };
                            }
                            placedWords.push({ ...wordToPlace, row: newRow, col: newCol, orientation: newOrientation });
                            placed = true;
                        }
                    }
                }
            }
        }
        attempts++;
    }
    
    // Asignar números
    const placedWordsInfo = [];
    placedWords.forEach(w => {
        const cell = grid[w.row][w.col];
        if(!cell.num) cell.num = placedWordsInfo.length + 1;
        placedWordsInfo.push({ ...w, number: cell.num });
    });

    return { grid, placedWordsInfo };
}

function canPlaceWord(grid, word, row, col, orientation) {
    if (row < 0 || col < 0 || row >= grid.length || col >= grid[0].length) return false;
    
    // Límite final
    if (orientation === 'across') { if (col + word.length > grid[0].length) return false; } 
    else { if (row + word.length > grid.length) return false; }

    for (let i = 0; i < word.length; i++) {
        let r = row + (orientation === 'down' ? i : 0);
        let c = col + (orientation === 'across' ? i : 0);
        const cell = grid[r][c];
        // Si la celda está ocupada, debe ser la misma letra
        if (cell && cell.char !== word[i]) return false;
    }
    return true;
}

async function handleCrosswordSubmit(event, practiceId) {
    const button = event.target;
    button.disabled = true;
    button.textContent = "Finalizando...";

    try {
        const practice = AppState.practices[practiceId];
        const quizScore = practice.students[AppState.user.uid].quizScore || 0;

        let correct = 0, total = 0;
        document.querySelectorAll(`#crossword-container-${practiceId} .crossword-cell`).forEach(cell => {
            total++;
            if (cell.value.toUpperCase() === cell.dataset.correct) {
                correct++;
                cell.style.backgroundColor = '#d4edda';
            } else {
                 cell.style.backgroundColor = '#f8d7da';
            }
            cell.disabled = true;
        });

        // Cálculo de nota: 70% Quiz + 30% Crucigrama
        const crossScore = total > 0 ? (correct / total) * 10 : 0;
        const finalGrade = Math.round((quizScore * 0.7) + (crossScore * 0.3));

        await submitStudentQuiz(practiceId, AppState.user.uid, finalGrade);
        alert(`¡Felicidades! Calificación Final: ${finalGrade}/10.`);
        renderStudentPracticesView();

    } catch (e) {
        alert(`Error: ${e.message}`);
        button.disabled = false;
    }
}