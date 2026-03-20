// === FIBERPUSZTA SHARED JS ===

// Resonance questions
function selectOption(el) {
  const parent = el.closest('.resonance-options');
  parent.querySelectorAll('.resonance-opt').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
}

function submitResponses() {
  const responses = {};
  document.querySelectorAll('.resonance-options').forEach(group => {
    const q = group.dataset.question;
    const selected = group.querySelector('.resonance-opt.selected span');
    if (selected) responses[q] = selected.textContent;
  });
  document.querySelectorAll('.resonance-freetext textarea').forEach((ta, i) => {
    if (ta.value.trim()) responses['freetext_' + i] = ta.value.trim();
  });
  if (Object.keys(responses).length === 0) {
    alert('Select at least one option before submitting.');
    return;
  }
  console.log('Fiberpuszta responses:', responses);
  alert('Thank you! Your responses have been recorded.\n\n(In the full version, this goes to the database for editorial analysis.)');
}

// AI Chat
let messagesRemaining = 5;
let conversationHistory = [];
let userApiKey = null;

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  if (messagesRemaining <= 0 && !userApiKey) {
    document.getElementById('byok-section').classList.add('visible');
    return;
  }

  addMessage('user', text);
  input.value = '';
  input.style.height = 'auto';

  const btn = document.getElementById('btn-send');
  btn.disabled = true;

  const loadingId = addMessage('ai', '<div class="loading-dots"><span>·</span><span>·</span><span>·</span></div>');
  conversationHistory.push({ role: 'user', content: text });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(userApiKey ? { 'x-api-key': userApiKey } : {})
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: window.ARTICLE_CONTEXT || 'You are a discussion partner on the Fiberpuszta journal. Engage the reader seriously about the article they just read.',
        messages: conversationHistory
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || 'API error');

    const reply = data.content.filter(c => c.type === 'text').map(c => c.text).join('\n');
    conversationHistory.push({ role: 'assistant', content: reply });
    updateMessage(loadingId, reply);

    if (!userApiKey) {
      messagesRemaining--;
      document.getElementById('budget-display').textContent =
        messagesRemaining > 0
          ? messagesRemaining + ' free message' + (messagesRemaining !== 1 ? 's' : '') + ' remaining'
          : 'Free messages used';
      if (messagesRemaining <= 0) {
        document.getElementById('byok-section').classList.add('visible');
        document.getElementById('chat-input').placeholder = 'Enter your API key below to continue...';
      }
    }
  } catch (err) {
    updateMessage(loadingId, 'Something went wrong: ' + err.message);
  }
  btn.disabled = false;
}

function addMessage(role, content) {
  const container = document.getElementById('chat-messages');
  const msg = document.createElement('div');
  const id = 'msg-' + Date.now();
  msg.id = id;
  msg.className = 'chat-msg ' + role;
  const label = role === 'ai' ? 'Fiberpuszta AI' : (role === 'system' ? '' : 'You');
  msg.innerHTML = (label ? '<div class="msg-label">' + label + '</div>' : '') +
    '<div class="msg-content">' + content + '</div>';
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
  return id;
}

function updateMessage(id, content) {
  const msg = document.getElementById(id);
  if (msg) {
    const formatted = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
    msg.querySelector('.msg-content').innerHTML = formatted;
  }
}

function activateBYOK() {
  const input = document.getElementById('byok-input');
  const key = input.value.trim();
  if (key && key.startsWith('sk-')) {
    userApiKey = key;
    document.getElementById('byok-section').classList.remove('visible');
    document.getElementById('chat-input').placeholder = 'Continue the discussion...';
    document.getElementById('budget-display').textContent = 'Using your API key';
    document.getElementById('budget-display').style.color = '#7cb87c';
    addMessage('system', 'API key activated. Conversation continues without limits.');
  } else {
    alert('Please enter a valid Anthropic API key (starts with sk-)');
  }
}

// Auto-resize textarea
document.addEventListener('DOMContentLoaded', () => {
  const ta = document.getElementById('chat-input');
  if (ta) {
    ta.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
  }
});
