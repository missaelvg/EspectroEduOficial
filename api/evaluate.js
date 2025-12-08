// api/evaluate.js
// Función Serverless para evaluar reportes usando Google Gemini.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

module.exports = async (req, res) => {
    // Configuración de permisos (CORS) para que el frontend pueda llamar a esta función
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Si es una verificación previa del navegador, respondemos OK y terminamos.
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }

    // Verificamos que la API Key exista en las variables de entorno
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ calificacion: 0, justificacion: "Error: Falta API Key en el servidor." });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    try {
        // Parseamos los datos recibidos
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { reporteTexto, estandar } = body;

        // Prompt (Instrucción) para la IA: Rol de evaluador estricto
        const promptIA = `
            Evalúa este reporte contra el estándar.
            No busques gráficos, imágenes, ilustraciones o figuras 
            Respuesta JSON: { "calificacion": (1-10), "justificacion": "texto..." }
            ESTÁNDAR: ${estandar}
            REPORTE: ${reporteTexto}
        `;

        // Llamada a la API de Google Gemini
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: promptIA }] }],
                generationConfig: { temperature: 0.1 } // Temperatura baja para ser objetivo
            })
        });

        if (!response.ok) return res.status(502).json({ calificacion: 0, justificacion: "Error conexión IA" });

        const data = await response.json();
        // Extraemos el texto de la respuesta
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        // Buscamos el JSON dentro del texto (por si la IA añade algo más)
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);

        if (!jsonMatch) return res.status(500).json({ calificacion: 0, justificacion: "Error formato IA" });

        // Devolvemos la calificación al frontend
        return res.status(200).json(JSON.parse(jsonMatch[0]));

    } catch (error) {
        return res.status(500).json({ calificacion: 0, justificacion: "Error interno." });
    }
};