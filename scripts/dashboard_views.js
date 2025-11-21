// scripts/dashboard_views.js (VERSIÓN FINAL MEJORADA)

const AppState = {
    user: null,
    practices: {},
    users: [],
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
                
                // VERIFICACIÓN DE ENLACES (Diagnóstico)
                const slidesBtn = p.slidesPdfUrl && p.slidesPdfUrl.length > 5
                    ? `<a href="${p.slidesPdfUrl}" target="_blank" class="btn btn-secondary">Ver Diapositivas</a>`
                    : `<button class="btn btn-secondary" disabled style="opacity:0.5; cursor:not-allowed;">Sin Diapositivas</button>`;

                const stdBtn = p.standardPdfUrl && p.standardPdfUrl.length > 5
                    ? `<a href="${p.standardPdfUrl}" target="_blank" class="btn btn-secondary">Ver Estándar</a>`
                    : `<button class="btn btn-secondary" disabled style="opacity:0.5; cursor:not-allowed;">Sin Estándar</button>`;

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
            <small style="color:#64748b; display:block; margin-bottom:15px;">* PDF con texto seleccionable para generar cuestionario.</small>
            
            <label for="standardFile">Estándar del Reporte (PDF)</label>
            <input type="file" id="standardFile" accept="application/pdf">
            
            <button onclick="handlePracticeCreation()">CREAR PRÁCTICA</button>
            
            <div id="creationLog" style="margin-top: 15px; font-family:monospace; font-size:0.9em;"></div>
        </div>`;
}

// --- LÓGICA DE CREACIÓN PASO A PASO ---
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
        // 1. Crear registro
        logDiv.innerHTML = '<span style="color:#3b82f6">1/4: Creando registro en base de datos...</span>';
        const practiceData = { 
            title, 
            students: {}, 
            generatedContent: null, 
            creatorId: AppState.user.uid,
            createdAt: new Date()
        };
        const practiceId = await createPractice(practiceData);

        // 2. Subir archivos
        logDiv.innerHTML = '<span style="color:#3b82f6">2/4: Subiendo archivos (esto puede tardar)...</span>';
        const [slidesPdfUrl, standardPdfUrl] = await Promise.all([
            uploadFile(slidesFile, `practices/${practiceId}`),
            uploadFile(standardFile, `practices/${practiceId}`)
        ]);

        // 3. GUARDAR ENLACES (Paso Crítico)
        logDiv.innerHTML = '<span style="color:#3b82f6">3/4: Guardando enlaces de archivos...</span>';
        // Aquí es donde antes fallaba si la IA se rompía. Ahora lo hacemos antes.
        await savePracticeContent(practiceId, { slidesPdfUrl, standardPdfUrl });

        // 4. IA (Opcional / Puede fallar sin romper todo)
        logDiv.innerHTML = '<span style="color:#eab308">4/4: Analizando texto con IA para cuestionario...</span>';
        
        let slidesText = "";
        try {
            slidesText = await extractTextFromPDF(slidesFile);
        } catch (err) { console.warn("Error texto:", err); }

        if (slidesText && slidesText.length > 50) {
            try {
                const generatedContent = await callAIGenerate(slidesText);
                await savePracticeContent(practiceId, { slidesText, generatedContent });
                logDiv.innerHTML = '<p class="alert-success">✅ ¡Todo listo! Práctica y Cuestionario creados.</p>';
            } catch (aiErr) {
                console.error(aiErr);
                logDiv.innerHTML = '<p class="alert-success" style="color:#f59e0b;">⚠️ Práctica creada, pero la IA no pudo generar el cuestionario (revisa si el PDF es imagen).</p>';
            }
        } else {
            logDiv.innerHTML = '<p class="alert-success" style="color:#f59e0b;">⚠️ Práctica creada sin cuestionario (PDF sin texto legible).</p>';
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

// ... (COPIA AQUÍ EL RESTO DE FUNCIONES EXACTAMENTE IGUAL QUE ANTES) ...
// ... (renderManageStudentsView, renderDoctorGradesView, renderStudent..., etc.) ...

async function renderManageStudentsView() {
    const contentDiv = document.getElementById('main-content');
    contentDiv.innerHTML = `
        <h2>Gestionar Alumnos</h2>
        <div class="card">
            <input type="text" id="studentSearchInput" placeholder="🔍 Buscar por matrícula o nombre..." onkeyup="handleSearchStudent()" style="margin-bottom:0;">
        </div>
        <div id="students-list-container">Cargando...</div>
    `;
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
async function handleDeleteUser(uid) { if(confirm("¿Borrar usuario permanentemente?")) { await deleteUser(uid); renderManageStudentsView(); } }
async function handleUnenroll(pid, uid) { if(confirm("¿Desinscribir?")) { await unenrollStudent(pid, uid); delete AppState.practices[pid].students[uid]; handleSearchStudent(); } }
async function enrollStudentHandler(uid) {
    const pid = document.getElementById(`practice-select-${uid}`).value;
    if(!pid) return;
    await enrollStudent(pid, uid);
    if(!AppState.practices[pid].students) AppState.practices[pid].students = {};
    AppState.practices[pid].students[uid] = { status: 'Inscrito' };
    handleSearchStudent();
}

function renderStudentDashboard() {
    document.getElementById('main-content').innerHTML = `<h2>Bienvenido</h2><div class="card"><p>Hola, ${AppState.user.username}</p></div>`;
}
function renderStudentProfileView() {
    const u = AppState.user;
    document.getElementById('main-content').innerHTML = `<h2>Mi Perfil</h2><div class="card">
        <label>Matrícula (Fija):</label><input type="text" value="${u.matricula}" disabled style="background:#eee;">
        <label>Nombre:</label><input type="text" id="pName" value="${u.username}">
        <label>Grupo:</label><input type="text" id="pGroup" value="${u.grupo||''}">
        <label>Email:</label><input type="email" id="pEmail" value="${u.email}">
        <button onclick="handleUpdateProfile()">Guardar</button>
    </div>`;
}
async function handleUpdateProfile() {
    const name = document.getElementById('pName').value, group = document.getElementById('pGroup').value, email = document.getElementById('pEmail').value;
    if(!name || !email) return alert("Faltan datos");
    await updateUserProfile(AppState.user.uid, { username: name, grupo: group, email: email });
    AppState.user.username = name; AppState.user.grupo = group; AppState.user.email = email;
    alert("Actualizado"); renderStudentProfileView();
}

async function renderStudentPracticesView() {
    const div = document.getElementById('main-content');
    div.innerHTML = '<h2>Mis Prácticas</h2><div id="list">Cargando...</div>';
    try {
        const practices = await getPractices();
        const myP = Object.values(practices).filter(p => p.students && p.students[AppState.user.uid]);
        if (myP.length===0) { document.getElementById('list').innerHTML='<p>Sin asignaciones.</p>'; return; }
        
        const html = myP.map(p => {
            const st = p.students[AppState.user.uid];
            let c = `<h4>${p.title}</h4><p>Estado: ${st.status}</p>`;
            if(st.completed) c += `<p>¡Completada!</p>`;
            else if(st.status === 'Crucigrama Pendiente') { c+=`<div id="crossword-${p.id}"></div>`; setTimeout(()=>renderCrossword(p),0); }
            else if(st.reportUrl) { c+=`<div id="quiz-${p.id}"></div>`; setTimeout(()=>renderQuiz(p),0); }
            else {
                c+=`<a href="${p.slidesPdfUrl}" target="_blank" class="btn">Diapositivas</a> <a href="${p.standardPdfUrl}" target="_blank" class="btn">Estándar</a>
                    <hr style="margin:15px 0"><h5>Sube tu Reporte</h5><input type="file" id="f-${p.id}"><button onclick="handleReportUpload('${p.id}')">Entregar</button>`;
            }
            return `<div class="card">${c}</div>`;
        }).join('');
        document.getElementById('list').innerHTML = html;
    } catch(e) { div.innerHTML = `<p class="alert-error">${e.message}</p>`; }
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

async function handleReportUpload(pid) {
    const f = document.getElementById(`f-${pid}`).files[0];
    if(!f) return alert("Elige archivo");
    try {
        const url = await uploadFile(f, `reports/${pid}/${AppState.user.uid}`);
        await submitStudentReport(pid, AppState.user.uid, url);
        renderStudentPracticesView();
    } catch(e) { alert(e.message); }
}

function renderQuiz(p) {
    const d = document.getElementById(`quiz-${p.id}`);
    const q = p.generatedContent?.cuestionario;
    if(!q) return d.innerHTML="<p>Error: Sin cuestionario (PDF sin texto legible)</p>";
    let h = '<h5>Cuestionario</h5>';
    q.forEach((x,i)=> {
        h+=`<div class="question"><p>${i+1}. ${x.pregunta}</p>`;
        if(x.tipo==='opcion') x.opciones.forEach(o=>h+=`<label><input type="radio" name="q-${p.id}-${i}" value="${o}"> ${o}</label><br>`);
        else h+=`<textarea name="q-${p.id}-${i}"></textarea>`;
        h+='</div>';
    });
    d.innerHTML = h + `<button onclick="subQuiz(event, '${p.id}')">Enviar</button>`;
}
async function subQuiz(e, pid) {
    e.target.disabled=true;
    const p = (await getPractices())[pid];
    const qs = p.generatedContent.cuestionario;
    let s = 0;
    qs.forEach((q,i)=>{
        const el = document.getElementsByName(`q-${pid}-${i}`);
        if(q.tipo==='opcion') { if(Array.from(el).find(x=>x.checked)?.value.trim().toLowerCase()===q.correcta.trim().toLowerCase()) s++; }
        else { if(el[0].value.length>5) s++; }
    });
    const sc = Math.round((s/qs.length)*10);
    await updateStudentProgress(pid, AppState.user.uid, 'Crucigrama Pendiente', sc);
    alert(`Nota parcial: ${sc}/10`);
    renderStudentPracticesView();
}

// ... (Incluye aquí las funciones de crucigrama: renderCrossword, generateCrosswordLayout, etc. que ya tenías antes)