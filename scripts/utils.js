// scripts/utils.js
// Funciones auxiliares para procesamiento de archivos y comunicación HTTP.

// URLs relativas para funciones Serverless (Vercel)
const EVALUATE_FUNCTION_URL = "/api/evaluate"; 
const GENERATE_CONTENT_FUNCTION_URL = "/api/generate_content"; 

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
                // Recorre todas las páginas para unir el texto
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

// 2. Intenta extraer nombre y matrícula del texto (opcional, uso auxiliar)
function extractStudentData(texto) {
    let nombre = "No Encontrado";
    let matricula = "No Encontrada";
    
    // Busca patrones de matrícula (A000000 o numéricos)
    const matriculaMatch = texto.match(/([Aa]\d{7,10})|(\d{7,10})/);
    if (matriculaMatch) {
        matricula = matriculaMatch[0];
    }

    // Busca etiquetas de nombre
    const nombreMatch = texto.match(/(Nombre|Alumno|Autor|Estudiante)\s*[:]\s*([A-Za-z\s]{5,})/i);
    if (nombreMatch && nombreMatch[2].trim().length > 3) {
        nombre = nombreMatch[2].trim().split(/\s{2,}|\n/)[0].substring(0, 50);
    }
    
    return { nombre, matricula };
}

// 3. Wrapper para llamar al endpoint de evaluación de IA
async function callAIEvaluate(reporteTexto, estandar) {
    const response = await fetch(EVALUATE_FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporteTexto, estandar })
    });
    if (!response.ok) {
        throw new Error(`Error en el servidor de evaluación: ${response.status}`);
    }
    return await response.json();
}

// 4. Wrapper para llamar al endpoint de generación de contenido
async function callAIGenerate(slidesTexto, practicaId) {
    const response = await fetch(GENERATE_CONTENT_FUNCTION_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slidesTexto, practicaId })
    });
    if (!response.ok) {
        throw new Error(`Error en la generación de IA: ${response.status}`);
    }
    return await response.json();
}