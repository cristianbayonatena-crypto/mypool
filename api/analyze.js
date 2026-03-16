export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { measurements, poolVolume } = req.body;

  const prompt = `Eres un experto en mantenimiento de piscinas. Analiza estas mediciones y da recomendaciones detalladas en español.

Volumen de la piscina: ${poolVolume || "desconocido"} m³

Mediciones actuales:
- Cloro: ${measurements.cl || "no medido"} ppm (ideal: 1-3 ppm)
- pH: ${measurements.ph || "no medido"} (ideal: 7.2-7.6)
- Alcalinidad: ${measurements.alk || "no medido"} ppm (ideal: 80-120 ppm)
- Dureza: ${measurements.hard || "no medido"} ppm (ideal: 200-400 ppm)
- Ácido cianúrico: ${measurements.cya || "no medido"} ppm (ideal: 30-50 ppm)

Proporciona:
1. DIAGNÓSTICO: Estado general de la piscina
2. PROBLEMAS DETECTADOS: Lista cada parámetro fuera de rango con explicación clara
3. TRATAMIENTO: Para cada problema, indica exactamente qué producto usar, qué cantidad aproximada añadir por m³ y en qué orden
4. CONSEJOS: Recomendaciones adicionales para mantener el agua en buen estado
5. PRÓXIMA REVISIÓN: Cuándo volver a medir

Sé específico, práctico y usa un tono profesional pero comprensible.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "No se pudo generar el análisis.";
    res.status(200).json({ analysis: text });
  } catch (error) {
    res.status(500).json({ error: "Error al contactar con la IA" });
  }
}