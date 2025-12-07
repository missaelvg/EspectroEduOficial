// api/evaluate.js
// Maneja la evaluación automática de reportes usando Google Gemini 2.5 Flash.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
// URL del modelo específico optimizado para velocidad y costo
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

module.exports = async (req, res) => {
    // Configuración de CORS para permitir peticiones desde el frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Manejo de la petición OPTIONS (pre-flight check del navegador)
    if (req.method === 'OPTIONS') { res.status(200).end(); return; }

    // Validación de seguridad: existencia de la API Key
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ calificacion: 0, justificacion: "Error del servidor: Configuración de API faltante." });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { reporteTexto, estandar } = body;

        // Prompt de Ingeniería (RF-13): Instruye a la IA para actuar como evaluador
        const promptIA = `
            Evalúa este reporte contra el estándar. 
            Respuesta JSON: { "calificacion": (1-10), "justificacion": "texto..." }
            ESTÁNDAR: ${estandar}
            REPORTE: ${reporteTexto}
        `;

        // Petición a la API de Google
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: promptIA }] }],
                generationConfig: { temperature: 0.1 } // Temperatura baja para evaluación objetiva
            })
        });

        if (!response.ok) return res.status(502).json({ calificacion: 0, justificacion: "Error de comunicación con el servicio de IA" });

        const data = await response.json();
        // Extracción y limpieza de la respuesta
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        // Buscamos la estructura JSON dentro de la respuesta de texto
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);

        if (!jsonMatch) return res.status(500).json({ calificacion: 0, justificacion: "El formato de respuesta de la IA no fue válido." });

        return res.status(200).json(JSON.parse(jsonMatch[0]));

    } catch (error) {
        return res.status(500).json({ calificacion: 0, justificacion: "Error interno del servidor durante la evaluación." });
    }
};