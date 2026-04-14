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
        
        /* Centro de Ayuda Dinámico (5 preguntas por Rol) */
        "help_title": "Centro de Ayuda y FAQ",
        "help_download_manual": "📥 Descargar Manual de Usuario",
        
        // General / Visitante
        "help_q1": "¿Qué es EspectroEdu?",
        "help_a1": "Es una plataforma inteligente para la gestión, análisis y aprendizaje en laboratorios de óptica biomédica mediante Inteligencia Artificial.",
        "help_q2": "¿Cómo recupero mi contraseña?",
        "help_a2": "En la pantalla de inicio, haz clic en '¿Olvidaste tu contraseña?'. Ingresa tu correo y te enviaremos un enlace.",
        
        // Alumnos (5)
        "help_al_q1": "¿Cómo entrego mi reporte?",
        "help_al_a1": "Entra a 'Mis Prácticas' y sube tu reporte en formato PDF. Importante: ¡No subas fotos de cuadernos porque la IA no podrá leerlas y sacará cero!",
        "help_al_q2": "¿Por qué no puedo abrir las actividades?",
        "help_al_a2": "El Cuestionario y el Crucigrama están bloqueados. Se habilitarán automáticamente en cuanto entregues exitosamente tu reporte en PDF.",
        "help_al_q3": "¿Cómo sé si aprobé la práctica?",
        "help_al_a3": "Ve a la pestaña 'Ver Calificaciones'. Si tu calificación final es 7 o mayor, aparecerá la etiqueta verde de 'Aprobado'.",
        "help_al_q4": "¿Cómo lleno rápido el crucigrama?",
        "help_al_a4": "Puedes usar las flechas de tu teclado para moverte entre cuadritos. Al darle a Evaluar, las letras correctas se pintarán de verde.",
        "help_al_q5": "¿Puedo cambiar mis datos o grupo?",
        "help_al_a5": "Sí. Ve a 'Mi Perfil' para cambiar tu nombre, grupo o correo. (Nota: Tu Matrícula está bloqueada por motivos de seguridad escolar).",
        
        // Docentes (5)
        "help_doc_q1": "¿Cómo creo una práctica?",
        "help_doc_a1": "Ve a 'Crear Práctica', sube tus diapositivas y el estándar de evaluación en PDF. La Inteligencia Artificial generará todo automáticamente.",
        "help_doc_q2": "¿Cómo asigno la tarea a mis alumnos?",
        "help_doc_a2": "Ve a 'Gestionar Alumnos', selecciona a los estudiantes de la lista, elige la práctica en el menú desplegable y da clic en 'Inscribir Seleccionados'.",
        "help_doc_q3": "¿Tengo que calificar los reportes?",
        "help_doc_a3": "¡No! La Inteligencia Artificial lee los reportes PDF de los alumnos y los califica comparándolos con el 'Estándar de Evaluación' que tú subiste.",
        "help_doc_q4": "¿Qué pasa si le doy clic a 'Borrar' práctica?",
        "help_doc_a4": "Cuidado: Eliminarás la práctica por completo y también borrarás TODAS las calificaciones de los alumnos que ya la habían entregado.",
        "help_doc_q5": "¿Cómo imprimo o guardo mis calificaciones?",
        "help_doc_a5": "Ve a la pestaña 'Ver Calificaciones' y haz clic en el botón gris 'Exportar PDF' que está en la esquina superior derecha.",
        
        // Coordinadores (5)
        "help_coord_q1": "¿Qué puedo hacer en mi perfil?",
        "help_coord_a1": "Tienes permisos de Auditoría (solo lectura). Puedes vigilar el rendimiento global de la escuela y analizar estadísticas por grupos.",
        "help_coord_q2": "¿Cómo descargo las calificaciones oficiales?",
        "help_coord_a2": "En la pestaña 'Tablero Global', da clic en el botón verde 'Descargar Bitácora (Auditoría)' para obtener un reporte Excel con horas exactas y notas.",
        "help_coord_q3": "¿Puedo modificar calificaciones o borrar alumnos?",
        "help_coord_a3": "No. Tu perfil está diseñado estrictamente para observación y auditoría, garantizando que no se alteren los registros de los docentes.",
        "help_coord_q4": "¿Cómo veo a los alumnos de un grupo específico?",
        "help_coord_a4": "Ve a la pestaña 'Análisis por Grupos' y haz clic en el texto azul 'Ver lista de alumnos' debajo de la tarjeta del grupo correspondiente.",
        "help_coord_q5": "¿Qué indica la barra en 'Auditoría de Prácticas'?",
        "help_coord_a5": "Muestra la Tasa de Éxito de la tarea. Compara cuántos alumnos fueron inscritos contra cuántos realmente completaron la práctica."
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
        
        // General
        "help_q1": "What is EspectroEdu?",
        "help_a1": "It is an intelligent platform for management and learning in biomedical optics laboratories through Artificial Intelligence.",
        "help_q2": "How do I recover my password?",
        "help_a2": "On the login screen, click on 'Forgot your password?'. Enter your email and we will send you a link.",
        
        // Students (5)
        "help_al_q1": "How do I submit my report?",
        "help_al_a1": "Go to 'My Practices' and upload your report in PDF format. Important: Do not upload photos of notebooks!",
        "help_al_q2": "I can't open the activities",
        "help_al_a2": "The Quiz and Crossword are locked. They will automatically unlock once you successfully deliver your PDF report.",
        "help_al_q3": "How do I know if I passed?",
        "help_al_a3": "Go to the 'View Grades' tab. If your final score is 7 or higher, you'll see a green 'Approved' badge.",
        "help_al_q4": "How does the crossword work?",
        "help_al_a4": "Click a box and use your keyboard arrows to move. When evaluated, correct letters turn green and incorrect ones turn red.",
        "help_al_q5": "Can I change my personal data?",
        "help_al_a5": "Yes. Go to 'My Profile' to change your name, group, or email. (Note: Your Student ID cannot be changed for security reasons).",
        
        // Teachers (5)
        "help_doc_q1": "How do I create a practice?",
        "help_doc_a1": "Go to 'Create Practice', upload your slides and the evaluation standard in PDF. The AI will generate everything automatically.",
        "help_doc_q2": "How do I assign tasks to students?",
        "help_doc_a2": "Go to 'Manage Students', select the students, choose the practice in the dropdown, and click 'Enroll Selected'.",
        "help_doc_q3": "Do I have to grade the reports?",
        "help_doc_a3": "No! The Artificial Intelligence reads the students' PDF reports and grades them based on the standard you uploaded.",
        "help_doc_q4": "What happens if I click 'Delete' practice?",
        "help_doc_a4": "Warning: It will delete the practice entirely and also delete ALL the grades of students who had already submitted it.",
        "help_doc_q5": "How do I save my grades?",
        "help_doc_a5": "Go to the 'View Grades' tab and click the gray 'Export PDF' button in the top right corner.",
        
        // Coordinators (5)
        "help_coord_q1": "What can I do in my profile?",
        "help_coord_a1": "You have Audit permissions (read-only). You can monitor global performance and analyze statistics by groups.",
        "help_coord_q2": "How do I download official grades?",
        "help_coord_a2": "In the 'Global Dashboard' tab, click the green 'Download Audit Log' button to get an Excel report with exact times and grades.",
        "help_coord_q3": "Can I modify grades or delete students?",
        "help_coord_a3": "No. Your profile is strictly designed for observation to guarantee that teachers' records are not altered.",
        "help_coord_q4": "How do I view students in a specific group?",
        "help_coord_a4": "Go to the 'Group Analysis' tab and click the blue 'View student list' text under the corresponding group's card.",
        "help_coord_q5": "What does the bar in 'Practice Audit' mean?",
        "help_coord_a5": "It shows the Task Success Rate. It compares how many students were enrolled vs how many actually completed the practice."
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

    document.querySelectorAll('[data-student-count]').forEach(el => {
        const count = Number(el.getAttribute('data-student-count')) || 0;
        el.textContent = formatStudentCountLabel(count, lang);
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

function formatStudentCountLabel(count, lang = currentLang) {
    if (lang === 'en') return `${count} student${count === 1 ? '' : 's'}`;
    return `${count} alumno${count === 1 ? '' : 's'}`;
}

function detectSpeechLang(text) {
    if (!text) return currentLang === 'en' ? 'en-US' : 'es-MX';
    const englishHints = /\b(the|and|status|practice|student|group|quiz|crossword|home|start|active|pending)\b/i;
    const spanishChars = /[áéíóúñ¿¡]/i;
    if (spanishChars.test(text)) return 'es-MX';
    if (englishHints.test(text)) return 'en-US';
    return currentLang === 'en' ? 'en-US' : 'es-MX';
}

function getBestVoiceForLang(langCode) {
    const voices = speechSynthesis.getVoices() || [];
    if (!voices.length) return null;
    const lang = langCode.toLowerCase();
    return (
        voices.find(v => v.lang && v.lang.toLowerCase() === lang) ||
        voices.find(v => v.lang && v.lang.toLowerCase().startsWith(lang.split('-')[0])) ||
        null
    );
}

function getReadableText(target) {
    if (!target) return '';
    if (target.getAttribute('aria-label')) return target.getAttribute('aria-label').trim();
    if (target.placeholder) return target.placeholder.trim();

    if (target.tagName === 'SELECT') {
        const selectedOption = target.options[target.selectedIndex];
        return selectedOption ? selectedOption.textContent.trim() : '';
    }
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return (target.value || '').trim();
    }

    const ownText = Array.from(target.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent.trim())
        .join(' ')
        .trim();
    if (ownText) return ownText;
    return (target.textContent || '').trim().replace(/\s+/g, ' ');
}

function getSelectLabel(selectEl) {
    if (!selectEl || !selectEl.id) return '';
    const label = document.querySelector(`label[for="${selectEl.id}"]`);
    return label ? label.textContent.trim() : '';
}

function getSelectAnnouncement(selectEl, includeAllOptions = false) {
    if (!selectEl) return '';
    const selectedOption = selectEl.options[selectEl.selectedIndex];
    const selectedText = selectedOption ? selectedOption.textContent.trim() : '';
    const labelText = getSelectLabel(selectEl);

    if (!includeAllOptions) {
        return labelText ? `${labelText}: ${selectedText}` : selectedText;
    }

    const allOptions = Array.from(selectEl.options)
        .map(option => option.textContent.trim())
        .filter(Boolean)
        .join(', ');

    if (!allOptions) return labelText ? `${labelText}: ${selectedText}` : selectedText;
    if (labelText) return `${labelText}. ${currentLang === 'en' ? 'Available options' : 'Opciones disponibles'}: ${allOptions}`;
    return `${currentLang === 'en' ? 'Available options' : 'Opciones disponibles'}: ${allOptions}`;
}

function readText(text, force = false) {
    if (!audioGuideActive && !force) return;
    speechSynthesis.cancel();
    setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        const langCode = detectSpeechLang(text);
        utterance.lang = langCode;
        const bestVoice = getBestVoiceForLang(langCode);
        if (bestVoice) utterance.voice = bestVoice;
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
        const textToSpeak = getReadableText(target);
        if (textToSpeak && textToSpeak.trim().length > 0) readText(textToSpeak.trim());
    }
});

document.addEventListener('mouseout', (e) => {
    if (!audioGuideActive) return;
    const target = e.target.closest('button, a, input, select, textarea, label, h1, h2, h3, h4, h5, h6, p, span, li, td, th, strong, em, b, i, details, summary, .alert-success, .alert-warning, .alert-error, .step-text, .badge');
    if (target) { target.classList.remove('speaking-indicator'); window.lastSpokenElement = null; speechSynthesis.cancel(); }
});

document.addEventListener('focusin', (e) => {
    if (!audioGuideActive) return;
    const target = e.target;
    if (target && target.tagName === 'SELECT') {
        const textToSpeak = getSelectAnnouncement(target, false);
        if (textToSpeak) readText(textToSpeak);
    }
});

document.addEventListener('change', (e) => {
    if (!audioGuideActive) return;
    const target = e.target;
    if (target && target.tagName === 'SELECT') {
        const textToSpeak = getSelectAnnouncement(target, false);
        if (textToSpeak) readText(textToSpeak);
    }
});

document.addEventListener('mousedown', (e) => {
    if (!audioGuideActive) return;
    const target = e.target.closest('select');
    if (target) {
        const textToSpeak = getSelectAnnouncement(target, true);
        if (textToSpeak) readText(textToSpeak);
    }
});

// FUNCIÓN DE AYUDA DINÁMICA CON 5 PREGUNTAS POR ROL (ACORDEÓN)
function updateHelpForRole(role) {
    const container = document.getElementById('help-dynamic-content');
    if (!container) return;

    let htmlContent = '';

    if (role === 'alumno') {
        htmlContent = `
            <details class="help-accordion">
                <summary data-i18n="help_al_q1"></summary>
                <p data-i18n="help_al_a1"></p>
            </details>
            <details class="help-accordion">
                <summary data-i18n="help_al_q2"></summary>
                <p data-i18n="help_al_a2"></p>
            </details>
            <details class="help-accordion">
                <summary data-i18n="help_al_q3"></summary>
                <p data-i18n="help_al_a3"></p>
            </details>
            <details class="help-accordion">
                <summary data-i18n="help_al_q4"></summary>
                <p data-i18n="help_al_a4"></p>
            </details>
            <details class="help-accordion">
                <summary data-i18n="help_al_q5"></summary>
                <p data-i18n="help_al_a5"></p>
            </details>
        `;
    } else if (role === 'doctor' || role === 'docente') {
        htmlContent = `
            <details class="help-accordion">
                <summary data-i18n="help_doc_q1"></summary>
                <p data-i18n="help_doc_a1"></p>
            </details>
            <details class="help-accordion">
                <summary data-i18n="help_doc_q2"></summary>
                <p data-i18n="help_doc_a2"></p>
            </details>
            <details class="help-accordion">
                <summary data-i18n="help_doc_q3"></summary>
                <p data-i18n="help_doc_a3"></p>
            </details>
            <details class="help-accordion">
                <summary data-i18n="help_doc_q4"></summary>
                <p data-i18n="help_doc_a4"></p>
            </details>
            <details class="help-accordion">
                <summary data-i18n="help_doc_q5"></summary>
                <p data-i18n="help_doc_a5"></p>
            </details>
        `;
    } else if (role === 'coordinador' || role === 'tutor') {
        htmlContent = `
            <details class="help-accordion">
                <summary data-i18n="help_coord_q1"></summary>
                <p data-i18n="help_coord_a1"></p>
            </details>
            <details class="help-accordion">
                <summary data-i18n="help_coord_q2"></summary>
                <p data-i18n="help_coord_a2"></p>
            </details>
            <details class="help-accordion">
                <summary data-i18n="help_coord_q3"></summary>
                <p data-i18n="help_coord_a3"></p>
            </details>
            <details class="help-accordion">
                <summary data-i18n="help_coord_q4"></summary>
                <p data-i18n="help_coord_a4"></p>
            </details>
            <details class="help-accordion">
                <summary data-i18n="help_coord_q5"></summary>
                <p data-i18n="help_coord_a5"></p>
            </details>
        `;
    } else {
        htmlContent = `
            <details class="help-accordion">
                <summary data-i18n="help_q1"></summary>
                <p data-i18n="help_a1"></p>
            </details>
            <details class="help-accordion">
                <summary data-i18n="help_q2"></summary>
                <p data-i18n="help_a2"></p>
            </details>
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
