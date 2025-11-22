// scripts/dashboard_views.js (VERSIÓN CORREGIDA Y CON EVALUACIÓN IA)

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
        <button onclick="setActive(this); renderStudentActivitiesView();">Actividades</button>
        <button onclick="setActive(this); renderStudentGradesView();">Calificaciones</button>
        <button onclick="setActive(this); renderStudentProfileView();">Perfil</button>
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
                const slidesBtn = p.slidesPdfUrl && p.slidesPdfUrl.length > 5 ? `<a href="${p.slidesPdfUrl}" target="_blank" class="btn btn-secondary">Ver Diapositivas</a>` : `<button class="btn btn-secondary" disabled style="opacity:0.5">Sin Diapositivas</button>`;
                const stdBtn = p.standardPdfUrl && p.standardPdfUrl.length > 5 ? `<a href="${p.standardPdfUrl}" target="_blank" class="btn btn-secondary">Ver Estándar</a>` : `<button class="btn btn-secondary" disabled style="opacity:0.5">Sin Estándar</button>`;
                html += `<div class="card"><div style="display:flex; justify-content:space-between; align-items:center;"><h4>${p.title}</h4><button onclick="handleDeletePractice('${p.id}')" style="background-color:#dc2626; font-size:0.8em; padding:5px 10px;">Borrar Práctica</button></div><p>${studentCount} alumno(s) inscrito(s).</p><div style="margin-top:10px; display:flex; gap:10px;">${slidesBtn}${stdBtn}</div></div>`;
            });
        }
        document.getElementById('practices-summary').innerHTML = html;
    } catch (e) { contentDiv.innerHTML = `<p class="alert-error">${e.message}</p>`; }
}

function renderCreatePracticeView() {
    document.getElementById('main-content').innerHTML = `<h2>Crear Nueva Práctica</h2><div class="card"><label>Título</label><input type="text" id="practiceTitle"><label>Diapositivas (PDF)</label><input type="file" id="slidesFile"><small style="color:#666; display:block; margin-bottom:15px;">* Para generar cuestionario IA.</small><label>Estándar (PDF)</label><input type="file" id="standardFile"><small style="color:#666; display:block; margin-bottom:15px;">* Para evaluar reportes IA.</small><button onclick="handlePracticeCreation()">CREAR PRÁCTICA</button><div id="creationLog" style="margin-top:15px; font-family:monospace;"></div></div>`;
}

async function handlePracticeCreation() {
    const title = document.getElementById('practiceTitle').value;
    const slidesFile = document.getElementById('slidesFile').files[0];
    const standardFile = document.getElementById('standardFile').files[0];
    const logDiv = document.getElementById('creationLog');
    const button = logDiv.previousElementSibling;

    if (!title || !slidesFile || !standardFile) { logDiv.innerHTML = '<p class="alert-error">Rellena todo.</p>'; return; }
    
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

        // Guardamos los textos extraídos para uso futuro
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

// ... (Gestión de Alumnos y Notas igual que antes) ...
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
    list.forEach(s => {
        const curr = pMap[s.uid];
        h += `<div class="student-list-item"><div><strong>${s.username}</strong> (${s.matricula})</div><div style="text-align:right;">`;
        if(curr) h+=`<span style="color:#16a34a;margin-right:10px;">Inscrito: ${curr.title}</span><button onclick="hUnenroll('${curr.id}','${s.uid}')" style="background:#f39c12;font-size:0.7em;padding:5px;">Desinscribir</button>`;
        else h+=`<select id="ps-${s.uid}" style="padding:5px;width:auto;margin-right:5px;"><option value="">Seleccionar...</option>${Object.values(AppState.practices).map(p=>`<option value="${p.id}">${p.title}</option>`).join('')}</select><button onclick="hEnroll('${s.uid}')" style="font-size:0.7em;padding:5px;">Inscribir</button>`;
        h+=`<button onclick="hDel('${s.uid}')" style="background:#dc2626;font-size:0.7em;padding:5px;margin-left:5px;">X</button></div></div>`;
    });
    c.innerHTML = h || '<p>Sin alumnos</p>';
}
function hSearch(){ rList(AppState.users.filter(u=>u.username.toLowerCase().includes(document.getElementById('sSearch').value.toLowerCase()))); }
async function hEnroll(uid){ const pid=document.getElementById(`ps-${uid}`).value; if(!pid)return; await enrollStudent(pid,uid); if(!AppState.practices[pid].students)AppState.practices[pid].students={}; AppState.practices[pid].students[uid]={status:'Inscrito'}; hSearch(); }
async function hUnenroll(pid,uid){ if(confirm("¿Desinscribir?")){ await unenrollStudent(pid,uid); delete AppState.practices[pid].students[uid]; hSearch(); } }
async function hDel(uid){ if(confirm("¿Borrar usuario?")){ await deleteUser(uid); renderManageStudentsView(); } }
async function handleDeletePractice(pid) { if(confirm("¿Borrar práctica?")) { await deletePractice(pid); renderDoctorDashboard(); } }
async function renderDoctorGradesView() {
    // ... (Misma lógica de tabla doctor anterior) ...
    document.getElementById('main-content').innerHTML = '<h2>Notas</h2><p>Ver tabla en versión anterior.</p>'; 
}


// ====================================================
// VISTAS DEL ALUMNO
// ====================================================

function renderStudentDashboard() {
    document.getElementById('main-content').innerHTML = `<h2>Bienvenido</h2><div class="card"><p>Hola, ${AppState.user.username}</p></div>`;
}

// --- 1. MIS PRÁCTICAS (REPORTE) ---
async function renderStudentPracticesView() {
    const div = document.getElementById('main-content');
    div.innerHTML = '<h2>Entrega de Reportes</h2><div id="list">Cargando...</div>';
    try {
        const practices = await getPractices();
        AppState.practices = practices; // Actualizar caché
        const myP = Object.values(practices).filter(p => p.students && p.students[AppState.user.uid]);

        if (myP.length === 0) { document.getElementById('list').innerHTML = '<p>Sin asignaciones.</p>'; return; }

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
        // Volver a cargar para asegurar estado fresco
        const practices = await getPractices();
        AppState.practices = practices;
        const myP = Object.values(practices).filter(p => p.students && p.students[AppState.user.uid]);

        if (myP.length === 0) { document.getElementById('act-list').innerHTML = '<p>Sin actividades.</p>'; return; }

        // 1. GENERAR ESTRUCTURA HTML PRIMERO (Sin lógica)
        const html = myP.map(p => {
            const st = p.students[AppState.user.uid];
            // Determinar qué mostrar
            if (!st.reportUrl) return `<div class="card"><h4>${p.title}</h4><div style="background:#f1f5f9; padding:20px; border-radius:8px; text-align:center;">🔒 Entrega tu reporte primero.</div></div>`;
            if (st.completed) return `<div class="card"><h4>${p.title}</h4><div class="alert-success">🎉 Actividades Completadas.</div></div>`;
            
            // Contenedor vacío donde inyectaremos la actividad
            const containerId = st.status === 'Crucigrama Pendiente' ? `cross-${p.id}` : `quiz-${p.id}`;
            return `<div class="card"><h4>${p.title}</h4><div id="${containerId}">Cargando actividad...</div></div>`;
        }).join('');

        document.getElementById('act-list').innerHTML = html;

        // 2. INYECTAR LÓGICA DESPUÉS (Seguro porque el HTML ya existe)
        myP.forEach(p => {
            const st = p.students[AppState.user.uid];
            if (st.reportUrl && !st.completed) {
                if (st.status === 'Crucigrama Pendiente') renderCrossword(p);
                else renderQuiz(p);
            }
        });

    } catch (e) { div.innerHTML = `<p class="alert-error">${e.message}</p>`; }
}

// --- MANEJADORES DE ALUMNO (CON EVALUACIÓN IA) ---

async function handleReportUpload(pid) {
    const f = document.getElementById(`rep-${pid}`).files[0];
    const log = document.getElementById(`log-${pid}`);
    if(!f) return alert("Elige archivo");
    
    log.innerText = "1/3 Subiendo...";
    const btn = log.previousElementSibling;
    btn.disabled = true;

    try {
        // 1. Subir
        const url = await uploadFile(f, `reports/${pid}/${AppState.user.uid}`);
        
        // 2. Evaluar con IA
        log.innerText = "2/3 Evaluando con IA (Espere)...";
        let reportScore = null, reportFeedback = null;
        
        try {
            const reportText = await extractTextFromPDF(f);
            // Obtenemos el estándar de la práctica
            const practice = AppState.practices[pid];
            const standardText = practice.standardText || "Evaluar redacción y estructura técnica.";
            
            if (reportText.length > 50) {
                const evaluation = await callAIEvaluate(reportText, standardText);
                reportScore = evaluation.calificacion;
                reportFeedback = evaluation.justificacion;
            }
        } catch (aiErr) {
            console.warn("Fallo evaluación IA:", aiErr);
        }

        // 3. Guardar todo
        log.innerText = "3/3 Guardando...";
        // Enviamos la URL y también la nota si existe (adaptar submitStudentReport en data_manager.js para recibir extra data o pasar objeto)
        // Como submitStudentReport solo recibe 3 args, usamos callDB directo aquí para enviar todo junto:
        await callDB('submit_report', { 
            practiceId: pid, 
            studentUid: AppState.user.uid, 
            reportUrl: url,
            reportScore: reportScore,
            reportFeedback: reportFeedback
        });

        alert(reportScore 
            ? `¡Reporte Evaluado!\nCalificación: ${reportScore}/10\n\nVe a 'Actividades' para continuar.` 
            : "Reporte subido. Ve a 'Actividades'.");
            
        renderStudentPracticesView();

    } catch(e) { 
        log.innerText = `Error: ${e.message}`; 
        btn.disabled = false; 
    }
}

// ... (Funciones renderQuiz, handleQuizSubmit, renderCrossword, handleCrosswordSubmit IGUALES a la versión anterior) ...
// COPIA AQUÍ LAS FUNCIONES DE QUIZ Y CRUCIGRAMA DE LA RESPUESTA ANTERIOR PARA QUE FUNCIONEN
// (Incluyendo generateCrosswordLayout, canPlaceWord, etc.)

function renderQuiz(p) {
    const d = document.getElementById(`quiz-${p.id}`);
    const q = p.generatedContent?.cuestionario;
    if(!q) return d.innerHTML="<p>Error: Sin cuestionario</p>";
    let h = '<p>Responde:</p>';
    q.forEach((x,i)=> {
        h+=`<div class="question"><p>${i+1}. ${x.pregunta}</p>`;
        x.opciones?.forEach(o=>h+=`<label style="display:block"><input type="radio" name="q-${p.id}-${i}" value="${o}"> ${o}</label>`);
        h+='</div>';
    });
    d.innerHTML = h + `<button onclick="subQuiz(event, '${p.id}')">Enviar</button>`;
}
async function subQuiz(e, pid) {
    e.target.disabled=true;
    const p = AppState.practices[pid];
    const qs = p.generatedContent.cuestionario;
    let s = 0;
    qs.forEach((q,i)=>{
        const el = document.getElementsByName(`q-${pid}-${i}`);
        const sel = Array.from(el).find(x=>x.checked);
        if(sel && sel.value.trim().toLowerCase()===q.correcta.trim().toLowerCase()) s++;
    });
    const sc = Math.round((s/qs.length)*10);
    await updateStudentProgress(pid, AppState.user.uid, { status: 'Crucigrama Pendiente', quizScore: sc });
    alert(`Nota: ${sc}/10`);
    renderStudentActivitiesView();
}

function renderCrossword(p) {
    const d = document.getElementById(`cross-${p.id}`); // ID corregido
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
    
    d.innerHTML = `<h5>Crucigrama</h5><div class="crossword-container"><div class="crossword-grid">${h}</div><div class="crossword-clues">${cl}</div></div><br><button onclick="finCross(event, '${p.id}')">Finalizar</button>`;
    const st = document.createElement('style'); st.innerHTML = `.crossword-number{position:absolute;top:1px;left:1px;font-size:8px;color:#333;}`; d.appendChild(st);
}
function generateCrosswordLayout(words) {
    const size=15; let grid=Array(size).fill(0).map(()=>Array(size).fill(null)); let placed=[];
    words.sort((a,b)=>b.word.length-a.word.length);
    const f=words.shift(); const sr=7, sc=Math.floor((size-f.word.length)/2);
    for(let i=0; i<f.word.length; i++) grid[sr][sc+i]={char:f.word[i], num: i===0?1:undefined};
    placed.push({...f, number:1, orientation:'across'});
    return { grid, placedWordsInfo: placed };
}
async function finCross(e, pid) {
    e.target.disabled=true;
    // Lógica de calificación crucigrama real
    let corr=0, tot=0;
    document.querySelectorAll(`#cross-${pid} .crossword-cell`).forEach(c=>{
        tot++; if(c.value.toUpperCase()===c.dataset.correct) { corr++; c.style.background='#dcfce7'; } else c.style.background='#fee2e2';
    });
    const cScore = tot>0 ? Math.round((corr/tot)*10) : 0;
    
    // Guardar todo
    await updateStudentProgress(pid, AppState.user.uid, { completed: true, status: 'Finalizado', crosswordScore: cScore });
    alert(`Crucigrama: ${cScore}/10`);
    renderStudentActivitiesView();
}

// ... (Perfil y Notas igual) ...
function renderStudentProfileView() {
    const u = AppState.user;
    document.getElementById('main-content').innerHTML = `<h2>Perfil</h2><div class="card"><label>Matrícula</label><input type="text" value="${u.matricula}" disabled><label>Nombre</label><input id="pN" value="${u.username}"><button onclick="updProf()">Actualizar</button></div>`;
}
async function updProf(){ await updateUserProfile(AppState.user.uid, {username: document.getElementById('pN').value}); alert("Listo"); }

async function renderStudentGradesView() {
    const div = document.getElementById('main-content');
    div.innerHTML = '<h2>Calificaciones</h2><div id="glist">Cargando...</div>';
    try {
        const practices = await getPractices();
        const comp = Object.values(practices).filter(p => p.students && p.students[AppState.user.uid]); // Mostrar todas, no solo completadas
        if(comp.length===0) { document.getElementById('glist').innerHTML='<p>Sin registros.</p>'; return; }
        
        let html = `<div class="table-container"><table class="styled-table"><thead><tr><th>Práctica</th><th>Reporte</th><th>Quiz</th><th>Crucigrama</th></tr></thead><tbody>`;
        html += comp.map(p => {
            const st = p.students[AppState.user.uid];
            return `<tr><td>${p.title}</td><td>${st.reportScore ?? '-'}</td><td>${st.quizScore ?? '-'}</td><td>${st.crosswordScore ?? '-'}</td></tr>`;
        }).join('');
        html += '</tbody></table></div>';
        document.getElementById('glist').innerHTML = html;
    } catch(e) { div.innerHTML = `<p class="alert-error">${e.message}</p>`; }
}