// scripts/dashboard_views.js
// ----------------------------------------------------------------------------------
// CONTROLADOR DE VISTAS (FRONTEND)
// Maneja la interfaz, navegación y lógica de presentación para Docentes, Alumnos y Coordinadores.
// ----------------------------------------------------------------------------------

const AppState = {
    user: null,      
    practices: {},   
    users: [],       
};

// ==================================================================================
// 1. UTILIDADES Y LÓGICA DE NEGOCIO
// ==================================================================================

// Formatea fechas ISO a un formato legible (DD/MM/AAAA HH:MM)
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

// RF-12: Calcula la calificación final según la ponderación del SRS
// Reporte (80%) + Cuestionario (10%) + Crucigrama (10%)
function calculateWeightedGrade(report, quiz, cross) {
    const r = report || 0;
    const q = quiz || 0;
    const c = cross || 0;
    const final = (r * 0.8) + (q * 0.1) + (c * 0.1);
    return parseFloat(final.toFixed(1)); // Devuelve con 1 decimal
}

// LÓGICA DE ALEATORIEDAD DETERMINISTA
// Selecciona 5 preguntas únicas de las 20 generadas, basándose en el ID del alumno.
function getStudentQuestions(all, uid, count = 5) {
    if (!all || all.length === 0) return [];
    let seed = 0; 
    for (let i = 0; i < uid.length; i++) seed += uid.charCodeAt(i);
    const s = [...all];
    for (let i = s.length - 1; i > 0; i--) { 
        const j = (seed * (i + 1)) % (i + 1); 
        [s[i], s[j]] = [s[j], s[i]]; 
        seed++; 
    }
    return s.slice(0, count);
}

// Selecciona 5 palabras únicas de las 15 generadas para el crucigrama.
function getStudentCrosswordWords(all, uid, count = 5) {
    if (!all || all.length === 0) return [];
    let seed = 0; for (let i = 0; i < uid.length; i++) seed += uid.charCodeAt(i) + 5; 
    const s = [...all];
    for (let i = s.length - 1; i > 0; i--) { 
        const j = (seed * (i + 1)) % (i + 1); 
        [s[i], s[j]] = [s[j], s[i]]; 
        seed++; 
    }
    return s.slice(0, count);
}

// ==================================================================================
// 2. NAVEGACIÓN Y ROLES (RI-08)
// ==================================================================================

function renderDoctorLayout(user) {
    AppState.user = user;
    document.getElementById('header-title').textContent = `Dr. ${user.username}`;
    const navbar = document.getElementById('navbar');
    navbar.innerHTML = `
        <button class="active" onclick="setActive(this); renderDoctorDashboard();">Inicio</button>
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

function renderTutorLayout(user) {
    AppState.user = user;
    document.getElementById('header-title').textContent = `Coord. ${user.username}`;
    const navbar = document.getElementById('navbar');
    navbar.innerHTML = `
        <button class="active" onclick="setActive(this); renderTutorDashboard();">Tablero Global</button>
        <button onclick="setActive(this); renderTutorGroupsView();">Análisis por Grupos</button>
        <button onclick="setActive(this); renderTutorAuditView();">Auditoría de Prácticas</button>
    `;
    renderTutorDashboard();
}

function setActive(button) {
    if(!button) return;
    document.querySelectorAll('#navbar button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
}

// ==================================================================================
// 3. VISTAS DEL DOCENTE
// ==================================================================================

// Dashboard Docente: Lista de prácticas
async function renderDoctorDashboard() {
    const div = document.getElementById('main-content');
    div.innerHTML = `<div style="margin-bottom:30px;"><h2 style="margin-bottom:5px; color:#0f172a;">Bienvenido, Dr. ${AppState.user.username}</h2><p style="color:#64748b; margin-top:0;">Panel de control general.</p></div><div id="practices-summary">Cargando...</div>`;
    try {
        const practices = await getPractices();
        AppState.practices = practices;
        const list = Object.values(practices);
        let html = '';
        if (list.length === 0) html = `<div class="card"><p>No hay prácticas creadas.</p></div>`;
        else {
            list.forEach(p => {
                const count = Object.keys(p.students || {}).length;
                const sBtn = p.slidesPdfUrl?.length > 5 ? `<a href="${p.slidesPdfUrl}" target="_blank" class="btn btn-secondary btn-sm">Ver Diapositivas</a>` : '';
                const stdBtn = p.standardPdfUrl?.length > 5 ? `<a href="${p.standardPdfUrl}" target="_blank" class="btn btn-secondary btn-sm">Ver Estándar</a>` : '';
                
                html += `<div class="card">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h4>${p.title}</h4>
                        <button onclick="handleDeletePractice('${p.id}')" style="background-color:#ef4444; font-size:0.8em; padding:6px 12px; color:white; border:none; border-radius:6px;">Borrar</button>
                    </div>
                    <p style="color:#64748b; font-size:0.9em;">${count} alumnos inscritos</p>
                    <div style="display:flex; gap:10px; flex-wrap:wrap;">${sBtn}${stdBtn}</div>
                </div>`;
            });
        }
        document.getElementById('practices-summary').innerHTML = html;
    } catch (e) { div.innerHTML += `<p class="alert-error">Error: ${e.message}</p>`; }
}

// Vista Crear Práctica (RF-05)
function renderCreatePracticeView() {
    document.getElementById('main-content').innerHTML = `
        <h2>Crear Nueva Práctica</h2>
        <div class="card">
            <label>Título</label>
            <input type="text" id="practiceTitle" placeholder="Ej. Óptica Geométrica">
            
            <label>Diapositivas (PDF)</label>
            <input type="file" id="slidesFile">
            <small class="input-hint">
                *Sube aquí la presentación del tema. La IA leerá este archivo para crear automáticamente el cuestionario y el crucigrama.
            </small>
            
            <label>Estándar (PDF)</label>
            <input type="file" id="standardFile">
            <small class="input-hint">
                *Sube el documento con los criterios de evaluación. El estándar ayuda a evaluar el orden y los aspectos técnicos que deben cumplir los reportes.
            </small>
            
            <button onclick="handlePracticeCreation()">CREAR PRÁCTICA</button>
            <div id="creationLog" style="margin-top:15px; font-family:monospace; font-size:0.9em;"></div>
        </div>`;
}

// Lógica de creación (RF-06)
async function handlePracticeCreation() {
    const title = document.getElementById('practiceTitle').value;
    const slidesFile = document.getElementById('slidesFile').files[0];
    const standardFile = document.getElementById('standardFile').files[0];
    const logDiv = document.getElementById('creationLog');
    
    if (!title || !slidesFile || !standardFile) { 
        logDiv.innerHTML = '<p class="alert-error">Por favor completa todos los campos.</p>'; return; 
    }
    
    logDiv.previousElementSibling.disabled = true;
    try {
        logDiv.innerHTML = '<span style="color:#3b82f6">1/4: Registrando práctica...</span>';
        const pid = await createPractice({ title, students: {}, generatedContent: null, creatorId: AppState.user.uid, createdAt: new Date() });
        
        logDiv.innerHTML = '<span style="color:#3b82f6">2/4: Subiendo archivos...</span>';
        const [s, std] = await Promise.all([
            uploadFile(slidesFile, `practices/${pid}`), 
            uploadFile(standardFile, `practices/${pid}`)
        ]);
        await savePracticeContent(pid, { slidesPdfUrl: s, standardPdfUrl: std });
        
        logDiv.innerHTML = '<span style="color:#eab308">3/4: IA Analizando contenido...</span>';
        let txt = ""; try { txt = await extractTextFromPDF(slidesFile); } catch(e){}
        await savePracticeContent(pid, { slidesText: txt });
        
        if (txt.length > 50) {
            logDiv.innerHTML = '<span style="color:#eab308">4/4: Generando actividades con IA...</span>';
            try { 
                const gen = await callAIGenerate(txt); 
                await savePracticeContent(pid, { generatedContent: gen }); 
                logDiv.innerHTML = '<p class="alert-success">¡Práctica creada con éxito!</p>'; 
            } catch(e) { 
                logDiv.innerHTML = '<p class="alert-warning">Creada parcialmente (Error IA).</p>'; 
            }
        } else { 
            logDiv.innerHTML = '<p class="alert-warning">Creada (PDF sin texto legible).</p>'; 
        }
        
        setTimeout(() => { document.querySelector('#navbar button').click(); }, 2000);
    } catch (e) { logDiv.innerHTML = `Error: ${e.message}`; }
}

// Gestión de Alumnos (RF-07)
async function renderManageStudentsView() {
    document.getElementById('main-content').innerHTML = `
        <h2>Gestionar Alumnos</h2>
        <div class="card">
            <input type="text" id="sSearch" placeholder="Buscar por nombre o matrícula..." onkeyup="hSearch()" style="margin-bottom:0;">
        </div>
        <div id="sList" style="margin-top:20px;">Cargando...</div>`;
    
    const [p, u] = await Promise.all([getPractices(), getAllUsers()]);
    AppState.practices = p; 
    AppState.users = u.filter(x => x.role === 'alumno');
    rList(AppState.users);
}

function rList(list) {
    let h = ''; 
    const pMap = {}; 
    Object.values(AppState.practices).forEach(p=>{
        Object.keys(p.students||{}).forEach(s => pMap[s] = {id:p.id, title:p.title})
    });

    if (list.length === 0) h = '<p>No hay alumnos registrados.</p>';
    else {
        list.forEach(s => {
            const curr = pMap[s.uid];
            const groupLabel = s.grupo ? `<span class="badge-info">${s.grupo}</span>` : '';
            h += `<div class="student-list-item">
                <div><strong>${s.username}</strong> ${groupLabel}<br><small style="color:#64748b;">${s.matricula}</small></div>
                <div style="text-align:right;">`;
            
            if(curr) {
                h+=`<span style="color:#3b82f6;margin-right:10px;font-weight:600;font-size:0.9em;">${curr.title}</span>
                    <button onclick="hUnenroll('${curr.id}','${s.uid}')" style="background:#f59e0b;font-size:0.7em;padding:6px 10px;border:none;border-radius:6px;color:white;">Desinscribir</button>`;
            } else {
                h+=`<select id="ps-${s.uid}" style="padding:5px;margin-right:5px;">
                        <option value="">Seleccionar...</option>
                        ${Object.values(AppState.practices).map(p=>`<option value="${p.id}">${p.title}</option>`).join('')}
                    </select>
                    <button onclick="hEnroll('${s.uid}')" style="font-size:0.7em;padding:6px 10px;background:#3b82f6;color:white;border:none;border-radius:6px;">Inscribir</button>`;
            }
            h+=`<button onclick="hDel('${s.uid}')" style="background:#ef4444;font-size:0.7em;padding:6px 10px;margin-left:5px;border:none;border-radius:6px;color:white;">X</button></div></div>`;
        });
    }
    document.getElementById('sList').innerHTML = h;
}

function hSearch(){ rList(AppState.users.filter(u=>u.username.toLowerCase().includes(document.getElementById('sSearch').value.toLowerCase()) || (u.matricula&&u.matricula.includes(document.getElementById('sSearch').value)))); }
async function hEnroll(uid){ const pid=document.getElementById(`ps-${uid}`).value; if(!pid)return; await enrollStudent(pid,uid); if(!AppState.practices[pid].students)AppState.practices[pid].students={}; AppState.practices[pid].students[uid]={status:'Inscrito'}; hSearch(); }
async function hUnenroll(pid,uid){ if(confirm("¿Desinscribir?")){ await unenrollStudent(pid,uid); delete AppState.practices[pid].students[uid]; hSearch(); } }
async function hDel(uid){ if(confirm("¿Eliminar usuario?")){ await deleteUser(uid); renderManageStudentsView(); } }
async function handleDeletePractice(pid) { if(confirm("¿Borrar práctica?")) { await deletePractice(pid); renderDoctorDashboard(); } }

// Calificaciones Docente (RF-08)
async function renderDoctorGradesView() {
    document.getElementById('main-content').innerHTML = `<h2>Calificaciones</h2><div id="grades-by-practice">Cargando...</div>`;
    const [practices, users] = await Promise.all([getPractices(), getAllUsers()]);
    const uMap = new Map(users.map(u => [u.uid, u]));
    let html = '';
    
    for (const p of Object.values(practices)) {
        html += `<div class="card"><h4>${p.title}</h4>`;
        const studs = p.students || {};
        if (Object.keys(studs).length === 0) html += '<p style="color:#64748b;">Sin alumnos inscritos.</p>';
        else {
            html += `<div class="table-container"><table class="styled-table"><thead><tr><th>Alumno</th><th>Matrícula</th><th>Grupo</th><th>Reporte (80%)</th><th>Cuestionario (10%)</th><th>Crucigrama (10%)</th><th>Final</th><th>Fecha</th></tr></thead><tbody>`;
            for (const sid in studs) {
                const d = studs[sid];
                const info = uMap.get(sid);
                const final = calculateWeightedGrade(d.reportScore, d.quizScore, d.crosswordScore);
                const date = formatDate(d.completedAt || d.reportSubmittedAt);
                html += `<tr><td>${info?.username||'?'}</td><td>${info?.matricula||sid}</td><td>${info?.grupo||'-'}</td><td>${d.reportScore??'-'}</td><td>${d.quizScore??'-'}</td><td>${d.crosswordScore??'-'}</td><td><strong>${final}</strong></td><td style="font-size:0.8em;">${date}</td></tr>`;
            }
            html += `</tbody></table></div>`;
        }
        html += `</div>`;
    }
    document.getElementById('grades-by-practice').innerHTML = html;
}

// ==================================================================================
// 4. VISTAS DEL ALUMNO
// ==================================================================================

function renderStudentDashboard() {
    document.getElementById('main-content').innerHTML = `
        <div class="welcome-header">
            <h1>¡Hola, ${AppState.user.username}!</h1>
            <p>Bienvenido a tu espacio de aprendizaje.</p>
        </div>

        <div class="card highlight-card">
            <h3>Instrucciones</h3>
            <div class="steps-container">
                <div class="step-item">
                    <div class="step-icon">1</div>
                    <div class="step-text">Descarga las <strong>Diapositivas</strong> en "Mis Prácticas".</div>
                </div>
                <div class="step-item">
                    <div class="step-icon">2</div>
                    <div class="step-text">Sube tu reporte en PDF para evaluación inmediata por IA.</div>
                </div>
                <div class="step-item">
                    <div class="step-icon">3</div>
                    <div class="step-text">Completa las <strong>Actividades</strong> para reforzar tu aprendizaje.</div>
                </div>
            </div>
        </div>`;
}

// Entregar Reporte (RF-09, RF-10)
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
            const hasR = st.reportUrl;
            const dl = `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:15px;">
                            <a href="${p.slidesPdfUrl}" target="_blank" class="btn btn-secondary btn-sm">Descargar Diapositivas</a>
                            <a href="${p.standardPdfUrl}" target="_blank" class="btn btn-secondary btn-sm">Descargar Estándar</a>
                        </div>`;
            
            if (hasR) {
                return `<div class="card">
                            <h4>${p.title}</h4>
                            <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:15px;border-radius:8px;color:#166534;">
                                <strong>Reporte Entregado</strong><br>Nota IA: ${st.reportScore||'Pendiente'}
                            </div>
                            ${st.reportFeedback ? `<div style="margin-top:10px;padding:10px;background:#f8fafc;font-size:0.9em;">${st.reportFeedback}</div>` : ''}
                            <p style="margin-top:15px;color:#64748b;font-size:0.9em;">Materiales:</p>${dl}
                        </div>`;
            }
            return `<div class="card">
                        <h4>${p.title}</h4>
                        <p>Descarga y sube tu PDF:</p>${dl}<hr>
                        <input type="file" id="rep-${p.id}" accept="application/pdf">
                        <button onclick="handleReportUpload('${p.id}')" style="width:100%;margin-top:10px;">Entregar Reporte</button>
                        <div id="log-${p.id}" style="margin-top:10px;font-size:0.9em;"></div>
                    </div>`;
        }).join('');
        document.getElementById('list').innerHTML = html;
    } catch (e) { div.innerHTML = `<p class="alert-error">${e.message}</p>`; }
}

// Actividades (RF-11)
async function renderStudentActivitiesView(shouldFetch = true) {
    const div = document.getElementById('main-content');
    div.innerHTML = '<h2>Actividades</h2><div id="act-list">Cargando...</div>';
    try {
        if (shouldFetch) {
            const practices = await getPractices(); 
            AppState.practices = practices;
        }
        
        const myP = Object.values(AppState.practices).filter(p => p.students && p.students[AppState.user.uid]);
        
        if (myP.length === 0) { document.getElementById('act-list').innerHTML = '<p>Sin actividades.</p>'; return; }
        
        const html = myP.map(p => {
            const st = p.students[AppState.user.uid];
            if (!st.reportUrl) return `<div class="card"><h4>${p.title}</h4><div style="background:#f1f5f9;padding:20px;text-align:center;color:#64748b;border-radius:8px;">Entrega el reporte primero.</div></div>`;
            if (st.completed) return `<div class="card"><h4>${p.title}</h4><div class="alert-success">¡Actividades Completadas!</div></div>`;
            
            const cid = st.status === 'Crucigrama Pendiente' ? `cross-${p.id}` : `quiz-${p.id}`;
            let scoreBadge = '';
            
            if (st.quizScore !== null && st.quizScore !== undefined) {
                scoreBadge = `<div style="background:#dcfce7; color:#166534; padding:10px; border-radius:8px; margin-bottom:15px; font-weight:bold; font-size:0.95em; border: 1px solid #bbf7d0;">
                                Cuestionario Completado: ${st.quizScore}/10
                              </div>`;
            }

            return `<div class="card"><h4>${p.title}</h4>${scoreBadge}<div id="${cid}">Cargando...</div></div>`;
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

function renderQuiz(p) {
    const d = document.getElementById(`quiz-${p.id}`);
    const fullBank = p.generatedContent?.cuestionario;
    if (!fullBank) return d.innerHTML = "<p class='alert-error'>Error cuestionario</p>";
    
    // Elige 5 preguntas aleatorias
    const myQuestions = getStudentQuestions(fullBank, AppState.user.uid, 5);
    
    let h = '<p>Responde:</p>';
    myQuestions.forEach((x, i) => {
        h += `<div class="question"><p>${i+1}. ${x.pregunta}</p>`;
        x.opciones?.forEach(o => h += `<label class="option-label"><input type="radio" name="q-${p.id}-${i}" value="${o}"> ${o}</label>`);
        h += '</div>';
    });
    d.innerHTML = h + `<button onclick="subQuiz(event, '${p.id}')">Enviar</button>`;
}

async function subQuiz(e, pid) {
    const btn = e.target; btn.disabled = true;
    let p = AppState.practices[pid]; 
    if(!p) { const all = await getPractices(); p = all[pid]; AppState.practices = all; }

    const fullBank = p.generatedContent.cuestionario;
    const myQuestions = getStudentQuestions(fullBank, AppState.user.uid, 5);
    let s = 0;
    
    myQuestions.forEach((q, i) => {
        const el = document.getElementsByName(`q-${pid}-${i}`);
        const selectedIndex = Array.from(el).findIndex(x => x.checked);
        if (selectedIndex !== -1) {
            const selectedText = el[selectedIndex].value.trim();
            const correctAnswer = q.correcta.trim();
            if (selectedText.toLowerCase() === correctAnswer.toLowerCase()) s++;
            else if (/^[A-D0-3]$/i.test(correctAnswer)) {
                let expectedIndex = /\d/.test(correctAnswer) ? parseInt(correctAnswer) : correctAnswer.toUpperCase().charCodeAt(0) - 65;
                if (selectedIndex === expectedIndex) s++;
            }
        }
    });
    
    const sc = myQuestions.length > 0 ? Math.round((s / myQuestions.length) * 10) : 0;
    await updateStudentProgress(pid, AppState.user.uid, { status: 'Crucigrama Pendiente', quizScore: sc });
    
    if (AppState.practices[pid]?.students[AppState.user.uid]) {
        AppState.practices[pid].students[AppState.user.uid].quizScore = sc;
        AppState.practices[pid].students[AppState.user.uid].status = 'Crucigrama Pendiente';
    }
    
    alert(`Resultado: ${sc}/10`); 
    renderStudentActivitiesView(false); 
}

function renderCrossword(p) {
    const d = document.getElementById(`cross-${p.id}`);
    const allWordsData = p.generatedContent?.crucigrama;
    if(!allWordsData) return d.innerHTML="<p>Error crucigrama</p>";
    
    // Elige 5 palabras aleatorias
    const myWordsData = getStudentCrosswordWords(allWordsData, AppState.user.uid, 5);
    const words = myWordsData.map(w => ({ word: w.word.toUpperCase(), clue: w.clue }));
    const layout = generateCrosswordLayout(words);
    if(!layout) return d.innerHTML="<p>Error generando</p>";
    
    let h = '<div class="crossword-container"><div class="crossword-grid"><table>';
    layout.grid.forEach((r, i) => { 
        h += '<tr>'; 
        r.forEach((c, j) => { 
            if(c) {
                const cellId = `cell-${p.id}-${i}-${j}`;
                h += `<td><input type="text" maxlength="1" data-correct="${c.char}" class="crossword-cell" id="${cellId}" data-p="${p.id}" data-r="${i}" data-c="${j}"><span class="crossword-number">${c.num||''}</span></td>`;
            } else h += '<td class="empty"></td>';
        }); 
        h += '</tr>'; 
    });
    h += '</table></div><div class="crossword-clues"><h5>Pistas</h5>';
    layout.placedWordsInfo.forEach(w => h+=`<p><strong>${w.number}. ${w.orientation==='across'?'H':'V'}</strong>: ${w.clue}</p>`);
    h += '</div></div><br><button onclick="handleCrosswordSubmit(event, \''+p.id+'\')">Finalizar</button>';
    d.innerHTML = h;

    d.querySelectorAll('.crossword-cell').forEach(input => {
        input.addEventListener('keydown', (e) => {
            const r = parseInt(input.dataset.r), c = parseInt(input.dataset.c), pid = input.dataset.p;
            let nextId = null;
            if(e.key==='ArrowUp') nextId=`cell-${pid}-${r-1}-${c}`;
            if(e.key==='ArrowDown') nextId=`cell-${pid}-${r+1}-${c}`;
            if(e.key==='ArrowLeft') nextId=`cell-${pid}-${r}-${c-1}`;
            if(e.key==='ArrowRight') nextId=`cell-${pid}-${r}-${c+1}`;
            if(nextId) { const n=document.getElementById(nextId); if(n) { e.preventDefault(); n.focus(); } }
        });
    });
}

function generateCrosswordLayout(words) {
    const size=18; let grid=Array(size).fill(0).map(()=>Array(size).fill(null)); let placed=[];
    words.sort((a,b)=>b.word.length-a.word.length);
    if(words.length===0) return null;
    const f=words.shift(); const sr=Math.floor(size/2), sc=Math.floor((size-f.word.length)/2);
    for(let i=0; i<f.word.length; i++) grid[sr][sc+i]={char:f.word[i], num: i===0?1:undefined};
    placed.push({...f, number:1, row:sr, col:sc, orientation:'across'});
    let attempts = 0;
    while(words.length > 0 && attempts < 150) {
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
                            for(let l=0; l<w.word.length; l++) { let r = nr + (newO==='down'?l:0); let c = nc + (newO==='across'?l:0); grid[r][c] = { char: w.word[l] }; }
                            placed.push({...w, row:nr, col:nc, orientation:newO}); isPlaced = true;
                        }
                    }
                }
            }
        }
        if(!isPlaced) words.push(w); attempts++;
    }
    let num = 1; placed.forEach(w => { const cell = grid[w.row][w.col]; if(!cell.num) { cell.num = num; num++; } w.number = cell.num; });
    return { grid, placedWordsInfo: placed };
}
function canPlace(grid, word, r, c, o) {
    if(r<0 || c<0 || r>=grid.length || c>=grid[0].length) return false;
    if(o==='across') { if(c+word.length > grid[0].length) return false; } else { if(r+word.length > grid.length) return false; }
    for(let i=0; i<word.length; i++) { let cr = r + (o==='down'?i:0); let cc = c + (o==='across'?i:0); const cell = grid[cr][cc]; if(cell && cell.char !== word[i]) return false; }
    return true;
}
async function handleCrosswordSubmit(e, pid) {
    const btn = e.target; btn.disabled=true;
    let p = AppState.practices[pid]; if(!p) { const all=await getPractices(); p=all[pid]; }
    
    let corr=0, tot=0;
    document.querySelectorAll(`#cross-${pid} .crossword-cell`).forEach(c=>{
        tot++; if(c.value.toUpperCase()===c.dataset.correct) { corr++; c.style.background='#dcfce7'; } else c.style.background='#fee2e2';
    });
    const cScore = tot>0 ? Math.round((corr/tot)*10) : 0;
    
    await updateStudentProgress(pid, AppState.user.uid, { completed: true, status: 'Finalizado', crosswordScore: cScore });
    alert(`Crucigrama: ${cScore}/10`);
    renderStudentActivitiesView();
}

async function renderStudentGradesView() {
    document.getElementById('main-content').innerHTML = '<h2>Mis Calificaciones</h2><div id="grades-list">Cargando...</div>';
    const practices = await getPractices();
    const myP = Object.values(practices).filter(p => p.students && p.students[AppState.user.uid]);
    
    if (myP.length === 0) { document.getElementById('grades-list').innerHTML = '<p>Sin datos.</p>'; return; }
    
    let html = `<div class="table-container"><table class="styled-table"><thead><tr><th>Práctica</th><th>Reporte (80%)</th><th>Cuestionario (10%)</th><th>Crucigrama (10%)</th><th>Final</th><th>Fecha</th></tr></thead><tbody>`;
    html += myP.map(p => {
        const s = p.students[AppState.user.uid];
        const f = calculateWeightedGrade(s.reportScore, s.quizScore, s.crosswordScore);
        return `<tr><td>${p.title}</td><td>${s.reportScore??'-'}</td><td>${s.quizScore??'-'}</td><td>${s.crosswordScore??'-'}</td><td><strong>${f}</strong></td><td>${formatDate(s.completedAt||s.reportSubmittedAt)}</td></tr>`;
    }).join('');
    document.getElementById('grades-list').innerHTML = html + '</tbody></table></div>';
}

function renderStudentProfileView() {
    const u = AppState.user;
    document.getElementById('main-content').innerHTML = `<h2>Perfil</h2><div class="card"><label>Matrícula</label><input value="${u.matricula}" disabled><label>Nombre</label><input id="pN" value="${u.username}"><label>Grupo</label><input id="pG" value="${u.grupo||''}"><label>Email</label><input id="pE" value="${u.email}"><button onclick="updProf()">Guardar</button></div>`;
}
async function updProf(){ await updateUserProfile(AppState.user.uid, {username: document.getElementById('pN').value, grupo: document.getElementById('pG').value, email: document.getElementById('pE').value}); alert("Guardado"); }

async function handleReportUpload(pid) {
    const f = document.getElementById(`rep-${pid}`).files[0];
    if(!f) return alert("Selecciona un archivo PDF.");
    
    document.getElementById(`log-${pid}`).innerText = "Procesando...";
    try {
        const url = await uploadFile(f, `reports/${pid}/${AppState.user.uid}`);
        let rScore=null, rFeed=null;
        
        try {
            const txt = await extractTextFromPDF(f);
            const p = AppState.practices[pid];
            if(txt.length>50) {
                const ev = await callAIEvaluate(txt, p.standardText||"Evaluar técnico");
                rScore=ev.calificacion; rFeed=ev.justificacion;
            }
        } catch(e){}
        
        await callDB('submit_report', { practiceId: pid, studentUid: AppState.user.uid, reportUrl: url, reportScore: rScore, reportFeedback: rFeed });
        alert("Enviado"); renderStudentPracticesView();
    } catch(e){ alert(e.message); }
}

// ==================================================================================
// 5. VISTAS DEL COORDINADOR / TUTOR
// ==================================================================================

// Dashboard Global
async function renderTutorDashboard() {
    const div = document.getElementById('main-content');
    div.innerHTML = `<h2>Tablero de Control Académico</h2><div id="tutor-stats">Calculando métricas...</div>`;
    
    try {
        const stats = await getGlobalStats();
        const groupsList = Object.values(stats.groupsData);
        let totalSchoolScore = 0;
        let totalGrades = 0;
        
        groupsList.forEach(g => {
            totalSchoolScore += g.totalScore;
            totalGrades += g.gradesCount;
        });
        const globalAvg = totalGrades > 0 ? (totalSchoolScore / totalGrades).toFixed(1) : '0.0';

        div.innerHTML = `
            <h2>Tablero de Control Académico</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <div class="card" style="text-align:center; border-left: 4px solid #3b82f6;">
                    <h3 style="margin:0; font-size: 2.5rem; color: #3b82f6;">${stats.studentCount}</h3>
                    <p style="color:#64748b;">Alumnos Totales</p>
                </div>
                <div class="card" style="text-align:center; border-left: 4px solid #8b5cf6;">
                    <h3 style="margin:0; font-size: 2.5rem; color: #8b5cf6;">${stats.practicesCount}</h3>
                    <p style="color:#64748b;">Prácticas Activas</p>
                </div>
                <div class="card" style="text-align:center; border-left: 4px solid #10b981;">
                    <h3 style="margin:0; font-size: 2.5rem; color: #10b981;">${globalAvg}</h3>
                    <p style="color:#64748b;">Promedio Global (Escuela)</p>
                </div>
            </div>
            
            <div class="card">
                <h4>Rendimiento Rápido por Grupo</h4>
                <div class="table-container">
                    <table class="styled-table">
                        <thead><tr><th>Grupo</th><th>Alumnos</th><th>Promedio General</th><th>Estado</th></tr></thead>
                        <tbody>
                            ${groupsList.map(g => {
                                const avg = g.gradesCount > 0 ? (g.totalScore / g.gradesCount).toFixed(1) : '0.0';
                                let badge = '<span class="badge badge-success">Excelente</span>';
                                if(avg < 8) badge = '<span class="badge badge-warning">Regular</span>';
                                if(avg < 6) badge = '<span class="badge badge-danger">Crítico</span>';
                                if(g.gradesCount === 0) badge = '<span class="badge" style="background:#f1f5f9;color:#64748b">Sin datos</span>';
                                return `<tr><td><strong>${g.name}</strong></td><td>${g.studentCount}</td><td>${avg}</td><td>${badge}</td></tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (e) {
        div.innerHTML = `<p class="alert-error">Error cargando datos: ${e.message}</p>`;
    }
}

// Estadísticas para el tutor (Datos)
async function getGlobalStats() {
    const [practices, users] = await Promise.all([getPractices(), getAllUsers()]);
    AppState.practices = practices;
    AppState.users = users;

    const students = users.filter(u => u.role === 'alumno');
    const groupsData = {};

    // Agrupa alumnos
    students.forEach(s => {
        const g = s.grupo || 'Sin Grupo';
        if (!groupsData[g]) {
            groupsData[g] = { name: g, totalScore: 0, gradesCount: 0, studentCount: 0, studentsIds: [] };
        }
        groupsData[g].studentCount++;
        groupsData[g].studentsIds.push(s.uid);
    });

    // Calcula calificaciones
    Object.values(practices).forEach(p => {
        if (p.students) {
            Object.entries(p.students).forEach(([uid, data]) => {
                const finalGrade = calculateWeightedGrade(data.reportScore, data.quizScore, data.crosswordScore);
                const studentProfile = students.find(s => s.uid === uid);
                if (studentProfile) {
                    const g = studentProfile.grupo || 'Sin Grupo';
                    if (groupsData[g]) {
                        if (data.reportScore !== null || data.quizScore !== null) {
                            groupsData[g].totalScore += finalGrade;
                            groupsData[g].gradesCount++;
                        }
                    }
                }
            });
        }
    });

    return { groupsData, practicesCount: Object.keys(practices).length, studentCount: students.length };
}

// Vista: Grupos
async function renderTutorGroupsView() {
    document.getElementById('main-content').innerHTML = `<h2>Detalle por Grupos</h2><div id="groups-detail">Cargando...</div>`;
    const stats = await getGlobalStats();
    const groups = Object.values(stats.groupsData);
    
    let html = '';
    groups.forEach(g => {
        const avg = g.gradesCount > 0 ? (g.totalScore / g.gradesCount).toFixed(1) : '-';
        html += `
            <div class="card">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h3 style="margin:0; color: #0f172a;">Grupo ${g.name}</h3>
                    <span class="badge-info" style="font-size:1em;">Promedio: ${avg}</span>
                </div>
                <details>
                    <summary style="cursor:pointer; color:#3b82f6; font-weight:600;">Ver lista de alumnos (${g.studentCount})</summary>
                    <div style="margin-top:10px; padding:10px; background:#f8fafc; border-radius:8px;">
                        <ul style="list-style:none; padding:0; margin:0;">
                            ${g.studentsIds.map(uid => {
                                const s = AppState.users.find(u => u.uid === uid);
                                return `<li style="padding:5px 0; border-bottom:1px solid #e2e8f0; font-size:0.9em;">
                                    <strong>${s.matricula}</strong> - ${s.username}
                                </li>`;
                            }).join('')}
                        </ul>
                    </div>
                </details>
            </div>
        `;
    });
    
    if (groups.length === 0) html = '<div class="card"><p>No hay grupos registrados.</p></div>';
    document.getElementById('groups-detail').innerHTML = html;
}

// Vista: Auditoría
async function renderTutorAuditView() {
    document.getElementById('main-content').innerHTML = `<h2>Auditoría de Prácticas</h2><p style="color:#64748b;">Vista de solo lectura del progreso académico.</p><div id="audit-list">Cargando...</div>`;
    
    const practices = await getPractices(); 
    const list = Object.values(practices);
    
    if (list.length === 0) {
        document.getElementById('audit-list').innerHTML = '<div class="card">No hay prácticas creadas por docentes.</div>';
        return;
    }

    let html = '';
    list.forEach(p => {
        const totalStudents = Object.keys(p.students || {}).length;
        let completedCount = 0;
        
        if (p.students) {
            Object.values(p.students).forEach(s => {
                if (s.completed || (s.reportScore !== null && s.quizScore !== null)) completedCount++;
            });
        }
        
        const completionRate = totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0;

        html += `
            <div class="card" style="border-left: 4px solid #f59e0b;">
                <div style="display:flex; justify-content:space-between;">
                    <h4 style="margin:0;">${p.title}</h4>
                    <span style="font-size:0.85em; color:#64748b;">ID: ${p.id}</span>
                </div>
                <div style="margin-top:15px; display:flex; gap:20px; flex-wrap:wrap;">
                    <div>
                        <span style="display:block; font-size:0.8em; color:#64748b;">Inscritos</span>
                        <strong style="font-size:1.2em;">${totalStudents}</strong>
                    </div>
                    <div>
                        <span style="display:block; font-size:0.8em; color:#64748b;">Completaron</span>
                        <strong style="font-size:1.2em; color:#166534;">${completedCount}</strong>
                    </div>
                    <div>
                        <span style="display:block; font-size:0.8em; color:#64748b;">Tasa de Éxito</span>
                        <strong style="font-size:1.2em; color:#3b82f6;">${completionRate}%</strong>
                    </div>
                </div>
                
                <div style="margin-top:15px; background:#e2e8f0; height:8px; border-radius:4px; overflow:hidden;">
                    <div style="background:#3b82f6; width:${completionRate}%; height:100%;"></div>
                </div>
            </div>
        `;
    });
    
    document.getElementById('audit-list').innerHTML = html;
}