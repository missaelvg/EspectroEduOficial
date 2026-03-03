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
        "a11y_font": "T Tamaño de Fuente",
        "a11y_highlight": "🔗 Resaltar Enlaces",
        "a11y_footer": "Estos ajustes se guardarán para tu próxima visita.",
        "login_welcome": "¡Hola de nuevo!",
        "login_instruction": "Ingresa tus credenciales para acceder",
        "login_email": "Correo Electrónico",
        "login_pass": "Contraseña",
        "login_enter": "ENTRAR",
        "login_no_account": "¿No tienes cuenta?",
        "login_register": "Regístrate gratis",
        "login_forgot": "¿Olvidaste tu contraseña?",
        "logout": "Cerrar Sesión"
    },
    en: {
        "a11y_title": "Accessibility Tools",
        "a11y_lang": "🌐 Language",
        "a11y_daltonism": "👁️ Colorblind Mode",
        "a11y_audio": "🔊 Audio Guide",
        "a11y_font": "T Font Size",
        "a11y_highlight": "🔗 Highlight Links",
        "a11y_footer": "These settings will be saved for your next visit.",
        "login_welcome": "Hello again!",
        "login_instruction": "Enter your credentials to access",
        "login_email": "Email Address",
        "login_pass": "Password",
        "login_enter": "LOGIN",
        "login_no_account": "Don't have an account?",
        "login_register": "Sign up for free",
        "login_forgot": "Forgot your password?",
        "logout": "Log Out"
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Cargar ajustes guardados
    if(daltonismActive) document.body.classList.add('daltonism-mode');
    if(highlightActive) document.body.classList.add('highlight-links');
    document.documentElement.style.setProperty('--font-size-base', fontSize + 'px');
    if(audioGuideActive) document.documentElement.classList.add('audio-guide-active');
    
    // Actualizar los interruptores en la UI
    const dt = document.getElementById('daltonism-toggle'); if(dt) dt.checked = daltonismActive;
    const at = document.getElementById('audio-toggle'); if(at) at.checked = audioGuideActive;
    const ht = document.getElementById('hl-toggle'); if(ht) ht.checked = highlightActive;
    const fs = document.getElementById('fs-toggle'); if(fs) fs.value = fontSize;
    const fsv = document.getElementById('fs-val'); if(fsv) fsv.innerText = fontSize + 'px';
    
    applyLanguage(currentLang);
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
            else el.innerText = translations[lang][key];
        }
    });
}

function setLanguage(lang) { applyLanguage(lang); }

function toggleA11yMenu() {
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
    document.documentElement.style.setProperty('--font-size-base', size + 'px');
    document.getElementById('fs-val').innerText = size + 'px';
    localStorage.setItem('espectro_fontsize', size);
}

// LÓGICA DE GUÍA AUDITIVA (WEB SPEECH API)
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
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = currentLang === 'es' ? 'es-MX' : 'en-US';
    speechSynthesis.speak(utterance);
}

document.addEventListener('mouseover', (e) => {
    if (!audioGuideActive) return;
    const target = e.target.closest('button, a, input, select, label, h1, h2, h3, h4, p');
    if (target) {
        target.classList.add('speaking-indicator');
        const textToSpeak = target.getAttribute('aria-label') || target.innerText || target.placeholder || target.value;
        if (textToSpeak) readText(textToSpeak);
    }
});

document.addEventListener('mouseout', (e) => {
    if (!audioGuideActive) return;
    const target = e.target.closest('button, a, input, select, label, h1, h2, h3, h4, p');
    if (target) {
        target.classList.remove('speaking-indicator');
        speechSynthesis.cancel();
    }
});
