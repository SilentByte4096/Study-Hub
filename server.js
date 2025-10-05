// server.js (ESM)
// Node 18+ has global fetch. If using older Node, install node-fetch and import it.
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';

dotenv.config();

const app = express();

// CORS first, so preflights (OPTIONS) are handled
app.use(cors({
  origin: true,               // reflect request origin in dev
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// Explicit preflight handler (belt-and-suspenders)
app.options('/api/gemini', cors());

app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL = 'gemini-2.0-flash-exp';

app.post('/api/gemini', async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Server API key not configured' });
    }
    const { prompt, systemPrompt = null } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Invalid prompt' });
    }

    const url = `${BASE_URL}/models/${MODEL}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
    const body = {
      contents: [
        {
          parts: [{ text: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.5,
        topK: 40,
        topP: 0.9,
        maxOutputTokens: 4096
      }
    };

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await resp.json();
    if (!resp.ok) {
      const msg = data?.error?.message || 'Unknown error';
      return res.status(resp.status).json({ error: `API Error: ${resp.status} - ${msg}` });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.json({ text, raw: data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Server error' });
  }
});
app.use(express.static('public'));
app.get('*', (req, res) => {
  res.sendFile(path.resolve('public', 'index.html'));
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`AI proxy listening on :${PORT}`);
});
