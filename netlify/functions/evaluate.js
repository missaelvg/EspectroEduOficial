// EspectroEdu/netlify/functions/evaluate.js

// La clave ya no se llama HUGGING_FACE_TOKEN.
// Asegúrate de que la nueva variable en Netlify se llame GEMINI_API_KEY.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 

// Endpoint del modelo Gemini 2.5 Flash
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

exports.handler = async (event) => {
    
    // VERIFICACIÓN DE SEGURIDAD PARA GEMINI
    if (!GEMINI_API_KEY || GEMINI_API_KEY.length < 10) {
        return { 
            statusCode: 500, 
            body: JSON.stringify({ 
                calificacion: 1,
                justificacion: "ERROR: La clave GEMINI_API_KEY no está configurada correctamente en las Variables de Entorno de Netlify." 
            }) 
        };
    }
    
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Método no permitido' };
    }

    try {
        const { reporteTexto, estandar } = JSON.parse(event.body);

        // 1. DEFINIR EL PROMPT (igual que antes, pero más directo para Gemini)
        const promptIA = `
            Eres un experto evaluador de reportes técnicos. Tu tarea es calificar el siguiente reporte comparándolo estrictamente con el estándar de cumplimiento. Tu respuesta DEBE SER SOLAMENTE un objeto JSON.
            
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
                config: {
                    temperature: 0.1, 
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("Error de Gemini:", response.status, errorData);
            return { 
                statusCode: 502, 
                body: JSON.stringify({ 
                    calificacion: 1, 
                    justificacion: `Fallo la IA de Gemini (Código ${response.status}). Revisa la consola para más detalles.` 
                }) 
            };
        }

        const data = await response.json();
        let rawResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        
        // Limpiamos y parseamos el JSON que devuelve la IA
        const jsonMatch = rawResponseText.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
            return { statusCode: 500, body: JSON.stringify({ calificacion: 1, justificacion: "La IA devolvió un formato incorrecto o ilegible." }) };
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
        return { statusCode: 500, body: JSON.stringify({ error: "Error interno del servidor." }) };
    }
};