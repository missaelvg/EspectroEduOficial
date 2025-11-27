// api/generate_content.js (BANCO DE PREGUNTAS Y PALABRAS)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }
    if (!GEMINI_API_KEY) return res.status(500).json({ error: "Clave API no configurada." });
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    try {
        const { slidesTexto } = JSON.parse(req.body);

        const promptIA = `
            Actúa como un profesor experto. Analiza el siguiente texto de diapositivas y genera:
            1. Un BANCO DE 20 PREGUNTAS de opción múltiple (con 3 opciones: A, B, C).
            2. Un BANCO DE 15 PALABRAS CLAVE para crucigrama con sus pistas cortas.

            Formato JSON ESTRICTO:
            {
              "cuestionario": [
                { "pregunta": "¿...?", "opciones": ["A", "B", "C"], "correcta": "A" }
              ],
              "crucigrama": [
                { "word": "PALABRA", "clue": "Pista..." }
              ]
            }

            Texto Base:
            ---
            ${slidesTexto.substring(0, 12000)} 
            ---
        `;

        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: promptIA }] }],
                generationConfig: { temperature: 0.7 }, 
            })
        });

        if (!response.ok) return res.status(502).json({ error: `Error IA: ${response.status}` });

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) return res.status(500).json({ error: "Formato JSON inválido de la IA." });

        const content = JSON.parse(jsonMatch[0]);
        return res.status(200).json(content);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Error interno del servidor." });
    }
};