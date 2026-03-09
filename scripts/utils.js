// scripts/utils.js
// REESCRITO PARA LLAMAR A GEMINI DIRECTAMENTE DESDE EL FRONTEND

// ⚠️ IMPORTANTE: PEGA AQUÍ TU API KEY DE GEMINI ⚠️
const GEMINI_API_KEY = "AIzaSyCfPNkDv3LwpsGcKKkmo8LtEiSuq89b3Fw"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// 1. Extrae texto crudo de un archivo PDF usando la librería pdf.js
async function extractTextFromPDF(file) {
    if (!window.pdfjsLib) throw new Error("La librería pdf.js no se ha cargado.");
    
    const fileReader = new FileReader();
    const texto = await new Promise((resolve, reject) => {
        fileReader.onload = async function() {
            try {
                const typedarray = new Uint8Array(this.result);
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                let textoAcumulado = "";
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    textoAcumulado += content.items.map(item => item.str).join(" ") + "\n";
                }
                resolve(textoAcumulado.replace(/\s+/g, ' ').trim()); 
            } catch (e) { reject(e); }
        };
        fileReader.onerror = reject;
        fileReader.readAsArrayBuffer(file);
    });
    return texto;
}

function extractStudentData(texto) {
    let nombre = "No Encontrado";
    let matricula = "No Encontrada";
    const matriculaMatch = texto.match(/([Aa]\d{7,10})|(\d{7,10})/);
    if (matriculaMatch) matricula = matriculaMatch[0];
    const nombreMatch = texto.match(/(Nombre|Alumno|Autor|Estudiante)\s*[:]\s*([A-Za-z\s]{5,})/i);
    if (nombreMatch && nombreMatch[2].trim().length > 3) nombre = nombreMatch[2].trim().split(/\s{2,}|\n/)[0].substring(0, 50);
    return { nombre, matricula };
}

// 3. Evalúa directamente desde el navegador
async function callAIEvaluate(reporteTexto, estandar) {
    const promptIA = `
        Evalúa este reporte contra el estándar.
        No busques gráficos, imágenes, ilustraciones o figuras 
        Respuesta JSON: { "calificacion": (1-10), "justificacion": "texto..." }
        ESTÁNDAR: ${estandar}
        REPORTE: ${reporteTexto}
    `;

    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: promptIA }] }],
            generationConfig: { temperature: 0.1 } 
        })
    });

    if (!response.ok) throw new Error(`Error en evaluación IA: ${response.status}`);
    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Error formato IA");
    return JSON.parse(jsonMatch[0]);
}

// 4. Genera cuestionarios y crucigramas desde el navegador
async function callAIGenerate(slidesTexto, practicaId) {
    const promptIA = `
        Actúa como un profesor experto. Analiza el siguiente texto y genera:
        1. Un BANCO DE 20 PREGUNTAS de opción múltiple (3 opciones).
        2. Un BANCO DE 15 PALABRAS para crucigrama.

        Formato JSON ESTRICTO:
        {
          "cuestionario": [
            { "pregunta": "¿...?", "opciones": ["A", "B", "C"], "correcta": "A" }
          ],
          "crucigrama": [
            { "word": "PALABRA", "clue": "Pista..." }
          ]
        }

        Texto:
        ---
        ${slidesTexto ? slidesTexto.substring(0, 15000) : ''} 
        ---
    `;

    const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: promptIA }] }],
            generationConfig: { temperature: 0.7 }
        })
    });

    if (!response.ok) throw new Error(`Error en la generación de IA: ${response.status}`);
    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Error formato IA");
    return JSON.parse(jsonMatch[0]);
}
