// scripts/accessibility.js

let currentLang = localStorage.getItem('espectro_lang') || 'es';
let audioGuideActive = localStorage.getItem('espectro_audio') === 'true';
let daltonismActive = localStorage.getItem('espectro_daltonism') === 'true';
let highlightActive = localStorage.getItem('espectro_highlight') === 'true';
let fontSize = localStorage.getItem('espectro_fontsize') || '16';

const translations = {
    es: {
        "a11y_title": "Herramientas de Accesibilidad",
        "a11y_lang": "🌐 Idioma",
        "a11y_daltonism": "👁️ Modo Daltonismo",
        "a11y_audio": "🔊 Guía Auditiva",
        "a11y_font": "Tamaño de Fuente",
        "a11y_highlight": "🔗 Resaltar Enlaces",
        "a11y_footer": "Estos ajustes se guardarán para tu próxima visita.",
        "app_subtitle": "Laboratorios de Óptica",
        "app_desc": "Plataforma inteligente para la gestión, análisis y aprendizaje en óptica biomédica.",
        "login_welcome": "¡Hola de nuevo!",
        "login_instruction": "Ingresa tus credenciales para acceder",
        "login_email": "Correo Electrónico",
        "login_pass": "Contraseña",
        "login_enter": "ENTRAR",
        "login_no_account": "¿No tienes cuenta?",
        "login_register": "Regístrate gratis",
        "login_forgot": "¿Olvidaste tu contraseña?",
        "reg_title": "Crear Cuenta",
        "reg_desc": "Completa tus datos para unirte",
        "role_label": "Soy:",
        "role_student": "Alumno",
        "role_doctor": "Doctor / Docente",
        "role_tutor": "Coordinador / Tutor",
        "title_label": "Cargo:",
        "name_label": "Nombre Completo",
        "name_ph": "Tu nombre",
        "id_label": "Matrícula / ID",
        "id_ph": "Tu matrícula",
        "group_label": "Grupo",
        "group_ph": "Ej. 8A",
        "email_label": "Correo Institucional",
        "email_ph": "ejemplo@espectro.edu",
        "pass_label": "Contraseña",
        "pass_confirm_label": "Confirmar Contraseña",
        "pass_confirm_ph": "Repite la contraseña",
        "btn_register": "REGISTRARME",
        "already_account": "¿Ya tienes cuenta?",
        "login_link": "Inicia Sesión",
        "rec_title": "Recuperar Acceso",
        "rec_desc": "Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.",
        "rec_btn": "ENVIAR ENLACE",
        "rec_back": "← Volver al inicio",
        "new_pass_title": "Nueva Contraseña",
        "new_pass_desc": "Ingresa tu nueva contraseña segura.",
        "new_pass_btn": "GUARDAR CONTRASEÑA",
        "logout": "Cerrar Sesión",
        "nav_home": "Inicio",
        "nav_create": "Crear Práctica",
        "nav_manage": "Gestionar Alumnos",
        "nav_grades": "Ver Calificaciones",
        "nav_my_practices": "Mis Prácticas",
        "nav_activities": "Actividades",
        "nav_profile": "Mi Perfil",
        "nav_global": "Tablero Global",
        "nav_groups": "Análisis por Grupos",
        "nav_audit": "Auditoría de Prácticas",
        "dash_welcome": "Bienvenido",
        "dash_hello": "Hola",
        "dash_desc": "Panel de control general - Vista inmediata de tus métricas académicas.",
        "dash_student_desc": "Bienvenido a tu espacio de aprendizaje en EspectroEdu.",
        "dash_total_students": "Total Alumnos",
        "dash_avg": "Promedio General",
        "dash_active_prac": "Prácticas Activas",
        "dash_my_prac": "Mis Prácticas",
        "dash_new_prac": "+ Nueva Práctica",
        "dash_no_prac": "No hay prácticas creadas.",
        "student_step_1": "Descarga las <strong>Diapositivas y el Estándar</strong> en la sección 'Mis Prácticas'.",
        "student_step_2": "Sube tu reporte en PDF para recibir evaluación automática por nuestra IA.",
        "student_step_3": "Completa las <strong>Actividades Interactivas</strong> para finalizar tu evaluación.",
        "view_create_title": "Crear Nueva Práctica",
        "view_manage_title": "Gestionar Alumnos",
        "view_grades_title": "Calificaciones por Práctica",
        "loading": "Cargando...",
        "btn_export": "Exportar PDF",
        "pract_title_label": "Título de la Práctica",
        "pract_slides_label": "Diapositivas (PDF)",
        "pract_standard_label": "Estándar de Evaluación (PDF)",
        "pract_drop_text": "↑ Arrastra y suelta tu archivo aquí",
        "pract_click_text": "O haz clic para seleccionar",
        "pract_btn_create": "CREAR PRÁCTICA",
        "search_student": "Buscar alumno...",
        "all_groups": "Todos los Grupos",
        "any_status": "Cualquier Estado",
        "select_all_label": "Seleccionar Todo",
        "choose_pract": "Elegir Práctica...",
        "btn_enroll": "Inscribir Seleccionados",
        "status_enrolled": "✅ Inscrito",
        "status_not_enrolled": "⏳ No inscrito",
        "btn_delete": "Borrar",
        "table_name": "Nombre",
        "table_id": "Matrícula",
        "table_group": "Grupo",
        "table_report": "Reporte (80%)",
        "table_quiz": "Cuestionario (10%)",
        "table_cross": "Crucigrama (10%)",
        "table_final": "Final",
        "table_status": "Estado",
        "table_date": "Fecha Fin",
        "grade_approved": "✅ Aprobado",
        "grade_pending": "⏳ Pendiente",
        "grade_attention": "⚠️ Requiere Atención",
        "report_delivered": "Reporte Entregado Correctamente",
        "report_ia_score": "Calificación Asignada por IA",
        "consult_material": "Material de Consulta:",
        "btn_slides": "Diapositivas",
        "btn_standard": "Estándar Evaluación",
        "upload_report_label": "Sube tu reporte elaborado en PDF:",
        "btn_send_report": "ENTREGAR REPORTE PARA EVALUACIÓN",
        "act_blocked": "Para desbloquear las actividades, primero debes entregar tu reporte.",
        "act_completed": "¡Has completado todas las actividades de esta práctica!",
        "quiz_instruction": "Responde las siguientes preguntas de opción múltiple:",
        "btn_send_answers": "ENVIAR RESPUESTAS",
        "btn_eval_cross": "EVALUAR CRUCIGRAMA",
        "profile_title": "Mi Perfil Académico",
        "profile_save": "GUARDAR CAMBIOS",
        "tutor_global_avg": "Promedio Global (Escuela)",
        "tutor_quick_perf": "Rendimiento Rápido por Grupo",
        "btn_audit_log": "Descargar Bitácora (Auditoría)",
        
        /* Centro de Ayuda Dinámico */
        "help_title": "Centro de Ayuda y FAQ",
        "help_download_manual": "📥 Descargar Manual de Usuario",
        "help_q1": "¿Qué es EspectroEdu?",
        "help_a1": "Es una plataforma inteligente para la gestión, análisis y aprendizaje en laboratorios de óptica biomédica mediante Inteligencia Artificial.",
        "help_q2": "¿Cómo recupero mi contraseña?",
        "help_a2": "En la pantalla de inicio, haz clic en '¿Olvidaste tu contraseña?'. Ingresa tu correo y te enviaremos un enlace.",
        
        "help_al_q1": "¿Cómo entrego mi reporte?",
        "help_al_a1": "Entra a 'Mis Prácticas' y sube tu reporte en formato PDF. Importante: ¡No subas fotos de cuadernos porque la IA no podrá leerlas y sacará cero!",
        "help_al_q2": "No puedo abrir las actividades",
        "help_al_a2": "El Cuestionario y el Crucigrama están bloqueados. Se habilitarán automáticamente en cuanto entregues exitosamente tu reporte en PDF.",
        
        "help_doc_q1": "¿Cómo creo una práctica?",
        "help_doc_a1": "Ve a 'Crear Práctica', sube tus diapositivas y el estándar de evaluación en PDF. La Inteligencia Artificial generará las preguntas y la rúbrica automáticamente.",
        "help_doc_q2": "¿Cómo asigno la tarea a mis alumnos?",
        "help_doc_a2": "Ve a 'Gestionar Alumnos', selecciona a los estudiantes de la lista, elige la práctica en el menú desplegable y da clic en 'Inscribir Seleccionados'.",
        
        "help_coord_q1": "¿Qué puedo hacer en mi perfil?",
        "help_coord_a1": "Tienes permisos de auditoría (solo lectura). Puedes vigilar el rendimiento global de la escuela y analizar las estadísticas por grupos.",
        "help_coord_q2": "¿Cómo descargo las calificaciones oficiales?",
        "help_coord_a2": "En la pestaña 'Tablero Global', da clic en el botón verde 'Descargar Bitácora (Auditoría)' para obtener un reporte en Excel con horas exactas y notas."
    },
    en: {
        "a11y_title": "Accessibility Tools",
        "a11y_lang": "🌐 Language",
        "a11y_daltonism": "👁️ Colorblind Mode",
        "a11y_audio": "🔊 Audio Guide",
        "a11y_font": "Font Size",
        "a11y_highlight": "🔗 Highlight Links",
        "a11y_footer": "These settings will be saved for your next visit.",
        "app_subtitle": "Optics Laboratories",
        "app_desc": "Intelligent platform for management, analysis, and learning in biomedical optics.",
        "login_welcome": "Hello again!",
        "login_instruction": "Enter your credentials to access",
        "login_email": "Email Address",
        "login_pass": "Password",
        "login_enter": "LOGIN",
        "login_no_account": "Don't have an account?",
        "login_register": "Sign up for free",
        "login_forgot": "Forgot your password?",
        "reg_title": "Create Account",
        "reg_desc": "Fill in your details to join",
        "role_label": "I am:",
        "role_student": "Student",
        "role_doctor": "Doctor / Professor",
        "role_tutor": "Coordinator / Tutor",
        "title_label": "Title:",
        "name_label": "Full Name",
        "name_ph": "Your name",
        "id_label": "Student ID",
        "id_ph": "Your ID",
        "group_label": "Group",
        "group_ph": "E.g. 8A",
        "email_label": "Institutional Email",
        "email_ph": "example@espectro.edu",
        "pass_label": "Password",
        "pass_confirm_label": "Confirm Password",
        "pass_confirm_ph": "Repeat password",
        "btn_register": "REGISTER",
        "already_account": "Already have an account?",
        "login_link": "Log In",
        "rec_title": "Recover Access",
        "rec_desc": "Enter your email and we will send you a link to reset your password.",
        "rec_btn": "SEND LINK",
        "rec_back": "← Back to home",
        "new_pass_title": "New Password",
        "new_pass_desc": "Enter your new secure password.",
        "new_pass_btn": "SAVE PASSWORD",
        "logout": "Log Out",
        "nav_home": "Home",
        "nav_create": "Create Practice",
        "nav_manage": "Manage Students",
        "nav_grades": "View Grades",
        "nav_my_practices": "My Practices",
        "nav_activities": "Activities",
        "nav_profile": "My Profile",
        "nav_global": "Global Dashboard",
        "nav_groups": "Group Analysis",
        "nav_audit": "Practice Audit",
        "dash_welcome": "Welcome",
        "dash_hello": "Hello",
        "dash_desc": "General dashboard - Immediate view of your academic metrics.",
        "dash_student_desc": "Welcome to your learning space in EspectroEdu.",
        "dash_total_students": "Total Students",
        "dash_avg": "Overall Average",
        "dash_active_prac": "Active Practices",
        "dash_my_prac": "My Practices",
        "dash_new_prac": "+ New Practice",
        "dash_no_prac": "No practices created.",
        "student_step_1": "Download the <strong>Slides and Standard</strong> in the 'My Practices' section.",
        "student_step_2": "Upload your PDF report to receive automatic evaluation by our AI.",
        "student_step_3": "Complete the <strong>Interactive Activities</strong> to finish your evaluation.",
        "view_create_title": "Create New Practice",
        "view_manage_title": "Manage Students",
        "view_grades_title": "Grades by Practice",
        "loading": "Loading...",
        "btn_export": "Export PDF",
        "pract_title_label": "Practice Title",
        "pract_slides_label": "Slides (PDF)",
        "pract_standard_label": "Evaluation Standard (PDF)",
        "pract_drop_text": "↑ Drag and drop your file here",
        "pract_click_text": "Or click to select",
        "pract_btn_create": "CREATE PRACTICE",
        "search_student": "Search student...",
        "all_groups": "All Groups",
        "any_status": "Any Status",
        "select_all_label": "Select All",
        "choose_pract": "Choose Practice...",
        "btn_enroll": "Enroll Selected",
        "status_enrolled": "✅ Enrolled",
        "status_not_enrolled": "⏳ Not enrolled",
        "btn_delete": "Delete",
        "table_name": "Name",
        "table_id": "Student ID",
        "table_group": "Group",
        "table_report": "Report (80%)",
        "table_quiz": "Quiz (10%)",
        "table_cross": "Crossword (10%)",
        "table_final": "Final",
        "table_status": "Status",
        "table_date": "End Date",
        "grade_approved": "✅ Approved",
        "grade_pending": "⏳ Pending",
        "grade_attention": "⚠️ Needs Attention",
        "report_delivered": "Report Successfully Delivered",
        "report_ia_score": "IA Assigned Grade",
        "consult_material": "Consultation Material:",
        "btn_slides": "Slides",
        "btn_standard": "Evaluation Standard",
        "upload_report_label": "Upload your prepared PDF report:",
        "btn_send_report": "DELIVER REPORT FOR EVALUATION",
        "act_blocked": "To unlock activities, you must first deliver your report.",
        "act_completed": "You have completed all activities for this practice!",
        "quiz_instruction": "Answer the following multiple choice questions:",
        "btn_send_answers": "SUBMIT ANSWERS",
        "btn_eval_cross": "EVALUATE CROSSWORD",
        "profile_title": "My Academic Profile",
        "profile_save": "SAVE CHANGES",
        "tutor_global_avg": "Global Average (School)",
        "tutor_quick_perf": "Quick Performance by Group",
        "btn_audit_log": "Download Audit Log",
        
        /* Dynamic Help Center */
        "help_title": "Help Center & FAQ",
        "help_download_manual": "📥 Download User Manual",
        "help_q1": "What is EspectroEdu?",
        "help_a1": "It is an intelligent platform for management and learning in biomedical optics laboratories through Artificial Intelligence.",
        "help_q2": "How do I recover my password?",
        "help_a2": "On the login screen, click on 'Forgot your password?'. Enter your email and we will send you a link.",
        
        "help_al_q1": "How do I submit my report?",
        "help_al_a1": "Go to 'My Practices' and upload your report in PDF format. Important: Do not upload photos of notebooks because the AI won't be able to read them!",
        "help_al_q2": "I can't open the activities",
        "help_al_a2": "The Quiz and Crossword are locked. They will automatically unlock once you successfully deliver your PDF report.",
        
        "help_doc_q1": "How do I create a practice?",
        "help_doc_a1": "Go to 'Create Practice', upload your slides and the evaluation standard in PDF. The Artificial Intelligence will automatically generate the questions and rubric.",
        "help_doc_q2": "How do I assign the task to my students?",
        "help_doc_a2": "Go to 'Manage Students', select the students from the list, choose the practice in the dropdown menu, and click 'Enroll Selected'.",
        
        "help_coord_q1": "What can I do in my profile?",
        "help_coord_a1": "You have audit permissions (read-only). You can monitor the global performance of the school and analyze statistics by groups.",
        "help_coord_q2": "How do I download official grades?",
        "help_coord_a2": "In the 'Global Dashboard' tab, click the green button 'Download Audit Log' to get an Excel report with exact times and grades."
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if(daltonismActive) document.body.classList.add('daltonism-mode');
    if(highlightActive) document.body.classList.add('highlight-links');
    
    document.documentElement.style.fontSize = fontSize + 'px';
    document.documentElement.style.setProperty('--font-size-base', fontSize + 'px');
    
    if(audioGuideActive) document.documentElement.classList.add('audio-guide-active');
    
    const dt = document.getElementById('daltonism-toggle'); if(dt) dt.checked = daltonismActive;
    const at = document.getElementById('audio-toggle'); if(at) at.checked = audioGuideActive;
    const ht = document.getElementById('hl-toggle'); if(ht) ht.checked = highlightActive;
    const fs = document.getElementById('fs-toggle'); if(fs) fs.value = fontSize;
    const fsv = document.getElementById('fs-val'); if(fsv) fsv.innerText = fontSize + 'px';
    
    applyLanguage(currentLang);
    
    // Cerrar menú haciendo clic afuera
    document.addEventListener('click', (e) => {
        const panel = document.getElementById('a11y-panel');
        const btn = document.getElementById('a11y-btn');
        if (panel && panel.style.display === 'block') {
            if (!panel.contains(e.target) && !btn.contains(e.target)) {
                panel.style.display = 'none';
            }
        }
    });
});

function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('espectro_lang', lang);
    
    const btnEs = document.getElementById('lang-es');
    const btnEn = document.getElementById('lang-en');
    
    if(btnEs && btnEn) {
        if(lang === 'es') {
            btnEs.classList.add('active'); btnEs.classList.remove('btn-secondary');
            btnEn.classList.remove('active'); btnEn.classList.add('btn-secondary');
        } else {
            btnEn.classList.add('active'); btnEn.classList.remove('btn-secondary');
            btnEs.classList.remove('active'); btnEs.classList.add('btn-secondary');
        }
    }

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            if(el.tagName === 'INPUT') el.placeholder = translations[lang][key];
            else if (el.tagName === 'OPTION') el.textContent = translations[lang][key];
            else el.innerHTML = translations[lang][key];
        }
    });
}

window.updateTranslations = () => applyLanguage(currentLang);
function setLanguage(lang) { applyLanguage(lang); }

function toggleA11yMenu(e) {
    if(e) e.stopPropagation();
    const panel = document.getElementById('a11y-panel');
    panel.style.display = (panel.style.display === 'none' || !panel.style.display) ? 'block' : 'none';
}

function toggleDaltonism() {
    daltonismActive = !daltonismActive;
    document.body.classList.toggle('daltonism-mode', daltonismActive);
    localStorage.setItem('espectro_daltonism', daltonismActive);
}

function toggleHighlightLinks() {
    highlightActive = !highlightActive;
    document.body.classList.toggle('highlight-links', highlightActive);
    localStorage.setItem('espectro_highlight', highlightActive);
}

function changeFontSize() {
    const size = document.getElementById('fs-toggle').value;
    document.documentElement.style.fontSize = size + 'px';
    document.documentElement.style.setProperty('--font-size-base', size + 'px');
    document.getElementById('fs-val').innerText = size + 'px';
    localStorage.setItem('espectro_fontsize', size);
}

function toggleAudioGuide() {
    audioGuideActive = !audioGuideActive;
    document.documentElement.classList.toggle('audio-guide-active', audioGuideActive);
    localStorage.setItem('espectro_audio', audioGuideActive);
    if(audioGuideActive) readText(currentLang === 'es' ? "Guía auditiva activada" : "Audio guide activated", true);
    else speechSynthesis.cancel();
}

function readText(text, force = false) {
    if (!audioGuideActive && !force) return;
    speechSynthesis.cancel();
    setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = currentLang === 'es' ? 'es-MX' : 'en-US';
        utterance.rate = 0.95; 
        speechSynthesis.speak(utterance);
    }, 50);
}

document.addEventListener('mouseover', (e) => {
    if (!audioGuideActive) return;
    const target = e.target.closest('button, a, input, select, textarea, label, h1, h2, h3, h4, h5, h6, p, span, li, td, th, strong, em, b, i, details, summary, .alert-success, .alert-warning, .alert-error, .step-text, .badge');
    if (target) {
        if (target === window.lastSpokenElement) return;
        window.lastSpokenElement = target;
        target.classList.add('speaking-indicator');
        let textToSpeak = target.getAttribute('aria-label') || target.placeholder;
        if (!textToSpeak) {
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                textToSpeak = target.value;
            } else { textToSpeak = target.innerText; }
        }
        if (textToSpeak && textToSpeak.trim().length > 0) readText(textToSpeak.trim());
    }
});

document.addEventListener('mouseout', (e) => {
    if (!audioGuideActive) return;
    const target = e.target.closest('button, a, input, select, textarea, label, h1, h2, h3, h4, h5, h6, p, span, li, td, th, strong, em, b, i, details, summary, .alert-success, .alert-warning, .alert-error, .step-text, .badge');
    if (target) { target.classList.remove('speaking-indicator'); window.lastSpokenElement = null; speechSynthesis.cancel(); }
});

// FUNCIÓN DE AYUDA DINÁMICA
function updateHelpForRole(role) {
    const container = document.getElementById('help-dynamic-content');
    if (!container) return;

    let htmlContent = '';

    if (role === 'alumno') {
        htmlContent = `
            <div class="help-item">
                <h4 data-i18n="help_al_q1"></h4>
                <p data-i18n="help_al_a1"></p>
            </div>
            <div class="help-item">
                <h4 data-i18n="help_al_q2"></h4>
                <p data-i18n="help_al_a2"></p>
            </div>
        `;
    } else if (role === 'doctor' || role === 'docente') {
        htmlContent = `
            <div class="help-item">
                <h4 data-i18n="help_doc_q1"></h4>
                <p data-i18n="help_doc_a1"></p>
            </div>
            <div class="help-item">
                <h4 data-i18n="help_doc_q2"></h4>
                <p data-i18n="help_doc_a2"></p>
            </div>
        `;
    } else if (role === 'coordinador' || role === 'tutor') {
        htmlContent = `
            <div class="help-item">
                <h4 data-i18n="help_coord_q1"></h4>
                <p data-i18n="help_coord_a1"></p>
            </div>
            <div class="help-item">
                <h4 data-i18n="help_coord_q2"></h4>
                <p data-i18n="help_coord_a2"></p>
            </div>
        `;
    } else {
        htmlContent = `
            <div class="help-item">
                <h4 data-i18n="help_q1"></h4>
                <p data-i18n="help_a1"></p>
            </div>
            <div class="help-item">
                <h4 data-i18n="help_q2"></h4>
                <p data-i18n="help_a2"></p>
            </div>
        `;
    }

    container.innerHTML = htmlContent;
    applyLanguage(currentLang); 
}

function openHelp() { document.getElementById('helpModal').style.display = 'flex'; }
function closeHelp() { document.getElementById('helpModal').style.display = 'none'; }

document.addEventListener('click', (e) => {
    const modalOverlay = document.getElementById('helpModal');
    if (e.target === modalOverlay) closeHelp();
});

window.openHelp = openHelp;
window.closeHelp = closeHelp;
window.updateHelpForRole = updateHelpForRole;
