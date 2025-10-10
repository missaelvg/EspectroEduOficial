// scripts/utils.js

// URL de la función Netlify para calificar reportes
const EVALUATE_FUNCTION_URL = "/.netlify/functions/evaluate"; 
// URL de la función Netlify para generar contenido
const GENERATE_CONTENT_FUNCTION_URL = "/.netlify/functions/generate_content"; 


// 1. Función para extraer texto de PDF (requiere pdf.js en el HTML)
async function extractTextFromPDF(file) {
    if (!window.pdfjsLib) throw new Error("pdf.js library not loaded.");
    
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
            } catch (e) {
                reject(e);
            }
        };
        fileReader.onerror = reject;
        fileReader.readAsArrayBuffer(file);
    });
    return texto;
}

// 2. Función para extraer datos de un string de texto
function extractStudentData(texto) {
    let nombre = "No Encontrado";
    let matricula = "No Encontrada";
    
    // Extracción de Matrícula (patrones comunes: A########, 7-10 dígitos)
    const matriculaMatch = texto.match(/([Aa]\d{7,10})|(\d{7,10})/);
    if (matriculaMatch) {
        matricula = matriculaMatch[0];
    }

    // Extracción de Nombre (Busca etiquetas comunes)
    const nombreMatch = texto.match(/(Nombre|Alumno|Autor|Estudiante)\s*[:]\s*([A-Za-z\s]{5,})/i);
    if (nombreMatch && nombreMatch[2].trim().length > 3) {
        nombre = nombreMatch[2].trim().split(/\s{2,}|\n/)[0].substring(0, 50);
    }
    
    return { nombre, matricula };
}

// 3. Función para llamar a la IA de Calificación
async function callAIEvaluate(reporteTexto, estandar) {
    const response = await fetch(EVALUATE_FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporteTexto, estandar })
    });
    if (!response.ok) {
        throw new Error(`Error en el servidor: ${response.status}`);
    }
    const result = await response.json();
    return result;
}

// 4. Función para llamar a la IA de Generación de Contenido
async function callAIGenerate(slidesTexto, practicaId) {
    const response = await fetch(GENERATE_CONTENT_FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slidesTexto, practicaId })
    });
    if (!response.ok) {
        throw new Error(`Error en la generación de IA: ${response.status}`);
    }
    const result = await response.json();
    return result;
}