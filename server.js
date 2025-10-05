// server.js (ESM)
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({
  origin: true,
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.options('/api/gemini', cors());
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL = 'gemini-2.0-flash-exp';

app.post('/api/gemini', async (req, res) => {
  try {
    if (!GEMINI_API_KEY)
      return res.status(500).json({ error: 'Server API key not configured' });
    const { prompt, systemPrompt = null } = req.body || {};
    if (!prompt || typeof prompt !== 'string')
      return res.status(400).json({ error: 'Invalid prompt' });

    const url = `${BASE_URL}/models/${MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
    const body = {
      contents: [{ parts: [{ text: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt }] }],
      generationConfig: { temperature: 0.5, topK: 40, topP: 0.9, maxOutputTokens: 4096 }
    };

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await resp.json();
    if (!resp.ok)
      return res.status(resp.status).json({ error: `API Error: ${resp.status} - ${data?.error?.message || 'Unknown'}` });

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.json({ text, raw: data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Serve all static frontend files from dist/
app.use(express.static(path.join(__dirname, 'dist')));

// For any non-API route, return index.html (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`✅ AI proxy + frontend listening on :${PORT}`));
