// scripts/dashboard_views.js (VERSIÓN COMPLETA CON EDICIÓN Y BORRADO)

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
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <h4>${p.title}</h4>
                            <button onclick="handleDeletePractice('${p.id}')" style="background-color:#dc2626; font-size:0.8em; padding:5px 10px;">Borrar</button>
                        </div>
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
        
        // Mapa para saber en qué práctica está cada alumno
        const studentPracticeMap = {};
        Object.values(practices).forEach(p => {
            Object.keys(p.students || {}).forEach(sid => {
                studentPracticeMap[sid] = { id: p.id, title: p.title };
            });
        });
        
        let html = `<h3>Estado de los Alumnos</h3>`;
        if (allStudents.length === 0) {
            html += `<p>No hay alumnos registrados en el sistema.</p>`;
        } else {
            allStudents.forEach(student => {
                const currentPractice = studentPracticeMap[student.uid];
                html += `
                    <div class="student-list-item">
                        <div style="flex:1;">
                            <strong>${student.username}</strong> <br> 
                            <small>Matrícula: ${student.matricula}</small>
                        </div>
                        <div style="flex:1; text-align:right;">
                `;

                if (currentPractice) {
                    // Si ya tiene práctica, mostramos cuál es y botón de desinscribir
                    html += `
                        <span style="color:#16a34a; font-weight:bold;">Inscrito en: ${currentPractice.title}</span>
                        <button onclick="handleUnenroll('${currentPractice.id}', '${student.uid}')" style="background-color:#f39c12; margin-left:10px; font-size:0.8em;">Desinscribir / Editar</button>
                    `;
                } else {
                    // Si no tiene práctica, mostramos selector para inscribir
                    if (Object.keys(practices).length > 0) {
                        html += `
                            <select id="practice-select-${student.uid}" style="padding:5px; width:auto; margin-right:5px;">
                                <option value="">Seleccionar Práctica...</option>
                                ${Object.values(practices).map(p => `<option value="${p.id}">${p.title}</option>`).join('')}
                            </select>
                            <button onclick="enrollStudentHandler('${student.uid}')" style="font-size:0.8em;">Inscribir</button>
                        `;
                    } else {
                        html += `<span style="color:#7f8c8d;">Crea una práctica primero</span>`;
                    }
                }
                html += `</div></div>`;
            });
        }
        document.getElementById('students-management-area').innerHTML = html;
    } catch (e) {
        document.getElementById('students-management-area').innerHTML = `<p class="alert-error">Error al cargar alumnos: ${e.message}</p>`;
    }
}

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
                        html += `<li>${name} - Calificación Final: ${grade}</li>`;
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

async function handleDeletePractice(practiceId) {
    if (confirm("¿Estás SEGURO de que quieres borrar esta práctica? Se perderá el progreso de todos los alumnos inscritos en ella.")) {
        try {
            await deletePractice(practiceId);
            alert("Práctica eliminada.");
            renderDoctorDashboard();
        } catch (e) {
            alert("Error al eliminar: " + e.message);
        }
    }
}

async function handleUnenroll(practiceId, studentUid) {
    if (confirm("¿Desinscribir a este alumno? Perderá su progreso actual en esta práctica.")) {
        try {
            await unenrollStudent(practiceId, studentUid);
            alert("Alumno desinscrito. Ahora puedes asignarlo a otra práctica.");
            renderManageStudentsView();
        } catch (e) {
            alert("Error al desinscribir: " + e.message);
        }
    }
}

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
            creatorId: AppState.user.uid,
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
            document.querySelector('#navbar button').click();
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
        alert("Selecciona una práctica.");
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
// VISTAS DEL ALUMNO (Sin cambios mayores)
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
            document.getElementById('student-practices-list').innerHTML = '<p>Aún no has sido inscrito en ninguna práctica. Contacta a tu doctor.</p>';
            return;
        }

        const html = myPractices.map(p => {
            const statusData = p.students[AppState.user.uid];
            let content = `<h4>${p.title}</h4><p><strong>Estado:</strong> ${statusData.status}</p>`;

            if (statusData.completed) {
                content += `<p>¡Felicidades! Has completado esta práctica. Puedes ver tu resultado en "Mis Calificaciones".</p>`;
            
            } else if (statusData.status === 'Crucigrama Pendiente') {
                content += `<div id="crossword-container-${p.id}"></div>`;
                setTimeout(() => renderCrossword(p), 0);

            } else if (statusData.reportUrl) {
                content += `<div id="quiz-container-${p.id}"></div>`;
                setTimeout(() => renderQuiz(p), 0);

            } else {
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
            } else {
                if (inputs[0] && inputs[0].value.trim().length > 10) {
                    correctAnswers++;
                }
            }
        });

        const quizScore = Math.round((correctAnswers / questions.length) * 10);

        await updateStudentProgress(practiceId, AppState.user.uid, 'Crucigrama Pendiente', quizScore);
        alert(`¡Cuestionario entregado! Tu puntaje parcial es: ${quizScore}/10. Ahora, el crucigrama.`);
        renderStudentPracticesView();

    } catch(e) {
        alert(`Error al entregar el cuestionario: ${e.message}`);
        button.disabled = false;
        button.textContent = "Entregar Cuestionario";
    }
}


// =======================================================
// LÓGICA DEL CRUCIGRAMA (VERSIÓN MEJORADA)
// =======================================================

function renderCrossword(practice) {
    const container = document.getElementById(`crossword-container-${practice.id}`);
    const crosswordData = practice.generatedContent?.crucigrama;

    if (!crosswordData || crosswordData.length === 0) {
        container.innerHTML = "<p class='alert-error'>Error: El crucigrama no está disponible.</p>";
        return;
    }

    const words = crosswordData.map(w => ({
        word: w.word.toUpperCase().trim(),
        clue: w.clue
    }));

    // --- Lógica de Generación del Crucigrama ---
    const layout = generateCrosswordLayout(words);
    if (!layout) {
        container.innerHTML = "<p class='alert-error'>No se pudo generar el crucigrama con las palabras dadas.</p>";
        return;
    }
    
    const { grid, placedWordsInfo } = layout;

    // --- Renderizado del HTML ---
    let gridHtml = '<table>';
    grid.forEach(row => {
        gridHtml += '<tr>';
        row.forEach(cell => {
            if (cell) {
                gridHtml += `<td style="position:relative;">
                    <input type="text" maxlength="1" data-correct="${cell.char}" class="crossword-cell">
                    ${cell.num ? `<span class="crossword-number">${cell.num}</span>` : ''}
                </td>`;
            } else {
                gridHtml += '<td class="empty"></td>';
            }
        });
        gridHtml += '</tr>';
    });
    gridHtml += '</table>';
    
    let cluesHtml = '<h5>Pistas</h5>';
    placedWordsInfo.sort((a,b) => a.number - b.number).forEach(w => {
         cluesHtml += `<p><strong>${w.number}. ${w.orientation === 'across' ? 'Horizontal' : 'Vertical'}</strong>: ${w.clue}</p>`;
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
    
    // Añadimos un estilo pequeño para los números, que no estaba en el CSS.
    const style = document.createElement('style');
    style.innerHTML = `
        .crossword-number { position:absolute; top:1px; left:1px; font-size:9px; z-index:1; color: #333; }
    `;
    container.appendChild(style);
}

/**
 * Intenta generar un layout para el crucigrama a partir de una lista de palabras.
 * @param {Array<{word: string, clue: string}>} words - La lista de palabras y pistas.
 * @returns {Object|null} Un objeto con la 'grid' y 'placedWordsInfo' o null si falla.
 */
function generateCrosswordLayout(words) {
    const gridSize = 20; // Un tamaño de rejilla más grande para mayor flexibilidad
    let grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(null));
    let placedWords = []; // { word, row, col, orientation, clue }

    // 1. Coloca la primera palabra (la más larga) en el centro.
    words.sort((a, b) => b.word.length - a.word.length);
    const firstWord = words.shift();
    const startRow = Math.floor(gridSize / 2);
    const startCol = Math.floor((gridSize - firstWord.word.length) / 2);

    for (let i = 0; i < firstWord.word.length; i++) {
        grid[startRow][startCol + i] = { char: firstWord.word[i] };
    }
    placedWords.push({ ...firstWord, row: startRow, col: startCol, orientation: 'across' });

    // 2. Itera sobre las palabras restantes para intentar cruzarlas.
    while (words.length > 0) {
        const wordToPlace = words.shift();
        let placed = false;

        for (let i = 0; i < placedWords.length && !placed; i++) {
            const currentPlacedWord = placedWords[i];
            for (let j = 0; j < currentPlacedWord.word.length && !placed; j++) {
                for (let k = 0; k < wordToPlace.word.length && !placed; k++) {
                    
                    if (currentPlacedWord.word[j] === wordToPlace.word[k]) {
                        // Posible intersección encontrada.
                        let newRow, newCol;
                        const newOrientation = currentPlacedWord.orientation === 'across' ? 'down' : 'across';

                        if (currentPlacedWord.orientation === 'across') {
                            newRow = currentPlacedWord.row - k;
                            newCol = currentPlacedWord.col + j;
                        } else { // 'down'
                            newRow = currentPlacedWord.row + j;
                            newCol = currentPlacedWord.col - k;
                        }

                        // Verificar si la palabra cabe y no choca con otras.
                        if (canPlaceWord(grid, wordToPlace.word, newRow, newCol, newOrientation)) {
                            for (let l = 0; l < wordToPlace.word.length; l++) {
                                let r = newRow, c = newCol;
                                if (newOrientation === 'across') c += l; else r += l;
                                grid[r][c] = { char: wordToPlace.word[l] };
                            }
                            placedWords.push({ ...wordToPlace, row: newRow, col: newCol, orientation: newOrientation });
                            placed = true;
                        }
                    }
                }
            }
        }
        if (!placed) { /* Opcional: manejar palabras que no se pudieron colocar */ }
    }
    
    // 3. Añadir los números a la rejilla final
    const placedWordsInfo = [];
    placedWords.forEach((word, index) => {
        const { row, col } = word;
        if (grid[row][col].num === undefined) {
             grid[row][col].num = placedWordsInfo.length + 1;
             placedWordsInfo.push({...word, number: grid[row][col].num});
        } else {
             // Si ya hay un número, la palabra comparte el inicio, hay que encontrarla.
             const existing = placedWordsInfo.find(p => p.number === grid[row][col].num && p.orientation !== word.orientation);
             if(existing) {
                 placedWordsInfo.push({...word, number: grid[row][col].num});
             }
        }
    });

    return { grid, placedWordsInfo };
}


/**
 * Verifica si una palabra se puede colocar en una posición sin colisionar.
 */
function canPlaceWord(grid, word, row, col, orientation) {
    if (row < 0 || col < 0) return false;

    for (let i = 0; i < word.length; i++) {
        let r = row, c = col;
        if (orientation === 'across') c += i; else r += i;
        
        if (r >= grid.length || c >= grid[0].length) return false; // Fuera de los límites

        const cell = grid[r][c];
        const prevCell = (orientation === 'across') ? grid[r][c-1] : grid[r-1]?.[c];
        const nextCell = (orientation === 'across') ? grid[r][c+1] : grid[r+1]?.[c];

        if (cell && cell.char !== word[i]) return false; // Colisión con letra diferente
        if (!cell && (prevCell || nextCell) && i > 0 && i < word.length-1) return false; // Paralelo a otra palabra
    }
    return true;
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
                cell.style.backgroundColor = '#d4edda';
            } else {
                 cell.style.backgroundColor = '#f8d7da';
            }
            cell.disabled = true; // Deshabilitar celdas tras calificar
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