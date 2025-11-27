// scripts/dashboard_views.js (VERSIÓN: EXÁMENES ÚNICOS POR ALUMNO)

const AppState = {
    user: null,
    practices: {},
    users: [],
};

// --- HELPERS ---
function formatDate(isoString) {
    if (!isoString) return '-';
    try {
        const date = new Date(isoString);
        return date.toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return '-'; }
}

function calculateWeightedGrade(r, q, c) {
    return parseFloat(((r||0)*0.8 + (q||0)*0.1 + (c||0)*0.1).toFixed(1));
}

// NUEVO: Selecciona preguntas únicas para el estudiante (Determinista)
function getStudentQuestions(allQuestions, studentUid, count = 10) {
    if (!allQuestions || allQuestions.length === 0) return [];
    
    // Usamos el UID para generar una "semilla" numérica única para este alumno
    let seed = 0;
    for (let i = 0; i < studentUid.length; i++) seed += studentUid.charCodeAt(i);
    
    // Algoritmo de mezcla usando la semilla (para que siempre le toquen las mismas a él/ella)
    const shuffled = [...allQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = (seed * (i + 1)) % (i + 1); // Pseudo-random basado en semilla
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        seed++; // Variar semilla
    }
    
    // Devolvemos las primeras 'count' preguntas (ej. 10 de 20)
    return shuffled.slice(0, count);
}

// ====================================================
// NAVEGACIÓN
// ====================================================
function renderDoctorLayout(user) {
    AppState.user = user;
    document.getElementById('header-title').textContent = `Dr. ${user.username}`;
    document.getElementById('navbar').innerHTML = `
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
    document.getElementById('navbar').innerHTML = `
        <button class="active" onclick="setActive(this); renderStudentDashboard();">Inicio</button>
        <button onclick="setActive(this); renderStudentPracticesView();">Mis Prácticas</button>
        <button onclick="setActive(this); renderStudentActivitiesView();">Actividades</button>
        <button onclick="setActive(this); renderStudentGradesView();">Calificaciones</button>
        <button onclick="setActive(this); renderStudentProfileView();">Mi Perfil</button>
    `;
    renderStudentDashboard();
}

function setActive(btn) {
    if(!btn) return;
    document.querySelectorAll('#navbar button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

// ====================================================
// VISTAS DOCTOR
// ====================================================
async function renderDoctorDashboard() {
    const div = document.getElementById('main-content');
    div.innerHTML = `
        <div style="margin-bottom:30px;">
            <h2 style="margin-bottom:5px; color:#0f172a;">Bienvenido, Dr. ${AppState.user.username}</h2>
            <p style="color:#64748b; margin-top:0;">Panel de control general.</p>
        </div>
        <div id="practices-summary">Cargando...</div>`;
    try {
        const practices = await getPractices();
        AppState.practices = practices;
        const list = Object.values(practices);
        let html = '';
        if (list.length === 0) html = `<div class="card"><p>No hay prácticas creadas.</p></div>`;
        else {
            list.forEach(p => {
                const count = Object.keys(p.students || {}).length;
                const sBtn = p.slidesPdfUrl?.length > 5 ? `<a href="${p.slidesPdfUrl}" target="_blank" class="btn btn-secondary">Ver Diapositivas</a>` : '';
                const stdBtn = p.standardPdfUrl?.length > 5 ? `<a href="${p.standardPdfUrl}" target="_blank" class="btn btn-secondary">Ver Estándar</a>` : '';
                html += `<div class="card"><div style="display:flex; justify-content:space-between; align-items:center;"><h4>${p.title}</h4><button onclick="handleDeletePractice('${p.id}')" style="background-color:#ef4444; font-size:0.8em; padding:6px 12px; border:none; color:white;">Borrar</button></div><p style="color:#64748b;">${count} alumnos</p><div style="display:flex; gap:10px;">${sBtn}${stdBtn}</div></div>`;
            });
        }
        document.getElementById('practices-summary').innerHTML = html;
    } catch (e) { div.innerHTML = `<p class="alert-error">${e.message}</p>`; }
}

function renderCreatePracticeView() {
    document.getElementById('main-content').innerHTML = `<h2>Crear Nueva Práctica</h2><div class="card"><label>Título</label><input type="text" id="practiceTitle"><label>Diapositivas (PDF)</label><input type="file" id="slidesFile"><small style="color:#666; display:block; margin-bottom:15px;">* Para generar banco de preguntas.</small><label>Manual (PDF)</label><input type="file" id="manualFile"><label>Estándar (PDF)</label><input type="file" id="standardFile"><button onclick="handlePracticeCreation()">CREAR PRÁCTICA</button><div id="creationLog" style="margin-top:15px; font-family:monospace;"></div></div>`;
}

async function handlePracticeCreation() {
    const title = document.getElementById('practiceTitle').value;
    const slidesFile = document.getElementById('slidesFile').files[0];
    const standardFile = document.getElementById('standardFile').files[0];
    const manualFile = document.getElementById('manualFile').files[0];
    const logDiv = document.getElementById('creationLog');
    if (!title || !slidesFile || !standardFile || !manualFile) { logDiv.innerHTML = '<p class="alert-error">Faltan campos.</p>'; return; }
    
    logDiv.previousElementSibling.disabled = true;
    try {
        logDiv.innerHTML = '<span style="color:#3b82f6">1/5: Registro...</span>';
        const pid = await createPractice({ title, students: {}, generatedContent: null, creatorId: AppState.user.uid, createdAt: new Date() });
        
        logDiv.innerHTML = '<span style="color:#3b82f6">2/5: Subiendo...</span>';
        const [sUrl, stdUrl, mUrl] = await Promise.all([
            uploadFile(slidesFile, `practices/${pid}`), uploadFile(standardFile, `practices/${pid}`), uploadFile(manualFile, `practices/${pid}`)
        ]);
        await savePracticeContent(pid, { slidesPdfUrl: sUrl, standardPdfUrl: stdUrl, manualPdfUrl: mUrl });

        logDiv.innerHTML = '<span style="color:#eab308">4/5: Analizando...</span>';
        let txt = ""; try { txt = await extractTextFromPDF(slidesFile); } catch(e){}
        await savePracticeContent(pid, { slidesText: txt });

        if (txt.length > 50) {
            logDiv.innerHTML = '<span style="color:#eab308">5/5: Creando banco de preguntas...</span>';
            const gen = await callAIGenerate(txt);
            await savePracticeContent(pid, { generatedContent: gen });
            logDiv.innerHTML = '<p class="alert-success">✅ ¡Éxito!</p>';
        } else {
            logDiv.innerHTML = '<p class="alert-success" style="color:orange">⚠️ Creada sin IA (PDF imagen).</p>';
        }
        setTimeout(() => { document.querySelector('#navbar button').click(); }, 3000);
    } catch (e) { logDiv.innerHTML = `<p class="alert-error">${e.message}</p>`; }
}

// ... (Gestión Alumnos y Notas Doctor - Igual que antes) ...
async function renderManageStudentsView() {
    document.getElementById('main-content').innerHTML = `<h2>Gestionar Alumnos</h2><div class="card"><input type="text" id="sSearch" placeholder="Buscar..." onkeyup="hSearch()" style="margin-bottom:0;"></div><div id="sList">Cargando...</div>`;
    const [p, u] = await Promise.all([getPractices(), getAllUsers()]);
    AppState.practices = p; AppState.users = u.filter(x => x.role === 'alumno');
    rList(AppState.users);
}
function rList(list) {
    let h = ''; const pMap = {}; Object.values(AppState.practices).forEach(p=>{Object.keys(p.students||{}).forEach(s=>pMap[s]={id:p.id, title:p.title})});
    list.forEach(s => {
        const grp = s.grupo ? `<span style="margin-left:5px;background:#e0f2fe;color:#0284c7;padding:2px 6px;border-radius:4px;font-size:0.8em;">${s.grupo}</span>` : '';
        h += `<div class="student-list-item"><div><strong>${s.username}</strong> ${grp}<br><small>${s.matricula}</small></div><div style="text-align:right;">`;
        if(pMap[s.uid]) h+=`<span style="color:#3b82f6;margin-right:10px;">${pMap[s.uid].title}</span><button onclick="hUnenroll('${pMap[s.uid].id}','${s.uid}')" style="background:#f59e0b;font-size:0.75em;padding:6px;">Desinscribir</button>`;
        else h+=`<select id="ps-${s.uid}">${Object.values(AppState.practices).map(p=>`<option value="${p.id}">${p.title}</option>`).join('')}</select><button onclick="hEnroll('${s.uid}')" style="font-size:0.75em;padding:6px;">Inscribir</button>`;
        h+=`<button onclick="hDel('${s.uid}')" style="background:#ef4444;font-size:0.75em;padding:6px;margin-left:5px;">X</button></div></div>`;
    });
    document.getElementById('sList').innerHTML = h || '<p>Sin alumnos</p>';
}
function hSearch(){ rList(AppState.users.filter(u=>u.username.toLowerCase().includes(document.getElementById('sSearch').value.toLowerCase()) || (u.matricula&&u.matricula.includes(document.getElementById('sSearch').value)))); }
async function hEnroll(uid){ const pid=document.getElementById(`ps-${uid}`).value; if(!pid)return; await enrollStudent(pid,uid); if(!AppState.practices[pid].students)AppState.practices[pid].students={}; AppState.practices[pid].students[uid]={status:'Inscrito'}; hSearch(); }
async function hUnenroll(pid,uid){ if(confirm("¿Desinscribir?")){ await unenrollStudent(pid,uid); delete AppState.practices[pid].students[uid]; hSearch(); } }
async function hDel(uid){ if(confirm("¿Borrar usuario?")){ await deleteUser(uid); renderManageStudentsView(); } }
async function handleDeletePractice(pid) { if(confirm("¿Borrar?")) { await deletePractice(pid); renderDoctorDashboard(); } }

async function renderDoctorGradesView() {
    document.getElementById('main-content').innerHTML = `<h2>Calificaciones</h2><div id="grades-by-practice">Cargando...</div>`;
    const [practices, users] = await Promise.all([getPractices(), getAllUsers()]);
    const uMap = new Map(users.map(u => [u.uid, u]));
    let html = '';
    for (const p of Object.values(practices)) {
        html += `<div class="card"><h4>${p.title}</h4>`;
        const studs = p.students || {};
        if (Object.keys(studs).length === 0) html += '<p style="color:#64748b;">Sin alumnos.</p>';
        else {
            html += `<div class="table-container"><table class="styled-table"><thead><tr><th>Alumno</th><th>Matrícula</th><th>Grupo</th><th>Reporte</th><th>Cuest</th><th>Cross</th><th>Final</th><th>Fecha</th></tr></thead><tbody>`;
            for (const sid in studs) {
                const d = studs[sid];
                const info = uMap.get(sid);
                const final = calculateWeightedGrade(d.reportScore, d.quizScore, d.crosswordScore);
                html += `<tr><td>${info?.username||'?'}</td><td>${info?.matricula||sid}</td><td>${info?.grupo||'-'}</td><td>${d.reportScore??'-'}</td><td>${d.quizScore??'-'}</td><td>${d.crosswordScore??'-'}</td><td><strong>${final}</strong></td><td style="font-size:0.8em;">${formatDate(d.completedAt||d.reportSubmittedAt)}</td></tr>`;
            }
            html += `</tbody></table></div>`;
        }
        html += `</div>`;
    }
    document.getElementById('grades-by-practice').innerHTML = html;
}

// ====================================================
// VISTAS ALUMNO
// ====================================================

function renderStudentDashboard() {
    document.getElementById('main-content').innerHTML = `<h2>¡Hola, ${AppState.user.username}!</h2><div class="card" style="border-left:4px solid var(--primary-color);"><p>Bienvenido a tu espacio. Usa el menú superior.</p></div>`;
}

async function renderStudentPracticesView() {
    const div = document.getElementById('main-content');
    div.innerHTML = '<h2>Entrega de Reportes</h2><div id="list">Cargando...</div>';
    try {
        const practices = await getPractices(); AppState.practices = practices;
        const myP = Object.values(practices).filter(p => p.students && p.students[AppState.user.uid]);
        if (myP.length === 0) { document.getElementById('list').innerHTML = '<p>Sin asignaciones.</p>'; return; }

        const html = myP.map(p => {
            const st = p.students[AppState.user.uid];
            const hasR = st.reportUrl;
            const dl = `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:15px;"><a href="${p.slidesPdfUrl}" target="_blank" class="btn btn-secondary" style="font-size:0.8em;">Diapositivas</a><a href="${p.manualPdfUrl}" target="_blank" class="btn btn-secondary" style="font-size:0.8em;">Manual</a><a href="${p.standardPdfUrl}" target="_blank" class="btn btn-secondary" style="font-size:0.8em;">Estándar</a></div>`;
            
            if (hasR) return `<div class="card"><h4>${p.title}</h4><div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:15px;border-radius:8px;color:#166534;"><strong>Reporte Entregado</strong><br>Nota IA: ${st.reportScore||'Pendiente'}</div>${st.reportFeedback?`<div style="margin-top:10px;padding:10px;background:#f8fafc;font-size:0.9em;">${st.reportFeedback}</div>`:''}<p style="margin-top:15px;color:#64748b;font-size:0.9em;">Materiales:</p>${dl}</div>`;
            
            return `<div class="card"><h4>${p.title}</h4><p>Descarga y sube tu PDF:</p>${dl}<hr><input type="file" id="rep-${p.id}" accept="application/pdf"><button onclick="handleReportUpload('${p.id}')" style="width:100%;margin-top:10px;">Entregar</button><div id="log-${p.id}" style="margin-top:10px;font-size:0.9em;"></div></div>`;
        }).join('');
        document.getElementById('list').innerHTML = html;
    } catch (e) { div.innerHTML = `<p class="alert-error">${e.message}</p>`; }
}

async function renderStudentActivitiesView() {
    const div = document.getElementById('main-content');
    div.innerHTML = '<h2>Actividades</h2><div id="act-list">Cargando...</div>';
    try {
        const practices = await getPractices(); AppState.practices = practices;
        const myP = Object.values(practices).filter(p => p.students && p.students[AppState.user.uid]);
        if (myP.length === 0) { document.getElementById('act-list').innerHTML = '<p>Sin actividades.</p>'; return; }

        const html = myP.map(p => {
            const st = p.students[AppState.user.uid];
            if (!st.reportUrl) return `<div class="card"><h4>${p.title}</h4><div style="background:#f1f5f9;padding:20px;text-align:center;color:#64748b;border-radius:8px;">🔒 Entrega reporte primero</div></div>`;
            if (st.completed) return `<div class="card"><h4>${p.title}</h4><div class="alert-success">Completado</div></div>`;
            const cid = st.status === 'Crucigrama Pendiente' ? `cross-${p.id}` : `quiz-${p.id}`;
            return `<div class="card"><h4>${p.title}</h4><div id="${cid}">Cargando...</div></div>`;
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

// --- RENDER QUIZ (ALEATORIO ÚNICO) ---
function renderQuiz(p) {
    const d = document.getElementById(`quiz-${p.id}`);
    // Obtenemos el banco completo
    const fullBank = p.generatedContent?.cuestionario;
    if (!fullBank) return d.innerHTML = "<p class='alert-error'>Error cuestionario</p>";
    
    // Seleccionamos 10 preguntas únicas para este alumno
    const myQuestions = getStudentQuestions(fullBank, AppState.user.uid, 10);
    
    let h = '<p>Responde:</p>';
    myQuestions.forEach((x, i) => {
        // Usamos el índice 'i' (0-9) para el nombre del input, PERO guardamos el texto de la pregunta para validar después si queremos ser muy estrictos
        // Por ahora validaremos contra el banco original buscando la pregunta.
        h += `<div class="question"><p>${i+1}. ${x.pregunta}</p>`;
        x.opciones?.forEach(o => h += `<label class="option-label"><input type="radio" name="q-${p.id}-${i}" value="${o}"> ${o}</label>`);
        h += '</div>';
    });
    d.innerHTML = h + `<button onclick="handleQuizSubmit(event, '${p.id}')">Enviar</button>`;
}

async function handleQuizSubmit(e, pid) {
    const btn = e.target; btn.disabled = true;
    const p = AppState.practices[pid] || (await getPractices())[pid];
    
    // Recuperamos LAS MISMAS preguntas que se renderizaron
    const fullBank = p.generatedContent.cuestionario;
    const myQuestions = getStudentQuestions(fullBank, AppState.user.uid, 10);
    
    let score = 0;
    myQuestions.forEach((q, i) => {
        const inputs = document.getElementsByName(`q-${pid}-${i}`);
        const selected = Array.from(inputs).find(x => x.checked);
        // Comparar respuesta seleccionada con la correcta
        if (selected && selected.value.trim().toLowerCase() === q.correcta.trim().toLowerCase()) {
            score++;
        }
    });

    // Nota sobre 10
    const finalScore = Math.round((score / myQuestions.length) * 10);
    
    await updateStudentProgress(pid, AppState.user.uid, { status: 'Crucigrama Pendiente', quizScore: finalScore });
    alert(`Resultado: ${finalScore}/10. ¡Sigue con el crucigrama!`);
    renderStudentActivitiesView();
}

// --- CRUCIGRAMA (ARREGLADO) ---
function renderCrossword(p) {
    const d = document.getElementById(`cross-${p.id}`);
    const data = p.generatedContent?.crucigrama;
    if(!data) return d.innerHTML="<p>Error crucigrama</p>";
    const words = data.map(w => ({ word: w.word.toUpperCase(), clue: w.clue }));
    const layout = generateCrosswordLayout(words);
    if(!layout) return d.innerHTML="<p>Error generando</p>";
    
    let h = '<div class="crossword-container"><div class="crossword-grid"><table>';
    layout.grid.forEach(r => { 
        h += '<tr>'; 
        r.forEach(c => {
            if(c) h += `<td style="position:relative;"><input type="text" maxlength="1" data-correct="${c.char}"><span class="crossword-number">${c.num||''}</span></td>`;
            else h += '<td class="empty"></td>';
        });
        h += '</tr>'; 
    });
    h += '</table></div><div class="crossword-clues"><h5>Pistas</h5>';
    layout.placedWordsInfo.forEach(w => h+=`<p><strong>${w.number}. ${w.orientation==='across'?'H':'V'}</strong>: ${w.clue}</p>`);
    h += '</div></div><br><button onclick="handleCrosswordSubmit(event, \''+p.id+'\')">Finalizar</button>';
    
    d.innerHTML = h;
}
// ... (Generador y submit del crucigrama igual que antes, sin cambios)
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
    let corr=0, tot=0;
    document.querySelectorAll(`#cross-${pid} input`).forEach(c=>{
        tot++; if(c.value.toUpperCase()===c.dataset.correct) { corr++; c.style.background='#dcfce7'; } else c.style.background='#fee2e2';
    });
    const cScore = tot>0 ? Math.round((corr/tot)*10) : 0;
    await updateStudentProgress(pid, AppState.user.uid, { completed: true, status: 'Finalizado', crosswordScore: cScore });
    alert(`Crucigrama: ${cScore}/10`);
    renderStudentActivitiesView();
}

// --- GRADES ALUMNO ---
async function renderStudentGradesView() {
    document.getElementById('main-content').innerHTML = '<h2>Mis Calificaciones</h2><div id="grades-list">Cargando...</div>';
    const practices = await getPractices();
    const myP = Object.values(practices).filter(p => p.students && p.students[AppState.user.uid]);
    if (myP.length === 0) { document.getElementById('grades-list').innerHTML = '<p>Sin datos.</p>'; return; }
    let html = `<div class="table-container"><table class="styled-table"><thead><tr><th>Práctica</th><th>Reporte</th><th>Quiz</th><th>Cross</th><th>Final</th><th>Fecha</th></tr></thead><tbody>`;
    html += myP.map(p => {
        const s = p.students[AppState.user.uid];
        const f = calculateWeightedGrade(s.reportScore, s.quizScore, s.crosswordScore);
        return `<tr><td>${p.title}</td><td>${s.reportScore??'-'}</td><td>${s.quizScore??'-'}</td><td>${s.crosswordScore??'-'}</td><td><strong>${f}</strong></td><td>${formatDate(s.completedAt||s.reportSubmittedAt)}</td></tr>`;
    }).join('');
    document.getElementById('grades-list').innerHTML = html + '</tbody></table></div>';
}
// --- PERFIL Y UPLOAD (Igual) ---
function renderStudentProfileView() {
    const u = AppState.user;
    document.getElementById('main-content').innerHTML = `<h2>Perfil</h2><div class="card"><label>Matrícula</label><input value="${u.matricula}" disabled><label>Nombre</label><input id="pN" value="${u.username}"><label>Grupo</label><input id="pG" value="${u.grupo||''}"><label>Email</label><input id="pE" value="${u.email}"><button onclick="updProf()">Guardar</button></div>`;
}
async function updProf(){ await updateUserProfile(AppState.user.uid, {username: document.getElementById('pN').value, grupo: document.getElementById('pG').value, email: document.getElementById('pE').value}); alert("Guardado"); }
async function handleReportUpload(pid) {
    const f = document.getElementById(`rep-${pid}`).files[0];
    if(!f) return alert("Archivo?");
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