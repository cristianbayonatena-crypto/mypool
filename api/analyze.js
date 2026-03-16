import Anthropic from "@anthropic-ai/sdk";

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
2. PROBLEMAS DETECTADOS: Lista cada parámetro fuera de rango con explicación
3. TRATAMIENTO: Para cada problema, qué producto usar, qué cantidad por m³ y en qué orden
4. CONSEJOS: Recomendaciones adicionales
5. PRÓXIMA REVISIÓN: Cuándo volver a medir`;

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_KEY });
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    res.status(200).json({ analysis: message.content[0].text });
  } catch (error) {
    res.status(500).json({ error: "Error: " + error.message });
  }
}