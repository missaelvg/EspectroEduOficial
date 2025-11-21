// api/generate_content.js (SOLO OPCIÓN MÚLTIPLE)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: "Clave de Gemini no configurada." });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { slidesTexto } = body;

        // CAMBIO CLAVE: Pedimos explícitamente solo preguntas de opción múltiple
        const promptIA = `
            Eres un generador de contenido educativo. Basándote en el siguiente texto, crea:
            1. Un cuestionario de 5 preguntas de OPCIÓN MÚLTIPLE (3 opciones cada una).
            2. Un crucigrama con 5 palabras.

            La salida DEBE SER SOLAMENTE un objeto JSON válido con esta estructura:
            {
              "cuestionario": [
                { "tipo": "opcion", "pregunta": "¿...?", "opciones": ["A", "B", "C"], "correcta": "La respuesta correcta" }
              ],
              "crucigrama": [
                { "word": "PALABRA", "clue": "Pista..." }
              ]
            }

            Texto base:
            ---
            ${slidesTexto.substring(0, 8000)} 
            ---
        `;

        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: promptIA }] }],
                generationConfig: { temperature: 0.3 }, // Bajamos temperatura para ser más precisos
            })
        });

        if (!response.ok) {
            return res.status(502).json({ error: `Fallo la IA externa. Código: ${response.status}` });
        }

        const data = await response.json();
        const rawResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        const jsonMatch = rawResponseText.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
            return res.status(500).json({ error: "La IA no devolvió un JSON válido." });
        }

        const contenidoGenerado = JSON.parse(jsonMatch[0]);
        return res.status(200).json(contenidoGenerado);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Error interno del servidor." });
    }
};