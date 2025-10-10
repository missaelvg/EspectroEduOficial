// netlify/functions/generate_content.js
// Requiere la variable de entorno: GEMINI_API_KEY
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

exports.handler = async (event) => {
    
    if (!GEMINI_API_KEY || GEMINI_API_KEY.length < 10) {
        return { statusCode: 500, body: JSON.stringify({ error: "Clave de Gemini no configurada." }) };
    }
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Método no permitido' };
    }

    try {
        const { slidesTexto } = JSON.parse(event.body);

        // 1. PROMPT PARA GENERAR AMBOS CONTENIDOS EN UN SOLO JSON
        const promptIA = `
            Eres un generador de contenido educativo. Basándote en el siguiente texto de diapositivas, crea 10 preguntas para un cuestionario (5 abiertas, 5 de opción múltiple con 3 opciones cada una) y un crucigrama con 5 palabras (Horizontales y Verticales). 
            
            La salida DEBE SER SOLAMENTE un objeto JSON que contenga estas dos claves: "cuestionario" y "crucigrama". El cuestionario debe tener las claves: tipo, pregunta, opciones (si es opcion), y correcta. El crucigrama debe tener las claves: word y clue.

            Texto de Diapositivas:
            ---
            ${slidesTexto}
            ---

            JSON:
        `;

        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: promptIA }] }],
                generationConfig: { temperature: 0.4 },
            })
        });

        if (!response.ok) {
            return { statusCode: 502, body: JSON.stringify({ error: `Fallo la IA externa. Código: ${response.status}` }) };
        }

        const data = await response.json();
        let rawResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        const jsonMatch = rawResponseText.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
            return { statusCode: 500, body: JSON.stringify({ error: "La IA no devolvió un JSON válido." }) };
        }

        const contenidoGenerado = JSON.parse(jsonMatch[0]);
        
        // Verificación final del formato
        if (!contenidoGenerado.cuestionario || !contenidoGenerado.crucigrama) {
             return { statusCode: 500, body: JSON.stringify({ error: "La IA no incluyó las claves 'cuestionario' o 'crucigrama'." }) };
        }

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(contenidoGenerado),
        };

    } catch (error) {
        console.error("Fallo general de la función:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Error interno del servidor." }) };
    }
};