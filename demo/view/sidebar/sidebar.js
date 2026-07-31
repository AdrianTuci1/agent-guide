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
    this.el.innerHTML = `
      <div class="sidebar-expanded-content">
        <button class="new-chat-btn">+ New chat</button>
        <button class="agents-btn">🤖 Agents</button>
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
        <button class="collapsed-btn new-chat-collapsed" title="New chat">+</button>
        <button class="collapsed-btn agents-collapsed" title="Agents">🤖</button>
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
