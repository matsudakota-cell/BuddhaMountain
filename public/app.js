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

  function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
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

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  function prependEntry(entry) {
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

  async function loadHistory() {
    try {
      const res = await fetch('/api/wisdom');
      const entries = await res.json();
      if (entries.length === 0) {
        const li = document.createElement('li');
        li.className = 'empty-feed';
        li.textContent = 'The mountain is quiet. Be the first to ask.';
        feedList.appendChild(li);
        return;
      }
      for (const entry of entries) {
        feedList.appendChild(renderFeedItem(entry));
        count += 1;
      }
      feedCount.textContent = String(count);
      showLatest(entries[0]);
    } catch {
      // ignore
    }
  }

  function connectStream() {
    const source = new EventSource('/events');
    source.addEventListener('wisdom', (event) => {
      const entry = JSON.parse(event.data);
      prependEntry(entry);
      showLatest(entry);
    });
    source.onerror = () => {
      // browser auto-reconnects EventSource; nothing to do
    };
  }

  askForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const question = questionInput.value.trim();
    if (!question) return;

    askButton.disabled = true;
    askButton.textContent = 'Climbing…';

    try {
      const res = await fetch('/ask', {
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
      }
    } catch {
      // ignore, SSE/history will stay consistent on reload
    } finally {
      askButton.disabled = false;
      askButton.textContent = 'Ask the mountain';
    }
  });

  loadHistory();
  connectStream();
})();
