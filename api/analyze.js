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

Da un análisis completo con: diagnóstico, problemas detectados, tratamiento con productos y cantidades, consejos y cuándo hacer la próxima revisión.`;

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

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: "Error Anthropic: " + err });
    }

    const data = await response.json();
    res.status(200).json({ analysis: data.content[0].text });
  } catch (error) {
    res.status(500).json({ error: "Error: " + error.message });
  }
}