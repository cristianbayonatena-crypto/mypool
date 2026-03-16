export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { measurements, poolVolume } = req.body;

  const prompt = `Eres un experto en mantenimiento de piscinas. Analiza estas mediciones y da recomendaciones detalladas en español.

Volumen de la piscina: ${poolVolume || "desconocido"} m³

Mediciones:
- Cloro: ${measurements.cl || "no medido"} ppm (ideal: 1-3)
- pH: ${measurements.ph || "no medido"} (ideal: 7.2-7.6)
- Alcalinidad: ${measurements.alk || "no medido"} ppm (ideal: 80-120)
- Dureza: ${measurements.hard || "no medido"} ppm (ideal: 200-400)
- Ácido cianúrico: ${measurements.cya || "no medido"} ppm (ideal: 30-50)

Da un análisis completo con: diagnóstico, problemas detectados, tratamiento con productos y cantidades exactas, consejos y cuándo hacer la próxima revisión.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: "Error Gemini: " + err });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    res.status(200).json({ analysis: text || "No se pudo generar el análisis." });
  } catch (error) {
    res.status(500).json({ error: "Error: " + error.message });
  }
}