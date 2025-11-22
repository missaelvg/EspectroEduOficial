// scripts/dashboard_views.js (VERSIÓN CON SECCIONES DEFINIDAS)

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
// VISTAS DEL DOCTOR (Sin cambios funcionales)
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
            <small style="color:#64748b; display:block; margin-bottom:15px;">* La IA generará un cuestionario de opción múltiple basado en este archivo.</small>
            
            <label for="standardFile">Estándar del Reporte (PDF)</label>
            <input type="file" id="standardFile" accept="application/pdf">
            
            <button onclick="handlePracticeCreation()">CREAR PRÁCTICA</button>
            
            <div id="creationLog" style="margin-top: 15px; font-family:monospace; font-size:0.9em;"></div>
        </div>`;
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
    try {
        logDiv.innerHTML = '<span style="color:#3b82f6">1/4: Creando registro...</span>';
        const practiceData = { title, students: {}, generatedContent: null, creatorId: AppState.user.uid, createdAt: new Date() };
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
    try {
        await enrollStudent(pid, uid);
        if(AppState.practices[pid]) {
            if(!AppState.practices[pid].students) AppState.practices[pid].students = {};
            AppState.practices[pid].students[uid] = { status: 'Inscrito' };
        }
        handleSearchStudent();
    } catch (e) { alert(e.message); }
}

// ====================================================
// VISTAS DEL ALUMNO (DISEÑO MEJORADO DE PRÁCTICAS)
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
            const hasReport = statusData.reportUrl ? true : false;
            const quizDone = (statusData.status === 'Crucigrama Pendiente' || statusData.status === 'Práctica Finalizada' || statusData.completed);
            const allDone = statusData.completed;

            // --- SECCIÓN 1: REPORTE ---
            let reportSectionHTML = '';
            if (hasReport) {
                reportSectionHTML = `
                    <div class="completed-step">
                        <span style="color:#16a34a; font-weight:bold;">✅ Reporte Entregado</span>
                        <div style="margin-top:10px;">
                            <a href="${p.slidesPdfUrl}" target="_blank" class="btn btn-secondary" style="font-size:0.8em; padding:5px 10px;">📄 Diapositivas</a>
                            <a href="${p.standardPdfUrl}" target="_blank" class="btn btn-secondary" style="font-size:0.8em; padding:5px 10px;">📄 Estándar</a>
                        </div>
                    </div>`;
            } else {
                reportSectionHTML = `
                    <div style="margin-bottom:15px;">
                        <p style="font-size:0.9em; color:#64748b; margin-bottom:10px;">Descarga los materiales y sube tu PDF:</p>
                        <a href="${p.slidesPdfUrl}" target="_blank" class="btn" style="margin-right:5px;">⬇️ Diapositivas</a>
                        <a href="${p.standardPdfUrl}" target="_blank" class="btn">⬇️ Estándar</a>
                    </div>
                    <div class="upload-area" style="background:#f8fafc; padding:15px; border-radius:8px; border:1px dashed #cbd5e1;">
                        <input type="file" id="report-file-${p.id}" accept="application/pdf" style="margin-bottom:10px;">
                        <button onclick="handleReportUpload('${p.id}')" style="width:100%;">Entregar Reporte</button>
                        <div class="upload-log" id="log-${p.id}" style="font-size:0.8em; margin-top:5px; color:#666;"></div>
                    </div>`;
            }

            // --- SECCIÓN 2: ACTIVIDADES ---
            let activitiesHTML = '';
            if (!hasReport) {
                activitiesHTML = `
                    <div style="text-align:center; padding:20px; background:#f1f5f9; border-radius:8px; color:#64748b;">
                        <span style="font-size:1.5em;">🔒</span><br>
                        <strong>Actividades Bloqueadas</strong><br>
                        <small>Sube tu reporte para desbloquear el cuestionario.</small>
                    </div>`;
            } else if (!quizDone) {
                activitiesHTML = `<div id="quiz-container-${p.id}"></div>`;
                setTimeout(() => renderQuiz(p), 0);
            } else if (!allDone) {
                activitiesHTML = `<div id="crossword-container-${p.id}"></div>`;
                setTimeout(() => renderCrossword(p), 0);
            } else {
                activitiesHTML = `
                    <div style="text-align:center; padding:20px; background:#dcfce7; border-radius:8px; color:#16a34a;">
                        <span style="font-size:2em;">🎉</span><br>
                        <strong>¡Felicidades!</strong><br>
                        Has completado todas las actividades de esta práctica.
                        <br><small>Puedes ver tu calificación final en la sección "Mis Calificaciones".</small>
                    </div>`;
            }

            return `
                <div class="card" style="padding:0; overflow:hidden;">
                    <div style="background:#0f172a; color:white; padding:15px 20px; display:flex; justify-content:space-between; align-items:center;">
                        <h4 style="margin:0; color:white;">${p.title}</h4>
                        <span style="background:rgba(255,255,255,0.2); padding:4px 10px; border-radius:15px; font-size:0.8em;">${statusData.status}</span>
                    </div>
                    
                    <div style="padding:20px;">
                        <div style="margin-bottom:30px;">
                            <h5 style="color:#3b82f6; border-bottom:2px solid #f1f5f9; padding-bottom:10px; margin-bottom:15px;">1. Entrega de Reporte</h5>
                            ${reportSectionHTML}
                        </div>

                        <div>
                            <h5 style="color:#eab308; border-bottom:2px solid #f1f5f9; padding-bottom:10px; margin-bottom:15px;">2. Actividades para Resolver</h5>
                            ${activitiesHTML}
                        </div>
                    </div>
                </div>`;
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

    let quizHtml = `<p style="margin-bottom:15px;">Selecciona la respuesta correcta:</p>`;
    questions.forEach((q, index) => {
        const inputName = `q-${practice.id}-${index}`;
        quizHtml += `<div class="question"><p><strong>${index + 1}. ${q.pregunta}</strong></p>`;
        if (q.opciones && Array.isArray(q.opciones)) {
            q.opciones.forEach(op => {
                quizHtml += `<label style="display:flex; align-items:center; margin-bottom:5px; cursor:pointer; background:white; padding:10px; border:1px solid #e2e8f0; border-radius:8px;">
                    <input type="radio" name="${inputName}" value="${op}" style="margin:0 10px 0 0; width:18px; height:18px;"> ${op}
                </label>`;
            });
        }
        quizHtml += `</div>`;
    });
    quizHtml += `<button onclick="handleQuizSubmit(event, '${practice.id}')" style="width:100%; margin-top:10px;">Enviar Cuestionario</button>`;
    container.innerHTML = quizHtml;
}

async function handleQuizSubmit(event, practiceId) {
    const button = event.target;
    let practice = AppState.practices[practiceId];
    if (!practice) {
        const allPractices = await getPractices();
        practice = allPractices[practiceId];
    }

    const questions = practice.generatedContent.cuestionario;
    let answeredCount = 0;
    questions.forEach((q, index) => {
        const inputs = document.getElementsByName(`q-${practiceId}-${index}`);
        if(Array.from(inputs).some(i => i.checked)) answeredCount++;
    });

    if (answeredCount < questions.length) {
        alert(`Responde todas las preguntas (${answeredCount}/${questions.length}).`);
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

// ... (Funciones de crucigrama igual que antes) ...
function renderCrossword(p) {
    const d = document.getElementById(`crossword-container-${p.id}`);
    const data = p.generatedContent?.crucigrama;
    if(!data) return d.innerHTML="<p>Error crucigrama</p>";
    const words = data.map(w => ({ word: w.word.toUpperCase(), clue: w.clue }));
    const layout = generateCrosswordLayout(words);
    if(!layout) return d.innerHTML="<p>Error grid</p>";
    let h = '<table>';
    layout.grid.forEach(r => { h+='<tr>'; r.forEach(c => h+= c ? `<td><input type="text" maxlength="1" data-correct="${c.char}" class="crossword-cell"><span class="crossword-number">${c.num||''}</span></td>` : '<td class="empty"></td>'); h+='</tr>'; });
    h += '</table>';
    let cl = '<h5>Pistas</h5>';
    layout.placedWordsInfo.forEach(w => cl+=`<p><strong>${w.number}. ${w.orientation==='across'?'H':'V'}</strong>: ${w.clue}</p>`);
    d.innerHTML = `<h5>Crucigrama</h5><div class="crossword-container"><div class="crossword-grid">${h}</div><div class="crossword-clues">${cl}</div></div><br><button onclick="handleCrosswordSubmit(event, '${p.id}')" style="width:100%;">Finalizar Práctica</button>`;
    const style = document.createElement('style');
    style.innerHTML = `.crossword-number { position:absolute; top:1px; left:1px; font-size:9px; z-index:1; color: #333; }`;
    d.appendChild(style);
}
function generateCrosswordLayout(words) {
    const size=15; let grid=Array(size).fill(0).map(()=>Array(size).fill(null)); let placed=[];
    words.sort((a,b)=>b.word.length-a.word.length);
    const f=words.shift(); const sr=7, sc=Math.floor((size-f.word.length)/2);
    for(let i=0; i<f.word.length; i++) grid[sr][sc+i]={char:f.word[i], num: i===0?1:undefined};
    placed.push({...f, number:1, orientation:'across'});
    // Lógica simplificada para asegurar estabilidad (como antes)
    return { grid, placedWordsInfo: placed };
}
async function handleCrosswordSubmit(e, pid) {
    e.target.disabled=true;
    const quizScore = AppState.practices[pid].students[AppState.user.uid].quizScore;
    const final = Math.round(quizScore*0.7 + 3); 
    await submitStudentQuiz(pid, AppState.user.uid, final>10?10:final);
    alert(`Finalizado. Nota Final: ${final>10?10:final}`);
    renderStudentPracticesView();
}