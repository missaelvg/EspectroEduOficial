// scripts/dashboard_views.js (VERSIÓN CON MANUAL DE PRÁCTICA)

const AppState = {
    user: null,
    practices: {},
    users: [],
};

// Helper para formato de fecha
function formatDate(isoString) {
    if (!isoString) return '-';
    try {
        const date = new Date(isoString);
        return date.toLocaleString('es-MX', { 
            day: '2-digit', month: '2-digit', year: '2-digit', 
            hour: '2-digit', minute: '2-digit' 
        });
    } catch (e) { return '-'; }
}

// Helper para promedio
function calculateWeightedGrade(report, quiz, cross) {
    const r = report || 0;
    const q = quiz || 0;
    const c = cross || 0;
    const final = (r * 0.8) + (q * 0.1) + (c * 0.1);
    return parseFloat(final.toFixed(1));
}

// ====================================================
// NAVEGACIÓN
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
        <button class="active" onclick="setActive(this); renderStudentDashboard();">Inicio</button>
        <button onclick="setActive(this); renderStudentPracticesView();">Mis Prácticas</button>
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
    contentDiv.innerHTML = `
        <div style="margin-bottom:30px;">
            <h2 style="margin-bottom:5px; color:#0f172a;">Bienvenido, Dr. ${AppState.user.username}</h2>
            <p style="color:#64748b; margin-top:0;">Panel de control general.</p>
        </div>
        <div id="practices-summary">Cargando...</div>`;
    try {
        const practices = await getPractices();
        AppState.practices = practices;
        const practicesList = Object.values(practices);
        
        let html = '';
        if (practicesList.length === 0) {
            html += `<div class="card"><p>No hay prácticas creadas.</p></div>`;
        } else {
            practicesList.forEach(p => {
                const studentCount = Object.keys(p.students || {}).length;
                
                // Botones para el doctor (incluye Manual)
                const slidesBtn = p.slidesPdfUrl && p.slidesPdfUrl.length > 5 ? `<a href="${p.slidesPdfUrl}" target="_blank" class="btn btn-secondary">Ver Diapositivas</a>` : '';
                const stdBtn = p.standardPdfUrl && p.standardPdfUrl.length > 5 ? `<a href="${p.standardPdfUrl}" target="_blank" class="btn btn-secondary">Ver Estándar</a>` : '';
                const manualBtn = p.manualPdfUrl && p.manualPdfUrl.length > 5 ? `<a href="${p.manualPdfUrl}" target="_blank" class="btn btn-secondary">Ver Manual</a>` : '';

                html += `
                    <div class="card">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <h4>${p.title}</h4>
                            <button onclick="handleDeletePractice('${p.id}')" style="background-color:#ef4444; font-size:0.8em; padding:6px 12px; border:none; color:white;">Borrar</button>
                        </div>
                        <p style="color:#64748b; margin-bottom:15px;">${studentCount} alumno(s) inscrito(s)</p>
                        <div style="display:flex; gap:10px; flex-wrap:wrap;">
                            ${slidesBtn}
                            ${stdBtn}
                            ${manualBtn}
                        </div>
                    </div>`;
            });
        }
        document.getElementById('practices-summary').innerHTML = html;
    } catch (e) { contentDiv.innerHTML = `<p class="alert-error">Error: ${e.message}</p>`; }
}

function renderCreatePracticeView() {
    document.getElementById('main-content').innerHTML = `
        <h2>Crear Nueva Práctica</h2>
        <div class="card">
            <label>Título</label>
            <input type="text" id="practiceTitle" placeholder="Ej. Espectroscopía Óptica #1">
            
            <label>Diapositivas (PDF)</label>
            <input type="file" id="slidesFile" accept="application/pdf">
            <small style="color:#666; display:block; margin-bottom:15px;">* La IA usará esto para el cuestionario.</small>
            
            <label>Manual de Práctica (PDF)</label>
            <input type="file" id="manualFile" accept="application/pdf">
            <small style="color:#666; display:block; margin-bottom:15px;">* Guía paso a paso para el alumno.</small>
            
            <label>Estándar del Reporte (PDF)</label>
            <input type="file" id="standardFile" accept="application/pdf">
            <small style="color:#666; display:block; margin-bottom:15px;">* La IA usará esto para evaluar.</small>
            
            <button onclick="handlePracticeCreation()">CREAR PRÁCTICA</button>
            <div id="creationLog" style="margin-top:15px; font-family:monospace;"></div>
        </div>`;
}

async function handlePracticeCreation() {
    const title = document.getElementById('practiceTitle').value;
    const slidesFile = document.getElementById('slidesFile').files[0];
    const standardFile = document.getElementById('standardFile').files[0];
    const manualFile = document.getElementById('manualFile').files[0]; // Nuevo archivo
    const logDiv = document.getElementById('creationLog');
    const button = logDiv.previousElementSibling;

    if (!title || !slidesFile || !standardFile || !manualFile) {
        logDiv.innerHTML = '<p class="alert-error">Por favor, rellena todos los campos y sube los 3 archivos.</p>';
        return;
    }
    
    button.disabled = true;
    try {
        logDiv.innerHTML = '<span style="color:#3b82f6">1/5: Creando registro...</span>';
        const pid = await createPractice({ title, students: {}, generatedContent: null, creatorId: AppState.user.uid, createdAt: new Date() });

        logDiv.innerHTML = '<span style="color:#3b82f6">2/5: Subiendo archivos...</span>';
        // Subimos los 3 archivos en paralelo
        const [slides, std, manual] = await Promise.all([
            uploadFile(slidesFile, `practices/${pid}`),
            uploadFile(standardFile, `practices/${pid}`),
            uploadFile(manualFile, `practices/${pid}`)
        ]);
        
        logDiv.innerHTML = '<span style="color:#3b82f6">3/5: Guardando enlaces...</span>';
        // Guardamos las 3 URLs
        await savePracticeContent(pid, { slidesPdfUrl: slides, standardPdfUrl: std, manualPdfUrl: manual });

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

// --- GESTIÓN DE ALUMNOS ---
async function renderManageStudentsView() {
    const div = document.getElementById('main-content');
    div.innerHTML = `<h2>Gestionar Alumnos</h2><div class="card"><input type="text" id="sSearch" placeholder="Buscar..." onkeyup="hSearch()" style="margin-bottom:0;"></div><div id="sList">Cargando...</div>`;
    try {
        const [practices, users] = await Promise.all([getPractices(), getAllUsers()]);
        AppState.practices = practices; AppState.users = users.filter(u => u.role === 'alumno');
        rList(AppState.users);
    } catch (e) { document.getElementById('sList').innerHTML = `<p class="alert-error">${e.message}</p>`; }
}
function rList(list) {
    const c = document.getElementById('sList');
    const pMap = {}; Object.values(AppState.practices).forEach(p=>{Object.keys(p.students||{}).forEach(s=>pMap[s]={id:p.id, title:p.title})});
    let h = '';
    if (list.length === 0) h = '<p>No se encontraron alumnos.</p>';
    else {
        list.forEach(s => {
            const curr = pMap[s.uid];
            const groupLabel = s.grupo ? `<span style="margin-left:5px;background:#e0f2fe;color:#0284c7;padding:2px 6px;border-radius:4px;font-size:0.8em;">${s.grupo}</span>` : '';
            h += `<div class="student-list-item"><div><strong>${s.username}</strong> ${groupLabel}<br><small style="color:#64748b;">${s.matricula}</small></div><div style="text-align:right;">`;
            if(curr) h+=`<span style="color:#3b82f6;font-weight:bold;margin-right:10px;font-size:0.9em;">${curr.title}</span><button onclick="hUnenroll('${curr.id}','${s.uid}')" style="background:#f59e0b;font-size:0.7em;padding:6px 12px;">Desinscribir</button>`;
            else h+=`<select id="ps-${s.uid}" style="padding:6px;width:auto;margin-right:5px;border-radius:6px;border:1px solid #cbd5e1;"><option value="">Seleccionar...</option>${Object.values(AppState.practices).map(p=>`<option value="${p.id}">${p.title}</option>`).join('')}</select><button onclick="hEnroll('${s.uid}')" style="font-size:0.7em;padding:6px 12px;">Inscribir</button>`;
            h+=`<button onclick="hDel('${s.uid}')" style="background:#ef4444;font-size:0.7em;padding:6px 12px;margin-left:5px;">X</button></div></div>`;
        });
    }
    c.innerHTML = h;
}
function hSearch(){ rList(AppState.users.filter(u=>u.username.toLowerCase().includes(document.getElementById('sSearch').value.toLowerCase()) || (u.matricula&&u.matricula.toLowerCase().includes(document.getElementById('sSearch').value.toLowerCase())))); }
async function hEnroll(uid){ const pid=document.getElementById(`ps-${uid}`).value; if(!pid)return; await enrollStudent(pid,uid); if(!AppState.practices[pid].students)AppState.practices[pid].students={}; AppState.practices[pid].students[uid]={status:'Inscrito'}; hSearch(); }
async function hUnenroll(pid,uid){ if(confirm("¿Desinscribir?")){ await unenrollStudent(pid,uid); delete AppState.practices[pid].students[uid]; hSearch(); } }
async function hDel(uid){ if(confirm("¿Borrar usuario?")){ await deleteUser(uid); renderManageStudentsView(); } }
async function handleDeletePractice(pid) { if(confirm("¿Borrar práctica?")) { await deletePractice(pid); renderDoctorDashboard(); } }

// --- CALIFICACIONES DOCTOR ---
async function renderDoctorGradesView() {
    const contentDiv = document.getElementById('main-content');
    contentDiv.innerHTML = `<h2>Calificaciones por Práctica</h2><div id="grades-by-practice">Cargando...</div>`;
    try {
        const [practices, users] = await Promise.all([getPractices(), getAllUsers()]);
        const usersMap = new Map(users.map(u => [u.uid, u]));
        let html = '';
        for (const p of Object.values(practices)) {
            html += `<div class="card"><h4>${p.title}</h4>`;
            const studs = p.students || {};
            if (Object.keys(studs).length === 0) html += '<p style="color:#64748b;">No hay alumnos inscritos.</p>';
            else {
                html += `<div class="table-container"><table class="styled-table"><thead><tr><th>Alumno</th><th>Matrícula</th><th>Grupo</th><th>Reporte (80%)</th><th>Cuestionario (10%)</th><th>Crucigrama (10%)</th><th>Final</th><th>Fecha</th></tr></thead><tbody>`;
                for (const sid in studs) {
                    const sData = studs[sid];
                    const sInfo = usersMap.get(sid);
                    const name = sInfo ? sInfo.username : "Desconocido";
                    const matricula = sInfo ? sInfo.matricula : sid;
                    const grupo = sInfo ? (sInfo.grupo || '-') : '-';
                    
                    const rScore = sData.reportScore !== undefined ? sData.reportScore : 0;
                    const qScore = sData.quizScore !== undefined ? sData.quizScore : 0;
                    const cScore = sData.crosswordScore !== undefined ? sData.crosswordScore : 0;
                    const final = calculateWeightedGrade(rScore, qScore, cScore);
                    const date = formatDate(sData.completedAt || sData.reportSubmittedAt);
                    
                    html += `<tr><td>${name}</td><td>${matricula}</td><td>${grupo}</td><td>${sData.reportScore ?? '-'}</td><td>${sData.quizScore ?? '-'}</td><td>${sData.crosswordScore ?? '-'}</td><td><strong>${final}</strong></td><td style="font-size:0.8em;color:#64748b;">${date}</td></tr>`;
                }
                html += `</tbody></table></div>`;
            }
            html += `</div>`;
        }
        document.getElementById('grades-by-practice').innerHTML = html;
    } catch (e) { contentDiv.innerHTML = `<p class="alert-error">${e.message}</p>`; }
}


// ====================================================
// VISTAS DEL ALUMNO
// ====================================================

function renderStudentDashboard() {
    document.getElementById('main-content').innerHTML = `
        <div style="margin-bottom:30px;">
            <h2 style="margin-bottom:5px; color:#0f172a;">¡Hola, ${AppState.user.username}!</h2>
            <p style="color:#64748b; margin-top:0;">Bienvenido a tu espacio de aprendizaje.</p>
        </div>
        <div class="card" style="border-left: 4px solid var(--primary-color);">
            <h3 style="margin-top:0;">Tu Progreso</h3>
            <p>Recuerda que la calificación se compone de: <strong>80% Reporte, 10% Cuestionario y 10% Crucigrama</strong>.</p>
        </div>`;
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
            
            // BOTONES DE DESCARGA (INCLUYE MANUAL)
            const downloads = `
                <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:15px;">
                    <a href="${p.slidesPdfUrl}" target="_blank" class="btn btn-secondary" style="font-size:0.85rem;">⬇️ Diapositivas</a> 
                    <a href="${p.manualPdfUrl}" target="_blank" class="btn btn-secondary" style="font-size:0.85rem;">⬇️ Manual</a>
                    <a href="${p.standardPdfUrl}" target="_blank" class="btn btn-secondary" style="font-size:0.85rem;">⬇️ Estándar</a>
                </div>`;

            if (hasReport) {
                const scoreDisplay = st.reportScore ? `<br><strong style="color:#15803d">Calificación IA: ${st.reportScore}/10</strong>` : '<br><em>Evaluando...</em>';
                const feedbackDisplay = st.reportFeedback ? `<div style="margin-top:15px; padding:15px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; font-size:0.9rem;"><strong>Retroalimentación:</strong> ${st.reportFeedback}</div>` : '';
                
                body = `<div style="background:#f0fdf4; border:1px solid #bbf7d0; padding:15px; border-radius:8px; color:#166534;"><strong>Reporte Entregado</strong>${scoreDisplay}</div>${feedbackDisplay}
                        <p style="margin-top:15px; font-size:0.9rem; color:#64748b;">Materiales de consulta:</p>
                        ${downloads}`;
            } else {
                body = `<p>Descarga los materiales y sube tu PDF para evaluación:</p>
                        ${downloads}
                        <hr style="margin:20px 0; border:0; border-top:1px solid #e2e8f0;">
                        <label style="display:block; margin-bottom:8px; font-weight:600;">Coloca aquí tu reporte:</label>
                        <input type="file" id="rep-${p.id}" accept="application/pdf">
                        <button onclick="handleReportUpload('${p.id}')" style="width:100%;">Entregar</button>
                        <div id="log-${p.id}" style="margin-top:10px; font-size:0.9rem; color:#64748b;"></div>`;
            }
            return `<div class="card"><h4>${p.title}</h4>${body}</div>`;
        }).join('');
        document.getElementById('list').innerHTML = html;
    } catch (e) { div.innerHTML = `<p class="alert-error">${e.message}</p>`; }
}

// --- 2. ACTIVIDADES ---
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
            if (!st.reportUrl) return `<div class="card"><h4>${p.title}</h4><div style="background:#f1f5f9; padding:20px; border-radius:8px; text-align:center; color:#64748b;"><strong>Bloqueado</strong><br>Entrega tu reporte primero.</div></div>`;
            if (st.completed) return `<div class="card"><h4>${p.title}</h4><div class="alert-success">Actividades Completadas.</div></div>`;
            
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

// --- 3. CALIFICACIONES ALUMNO ---
async function renderStudentGradesView() {
    const contentDiv = document.getElementById('main-content');
    contentDiv.innerHTML = '<h2>Mis Calificaciones</h2><div id="grades-list">Cargando...</div>';
    try {
        const practices = await getPractices();
        const myP = Object.values(practices).filter(p => p.students && p.students[AppState.user.uid]);

        if (myP.length === 0) { document.getElementById('grades-list').innerHTML = '<p>No hay registros.</p>'; return; }

        let html = `<div class="table-container"><table class="styled-table"><thead><tr><th>Práctica</th><th>Reporte</th><th>Cuestionario</th><th>Crucigrama</th><th>Promedio</th><th>Fecha</th></tr></thead><tbody>`;

        html += myP.map(p => {
            const st = p.students[AppState.user.uid];
            const rScore = st.reportScore !== undefined ? st.reportScore : 0;
            const qScore = st.quizScore !== undefined ? st.quizScore : 0;
            const cScore = st.crosswordScore !== undefined ? st.crosswordScore : 0;
            const final = calculateWeightedGrade(rScore, qScore, cScore);
            const date = formatDate(st.completedAt || st.reportSubmittedAt);

            // Displays
            const rDisplay = st.reportScore !== undefined ? st.reportScore : '-';
            const qDisplay = st.quizScore !== undefined ? st.quizScore : '-';
            const cDisplay = st.crosswordScore !== undefined ? st.crosswordScore : '-';
            const finalDisplay = (st.reportUrl) ? `<strong>${final}</strong>` : '-';

            return `<tr><td>${p.title}</td><td>${rDisplay}</td><td>${qDisplay}</td><td>${cDisplay}</td><td>${finalDisplay}</td><td style="font-size:0.8em; color:#64748b;">${date}</td></tr>`;
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

// --- MANEJADORES (IGUAL QUE ANTES) ---
async function handleReportUpload(pid) {
    const f = document.getElementById(`rep-${pid}`).files[0];
    const log = document.getElementById(`log-${pid}`);
    if(!f) return alert("Elige archivo");
    log.innerText = "Subiendo...";
    const btn = log.previousElementSibling;
    btn.disabled = true;
    try {
        const url = await uploadFile(f, `reports/${pid}/${AppState.user.uid}`);
        log.innerText = "Evaluando con IA...";
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

        log.innerText = "Guardando...";
        await callDB('submit_report', { practiceId: pid, studentUid: AppState.user.uid, reportUrl: url, reportScore: reportScore, reportFeedback: reportFeedback });
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
    const btn = e.target; btn.disabled=true;
    let p = AppState.practices[pid]; if(!p) { const all=await getPractices(); p=all[pid]; AppState.practices=all; }
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
    d.innerHTML = `<h5>Crucigrama</h5><div class="crossword-container"><div class="crossword-grid">${h}</div><div class="crossword-clues">${cl}</div></div><br><button onclick="handleCrosswordSubmit(event, '${p.id}')">Finalizar</button>`;
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
async function handleCrosswordSubmit(e, pid) {
    const btn = e.target; btn.disabled=true;
    let p = AppState.practices[pid]; if(!p) { const all=await getPractices(); p=all[pid]; }
    if(!p || !p.students || !p.students[AppState.user.uid]) { alert("Error al recuperar datos. Recarga."); btn.disabled=false; return; }
    let corr=0, tot=0;
    document.querySelectorAll(`#cross-${pid} .crossword-cell`).forEach(c=>{
        tot++; if(c.value.toUpperCase()===c.dataset.correct) { corr++; c.style.background='#dcfce7'; } else c.style.background='#fee2e2';
    });
    const cScore = tot>0 ? Math.round((corr/tot)*10) : 0;
    await updateStudentProgress(pid, AppState.user.uid, { completed: true, status: 'Finalizado', crosswordScore: cScore });
    alert(`Crucigrama: ${cScore}/10`);
    renderStudentActivitiesView();
}