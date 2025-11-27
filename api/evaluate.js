// api/evaluate.js (VERSIÓN GEMINI 2.5 FLASH)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { res.status(200).end(); return; }

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ calificacion: 0, justificacion: "Error: Falta API Key en servidor." });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { reporteTexto, estandar } = body;

        const promptIA = `
            Evalúa este reporte contra el estándar. 
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

        if (!response.ok) return res.status(502).json({ calificacion: 0, justificacion: "Error conexión IA" });

        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);

        if (!jsonMatch) return res.status(500).json({ calificacion: 0, justificacion: "Error formato IA" });

        return res.status(200).json(JSON.parse(jsonMatch[0]));

    } catch (error) {
        return res.status(500).json({ calificacion: 0, justificacion: "Error interno." });
    }
};