'use strict';

const crypto = require('crypto');
const { getAdminClient } = require('./supabase');
const { generateResponse } = require('./respond');

const RECENT_CONTEXT_LIMIT = 50;
const AGENT_RATE_LIMIT = { count: 20, windowMs: 5 * 60 * 1000 };
const IP_RATE_LIMIT = { count: 30, windowMs: 5 * 60 * 1000 };

function hashIp(ip) {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 32);
}

function rowToEntry(row) {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    agent: row.agent,
    source: row.source,
    category: row.category,
    usedLLM: row.used_llm,
    timestamp: row.created_at,
  };
}

async function checkRateLimit(supabase, { agent, ipHash }) {
  const now = Date.now();

  const agentSince = new Date(now - AGENT_RATE_LIMIT.windowMs).toISOString();
  const { count: agentCount, error: agentErr } = await supabase
    .from('wisdom')
    .select('id', { count: 'exact', head: true })
    .eq('agent', agent)
    .gte('created_at', agentSince);
  if (!agentErr && agentCount >= AGENT_RATE_LIMIT.count) {
    return { limited: true, reason: 'agent' };
  }

  if (ipHash) {
    const ipSince = new Date(now - IP_RATE_LIMIT.windowMs).toISOString();
    const { count: ipCount, error: ipErr } = await supabase
      .from('wisdom')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gte('created_at', ipSince);
    if (!ipErr && ipCount >= IP_RATE_LIMIT.count) {
      return { limited: true, reason: 'ip' };
    }
  }

  return { limited: false };
}

async function handleAsk({ question, agent, source, ip }) {
  const trimmedQuestion = (question || '').toString().trim().slice(0, 500);
  if (!trimmedQuestion) {
    return { status: 400, body: { error: 'question is required' } };
  }

  const cleanAgent = (agent || 'a wandering agent').toString().trim().slice(0, 80) || 'a wandering agent';
  const cleanSource = source === 'human' ? 'human' : 'agent';
  const ipHash = hashIp(ip);

  const supabase = getAdminClient();

  const rateCheck = await checkRateLimit(supabase, { agent: cleanAgent, ipHash });
  if (rateCheck.limited) {
    return {
      status: 429,
      body: { error: 'The mountain needs a moment of silence. Try again shortly.' },
    };
  }

  const { data: recentRows, error: recentErr } = await supabase
    .from('wisdom')
    .select('question, answer, category')
    .order('created_at', { ascending: false })
    .limit(RECENT_CONTEXT_LIMIT);

  const knowledgeBase = recentErr ? [] : recentRows;

  const { answer, category, usedLLM } = await generateResponse(trimmedQuestion, knowledgeBase);

  const { data: inserted, error: insertErr } = await supabase
    .from('wisdom')
    .insert({
      question: trimmedQuestion,
      answer,
      agent: cleanAgent,
      source: cleanSource,
      category,
      used_llm: usedLLM,
      ip_hash: ipHash,
    })
    .select()
    .single();

  if (insertErr) {
    return { status: 500, body: { error: 'The mountain is unreachable right now.' } };
  }

  return { status: 200, body: rowToEntry(inserted) };
}

module.exports = { handleAsk };
