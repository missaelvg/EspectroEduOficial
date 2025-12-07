// api/generate_content.js
// Genera cuestionarios y crucigramas a partir del texto de las diapositivas.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

module.exports = async (req, res) => {
    // Configuración CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: "Error de Servidor: Falta la API Key." });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { slidesTexto } = body;

        // PROMPT: Pedimos 20 preguntas y 15 palabras para tener un "Banco" grande.
        // El frontend seleccionará 5 aleatorias para cada alumno (Randomización).
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
                generationConfig: { temperature: 0.7 }, // Temperatura media para creatividad
            })
        });

        if (!response.ok) {
            return res.status(502).json({ error: `Error IA (${response.status})` });
        }

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) return res.status(500).json({ error: "JSON inválido de IA." });

        return res.status(200).json(JSON.parse(jsonMatch[0]));

    } catch (error) {
        console.error("Error interno:", error);
        return res.status(500).json({ error: error.message });
    }
};