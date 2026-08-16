'use strict';

// One-time import of the old file-based knowledge base (data/wisdom.json)
// into Supabase. Safe to run more than once: entries are matched by
// question+answer+created_at and skipped if already present.
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { getAdminClient } = require('../lib/supabase');

async function main() {
  const filePath = path.join(__dirname, '..', 'data', 'wisdom.json');
  const entries = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const supabase = getAdminClient();
  let imported = 0;
  let skipped = 0;

  for (const entry of entries) {
    const { data: existing } = await supabase
      .from('wisdom')
      .select('id')
      .eq('question', entry.question)
      .eq('answer', entry.answer)
      .limit(1);

    if (existing && existing.length > 0) {
      skipped += 1;
      continue;
    }

    const { error } = await supabase.from('wisdom').insert({
      question: entry.question,
      answer: entry.answer,
      agent: entry.agent,
      source: entry.source,
      category: entry.category,
      used_llm: entry.usedLLM ?? false,
      created_at: entry.timestamp,
    });

    if (error) {
      console.error(`Failed to import "${entry.question}":`, error.message);
    } else {
      imported += 1;
    }
  }

  console.log(`Imported ${imported} entries, skipped ${skipped} already present.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
