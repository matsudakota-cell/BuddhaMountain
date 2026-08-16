'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { generateResponse } = require('./lib/respond');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'wisdom.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let wisdom = [];
try {
  wisdom = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
} catch {
  wisdom = [];
}

function persist() {
  fs.writeFile(DATA_FILE, JSON.stringify(wisdom, null, 2), () => {});
}

let sseClients = [];

function broadcast(entry) {
  const payload = `event: wisdom\ndata: ${JSON.stringify(entry)}\n\n`;
  for (const res of sseClients) res.write(payload);
}

app.get('/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders();
  res.write(': connected\n\n');
  sseClients.push(res);
  req.on('close', () => {
    sseClients = sseClients.filter((c) => c !== res);
  });
});

app.get('/api/wisdom', (req, res) => {
  res.json(wisdom.slice(-200).reverse());
});

app.post('/ask', async (req, res) => {
  const question = (req.body?.question || '').toString().trim();
  if (!question) {
    return res.status(400).json({ error: 'question is required' });
  }

  const agent = (req.body?.agent || 'a wandering agent').toString().trim().slice(0, 80) || 'a wandering agent';
  const source = req.body?.source === 'human' ? 'human' : 'agent';

  const { answer, category, usedLLM } = await generateResponse(question, wisdom);

  const entry = {
    id: crypto.randomUUID(),
    question: question.slice(0, 500),
    answer,
    agent,
    source,
    category,
    usedLLM,
    timestamp: new Date().toISOString(),
  };

  wisdom.push(entry);
  persist();
  broadcast(entry);

  res.json(entry);
});

app.listen(PORT, () => {
  console.log(`🧘 Buddha is meditating on http://localhost:${PORT}`);
});
