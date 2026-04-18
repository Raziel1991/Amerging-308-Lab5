require("dotenv").config();

const path = require("path");
const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

function ensureRequiredEnv() {
  const missing = [];

  if (!process.env.GEMINI_API_KEY) {
    missing.push("GEMINI_API_KEY");
  }
  if (!process.env.OPENAI_API_KEY) {
    missing.push("OPENAI_API_KEY");
  }

  return missing;
}

app.get("/api/health", (_req, res) => {
  const missing = ensureRequiredEnv();
  res.json({
    ok: missing.length === 0,
    missing,
  });
});

app.post("/api/compare", async (req, res) => {
  const prompt = String(req.body?.prompt || "").trim();
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required." });
  }

  try {
    const [geminiResult, chatgptResult] = await Promise.all([
      getGeminiResponse(prompt),
      getChatGPTResponse(prompt),
    ]);

    return res.json({
      prompt,
      gemini: geminiResult.text,
      chatgpt: chatgptResult.text,
      warnings: [geminiResult.warning, chatgptResult.warning].filter(Boolean),
    });
  } catch (err) {
    return res.status(500).json({
      error: err?.message || "Failed to compare model outputs.",
    });
  }
});

async function getGeminiResponse(prompt) {
  if (!process.env.GEMINI_API_KEY) {
    return {
      text: "Gemini API key is missing, so Gemini was skipped.",
      warning: "GEMINI_API_KEY is not set.",
    };
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
    generationConfig: {
      maxOutputTokens: 1024,
      temperature: 0.7,
      topP: 0.9,
      topK: 32,
    },
  });

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return { text: response.text(), warning: null };
}

async function getChatGPTResponse(prompt) {
  if (!process.env.OPENAI_API_KEY) {
    return {
      text: "OpenAI API key is missing, so ChatGPT was skipped.",
      warning: "OPENAI_API_KEY is not set.",
    };
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant. Provide clear, concise summaries.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 1024,
  });

  return {
    text: completion.choices?.[0]?.message?.content?.trim() || "No response.",
    warning: null,
  };
}

app.listen(PORT, () => {
  console.log(`Comparison app running at http://localhost:${PORT}`);
});
