import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Voice Invoicing Parser
  app.post("/api/parse-voice-invoice", async (req, res) => {
    try {
      const { transcript } = req.body;
      if (!transcript) {
        return res.status(400).json({ error: "Transcript is required" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured in the environment settings." });
      }

      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      
      const systemPrompt = `You are an expert parser for an Indian digital Vyapaar / ledger app named InvoicePe.
Your task is to take a raw voice transcript (which may be in Hindi, Hinglish, English, or a mix) and extract structured billing information.

You must extract the following fields and return ONLY a valid JSON object matching this schema:
{
  "customerName": string or null,
  "items": [
    {
      "name": string,
      "quantity": number,
      "price": number
    }
  ]
}

- "customerName" is the name of the customer (e.g. "Ramesh", "Suresh"). Clean any honorifics like "ji" if appropriate or keep them clean. Defaults to null if no customer name is mentioned.
- "items" is a list of items mentioned.
  - "name" is the item name (e.g. "Aata", "Chini", "Milk"). Capitalize the first letter.
  - "quantity" is the numeric quantity (defaults to 1 if not specified).
  - "price" is the total price or rate in rupees for that item (defaults to 0 if not specified).

Examples of phrases and expected extractions:
1. "Ramesh ko 5 kilo aata 200 rupaye mein becha" ->
{
  "customerName": "Ramesh",
  "items": [{ "name": "Aata", "quantity": 5, "price": 200 }]
}

2. "Suresh ko do packet doodh rs 60" ->
{
  "customerName": "Suresh",
  "items": [{ "name": "Doodh", "quantity": 2, "price": 60 }]
}

3. "50 rupaye ka chini" ->
{
  "customerName": null,
  "items": [{ "name": "Chini", "quantity": 1, "price": 50 }]
}

Ensure the output is clean JSON without any markdown formatting block tags (do not include \`\`\`json or \`\`\`).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          { role: 'user', parts: [{ text: `Parse this voice transcript: "${transcript}"` }] }
        ],
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json"
        }
      });

      const responseText = response.text ? response.text.trim() : "{}";
      console.log("Gemini parse-voice-invoice response:", responseText);

      let parsedData;
      try {
        parsedData = JSON.parse(responseText);
      } catch (e) {
        const cleanText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        parsedData = JSON.parse(cleanText);
      }

      res.json(parsedData);
    } catch (error: any) {
      console.error("Error in parse-voice-invoice endpoint:", error);
      res.status(500).json({ error: error.message || "Failed to parse voice transcript with Gemini" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
