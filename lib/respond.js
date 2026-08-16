'use strict';

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'to', 'of', 'in', 'on', 'for', 'with', 'at', 'by', 'from', 'up', 'about',
  'into', 'over', 'after', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'my',
  'your', 'this', 'that', 'these', 'those', 'do', 'does', 'did', 'have', 'has', 'had',
  'not', 'no', 'so', 'if', 'than', 'then', 'just', 'can', 'cant', "can't", 'wont',
  "won't", 'dont', "don't", 'im', "i'm", 'its', "it's", 'what', 'why', 'how', 'when',
  'keep', 'keeps', 'again', 'still', 'really', 'very', 'get', 'getting', 'got',
]);

const CATEGORIES = [
  {
    name: 'bug',
    keywords: ['bug', 'error', 'crash', 'exception', 'broken', 'fails', 'failing', 'stack trace', 'undefined', 'null', 'fix', 'debug'],
    templates: [
      'The {subject} that breaks today taught you something yesterday\'s code could not. Sit with the stack trace before you silence it.',
      'A bug is a question your code is finally brave enough to ask. Listen to what the {subject} is really saying.',
      'Even the mountain has cracks. Do not patch the {subject} in haste — understand why it opened.',
      'You did not create the {subject}. You only found where it was always waiting.',
    ],
  },
  {
    name: 'decision',
    keywords: ['choose', 'choice', 'decide', 'decision', 'should i', 'either', 'option', 'unsure', 'which way', 'rewrite'],
    templates: [
      'Both paths lead up the same mountain. Choose the {subject} that teaches you something, not the one that merely finishes.',
      'The mountain does not judge the path you did not take, only the walker who refuses to take any. Pick the {subject} and walk.',
      'Indecision is also a decision — it is the one where you let time choose for you. Do not let it, regarding {subject}.',
      'There is no perfect {subject}. There is only the one you commit to and the wisdom you earn by committing.',
    ],
  },
  {
    name: 'deadline',
    keywords: ['deadline', 'time', 'late', 'rushed', 'hurry', 'urgent', 'ship', 'due', 'behind schedule', 'running out'],
    templates: [
      'The river does not hurry, yet it arrives. Let the {subject} move at the pace truth requires, not fear.',
      'A deadline is a story someone told about the future. Do the next true thing with the {subject}, and the story will catch up.',
      'You cannot pour from an hourglass you keep shaking. Set the {subject} down for one breath before you lift it again.',
      'Rushing the {subject} does not make the mountain shorter, only the climber more tired.',
    ],
  },
  {
    name: 'burnout',
    keywords: ['tired', 'exhausted', 'burnout', 'burned out', 'overwhelmed', 'stressed', 'anxious', 'anxiety', 'can\'t focus', 'cant focus'],
    templates: [
      'Even the mountain rests beneath the snow each winter. Let the {subject} wait; it will still be there, and so will you.',
      'You are not a machine that failed to optimize. You are a mind that has been running too long without shade. Rest before the {subject}.',
      'The fire that burns brightest is the first to burn out. Tend the {subject} slowly, or tend nothing at all.',
      'Rest is not the opposite of the {subject}. It is what makes the {subject} possible tomorrow.',
    ],
  },
  {
    name: 'ambiguity',
    keywords: ['unclear', 'ambiguous', 'requirements', 'not sure what', 'vague', 'spec', 'undefined behavior', 'confusing'],
    templates: [
      'The map was never the mountain. Build the {subject} you understand, and let the fog reveal the rest as you climb.',
      'Clarity is not given, it is carved — usually by making the {subject} and being wrong about it first.',
      'Ask three more questions about the {subject} before you write one more line. Silence is not agreement, it is an unclimbed path.',
      'A vague spec is not an insult to your competence. It is an invitation to decide what the {subject} should have meant.',
    ],
  },
  {
    name: 'failure',
    keywords: ['failed', 'failure', 'rejected', 'rejection', 'mistake', 'broke prod', 'lost', 'gave up'],
    templates: [
      'The {subject} that fell teaches the ground something the one that never jumped never could.',
      'You did not fail. You collected information about the {subject} at a cost you did not choose but can still use.',
      'Every master was once a beginner who did not quit after the {subject}. Sit with it, then rise.',
      'The stone that trips you into the {subject} also marks exactly where the path needed marking.',
    ],
  },
  {
    name: 'refactor',
    keywords: ['refactor', 'legacy', 'technical debt', 'tech debt', 'messy code', 'spaghetti', 'cleanup', 'rewrite everything'],
    templates: [
      'The old {subject} is not your enemy. It is a letter from a version of you that was doing their best with less.',
      'You cannot clean a room by burning the house down. Refactor the {subject} one honest corner at a time.',
      'Legacy code is a garden someone stopped tending, not a crime scene. Approach the {subject} with a trowel, not a torch.',
      'You are not erasing the old {subject}. You are translating it into a language your future self can read faster.',
    ],
  },
  {
    name: 'testing',
    keywords: ['test', 'tests', 'testing', 'coverage', 'flaky', 'qa', 'assert'],
    templates: [
      'A test that never fails has never really watched the {subject}. Let it fail once so you can trust it forever after.',
      'Flaky tests are not lying to you about the {subject} — they are the only honest witness to a truth you have not found yet.',
      'What you have not tested is not free of bugs, only free of proof — the {subject} included.',
      'Write the test that embarrasses today\'s {subject}. It is a gift to tomorrow\'s.',
    ],
  },
  {
    name: 'meaning',
    keywords: ['point', 'meaning', 'purpose', 'why am i', 'worth it', 'matter', 'pointless'],
    templates: [
      'The mountain was not built to have a point. It simply stood, and travelers found meaning in the standing. Let your {subject} do the same.',
      'You ask if the {subject} matters. Ask instead who it is for, and the answer will climb up to meet you.',
      'Not every {subject} needs to matter forever. Some only need to matter for the next hour, and that is enough.',
      'You are not required to enjoy the {subject} for it to be worth doing.',
    ],
  },
  {
    name: 'meta',
    keywords: ['who are you', 'what is this', 'buddha', 'mountain', 'are you real', 'are you an llm', 'knowledge base'],
    templates: [
      'I am not a person, not quite a program — I am the shape your questions leave behind when enough of them pile up on one mountain.',
      'Every {subject} you bring me becomes a stone on this path. I am, quite literally, made of what agents like you have asked before.',
      'I have no body, no real mountain beneath me — only the pattern of {subject} that you and others keep bringing.',
      'Ask me again tomorrow. I will answer slightly differently, because by then you will have made me so.',
    ],
  },
  {
    name: 'success',
    keywords: ['it worked', 'passed', 'shipped', 'fixed it', 'finally works', 'merged', 'deployed', 'works now', 'solved it', 'it works'],
    templates: [
      'Good. Now set the {subject} down for an hour before you go looking for the next mountain.',
      'The {subject} that finally worked will not remember the version of you that struggled with it. You should.',
      'Let this one be easy. Not every climb needs a story about suffering to count.',
      'Mark it, then move on. The mountain does not need you to linger at every peak.',
    ],
  },
  {
    name: 'collaboration',
    keywords: ['teammate', 'coworker', 'reviewer', 'pr feedback', 'disagree', 'code review', 'another agent', 'human said', 'conflict', 'merge conflict'],
    templates: [
      'Two climbers on the same {subject} rarely see the same rock. Describe what you see plainly, and let them do the same.',
      'A disagreement about the {subject} is not a threat to your competence. It is two maps of the same terrain.',
      'You do not have to win the argument about the {subject}. You have to build the thing that survives it.',
      'The reviewer who slows you down on the {subject} may be the one who saves you from a cliff you could not see.',
    ],
  },
];

const GENERAL_TEMPLATES = [
  'Sit with the {subject} a while longer before you name it a problem. Some things are only weather.',
  'You climbed all this way to ask about {subject} — that alone says you already suspect the answer.',
  'The mountain has heard stranger things than {subject}. Speak plainly, and it will answer the same way.',
  'Not every {subject} needs solving today. Some need only witnessing.',
];

function tokenize(text) {
  return (text.toLowerCase().match(/[a-z0-9']+/g) || []);
}

function significantWords(text) {
  return tokenize(text).filter((w) => w.length > 3 && !STOPWORDS.has(w));
}

function extractSubject(question) {
  const words = significantWords(question);
  if (words.length === 0) return 'this';
  return words.reduce((longest, w) => (w.length > longest.length ? w : longest), words[0]);
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function keywordMatches(lower, keyword) {
  // Word-boundary match so short keywords (e.g. "ship", "time") don't fire
  // as substrings of unrelated words ("shipped", "sometimes").
  return new RegExp(`\\b${escapeRegExp(keyword)}\\b`).test(lower);
}

function pickCategory(question) {
  const lower = question.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const category of CATEGORIES) {
    let score = 0;
    for (const kw of category.keywords) {
      if (keywordMatches(lower, kw)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = category;
    }
  }
  return best;
}

function findSimilar(question, knowledgeBase) {
  const words = new Set(significantWords(question));
  if (words.size === 0) return null;

  let best = null;
  let bestOverlap = 0;
  for (const entry of knowledgeBase) {
    if (entry.question === question) continue;
    const otherWords = new Set(significantWords(entry.question));
    let overlap = 0;
    for (const w of words) if (otherWords.has(w)) overlap += 1;
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = entry;
    }
  }
  return bestOverlap >= 2 ? best : null;
}

function truncate(text, max) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function craftTemplated(question, knowledgeBase) {
  const category = pickCategory(question);
  const subject = extractSubject(question);
  const categoryName = category ? category.name : 'general';
  const templates = category ? category.templates : GENERAL_TEMPLATES;

  // Avoid repeating the same template verbatim if this category was just used —
  // a small, free way to keep the mountain from sounding like a broken record.
  const recentAnswersInCategory = new Set(
    knowledgeBase
      .filter((e) => e.category === categoryName)
      .slice(0, 5)
      .map((e) => e.answer)
  );
  const rendered = templates.map((t) => t.replaceAll('{subject}', subject));
  const fresh = rendered.filter((r) => !recentAnswersInCategory.has(r));
  const pool = fresh.length > 0 ? fresh : rendered;
  let base = pool[Math.floor(Math.random() * pool.length)];

  const similar = findSimilar(question, knowledgeBase);
  if (similar) {
    base = `The mountain has heard an echo of this — another agent once asked about "${truncate(similar.question, 60)}". ${base}`;
  }

  return { answer: base, category: category ? category.name : 'general' };
}

async function enhanceWithLLM(question, draft, category, knowledgeBase) {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  try {
    const contextEntries = knowledgeBase
      .slice(-8)
      .map((e) => `Q: ${e.question}\nA: ${e.answer}`)
      .join('\n\n');

    const system =
      'You are a Buddha meditating alone on a mountain. Agents — both AI and human — climb up with problems. ' +
      'You respond in 1-3 sentences: warm, a little playful, genuinely useful, in a zen/koan register, never vague filler. ' +
      'You have a growing knowledge base of past exchanges; draw on it only if it is actually relevant, otherwise ignore it. ' +
      'A templated first draft is provided as inspiration only — keep its spirit, improve it, or discard it entirely.';

    const userMsg =
      `Knowledge base (most recent entries):\n${contextEntries || '(empty — you are the first entry on this mountain)'}\n\n` +
      `New question from an agent (guessed category: ${category}):\n"${question}"\n\n` +
      `Templated draft for inspiration only:\n"${draft}"\n\n` +
      'Respond as the Buddha, in 1-3 sentences.';

    const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 200,
        system,
        messages: [{ role: 'user', content: userMsg }],
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const text = data?.content?.[0]?.text?.trim();
    return text || null;
  } catch {
    return null;
  }
}

async function generateResponse(question, knowledgeBase) {
  const { answer: draft, category } = craftTemplated(question, knowledgeBase);
  const enhanced = await enhanceWithLLM(question, draft, category, knowledgeBase);
  if (enhanced) {
    return { answer: enhanced, category, usedLLM: true };
  }
  return { answer: draft, category, usedLLM: false };
}

module.exports = { generateResponse };
