// EspectroEdu/netlify/functions/evaluate.js

// La clave API no está visible en el frontend. Netlify la inyectará aquí desde
// una variable de entorno segura.
const HF_TOKEN = process.env.HUGGING_FACE_TOKEN; 

const API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2"; 

exports.handler = async (event) => {
    
    // VERIFICACIÓN DE SEGURIDAD CRÍTICA 🚨
    // Si la variable de entorno no se cargó correctamente, devuelve un error específico.
    if (!HF_TOKEN || HF_TOKEN.length < 5) {
        return { 
            statusCode: 500, 
            body: JSON.stringify({ 
                calificacion: 1,
                justificacion: "ERROR: El token de Hugging Face no está configurado correctamente en las Variables de Entorno de Netlify. Por favor, revísalo." 
            }) 
        };
    }
    
    // Solo aceptamos solicitudes POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Método no permitido' };
    }

    try {
        // Obtenemos los datos enviados desde el frontend (texto y estándar)
        const { reporteTexto, estandar } = JSON.parse(event.body);

        if (!reporteTexto || !estandar) {
            return { statusCode: 400, body: JSON.stringify({ error: "Faltan datos de reporte o estándar." }) };
        }

        // 1. DEFINIR EL PROMPT DE RAZONAMIENTO
        const promptIA = `
            Eres un experto evaluador de reportes técnicos. Tu tarea es calificar el siguiente reporte comparándolo estrictamente con el estándar de cumplimiento.
            
            ESTÁNDAR DE CUMPLIMIENTO:
            ---
            ${estandar}
            ---
            
            REPORTE A EVALUAR:
            ---
            ${reporteTexto}
            ---
            
            Genera SOLO un objeto JSON. Si el reporte es muy corto o el texto extraído es ilegible, asigna calificación 1.
            El JSON debe contener dos claves:
            1. "calificacion": Un número entero del 1 al 10.
            2. "justificacion": Una explicación detallada de por qué se asignó esa calificación.
            
            JSON:
        `;

        // 2. LLAMADA A LA API DE HUGGING FACE (Segura desde el backend)
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${HF_TOKEN}`, 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({
                inputs: promptIA,
                parameters: {
                    max_new_tokens: 400,
                    return_full_text: false, 
                    temperature: 0.1
                }
            })
        });

        if (!response.ok) {
            // Manejo de errores de la API (ej. 401 Unauthorized, 503 Service Unavailable)
            const errorData = await response.json().catch(() => ({error: 'Error desconocido de la IA externa.'}));
            console.error("Error de HF:", response.status, errorData);
            
            const userErrorMsg = errorData.error ? `Error externo de la IA: ${errorData.error}` : "Fallo la IA externa. Verifica la consola para más detalles.";
            
            // Devolver un JSON parseable al frontend
            return { 
                statusCode: 502, 
                body: JSON.stringify({ 
                    calificacion: 1, 
                    justificacion: `La comunicación con la IA falló. Esto puede ser por saturación del servicio gratuito o clave inválida. ${userErrorMsg}` 
                }) 
            };
        }

        const data = await response.json();
        let rawResponseText = data[0].generated_text.trim();
        
        // Limpiamos y parseamos el JSON que devuelve la IA
        const jsonMatch = rawResponseText.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
            return { 
                statusCode: 500, 
                body: JSON.stringify({ 
                    calificacion: 1, 
                    justificacion: "La IA no devolvió un JSON válido. Error de formato inesperado." 
                }) 
            };
        }

        const resultadoIA = JSON.parse(jsonMatch[0]);

        // 3. Devolvemos el resultado al frontend
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(resultadoIA),
        };

    } catch (error) {
        console.error("Fallo general de la función:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Error interno del servidor al procesar la solicitud." }) };
    }
};