// EspectroEdu/netlify/functions/evaluate.js

const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

exports.handler = async (event) => {
    
    // VERIFICACIÓN DE SEGURIDAD CRÍTICA
    if (!GEMINI_API_KEY || GEMINI_API_KEY.length < 10) {
        return { 
            statusCode: 500, 
            body: JSON.stringify({ 
                calificacion: 1,
                justificacion: "ERROR DEL SERVIDOR: La clave GEMINI_API_KEY no está configurada." 
            }) 
        };
    }
    
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Método no permitido' };
    }

    try {
        const { reporteTexto, estandar } = JSON.parse(event.body);

        // 1. DEFINIR EL PROMPT DE RAZONAMIENTO
        const promptIA = `
            Eres un experto evaluador de reportes técnicos. Tu tarea es calificar el siguiente reporte comparándolo estrictamente con el estándar de cumplimiento. Tu respuesta DEBE SER SOLAMENTE un objeto JSON y debe contener EXACTAMENTE las claves "calificacion" (un número entero del 1 al 10) y "justificacion".
            
            ESTÁNDAR DE CUMPLIMIENTO: ${estandar}
            
            REPORTE A EVALUAR: ${reporteTexto}
            
            JSON:
        `;

        // 2. LLAMADA A LA API DE GEMINI
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: promptIA }] }],
                generationConfig: { 
                    temperature: 0.1, 
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const userErrorMsg = errorData.error ? `Error externo de la IA: ${errorData.error.message}` : "Error desconocido.";
            
            return { 
                statusCode: 502, 
                body: JSON.stringify({ 
                    calificacion: 1, 
                    justificacion: `La IA falló (Código ${response.status}). Esto puede ser por saturación o clave inválida. ${userErrorMsg}` 
                }) 
            };
        }

        const data = await response.json();
        let rawResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        
        // Limpiamos y parseamos el JSON que devuelve la IA
        const jsonMatch = rawResponseText.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
            return { 
                statusCode: 500, 
                body: JSON.stringify({ 
                    calificacion: 1, 
                    justificacion: "La IA no devolvió un JSON. Error de formato inesperado." 
                }) 
            };
        }

        const resultadoIA = JSON.parse(jsonMatch[0]);

        // 3. VALIDACIÓN DE CLAVE ESTRICTA (Si falta alguna clave, devolvemos error estructurado)
        if (typeof resultadoIA.calificacion === 'undefined' || typeof resultadoIA.justificacion === 'undefined') {
             return { 
                statusCode: 500, 
                body: JSON.stringify({ 
                    calificacion: 1, 
                    justificacion: `El JSON se pudo leer, pero la IA no incluyó las claves "calificacion" o "justificacion".`
                }) 
            };
        }
        
        // 4. ⭐ SANITIZACIÓN FINAL DEL VALOR DE CALIFICACIÓN ⭐
        const calificacionNum = parseInt(resultadoIA.calificacion, 10);
        let justificacionFinal = resultadoIA.justificacion;

        if (isNaN(calificacionNum) || calificacionNum < 1 || calificacionNum > 10) {
            // Si la calificación es 'CUMPLE', 'SI', 'OK' o cualquier otra palabra...
            justificacionFinal = `[FALLO DE FORMATO DE LA IA: La calificación devuelta fue '${resultadoIA.calificacion}']. ${justificacionFinal}`;
            resultadoIA.calificacion = 1; // Asignamos una calificación de error para que el cliente no falle.
        } else {
            resultadoIA.calificacion = calificacionNum; // Usamos el número parseado
        }

        // 5. Devolvemos el resultado al frontend (Solo si pasa la validación)
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(resultadoIA),
        };

    } catch (error) {
        console.error("Fallo general de la función:", error);
        return { statusCode: 500, body: JSON.stringify({ calificacion: 1, justificacion: "Error interno desconocido del servidor." }) };
    }
};