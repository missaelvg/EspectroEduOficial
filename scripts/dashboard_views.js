// scripts/dashboard_views.js (VERSIÓN FINAL MEJORADA)

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
        <button onclick="setActive(this); renderStudentPracticesView();">Mis Prácticas (Reporte)</button>
        <button onclick="setActive(this); renderStudentActivitiesView();">Actividades</button>
        <button onclick="setActive(this); renderStudentGradesView();">Calificaciones</button>
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
    contentDiv.innerHTML = `<h2>Bienvenido, Dr. ${AppState.user.username}</h2><div id="practices-summary">Cargando...</div>`;
    try {
        const practices = await getPractices();
        AppState.practices = practices;
        const practicesList = Object.values(practices);
        
        let html = `<p style="margin-bottom:20px;">Aquí tienes un resumen de tus prácticas activas.</p>`;
        if (practicesList.length === 0) {
            html += `<div class="card"><p>No has creado ninguna práctica aún. Ve a la pestaña "Crear Práctica".</p></div>`;
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
                            <button onclick="handleDeletePractice('${p.id}')" style="background-color:#dc2626; font-size:0.8em; padding:6px 12px;">Borrar</button>
                        </div>
                        <p style="color:#64748b;">${studentCount} alumno(s) inscrito(s)</p>
                        <div style="margin-top:15px; display:flex; gap:10px;">
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
            <p style="margin-bottom:20px; color:#64748b;">Sube los materiales necesarios. La IA generará automáticamente el cuestionario.</p>
            <label>Título de la Práctica</label>
            <input type="text" id="practiceTitle" placeholder="Ej. Espectroscopía Óptica #1">
            
            <label>Diapositivas (PDF)</label>
            <input type="file" id="slidesFile" accept="application/pdf">
            <small style="color:#64748b; display:block; margin-bottom:15px;">* Usado para generar el cuestionario y crucigrama.</small>
            
            <label>Estándar del Reporte (PDF)</label>
            <input type="file" id="standardFile" accept="application/pdf">
            <small style="color:#64748b; display:block; margin-bottom:15px;">* Usado para evaluar los reportes de los alumnos.</small>
            
            <button onclick="handlePracticeCreation()">CREAR PRÁCTICA</button>
            <div id="creationLog" style="margin-top: 15px; font-family:monospace;"></div>
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
        logDiv.innerHTML = '<span style="color:#3b82f6">1/5: Creando registro...</span>';
        const pid = await createPractice({ title, students: {}, generatedContent: null, creatorId: AppState.user.uid, createdAt: new Date() });

        logDiv.innerHTML = '<span style="color:#3b82f6">2/5: Subiendo archivos...</span>';
        const [slides, std] = await Promise.all([uploadFile(slidesFile, `practices/${pid}`), uploadFile(standardFile, `practices/${pid}`)]);
        
        logDiv.innerHTML = '<span style="color:#3b82f6">3/5: Guardando enlaces...</span>';
        await savePracticeContent(pid, { slidesPdfUrl: slides, standardPdfUrl: std });

        logDiv.innerHTML = '<span style="color:#eab308">4/5: Analizando textos para IA...</span>';
        let slidesText = "", standardText = "";
        try { slidesText = await extractTextFromPDF(slidesFile); } catch(e) {}
        try { standardText = await extractTextFromPDF(standardFile); } catch(e) {}

        await savePracticeContent(pid, { slidesText, standardText });

        if (slidesText.length > 50) {
            logDiv.innerHTML = '<span style="color:#eab308">5/5: Generando cuestionario...</span>';
            try {
                const gen = await callAIGenerate(slidesText);
                await savePracticeContent(pid, { generatedContent: gen });
                logDiv.innerHTML = '<p class="alert-success">✅ ¡Listo con IA!</p>';
            } catch (e) { logDiv.innerHTML = '<p class="alert-success" style="color:#f59e0b;">⚠️ Creada sin Cuestionario (Fallo IA).</p>'; }
        } else {
            logDiv.innerHTML = '<p class="alert-success" style="color:#f59e0b;">⚠️ Creada (PDF imagen, sin IA).</p>';
        }
        setTimeout(() => { document.querySelector('#navbar button').click(); }, 3000);
    } catch (e) { logDiv.innerHTML = `<p class="alert-error">Error: ${e.message}</p>`; button.disabled = false; }
}

// --- GESTIÓN DE ALUMNOS (DOCTOR) ---
async function renderManageStudentsView() {
    const contentDiv = document.getElementById('main-content');
    contentDiv.innerHTML = `<h2>Gestionar Alumnos</h2><div class="card"><input type="text" id="studentSearchInput" placeholder="🔍 Buscar por nombre o matrícula..." onkeyup="handleSearchStudent()" style="margin-bottom:0;"></div><div id="students-list-container">Cargando...</div>`;
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
    Object.values(AppState.practices).forEach(p => { 
        Object.keys(p.students || {}).forEach(sid => studentPracticeMap[sid] = { id: p.id, title: p.title }); 
    });

    let html = '';
    if (studentsToRender.length === 0) html = `<p>No se encontraron alumnos.</p>`;
    else {
        studentsToRender.forEach(student => {
            const currentPractice = studentPracticeMap[student.uid];
            const groupDisplay = student.grupo ? `| Grupo: ${student.grupo}` : '';
            html += `
                <div class="student-list-item">
                    <div style="flex:1;">
                        <strong>${student.username}</strong> <span style="color:#666; font-size:0.9em;">${groupDisplay}</span><br> 
                        <small>Matrícula: ${student.matricula}</small>
                    </div>
                    <div style="flex:1; text-align:right;">`;
            if (currentPractice) {
                html += `<span style="color:#16a34a; font-weight:bold; margin-right:10px;">Inscrito: ${currentPractice.title}</span>
                         <button onclick="handleUnenroll('${currentPractice.id}', '${student.uid}')" style="background-color:#f39c12; font-size:0.7em; padding:5px 8px;">Desinscribir</button>`;
            } else {
                if (Object.keys(AppState.practices).length > 0) {
                    html += `<select id="practice-select-${student.uid}" style="padding:5px; width:auto; margin-right:5px;">
                                <option value="">Seleccionar...</option>
                                ${Object.values(AppState.practices).map(p => `<option value="${p.id}">${p.title}</option>`).join('')}
                             </select>
                             <button onclick="enrollStudentHandler('${student.uid}')" style="font-size:0.7em; padding:5px 8px;">Inscribir</button>`;
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

// --- CALIFICACIONES (DOCTOR) ---
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
            for (const p of Object.values(practices)) {
                const students = p.students || {};
                html += `<div class="card"><h4>${p.title}</h4>`;
                
                if (Object.keys(students).length === 0) {
                    html += '<p style="color:#64748b;">No hay alumnos inscritos.</p>';
                } else {
                    html += `<div class="table-container"><table class="styled-table">
                            <thead><tr><th>Alumno</th><th>Matrícula</th><th>Reporte</th><th>Cuestionario</th><th>Crucigrama</th><th>Final</th></tr></thead><tbody>`;
                    
                    for (const sid in students) {
                        const sData = students[sid];
                        const sInfo = usersMap.get(sid);
                        const name = sInfo ? sInfo.username : "Usuario desconocido";
                        const matricula = sInfo ? sInfo.matricula : sid;
                        
                        let avg = 0, count = 0;
                        if(sData.reportScore !== undefined) { avg += sData.reportScore; count++; }
                        if(sData.quizScore !== undefined) { avg += sData.quizScore; count++; }
                        if(sData.crosswordScore !== undefined) { avg += sData.crosswordScore; count++; }
                        const final = count > 0 ? Math.round(avg / count) : '-';

                        html += `<tr>
                                <td>${name}</td>
                                <td>${matricula}</td>
                                <td>${sData.reportScore ?? '-'}</td>
                                <td>${sData.quizScore ?? '-'}</td>
                                <td>${sData.crosswordScore ?? '-'}</td>
                                <td><strong>${final}</strong></td>
                            </tr>`;
                    }
                    html += `</tbody></table></div>`;
                }
                html += `</div>`;
            }
        }
        document.getElementById('grades-by-practice').innerHTML = html;
    } catch (e) { contentDiv.innerHTML = `<p class="alert-error">${e.message}</p>`; }
}

// --- MANEJADORES DE ACCIÓN (DOCTOR) ---
async function handleDeletePractice(pid) { if(confirm("¿Borrar práctica?")) { await deletePractice(pid); renderDoctorDashboard(); } }
async function handleDeleteUser(uid) { if(confirm("¿Borrar usuario permanentemente?")) { await deleteUser(uid); renderManageStudentsView(); } }
async function handleUnenroll(pid, uid) { 
    if(confirm("¿Desinscribir?")) { 
        try {
            await unenrollStudent(pid, uid); 
            if (AppState.practices[pid] && AppState.practices[pid].students) delete AppState.practices[pid].students[uid]; 
            handleSearchStudent(); 
        } catch (e) { alert(e.message); }
    } 
}
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
// VISTAS DEL ALUMNO
// ====================================================

function renderStudentDashboard() {
    document.getElementById('main-content').innerHTML = `<h2>¡Hola, ${AppState.user.username}!</h2><div class="card"><p>Bienvenido a tu espacio de aprendizaje. Aquí podrás gestionar tus prácticas y ver tu progreso.</p><p>Selecciona una opción del menú superior para comenzar.</p></div>`;
}

// --- 1. MIS PRÁCTICAS (REPORTE) ---
async function renderStudentPracticesView() {
    const div = document.getElementById('main-content');
    div.innerHTML = '<h2>Entrega de Reportes</h2><div id="list">Cargando...</div>';
    try {
        const practices = await getPractices();
        AppState.practices = practices; 
        const myP = Object.values(practices).filter(p => p.students && p.students[AppState.user.uid]);

        if (myP.length === 0) { document.getElementById('list').innerHTML = '<p>No tienes prácticas asignadas.</p>'; return; }

        const html = myP.map(p => {
            const st = p.students[AppState.user.uid];
            const hasReport = st.reportUrl ? true : false;
            let body = '';
            
            if (hasReport) {
                const scoreDisplay = st.reportScore ? `<br><strong style="color:#16a34a">Calificación IA: ${st.reportScore}/10</strong>` : '<br><em>Evaluando...</em>';
                const feedbackDisplay = st.reportFeedback ? `<p style="font-size:0.9em; background:#f0fdf4; padding:10px; border-radius:5px; margin-top:5px;"><strong>IA:</strong> ${st.reportFeedback}</p>` : '';
                
                body = `<div class="alert-success">✅ Reporte Entregado ${scoreDisplay}</div>${feedbackDisplay}
                        <div style="margin-top:10px;"><a href="${p.slidesPdfUrl}" target="_blank" class="btn btn-secondary">Diapositivas</a> <a href="${p.standardPdfUrl}" target="_blank" class="btn btn-secondary">Estándar</a></div>`;
            } else {
                body = `<p>Descarga materiales y sube tu PDF para evaluación inmediata con IA:</p>
                        <a href="${p.slidesPdfUrl}" target="_blank" class="btn">⬇️ Diapositivas</a> <a href="${p.standardPdfUrl}" target="_blank" class="btn">⬇️ Estándar</a>
                        <hr><input type="file" id="rep-${p.id}" accept="application/pdf"><button onclick="handleReportUpload('${p.id}')">Evaluar y Entregar</button><div id="log-${p.id}"></div>`;
            }
            return `<div class="card"><h4>${p.title}</h4>${body}</div>`;
        }).join('');
        document.getElementById('list').innerHTML = html;
    } catch (e) { div.innerHTML = `<p class="alert-error">${e.message}</p>`; }
}

// --- 2. ACTIVIDADES (CUESTIONARIO + CRUCIGRAMA) ---
async function renderStudentActivitiesView() {
    const div = document.getElementById('main-content');
    div.innerHTML = '<h2>Actividades</h2><div id="act-list">Cargando...</div>';
    
    try {
        const practices = await getPractices();
        AppState.practices = practices;
        const myP = Object.values(practices).filter(p => p.students && p.students[AppState.user.uid]);

        if (myP.length === 0) { document.getElementById('act-list').innerHTML = '<p>Sin actividades.</p>'; return; }

        const html = myP.map(p => {
            const st = p.students[AppState.user.uid];
            if (!st.reportUrl) return `<div class="card"><h4>${p.title}</h4><div style="background:#f1f5f9; padding:20px; border-radius:8px; text-align:center;">🔒 <strong>Bloqueado</strong><br>Entrega tu reporte primero.</div></div>`;
            if (st.completed) return `<div class="card"><h4>${p.title}</h4><div class="alert-success">🎉 Actividades Completadas.</div></div>`;
            
            const containerId = st.status === 'Crucigrama Pendiente' ? `cross-${p.id}` : `quiz-${p.id}`;
            return `<div class="card"><h4>${p.title}</h4><div id="${containerId}">Cargando actividad...</div></div>`;
        }).join('');

        document.getElementById('act-list').innerHTML = html;

        myP.forEach(p => {
            const st = p.students[AppState.user.uid];
            if (st.reportUrl && !st.completed) {
                if (st.status === 'Crucigrama Pendiente') renderCrossword(p);
                else renderQuiz(p);
            }
        });

    } catch (e) { div.innerHTML = `<p class="alert-error">${e.message}</p>`; }
}

// --- 3. CALIFICACIONES DETALLADAS ---
async function renderStudentGradesView() {
    const contentDiv = document.getElementById('main-content');
    contentDiv.innerHTML = '<h2>Mis Calificaciones</h2><div id="grades-list">Cargando...</div>';
    try {
        const practices = await getPractices();
        const myP = Object.values(practices).filter(p => p.students && p.students[AppState.user.uid]);

        if (myP.length === 0) { document.getElementById('grades-list').innerHTML = '<p>No hay registros.</p>'; return; }

        let html = `<div class="table-container"><table class="styled-table"><thead><tr><th>Práctica</th><th>Reporte</th><th>Cuestionario</th><th>Crucigrama</th><th>Promedio</th></tr></thead><tbody>`;

        html += myP.map(p => {
            const st = p.students[AppState.user.uid];
            const reportScore = st.reportScore !== undefined ? st.reportScore : '-';
            const quizScore = st.quizScore !== undefined ? st.quizScore : '-';
            const crossScore = st.crosswordScore !== undefined ? st.crosswordScore : '-';
            
            let avg = 0, count = 0;
            if(st.reportScore !== undefined) { avg += st.reportScore; count++; }
            if(st.quizScore !== undefined) { avg += st.quizScore; count++; }
            if(st.crosswordScore !== undefined) { avg += st.crosswordScore; count++; }
            const final = count > 0 ? Math.round(avg/count) : '-';

            return `<tr><td>${p.title}</td><td>${reportScore}</td><td>${quizScore}</td><td>${crossScore}</td><td><strong>${final}</strong></td></tr>`;
        }).join('');

        html += `</tbody></table></div>`;
        document.getElementById('grades-list').innerHTML = html;
    } catch (e) { document.getElementById('grades-list').innerHTML = `<p class="alert-error">${e.message}</p>`; }
}

// --- 4. PERFIL ---
function renderStudentProfileView() {
    const u = AppState.user;
    document.getElementById('main-content').innerHTML = `<h2>Mi Perfil</h2><div class="card"><label>Matrícula</label><input type="text" value="${u.matricula}" disabled><label>Nombre</label><input id="pN" value="${u.username}"><label>Grupo</label><input id="pG" value="${u.grupo||''}"><label>Email</label><input id="pE" value="${u.email}"><button onclick="updProf()">Actualizar</button></div>`;
}
async function updProf(){ 
    try {
        await updateUserProfile(AppState.user.uid, {username: document.getElementById('pN').value, grupo: document.getElementById('pG').value, email: document.getElementById('pE').value}); 
        alert("Perfil actualizado");
    } catch(e) { alert(e.message); }
}

// --- MANEJADORES DE ACCIÓN (ALUMNO) ---

async function handleReportUpload(pid) {
    const f = document.getElementById(`rep-${pid}`).files[0];
    const log = document.getElementById(`log-${pid}`);
    if(!f) return alert("Elige archivo");
    
    log.innerText = "1/3 Subiendo...";
    const btn = log.previousElementSibling;
    btn.disabled = true;

    try {
        const url = await uploadFile(f, `reports/${pid}/${AppState.user.uid}`);
        log.innerText = "2/3 Evaluando con IA...";
        let reportScore = null, reportFeedback = null;
        try {
            const reportText = await extractTextFromPDF(f);
            const practice = AppState.practices[pid] || (await getPractices())[pid];
            const standardText = practice.standardText || "Evaluar técnicamente.";
            if (reportText.length > 50) {
                const evaluation = await callAIEvaluate(reportText, standardText);
                reportScore = evaluation.calificacion;
                reportFeedback = evaluation.justificacion;
            }
        } catch (aiErr) { console.warn("Fallo IA:", aiErr); }

        log.innerText = "3/3 Guardando...";
        await callDB('submit_report', { 
            practiceId: pid, studentUid: AppState.user.uid, 
            reportUrl: url, reportScore: reportScore, reportFeedback: reportFeedback
        });
        alert(reportScore ? `Calificación Reporte: ${reportScore}/10` : "Reporte entregado.");
        renderStudentPracticesView();
    } catch(e) { log.innerText = `Error: ${e.message}`; btn.disabled = false; }
}

function renderQuiz(p) {
    const d = document.getElementById(`quiz-${p.id}`);
    const q = p.generatedContent?.cuestionario;
    if(!q) return d.innerHTML="<p class='alert-error'>Error: Sin cuestionario</p>";
    let h = '<p>Responde:</p>';
    q.forEach((x,i)=> {
        h+=`<div class="question"><p>${i+1}. ${x.pregunta}</p>`;
        x.opciones?.forEach(o=>h+=`<label class="option-label"><input type="radio" name="q-${p.id}-${i}" value="${o}"> ${o}</label>`);
        h+='</div>';
    });
    d.innerHTML = h + `<button onclick="subQuiz(event, '${p.id}')">Enviar</button>`;
}

async function subQuiz(e, pid) {
    const btn = e.target;
    btn.disabled=true;
    let p = AppState.practices[pid];
    if(!p) { const all=await getPractices(); p=all[pid]; AppState.practices=all; }
    const qs = p.generatedContent.cuestionario;
    let s = 0;
    qs.forEach((q,i)=>{
        const el = document.getElementsByName(`q-${pid}-${i}`);
        const sel = Array.from(el).find(x=>x.checked);
        if(sel && sel.value.trim().toLowerCase()===q.correcta.trim().toLowerCase()) s++;
    });
    const quizGrade = Math.round((s/qs.length)*10);
    await updateStudentProgress(pid, AppState.user.uid, { status: 'Crucigrama Pendiente', quizScore: quizGrade });
    alert(`Cuestionario: ${quizGrade}/10. Siguiente: Crucigrama.`);
    renderStudentActivitiesView();
}

function renderCrossword(p) {
    const d = document.getElementById(`cross-${p.id}`);
    const data = p.generatedContent?.crucigrama;
    if(!data) return d.innerHTML="<p>Error crucigrama</p>";
    
    const words = data.map(w => ({ word: w.word.toUpperCase(), clue: w.clue }));
    const layout = generateCrosswordLayout(words);
    if(!layout) return d.innerHTML="<p>Error generando crucigrama</p>";
    
    let h = '<table>';
    layout.grid.forEach(r => { h+='<tr>'; r.forEach(c => h+= c ? `<td><input type="text" maxlength="1" data-correct="${c.char}" class="crossword-cell"><span class="crossword-number">${c.num||''}</span></td>` : '<td class="empty"></td>'); h+='</tr>'; });
    h += '</table>';
    let cl = '<h5>Pistas</h5>';
    layout.placedWordsInfo.forEach(w => cl+=`<p><strong>${w.number}. ${w.orientation==='across'?'H':'V'}</strong>: ${w.clue}</p>`);
    
    d.innerHTML = `<h5>Crucigrama</h5><div class="crossword-container"><div class="crossword-grid">${h}</div><div class="crossword-clues">${cl}</div></div><br><button onclick="finCross(event, '${p.id}')">Finalizar</button>`;
    const st = document.createElement('style'); st.innerHTML = `.crossword-number{position:absolute;top:1px;left:1px;font-size:8px;color:#333;}`; d.appendChild(st);
}

function generateCrosswordLayout(words) {
    const size=15; let grid=Array(size).fill(0).map(()=>Array(size).fill(null)); let placed=[];
    words.sort((a,b)=>b.word.length-a.word.length);
    if(words.length===0) return null;
    
    const f=words.shift(); const sr=Math.floor(size/2), sc=Math.floor((size-f.word.length)/2);
    for(let i=0; i<f.word.length; i++) grid[sr][sc+i]={char:f.word[i], num: i===0?1:undefined};
    placed.push({...f, number:1, row:sr, col:sc, orientation:'across'});

    let attempts = 0;
    while(words.length > 0 && attempts < 100) {
        const w = words.shift();
        let isPlaced = false;
        for(let i=0; i<placed.length && !isPlaced; i++) {
            const p = placed[i];
            for(let j=0; j<p.word.length && !isPlaced; j++) {
                for(let k=0; k<w.word.length && !isPlaced; k++) {
                    if(p.word[j] === w.word[k]) {
                        const newO = p.orientation === 'across' ? 'down' : 'across';
                        let nr, nc;
                        if(p.orientation === 'across') { nr = p.row - k; nc = p.col + j; } else { nr = p.row + j; nc = p.col - k; }
                        if(canPlace(grid, w.word, nr, nc, newO)) {
                            for(let l=0; l<w.word.length; l++) {
                                let r = nr + (newO==='down'?l:0);
                                let c = nc + (newO==='across'?l:0);
                                grid[r][c] = { char: w.word[l] };
                            }
                            placed.push({...w, row:nr, col:nc, orientation:newO});
                            isPlaced = true;
                        }
                    }
                }
            }
        }
        if(!isPlaced) words.push(w);
        attempts++;
    }
    let num = 1;
    placed.forEach(w => { const cell = grid[w.row][w.col]; if(!cell.num) { cell.num = num; num++; } w.number = cell.num; });
    return { grid, placedWordsInfo: placed };
}

function canPlace(grid, word, r, c, o) {
    if(r<0 || c<0 || r>=grid.length || c>=grid[0].length) return false;
    if(o==='across') { if(c+word.length > grid[0].length) return false; } else { if(r+word.length > grid.length) return false; }
    for(let i=0; i<word.length; i++) {
        let cr = r + (o==='down'?i:0);
        let cc = c + (o==='across'?i:0);
        const cell = grid[cr][cc];
        if(cell && cell.char !== word[i]) return false;
    }
    return true;
}

async function finCross(e, pid) {
    const btn = e.target;
    btn.disabled=true;
    let p = AppState.practices[pid];
    if(!p) { const all=await getPractices(); p=all[pid]; }

    let corr=0, tot=0;
    document.querySelectorAll(`#cross-${pid} .crossword-cell`).forEach(c=>{
        tot++; if(c.value.toUpperCase()===c.dataset.correct) { corr++; c.style.background='#dcfce7'; } else c.style.background='#fee2e2';
    });
    const cScore = tot>0 ? Math.round((corr/tot)*10) : 0;
    
    // Guardar nota específica del crucigrama y marcar completado
    await updateStudentProgress(pid, AppState.user.uid, { completed: true, status: 'Finalizado', crosswordScore: cScore });
    alert(`Crucigrama: ${cScore}/10`);
    renderStudentActivitiesView();
}