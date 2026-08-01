window.Sidebar = class Sidebar {
  constructor(el, activeConversations, pastConversations, onSelect, onNewChat, onOpenAgents) {
    this.el = el;
    this.activeConversations = activeConversations;
    this.pastConversations = pastConversations;
    this.onSelect = onSelect;
    this.onNewChat = onNewChat;
    this.onOpenAgents = onOpenAgents;
    this.selectedId = null;
    this.render();
  }

  setSelected(id) {
    this.selectedId = id;
  }

  render() {
    const newChatIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
    const agentsIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="4"></rect><circle cx="9" cy="10" r="2" fill="currentColor" stroke="none"></circle><circle cx="15" cy="10" r="2" fill="currentColor" stroke="none"></circle><path d="M9 15h6"></path></svg>`;
    this.el.innerHTML = `
      <div class="sidebar-expanded-content">
        <div class="sidebar-header">
          <div class="sidebar-brand">Agent Guide</div>
        </div>
        <button class="new-chat-btn">
          <span class="btn-icon">${newChatIcon}</span>
          <span>New chat</span>
        </button>
        <button class="agents-btn">
          <span class="btn-icon">${agentsIcon}</span>
          <span>Agents</span>
        </button>
        <div class="sidebar-section active-section">
          <h3>Active</h3>
          <div class="active-list conversation-list"></div>
        </div>
        <div class="sidebar-section past-section">
          <h3>Past</h3>
          <div class="past-list conversation-list"></div>
        </div>
      </div>
      <div class="sidebar-collapsed-content">
        <button class="collapsed-btn new-chat-collapsed" title="New chat">${newChatIcon}</button>
        <button class="collapsed-btn agents-collapsed" title="Agents">${agentsIcon}</button>
      </div>
    `;

    this.el.querySelector('.new-chat-btn').addEventListener('click', () => this.onNewChat?.());
    this.el.querySelector('.agents-btn').addEventListener('click', () => this.onOpenAgents?.());
    this.el.querySelector('.new-chat-collapsed').addEventListener('click', () => this.onNewChat?.());
    this.el.querySelector('.agents-collapsed').addEventListener('click', () => this.onOpenAgents?.());

    this.renderLists();
  }

  renderLists() {
    this.renderList(this.activeConversations, this.el.querySelector('.active-list'));
    this.renderList(this.pastConversations, this.el.querySelector('.past-list'));
  }

  refresh() {
    this.renderLists();
  }

  renderList(conversations, listEl) {
    listEl.innerHTML = '';
    if (conversations.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'conversation-empty';
      empty.textContent = 'None';
      listEl.appendChild(empty);
      return;
    }
    conversations.forEach(conv => {
      const item = document.createElement('div');
      item.className = 'conversation-item' + (conv.id === this.selectedId ? ' selected' : '');
      item.textContent = conv.title;
      item.dataset.id = conv.id;
      item.addEventListener('click', () => this.select(conv.id));
      listEl.appendChild(item);
    });
  }

  select(id) {
    this.selectedId = id;
    this.el.querySelectorAll('.conversation-item').forEach(item => {
      item.classList.toggle('selected', item.dataset.id === id);
    });
    this.onSelect?.(id);
  }
};
