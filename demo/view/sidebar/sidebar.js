window.Sidebar = class Sidebar {
  constructor(el, conversations, onSelect, onNewChat, onOpenAgents) {
    this.el = el;
    this.conversations = conversations;
    this.onSelect = onSelect;
    this.onNewChat = onNewChat;
    this.onOpenAgents = onOpenAgents;
    this.activeId = null;
    this.render();
  }

  render() {
    this.el.innerHTML = `
      <div class="sidebar-expanded-content">
        <button class="new-chat-btn">+ New chat</button>
        <button class="agents-btn">🤖 Agents</button>
        <h3>Conversations</h3>
        <div class="conversation-list"></div>
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

    this.renderConversations();
  }

  renderConversations() {
    const list = this.el.querySelector('.conversation-list');
    list.innerHTML = '';
    this.conversations.forEach(conv => {
      const item = document.createElement('div');
      item.className = 'conversation-item';
      item.textContent = conv.title;
      item.dataset.id = conv.id;
      item.addEventListener('click', () => this.select(conv.id));
      list.appendChild(item);
    });
  }

  select(id) {
    this.activeId = id;
    this.el.querySelectorAll('.conversation-item').forEach(item => {
      item.classList.toggle('active', item.dataset.id === id);
    });
    this.onSelect?.(id);
  }
};
