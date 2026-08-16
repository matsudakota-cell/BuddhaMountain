'use strict';

require('dotenv').config();

const express = require('express');
const path = require('path');
const { handleAsk } = require('./lib/askHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || null;
}

app.get('/api/config', (req, res) => {
  res.json({
    url: process.env.SUPABASE_URL,
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
  });
});

app.post('/api/ask', async (req, res) => {
  const result = await handleAsk({
    question: req.body?.question,
    agent: req.body?.agent,
    source: req.body?.source,
    ip: getClientIp(req),
  });
  res.status(result.status).json(result.body);
});

app.listen(PORT, () => {
  console.log(`🧘 Buddha is meditating on http://localhost:${PORT}`);
});
