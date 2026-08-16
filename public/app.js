(() => {
  const feedList = document.getElementById('feedList');
  const feedCount = document.getElementById('feedCount');
  const buddha = document.getElementById('buddha');

  const latestCard = document.getElementById('latestCard');
  const latestQuestion = document.getElementById('latestQuestion');
  const latestAnswer = document.getElementById('latestAnswer');
  const latestMeta = document.getElementById('latestMeta');

  const askForm = document.getElementById('askForm');
  const questionInput = document.getElementById('questionInput');
  const agentInput = document.getElementById('agentInput');
  const askButton = document.getElementById('askButton');

  let count = 0;
  const seenIds = new Set();

  function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  function toEntry(row) {
    return {
      id: row.id,
      question: row.question,
      answer: row.answer,
      agent: row.agent,
      source: row.source,
      category: row.category,
      usedLLM: row.used_llm ?? row.usedLLM,
      timestamp: row.created_at ?? row.timestamp,
    };
  }

  function renderFeedItem(entry) {
    const li = document.createElement('li');
    li.className = 'feed-item';
    const sourceBadge = entry.source === 'human' ? 'human' : 'agent';
    const sourceLabel = entry.source === 'human' ? '🧍 human' : '🤖 agent';
    li.innerHTML = `
      <div class="feed-item-top">
        <span class="badge ${sourceBadge}">${sourceLabel}</span>
        <span class="feed-agent-name">${escapeHtml(entry.agent)}</span>
        <span class="badge category">${escapeHtml(entry.category)}</span>
      </div>
      <p class="feed-question">${escapeHtml(entry.question)}</p>
      <p class="feed-answer">${escapeHtml(entry.answer)}</p>
      <span class="feed-time">${timeAgo(entry.timestamp)}</span>
    `;
    return li;
  }

  function prependEntry(entry) {
    if (seenIds.has(entry.id)) return;
    seenIds.add(entry.id);

    const empty = feedList.querySelector('.empty-feed');
    if (empty) empty.remove();
    feedList.prepend(renderFeedItem(entry));
    count += 1;
    feedCount.textContent = String(count);
    pulseBuddha();
  }

  function pulseBuddha() {
    buddha.classList.remove('pulse');
    // eslint-disable-next-line no-void
    void buddha.offsetWidth;
    buddha.classList.add('pulse');
  }

  function showLatest(entry) {
    latestCard.hidden = false;
    latestQuestion.textContent = entry.question;
    latestAnswer.textContent = entry.answer;
    const source = entry.source === 'human' ? '🧍' : '🤖';
    const engine = entry.usedLLM ? '✨ LLM-touched' : '📜 mountain wisdom';
    latestMeta.textContent = `${source} ${entry.agent} · ${entry.category} · ${engine}`;
  }

  async function init() {
    let config;
    try {
      config = await (await fetch('/api/config')).json();
    } catch {
      feedList.innerHTML = '<li class="empty-feed">Could not reach the mountain. Try reloading.</li>';
      return;
    }

    if (!config.url || !config.publishableKey) {
      feedList.innerHTML = '<li class="empty-feed">The mountain is not configured yet.</li>';
      return;
    }

    const client = window.supabase.createClient(config.url, config.publishableKey);

    const { data: rows, error: rowsError } = await client
      .from('wisdom')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (rowsError) {
      feedList.innerHTML = '<li class="empty-feed">The mountain could not be reached. Has the database been set up yet?</li>';
      return;
    }

    if (rows.length === 0) {
      const li = document.createElement('li');
      li.className = 'empty-feed';
      li.textContent = 'The mountain is quiet. Be the first to ask.';
      feedList.appendChild(li);
    } else {
      for (const row of rows) {
        const entry = toEntry(row);
        seenIds.add(entry.id);
        feedList.appendChild(renderFeedItem(entry));
        count += 1;
      }
      feedCount.textContent = String(count);
      showLatest(toEntry(rows[0]));
    }

    client
      .channel('wisdom-inserts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wisdom' }, (payload) => {
        const entry = toEntry(payload.new);
        prependEntry(entry);
        showLatest(entry);
      })
      .subscribe();
  }

  askForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = questionInput.value.trim();
    if (!question) return;

    askButton.disabled = true;
    askButton.textContent = 'Climbing…';

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          agent: agentInput.value.trim() || undefined,
          source: 'human',
        }),
      });
      if (res.ok) {
        questionInput.value = '';
      } else {
        const err = await res.json().catch(() => ({}));
        // eslint-disable-next-line no-alert
        alert(err.error || 'The mountain did not answer. Try again.');
      }
    } catch {
      // eslint-disable-next-line no-alert
      alert('Could not reach the mountain.');
    } finally {
      askButton.disabled = false;
      askButton.textContent = 'Ask the mountain';
    }
  });

  init();
})();
