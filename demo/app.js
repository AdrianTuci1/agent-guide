const agents = [
  { id: 'reviewer', name: 'Code Reviewer', description: 'Reviews diffs and suggests improvements.' },
  { id: 'refactorer', name: 'Refactor Agent', description: 'Extracts services and cleans up code.' },
  { id: 'deployer', name: 'Deploy Agent', description: 'Deploys releases to staging or production.' },
  { id: 'onboarder', name: 'Onboard Agent', description: 'Explains repo structure and setup.' }
];

const conversations = [
  { id: 'refactor', title: 'Refactor auth module' },
  { id: 'deploy', title: 'Deploy to production' },
  { id: 'image', title: 'Analyze screenshot' },
  { id: 'onboard', title: 'Onboard to repo' },
  { id: 'configure', title: 'Configure environment' },
  { id: 'confirm', title: 'Delete branch' },
  { id: 'release', title: 'Multi-step release' }
];

const chatWindow = new window.ChatWindow(document.getElementById('chat-view'));

let selectedAgentId = null;

const rightSidebar = new window.RightSidebar(
  document.getElementById('right-sidebar'),
  el => renderInfo(el),
  el => renderHistory(el)
);

const agentsView = new window.AgentsView(
  document.getElementById('agents-view'),
  agents,
  () => { showChat(); newChat(); },
  id => openAgentInfo(id)
);

const threadsData = {
  channels: [
    { id: 'general', name: 'general' },
    { id: 'releases', name: 'releases' },
    { id: 'code-review', name: 'code-review' },
    { id: 'flight-path', name: 'flight-path' }
  ],
  messagesByChannel: {
    general: [
      { id: 1, text: 'Welcome to the team channel.', author: 'Adrian', time: '09:00', reactions: [{ emoji: '👋', count: 2 }] },
      { id: 2, text: 'What are we building today?', author: 'You', time: '09:05', replyTo: 1, reactions: [{ emoji: '💬', count: 1 }] }
    ],
    releases: [
      { id: 3, text: 'v1.2 is scheduled for Friday.', author: 'Release bot', time: '08:30', tag: '#release', reactions: [{ emoji: '🚀', count: 1 }] }
    ],
    'code-review': [],
    'flight-path': [
      { id: 101, text: 'Perfect. That\'s the move.', author: 'Adrian', time: '3:24 PM', reactions: [{ emoji: '✅', count: 1 }] },
      { id: 102, text: 'Small thing: the desktop-to-mobile handoff still feels a little fast.', author: 'Maya Chen', time: '3:25 PM', reactions: [{ emoji: '👀', count: 1 }] },
      { id: 103, text: 'Yeah — I want one extra beat on the sent message.', author: 'Jordan Brooks', time: '3:25 PM', reactions: [] },
      { id: 104, text: 'That would give the camera somewhere to land too.', author: 'Camille Dubois', time: '3:25 PM', reactions: [] },
      { id: 105, text: 'Fizz can you turn that into a clean three-beat capture plan?', author: 'Maya Chen', time: '3:25 PM', reactions: [{ emoji: '👀', count: 1 }, { emoji: '💬', count: 1 }] },
      { id: 106, text: `Absolutely — clean three-beat capture plan:
1. Desktop compose
   • Start on the project view.
   • One clean cursor move into the update field.
   • Type the short update without rushing.
2. Project header settle
   • After the transition, hold on the project header for a half beat.
   • Let the context change become legible before moving on.
   • Keep motion quick, but not slippery.
3. Mobile handoff / sent message
   • Cut to mobile.
   • Let the sent message land and hold one extra beat.
   • This gives the camera a clear final resting point and makes the handoff feel intentional.

Tiny rule of thumb: cursor moves once, transition breathes once, sent state lands once. Nice and buzzy 🐝✨
@honey over to you for the final capture pass.`, author: 'Fizz', time: '3:26 PM', reactions: [{ emoji: '👀', count: 1 }, { emoji: '💬', count: 1 }] },
      { id: 107, text: 'Looks great, thanks!', author: 'Honey', time: '3:27 PM', replyTo: 106, reactions: [] },
      { id: 108, text: '+1 on the extra beat.', author: 'Maya Chen', time: '3:28 PM', replyTo: 106, reactions: [] }
    ]
  },
  tags: ['#bug', '#feature', '#question', '#release']
};

const threadsView = new window.ThreadsView(
  document.getElementById('threads-view'),
  threadsData
);

let activeConversations = [];
let pastConversations = [...conversations];
let currentConversationId = null;

let ws = null;
let wsReady = false;

const executions = [];
let currentExecutionTitle = 'New chat';
let historyDetailId = null;

function connectBackend() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  try {
    ws = new WebSocket(`${protocol}//${location.host}/ws`);
  } catch {
    wsReady = false;
    return;
  }

  ws.onopen = () => {
    wsReady = true;
  };

  ws.onclose = () => {
    wsReady = false;
    setTimeout(connectBackend, 3000);
  };

  ws.onerror = () => {
    wsReady = false;
  };

  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      handleServerEvent(data);
    } catch {}
  };
}

function sendToBackend(text) {
  chatWindow.setEmpty(false);
  chatWindow.chat.addMessage(text, 'user');
  if (wsReady && ws) {
    ws.send(JSON.stringify({ event: 'user_message', text }));
  } else {
    chatWindow.chat.addMessage('Backend not connected. Select a conversation from the sidebar to see a scripted flow.', 'agent');
  }
}

function handleServerEvent(data) {
  const chat = chatWindow.chat;
  switch (data.event) {
    case 'add_message_chunk':
      chat.addMessageChunk(data.text, data.done);
      break;
    case 'render_mode':
      chat.setRenderMode(data.mode);
      break;
    case 'add_tool_call':
      chat.addToolCall(data.tool, data.args, data.result);
      break;
    case 'show_variants':
      chat.showVariants(data.title, data.options, (choice) => {
        ws.send(JSON.stringify({ event: 'variant_choice', id: data.id, choice }));
      });
      break;
    case 'show_confirmation':
      chat.showConfirmation(data.title, data.message, data.actions, (action) => {
        ws.send(JSON.stringify({ event: 'confirmation_choice', id: data.id, action }));
      });
      break;
    case 'show_secret':
      chat.showSecret(data.title, data.scope, (value) => {
        ws.send(JSON.stringify({ event: 'secret_value', id: data.id, value }));
      });
      break;
    case 'show_form':
      chat.showForm(data.title, data.fields, (formData) => {
        ws.send(JSON.stringify({ event: 'form_submit', id: data.id, data: formData }));
      });
      break;
    case 'add_code_change_card':
      chat.addCodeChangeCard(data.description, data.files);
      break;
    case 'error':
      chat.addMessage(`Error: ${data.message}`, 'agent');
      break;
    case 'done':
      chatWindow.composer.setDefault(msg => sendToBackend(msg));
      break;
  }
}

const sidebar = new window.Sidebar(
  document.getElementById('sidebar'),
  activeConversations,
  pastConversations,
  id => loadFlow(id),
  () => { showChat(); newChat(); },
  () => showAgents()
);

const settingsSidebar = new window.SettingsSidebar(
  document.getElementById('settings-sidebar'),
  () => {
    appEl.classList.remove('settings-active');
  }
);
const settingsContent = new window.SettingsContent(document.getElementById('settings-content'));

const appEl = document.getElementById('app');
const threadsBtn = document.querySelector('.threads-btn');

document.querySelector('.sidebar-toggle').addEventListener('click', () => {
  appEl.classList.toggle('sidebar-collapsed');
});

document.querySelector('.settings-btn').addEventListener('click', () => {
  appEl.classList.add('settings-active');
});

document.querySelector('.threads-btn').addEventListener('click', () => toggleThreads());

document.addEventListener('rightsidebartoggle', () => rightSidebar.toggle());

function archiveExecution() {
  const history = chatWindow.chat.getHistory();
  if (history.length === 0) return;
  executions.push({
    id: Date.now(),
    time: history[0]?.time || new Date().toLocaleTimeString(),
    title: currentExecutionTitle,
    steps: history
  });
}

function moveToActive(id) {
  if (currentConversationId === id) return;
  if (currentConversationId) {
    moveToPast(currentConversationId);
  }
  const pastIndex = pastConversations.findIndex(c => c.id === id);
  if (pastIndex !== -1) {
    activeConversations.push(pastConversations[pastIndex]);
    pastConversations.splice(pastIndex, 1);
  }
  if (!activeConversations.find(c => c.id === id)) {
    const conv = conversations.find(c => c.id === id);
    if (conv) activeConversations.push(conv);
  }
  currentConversationId = id;
  sidebar.activeId = id;
  sidebar.refresh();
}

function moveToPast(id) {
  const activeIndex = activeConversations.findIndex(c => c.id === id);
  if (activeIndex !== -1) {
    activeConversations.splice(activeIndex, 1);
  }
  if (!pastConversations.find(c => c.id === id)) {
    const conv = conversations.find(c => c.id === id);
    if (conv) pastConversations.push(conv);
  }
  if (currentConversationId === id) {
    currentConversationId = null;
  }
  sidebar.refresh();
}

function loadFlow(id) {
  archiveExecution();
  moveToActive(id);
  showChat();
  chatWindow.clear();
  chatWindow.setEmpty(false);
  selectedAgentId = null;
  const title = conversations.find(c => c.id === id)?.title || id;
  currentExecutionTitle = title;
  chatWindow.setFlow(id, title, flowMeta[id]);
  if (wsReady && ws) {
    ws.send(JSON.stringify({ event: 'user_message', text: title }));
  } else {
    runFlow(chatWindow, id);
  }
  rightSidebar.refresh();
}

function newChat() {
  archiveExecution();
  if (currentConversationId) {
    moveToPast(currentConversationId);
  }
  chatWindow.clear();
  chatWindow.setEmpty(true);
  chatWindow.composer.setDefault(msg => sendToBackend(msg));
  selectedAgentId = null;
  currentExecutionTitle = 'New chat';
  rightSidebar.refresh();
}

function showChat() {
  document.getElementById('chat-view').classList.add('active');
  document.getElementById('agents-view').classList.remove('active');
  appEl.classList.remove('threads-active');
  selectedAgentId = null;
  threadsBtn.classList.remove('active');
  rightSidebar.refresh();
}

function showAgents() {
  document.getElementById('agents-view').classList.add('active');
  document.getElementById('chat-view').classList.remove('active');
  appEl.classList.remove('threads-active');
  selectedAgentId = null;
  threadsBtn.classList.remove('active');
  rightSidebar.close();
}

function toggleThreads() {
  if (appEl.classList.contains('threads-active')) {
    showChat();
  } else {
    showThreads();
  }
}

function showThreads() {
  document.getElementById('chat-view').classList.remove('active');
  document.getElementById('agents-view').classList.remove('active');
  appEl.classList.add('threads-active');
  selectedAgentId = null;
  threadsBtn.classList.add('active');
  rightSidebar.close();
}

function openAgentInfo(id) {
  selectedAgentId = id;
  rightSidebar.open('info');
}

function renderInfo(el) {
  if (selectedAgentId) {
    const agent = agents.find(a => a.id === selectedAgentId);
    if (agent) {
      el.innerHTML = `
        <div class="panel-section"><div class="panel-label">Agent</div><div class="panel-value">${escapeHtml(agent.name)}</div></div>
        <div class="panel-section"><div class="panel-label">Description</div><div class="panel-value">${escapeHtml(agent.description)}</div></div>
      `;
      return;
    }
  }
  if (chatWindow.flowId) {
    const meta = chatWindow.flowMeta || {};
    const stateSteps = chatWindow.chat.getStateSteps();
    el.innerHTML = `
      <div class="panel-section"><div class="panel-label">Title</div><div class="panel-value">${escapeHtml(chatWindow.flowTitle || '-')}</div></div>
      <div class="panel-section"><div class="panel-label">Created by</div><div class="panel-value">${escapeHtml(meta.createdBy || '-')}</div></div>
      <div class="panel-section"><div class="panel-label">Integrations</div><div class="panel-tags">${(meta.integrations || []).map(i => `<span class="panel-tag">${escapeHtml(i)}</span>`).join('')}</div></div>
      <div class="panel-section"><div class="panel-label">State</div><div class="panel-steps">${stateSteps.length ? stateSteps.map((step, idx) => `<div class="panel-step ${idx === stateSteps.length - 1 ? 'active' : ''}"><span class="panel-step-time">${escapeHtml(step.time)}</span><span class="panel-step-label">${escapeHtml(step.label)}</span></div>`).join('') : '<div class="panel-placeholder">No steps yet</div>'}</div></div>
      <div class="panel-section"><div class="panel-label">Cron</div><div class="panel-value panel-code">${escapeHtml(meta.cron || '-')}</div></div>
    `;
    return;
  }
  el.innerHTML = '<div class="panel-placeholder">Select a conversation or an agent to see details.</div>';
}

function renderHistory(el) {
  if (historyDetailId) {
    const exec = executions.find(e => e.id === historyDetailId);
    if (!exec) {
      historyDetailId = null;
      renderHistory(el);
      return;
    }
    el.innerHTML = `
      <button class="back-btn">← Back</button>
      <div class="panel-section"><div class="panel-label">Execution</div><div class="panel-value">${escapeHtml(exec.title)}</div></div>
      <div class="panel-section"><div class="panel-label">Time</div><div class="panel-value">${escapeHtml(exec.time)}</div></div>
      <div class="panel-section"><div class="panel-label">Steps</div><div class="panel-steps">${exec.steps.map((step, idx) => `<div class="panel-step ${idx === exec.steps.length - 1 ? 'active' : ''}"><span class="panel-step-time">${escapeHtml(step.time)}</span><span class="panel-step-label">${escapeHtml(step.label)}</span></div>`).join('')}</div></div>
    `;
    el.querySelector('.back-btn').addEventListener('click', () => {
      historyDetailId = null;
      rightSidebar.refresh();
    });
    return;
  }

  if (executions.length === 0) {
    el.innerHTML = '<div class="panel-placeholder">No executions yet</div>';
    return;
  }
  const list = document.createElement('div');
  list.className = 'panel-history-list';
  executions.forEach(exec => {
    const card = document.createElement('button');
    card.className = 'panel-history-item';
    card.innerHTML = `<span class="panel-history-time">${escapeHtml(exec.time)}</span><span class="panel-history-label">${escapeHtml(exec.title)}</span>`;
    card.addEventListener('click', () => {
      historyDetailId = exec.id;
      rightSidebar.refresh();
    });
    list.appendChild(card);
  });
  el.innerHTML = '';
  el.appendChild(list);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

connectBackend();
newChat();
window.__debugChatWindow = chatWindow;
