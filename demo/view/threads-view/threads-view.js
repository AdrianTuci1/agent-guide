window.Modal = class Modal {
  constructor(title) {
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';
    this.container = document.createElement('div');
    this.container.className = 'modal-container';
    this.container.innerHTML = `
      <div class="modal-header">
        <h3>${title}</h3>
        <button class="modal-close">×</button>
      </div>
      <div class="modal-body"></div>
    `;
    this.body = this.container.querySelector('.modal-body');
    this.overlay.appendChild(this.container);
    document.body.appendChild(this.overlay);
    this.container.querySelector('.modal-close').addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', e => { if (e.target === this.overlay) this.close(); });
    this._onKey = e => { if (e.key === 'Escape') this.close(); };
    document.addEventListener('keydown', this._onKey);
  }

  close() {
    document.removeEventListener('keydown', this._onKey);
    this.overlay.remove();
  }
};

window.WorkspaceSidebar = class WorkspaceSidebar {
  constructor(el, workspaces, callbacks) {
    this.el = el;
    this.workspaces = workspaces || [];
    this.onSelect = callbacks?.onSelect;
    this.onEdit = callbacks?.onEdit;
    this.onAdd = callbacks?.onAdd;
    this.currentWorkspaceId = workspaces[0]?.id || null;
    this.render();
  }

  select(id) {
    this.currentWorkspaceId = id;
    this.onSelect?.(id);
    this.render();
  }

  render() {
    this.el.innerHTML = `
      <div class="workspace-list">
        ${this.workspaces.map(w => this._workspaceItem(w)).join('')}
      </div>
      <div class="workspace-divider"></div>
      <button class="workspace-add" title="Add workspace">+</button>
    `;
    this.el.querySelectorAll('.workspace-item').forEach(item => {
      item.addEventListener('click', () => this.select(item.dataset.id));
    });
    this.el.querySelectorAll('.workspace-edit').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        this.onEdit?.(btn.dataset.id);
      });
    });
    this.el.querySelector('.workspace-add').addEventListener('click', () => {
      const id = 'workspace-' + Date.now();
      const name = 'New';
      const color = this._randomColor();
      this.workspaces.push({ id, name, color, channels: [], directMessages: [], projects: [], messagesByChannel: {}, directMessagesById: {}, tags: ['#bug', '#feature', '#question', '#release'] });
      this.onAdd?.(id);
    });
  }

  _workspaceItem(w) {
    const selected = w.id === this.currentWorkspaceId;
    const initials = w.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    return `
      <div class="workspace-item ${selected ? 'selected' : ''}" data-id="${w.id}" style="background:${w.color}" title="${this._escapeHtml(w.name)}">
        <span class="workspace-initials">${initials}</span>
        <button class="workspace-edit" data-id="${w.id}" title="Edit workspace">✎</button>
      </div>
    `;
  }

  _randomColor() {
    const colors = ['#2563eb', '#10b981', '#f97316', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6', '#f59e0b'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
};

window.ThreadsSidebar = class ThreadsSidebar {
  constructor(el, data, callbacks) {
    this.el = el;
    this.channels = data.channels || [];
    this.directMessages = data.directMessages || [];
    this.onSelect = callbacks?.onSelect;
    this.onAgents = callbacks?.onAgents;
    this.selectedItem = callbacks?.selectedItem || { type: 'channel', id: this.channels[0]?.id };
    this.render();
  }

  update(data, selectedItem) {
    this.channels = data.channels || [];
    this.directMessages = data.directMessages || [];
    this.selectedItem = selectedItem;
    this.render();
  }

  render() {
    this.el.innerHTML = `
      <div class="threads-sidebar-nav">
        <div class="nav-item inbox-item" data-type="inbox">
          <span class="nav-icon">📥</span>
          <span class="nav-label">Inbox</span>
        </div>
        <div class="nav-item projects-item" data-type="projects">
          <span class="nav-icon">📁</span>
          <span class="nav-label">Projects</span>
        </div>
        <div class="nav-item agents-item" data-type="agents">
          <span class="nav-icon">🤖</span>
          <span class="nav-label">Agents</span>
        </div>
      </div>
      <div class="threads-sidebar-section">
        <h4>Channels</h4>
        <div class="channel-list">
          ${this.channels.map(c => this._channelItem(c)).join('')}
        </div>
      </div>
      <div class="threads-sidebar-section">
        <h4>Direct messages</h4>
        <div class="dm-list">
          ${this.directMessages.map(d => this._dmItem(d)).join('')}
        </div>
      </div>
    `;
    this._attachEvents();
  }

  _channelItem(c) {
    const selected = this.selectedItem.type === 'channel' && this.selectedItem.id === c.id;
    const icon = c.private ? '🔒' : '#';
    const badge = c.unread ? `<span class="unread-badge">${c.unread}${c.total ? '/' + c.total : ''}</span>` : '';
    return `
      <div class="channel-item ${selected ? 'selected' : ''}" data-type="channel" data-id="${c.id}">
        <span class="channel-icon">${icon}</span>
        <span class="channel-name">${this._escapeHtml(c.name)}</span>
        ${badge}
      </div>
    `;
  }

  _dmItem(d) {
    const selected = this.selectedItem.type === 'directMessage' && this.selectedItem.id === d.id;
    const badge = d.unread ? `<span class="unread-badge">${d.unread}</span>` : '';
    const avatar = this._avatarHtml(d.name, true);
    return `
      <div class="dm-item ${selected ? 'selected' : ''}" data-type="directMessage" data-id="${d.id}">
        <span class="dm-avatar">${avatar}</span>
        <span class="dm-name">${this._escapeHtml(d.name)}</span>
        ${badge}
      </div>
    `;
  }

  _attachEvents() {
    this.el.querySelectorAll('.nav-item[data-type]').forEach(item => {
      item.addEventListener('click', () => {
        const type = item.dataset.type;
        if (type === 'agents') {
          this.onAgents?.();
        } else {
          this.onSelect?.({ type });
        }
      });
    });
    this.el.querySelectorAll('.channel-item, .dm-item').forEach(item => {
      item.addEventListener('click', () => {
        this.onSelect?.({ type: item.dataset.type, id: item.dataset.id });
      });
    });
  }

  _avatarHtml(author, small) {
    const color = this._avatarColor(author);
    const initials = author.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    const sizeClass = small ? ' avatar-small' : '';
    return `<div class="threads-message-avatar${sizeClass}" style="background:${color}" title="${this._escapeHtml(author)}">${initials}</div>`;
  }

  _avatarColor(author) {
    const colors = {
      'Adrian': '#2563eb',
      'You': '#22c55e',
      'Release bot': '#9ca3af',
      'Maya Chen': '#ec4899',
      'Jordan Brooks': '#8b5cf6',
      'Camille Dubois': '#f97316',
      'Fizz': '#10b981',
      'Honey': '#ef4444'
    };
    if (colors[author]) return colors[author];
    let hash = 0;
    for (let i = 0; i < author.length; i++) {
      hash = author.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return 'hsl(' + hue + ', 60%, 45%)';
  }

  _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
};

window.ThreadsView = class ThreadsView {
  constructor(el, data, callbacks) {
    this.el = el;
    this.onAgents = callbacks?.onAgents;
    this.workspaces = data.workspaces || [];
    this.currentWorkspaceId = this.workspaces[0]?.id || null;
    this.useWorkspace(this.currentWorkspaceId);
    this.currentView = 'channel';
    this.currentChannelId = this.channels[0]?.id || null;
    this.currentDirectMessageId = null;
    this.replyTo = null;
    this.currentTag = '';
    this.reactionPickerEl = null;
    this._pickerClickOutside = null;
    this.render();
  }

  useWorkspace(id) {
    this.currentWorkspaceId = id;
    const ws = this.workspaces.find(w => w.id === id);
    this.activeWorkspace = ws;
    if (!ws) return;
    this.channels = ws.channels || [];
    this.directMessages = ws.directMessages || [];
    this.projects = ws.projects || [];
    this.messagesByChannel = ws.messagesByChannel || {};
    this.directMessagesById = ws.directMessagesById || {};
    this.tags = ws.tags || ['#bug', '#feature', '#question', '#release'];
    this.reactionEmojis = ['👀', '💬', '🎉', '👍', '🔥'];
  }

  render() {
    this.el.innerHTML = `
      <div class="threads-view">
        <div class="threads-workspace-sidebar"></div>
        <div class="threads-sidebar"></div>
        <div class="threads-main">
          <div class="threads-header">
            <div class="header-left">
              <span class="header-icon"></span>
              <span class="header-title"></span>
            </div>
            <div class="header-right">
              <button class="header-action members-btn" title="Members">👤</button>
              <button class="header-action call-btn" title="Call">🎧</button>
            </div>
          </div>
          <div class="threads-main-content"></div>
          <div class="threads-composer">
            <div class="composer-context hidden"></div>
            <input type="text" class="composer-input" placeholder="Message..." />
            <div class="composer-toolbar">
              <div class="toolbar-left">
                <button class="toolbar-btn mention-btn" title="Mention">@</button>
                <button class="toolbar-btn attach-btn" title="Attach">📎</button>
                <button class="toolbar-btn emoji-btn" title="Emoji">☺</button>
                <button class="toolbar-btn tag-btn" title="Tag">#</button>
                <button class="toolbar-btn format-btn" title="Format">Aa</button>
              </div>
              <button class="composer-send" title="Send">↑</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.workspaceSidebarEl = this.el.querySelector('.threads-workspace-sidebar');
    this.sidebarEl = this.el.querySelector('.threads-sidebar');
    this.headerIconEl = this.el.querySelector('.header-icon');
    this.headerTitleEl = this.el.querySelector('.header-title');
    this.mainContentEl = this.el.querySelector('.threads-main-content');
    this.composerEl = this.el.querySelector('.threads-composer');
    this.contextEl = this.el.querySelector('.composer-context');
    this.inputEl = this.el.querySelector('.composer-input');
    this.tagBtn = this.el.querySelector('.tag-btn');
    this.sendBtn = this.el.querySelector('.composer-send');

    this.workspaceSidebar = new window.WorkspaceSidebar(this.workspaceSidebarEl, this.workspaces, {
      onSelect: id => this.selectWorkspace(id),
      onEdit: id => this.openWorkspaceModal(id),
      onAdd: id => this.selectWorkspace(id)
    });
    this.sidebar = new window.ThreadsSidebar(this.sidebarEl, this._sidebarData(), {
      selectedItem: this._selectedItem(),
      onSelect: item => this.selectItem(item),
      onAgents: () => this.onAgents?.()
    });

    this.sendBtn.addEventListener('click', () => this.send());
    this.inputEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') this.send();
    });
    this.tagBtn.addEventListener('click', () => this.cycleComposerTag());

    this.el.querySelector('.mention-btn').addEventListener('click', () => this.insertAtCursor('@'));
    this.el.querySelector('.attach-btn').addEventListener('click', () => this.insertAtCursor('📎 '));
    this.el.querySelector('.emoji-btn').addEventListener('click', () => this.insertAtCursor('☺ '));
    this.el.querySelector('.format-btn').addEventListener('click', () => this.insertAtCursor('**'));

    this.renderMain();
  }

  _sidebarData() {
    return { channels: this.channels, directMessages: this.directMessages };
  }

  _selectedItem() {
    if (this.currentView === 'channel') return { type: 'channel', id: this.currentChannelId };
    if (this.currentView === 'directMessage') return { type: 'directMessage', id: this.currentDirectMessageId };
    return { type: this.currentView };
  }

  selectWorkspace(id) {
    this.hideReactionPicker();
    this.useWorkspace(id);
    this.currentView = 'channel';
    this.currentChannelId = this.channels[0]?.id || null;
    this.currentDirectMessageId = null;
    this.replyTo = null;
    this.currentTag = '';
    this.render();
  }

  selectItem(item) {
    this.hideReactionPicker();
    this.replyTo = null;
    this.currentTag = '';
    if (item.type === 'agents') {
      this.onAgents?.();
      return;
    }
    if (item.type === 'inbox') {
      this.currentView = 'inbox';
    } else if (item.type === 'projects') {
      this.openProjectsModal();
      return;
    } else if (item.type === 'channel') {
      this.currentView = 'channel';
      this.currentChannelId = item.id;
      this.currentDirectMessageId = null;
      const channel = this.findChannel(item.id);
      if (channel && channel.unread) channel.unread = 0;
    } else if (item.type === 'directMessage') {
      this.currentView = 'directMessage';
      this.currentDirectMessageId = item.id;
      this.currentChannelId = null;
      const dm = this.directMessages.find(d => d.id === item.id);
      if (dm && dm.unread) dm.unread = 0;
    }
    this.sidebar.update(this._sidebarData(), this._selectedItem());
    this.renderMain();
  }

  renderMain() {
    this.headerIconEl.innerHTML = this._headerIcon();
    this.headerTitleEl.textContent = this._headerTitle();
    this.inputEl.placeholder = this._composerPlaceholder();
    this.composerEl.classList.toggle('hidden', !this._hasComposer());
    if (this.currentView === 'inbox') {
      this.mainContentEl.innerHTML = '<div class="inbox-view"></div>';
      this.renderInbox();
    } else if (this.currentView === 'projects') {
      // Projects is now a modal; keep current view
      this.mainContentEl.innerHTML = '<div class="threads-messages"></div>';
      this.messagesEl = this.mainContentEl.querySelector('.threads-messages');
      this.renderMessages(this.currentMessages());
    } else {
      this.mainContentEl.innerHTML = '<div class="threads-messages"></div>';
      this.messagesEl = this.mainContentEl.querySelector('.threads-messages');
      this.renderMessages(this.currentMessages());
    }
  }

  _headerIcon() {
    if (this.currentView === 'inbox') return '📥';
    if (this.currentView === 'channel') {
      const channel = this.findChannel(this.currentChannelId);
      return channel?.private ? '🔒' : '#';
    }
    if (this.currentView === 'directMessage') {
      const dm = this.directMessages.find(d => d.id === this.currentDirectMessageId);
      return dm ? this._avatarHtml(dm.name, true) : '';
    }
    return '';
  }

  _headerTitle() {
    if (this.currentView === 'inbox') return 'Inbox';
    if (this.currentView === 'channel') return this.findChannel(this.currentChannelId)?.name || '';
    if (this.currentView === 'directMessage') return this.directMessages.find(d => d.id === this.currentDirectMessageId)?.name || '';
    return '';
  }

  _composerPlaceholder() {
    if (this.currentView === 'channel') return 'Message #' + (this.findChannel(this.currentChannelId)?.name || '');
    if (this.currentView === 'directMessage') return 'Message ' + (this.directMessages.find(d => d.id === this.currentDirectMessageId)?.name || '');
    return '';
  }

  _hasComposer() {
    return this.currentView === 'channel' || this.currentView === 'directMessage';
  }

  findChannel(id) {
    let channel = this.channels.find(c => c.id === id);
    if (channel) return channel;
    for (const p of this.projects) {
      for (const g of p.groups || []) {
        channel = (g.channels || []).find(c => c.id === id);
        if (channel) return channel;
      }
    }
    return null;
  }

  currentMessages() {
    if (this.currentView === 'channel') return this.messagesByChannel[this.currentChannelId] || [];
    if (this.currentView === 'directMessage') return this.directMessagesById[this.currentDirectMessageId] || [];
    return [];
  }

  renderMessages(messages) {
    this.messagesEl.innerHTML = '';
    if (messages.length === 0) {
      this.messagesEl.innerHTML = '<div class="threads-empty">No messages yet</div>';
      return;
    }
    messages.forEach((msg, idx) => {
      const prev = messages[idx - 1];
      const isGrouped = prev && prev.author === msg.author;
      const replyCount = messages.filter(m => m.replyTo === msg.id).length;
      const el = document.createElement('div');
      el.className = 'threads-message' + (isGrouped ? ' grouped' : '');
      el.dataset.id = msg.id;
      const avatarHtml = isGrouped ? '<div class="threads-message-avatar placeholder"></div>' : this._avatarHtml(msg.author);
      const headerHtml = isGrouped ? '' : `
        <div class="threads-message-header">
          <span class="threads-message-author">${this._escapeHtml(msg.author)}</span>
          <span class="threads-message-time">${this._escapeHtml(msg.time)}</span>
        </div>
      `;
      const replyToHtml = msg.replyTo ? `<div class="threads-message-reply">↳ replying to ${this._escapeHtml(this._replyLabel(msg.replyTo))}</div>` : '';
      const reactionsHtml = (msg.reactions || []).map(r => `<button class="reaction" data-emoji="${r.emoji}">${r.emoji} ${r.count}</button>`).join('');
      const tagHtml = msg.tag ? `<span class="message-tag">${this._escapeHtml(msg.tag)}</span>` : '';
      const replyBadgeHtml = replyCount ? `<button class="reply-badge" data-reply-id="${msg.id}">💬 ${replyCount}</button>` : '';
      el.innerHTML = `
        ${avatarHtml}
        <div class="threads-message-content">
          ${headerHtml}
          <div class="threads-message-body">${this._escapeHtml(msg.text)}</div>
          ${replyToHtml}
          <div class="threads-message-footer">
            <button class="msg-action reply-btn">Reply</button>
            <button class="msg-action tag-btn">Tag</button>
            <button class="msg-action react-btn">React</button>
            ${tagHtml}
            ${reactionsHtml}
            ${replyBadgeHtml}
          </div>
        </div>
      `;
      el.querySelector('.reply-btn').addEventListener('click', () => this.replyToMessage(msg.id));
      el.querySelector('.tag-btn').addEventListener('click', () => this.cycleMessageTag(msg.id));
      el.querySelector('.react-btn').addEventListener('click', e => this.showReactionPicker(msg.id, e.currentTarget));
      el.querySelectorAll('.reaction').forEach(btn => {
        btn.addEventListener('click', () => this.addReaction(msg.id, btn.dataset.emoji));
      });
      const replyBadge = el.querySelector('.reply-badge');
      if (replyBadge) {
        replyBadge.addEventListener('click', () => this.replyToMessage(msg.id));
      }
      this.messagesEl.appendChild(el);
    });
  }

  showReactionPicker(messageId, anchorEl) {
    this.hideReactionPicker();
    const picker = document.createElement('div');
    picker.className = 'reaction-picker';
    const emojis = ['👍', '❤️', '😂', '🎉', '😊', '👀', '🔥', '🚀'];
    picker.innerHTML = emojis.map(e => `<button class="reaction-picker-emoji">${e}</button>`).join('') + `<button class="reaction-picker-close">×</button>`;
    document.body.appendChild(picker);
    const rect = anchorEl.getBoundingClientRect();
    const pickerRect = picker.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + 6;
    if (left + pickerRect.width > window.innerWidth) left = window.innerWidth - pickerRect.width - 8;
    if (top + pickerRect.height > window.innerHeight) top = rect.top - pickerRect.height - 6;
    picker.style.left = left + 'px';
    picker.style.top = top + 'px';
    picker.querySelectorAll('.reaction-picker-emoji').forEach(btn => {
      btn.addEventListener('click', () => {
        this.addReaction(messageId, btn.textContent);
        this.hideReactionPicker();
      });
    });
    picker.querySelector('.reaction-picker-close').addEventListener('click', () => this.hideReactionPicker());
    this.reactionPickerEl = picker;
    setTimeout(() => {
      this._pickerClickOutside = e => {
        if (!picker.contains(e.target)) this.hideReactionPicker();
      };
      document.addEventListener('click', this._pickerClickOutside);
    }, 0);
  }

  hideReactionPicker() {
    if (this.reactionPickerEl) {
      this.reactionPickerEl.remove();
      this.reactionPickerEl = null;
    }
    if (this._pickerClickOutside) {
      document.removeEventListener('click', this._pickerClickOutside);
      this._pickerClickOutside = null;
    }
  }

  renderInbox() {
    const container = this.mainContentEl.querySelector('.inbox-view');
    const messages = this.computeInbox();
    if (messages.length === 0) {
      container.innerHTML = '<div class="threads-empty">No mentions or replies yet</div>';
      return;
    }
    const list = document.createElement('div');
    list.className = 'inbox-list';
    messages.forEach(item => {
      const row = document.createElement('div');
      row.className = 'inbox-item';
      const source = item.channelName || item.dmName || '';
      const avatar = this._avatarHtml(item.author);
      row.innerHTML = `
        <div class="inbox-avatar">${avatar}</div>
        <div class="inbox-content">
          <div class="inbox-meta">
            <span class="inbox-author">${this._escapeHtml(item.author)}</span>
            <span class="inbox-source">in ${this._escapeHtml(source)}</span>
            <span class="inbox-time">${this._escapeHtml(item.time)}</span>
          </div>
          <div class="inbox-text">${this._escapeHtml(item.text)}</div>
        </div>
      `;
      row.addEventListener('click', () => {
        if (item.type === 'channel') {
          this.selectItem({ type: 'channel', id: item.channelId });
        } else {
          this.selectItem({ type: 'directMessage', id: item.dmId });
        }
      });
      list.appendChild(row);
    });
    container.innerHTML = '';
    container.appendChild(list);
  }

  openWorkspaceModal(id) {
    const ws = this.workspaces.find(w => w.id === id);
    if (!ws) return;
    const modal = new window.Modal('Edit workspace');
    modal.body.innerHTML = `
      <div class="modal-form">
        <label>Workspace name</label>
        <input type="text" class="modal-input workspace-name" value="${this._escapeHtml(ws.name)}" />
        <label>Color</label>
        <div class="color-swatches">
          ${['#2563eb', '#10b981', '#f97316', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6', '#f59e0b'].map(c => `<button class="color-swatch ${c === ws.color ? 'selected' : ''}" style="background:${c}" data-color="${c}"></button>`).join('')}
        </div>
        <label>Channels</label>
        <div class="modal-channel-list"></div>
        <button class="modal-add-btn add-channel">+ Add channel</button>
      </div>
    `;
    const nameInput = modal.body.querySelector('.workspace-name');
    const swatches = modal.body.querySelectorAll('.color-swatch');
    swatches.forEach(btn => {
      btn.addEventListener('click', () => {
        swatches.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });
    const list = modal.body.querySelector('.modal-channel-list');
    const renderChannels = () => {
      list.innerHTML = ws.channels.map((c, idx) => `
        <div class="modal-channel-row" data-idx="${idx}">
          <input type="text" class="modal-input channel-name" value="${this._escapeHtml(c.name)}" placeholder="Channel name" />
          <label class="modal-checkbox"><input type="checkbox" class="channel-private" ${c.private ? 'checked' : ''} /> Private</label>
          <button class="modal-delete-btn delete-channel">🗑</button>
        </div>
      `).join('');
      list.querySelectorAll('.delete-channel').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.closest('.modal-channel-row').dataset.idx);
          const removed = ws.channels[idx];
          ws.channels.splice(idx, 1);
          delete ws.messagesByChannel[removed.id];
          renderChannels();
        });
      });
    };
    renderChannels();
    modal.body.querySelector('.add-channel').addEventListener('click', () => {
      const cid = 'channel-' + Date.now() + '-' + ws.channels.length;
      ws.channels.push({ id: cid, name: 'new-channel', private: false, unread: 0 });
      ws.messagesByChannel[cid] = [];
      renderChannels();
    });
    modal.container.querySelector('.modal-close').addEventListener('click', () => {
      modal.body.querySelectorAll('.modal-channel-row').forEach((row, idx) => {
        const name = row.querySelector('.channel-name').value.trim() || ws.channels[idx].name;
        ws.channels[idx].name = name;
        ws.channels[idx].private = row.querySelector('.channel-private').checked;
      });
      ws.name = nameInput.value.trim() || ws.name;
      const selected = modal.body.querySelector('.color-swatch.selected');
      if (selected) ws.color = selected.dataset.color;
      modal.close();
      this.useWorkspace(this.currentWorkspaceId);
      if (this.currentView === 'channel' && !this.findChannel(this.currentChannelId)) {
        this.currentChannelId = this.channels[0]?.id || null;
      }
      this.render();
    });
  }

  openProjectsModal() {
    const ws = this.activeWorkspace;
    const modal = new window.Modal('Manage projects');
    modal.body.innerHTML = `
      <div class="modal-form">
        <div class="modal-projects-list"></div>
        <button class="modal-add-btn add-project">+ Add project</button>
      </div>
    `;
    const projectsList = modal.body.querySelector('.modal-projects-list');
    const renderProjects = () => {
      projectsList.innerHTML = ws.projects.map((p, pIdx) => `
        <div class="modal-project-card" data-idx="${pIdx}">
          <div class="modal-project-header">
            <input type="text" class="modal-input project-name" value="${this._escapeHtml(p.name)}" placeholder="Project name" />
            <button class="modal-delete-btn delete-project">🗑</button>
          </div>
          <div class="modal-groups-list">
            ${(p.groups || []).map((g, gIdx) => `
              <div class="modal-group" data-gidx="${gIdx}">
                <div class="modal-group-header">
                  <input type="text" class="modal-input group-name" value="${this._escapeHtml(g.name)}" placeholder="Group name" />
                  <button class="modal-delete-btn delete-group">🗑</button>
                </div>
                <div class="modal-project-channels-list">
                  ${(g.channels || []).map((c, cIdx) => `
                    <div class="modal-project-channel-row" data-cidx="${cIdx}">
                      <input type="text" class="modal-input channel-name" value="${this._escapeHtml(c.name)}" placeholder="Channel name" />
                      <label class="modal-checkbox"><input type="checkbox" class="channel-private" ${c.private ? 'checked' : ''} /> Private</label>
                      <button class="modal-delete-btn delete-channel">🗑</button>
                    </div>
                  `).join('')}
                </div>
                <button class="modal-add-btn add-project-channel">+ Add channel</button>
              </div>
            `).join('')}
          </div>
          <button class="modal-add-btn add-group">+ Add group</button>
        </div>
      `).join('');
      projectsList.querySelectorAll('.delete-project').forEach(btn => {
        btn.addEventListener('click', () => {
          const pIdx = Number(btn.closest('.modal-project-card').dataset.idx);
          const project = ws.projects[pIdx];
          (project.groups || []).forEach(g => (g.channels || []).forEach(c => delete ws.messagesByChannel[c.id]));
          ws.projects.splice(pIdx, 1);
          renderProjects();
        });
      });
      projectsList.querySelectorAll('.delete-group').forEach(btn => {
        btn.addEventListener('click', () => {
          const card = btn.closest('.modal-project-card');
          const pIdx = Number(card.dataset.idx);
          const group = btn.closest('.modal-group');
          const gIdx = Number(group.dataset.gidx);
          (ws.projects[pIdx].groups[gIdx].channels || []).forEach(c => delete ws.messagesByChannel[c.id]);
          ws.projects[pIdx].groups.splice(gIdx, 1);
          renderProjects();
        });
      });
      projectsList.querySelectorAll('.delete-channel').forEach(btn => {
        btn.addEventListener('click', () => {
          const card = btn.closest('.modal-project-card');
          const pIdx = Number(card.dataset.idx);
          const group = btn.closest('.modal-group');
          const gIdx = Number(group.dataset.gidx);
          const row = btn.closest('.modal-project-channel-row');
          const cIdx = Number(row.dataset.cidx);
          const removed = ws.projects[pIdx].groups[gIdx].channels[cIdx];
          delete ws.messagesByChannel[removed.id];
          ws.projects[pIdx].groups[gIdx].channels.splice(cIdx, 1);
          renderProjects();
        });
      });
      projectsList.querySelectorAll('.add-project-channel').forEach(btn => {
        btn.addEventListener('click', () => {
          const card = btn.closest('.modal-project-card');
          const pIdx = Number(card.dataset.idx);
          const group = btn.closest('.modal-group');
          const gIdx = Number(group.dataset.gidx);
          const cid = 'project-' + pIdx + '-channel-' + Date.now() + '-' + gIdx;
          ws.projects[pIdx].groups[gIdx].channels.push({ id: cid, name: 'new-channel', private: false, unread: 0 });
          ws.messagesByChannel[cid] = [];
          renderProjects();
        });
      });
      projectsList.querySelectorAll('.add-group').forEach(btn => {
        btn.addEventListener('click', () => {
          const pIdx = Number(btn.closest('.modal-project-card').dataset.idx);
          ws.projects[pIdx].groups.push({ name: 'New group', channels: [] });
          renderProjects();
        });
      });
    };
    renderProjects();
    modal.body.querySelector('.add-project').addEventListener('click', () => {
      const pid = 'project-' + Date.now();
      ws.projects.push({ id: pid, name: 'New project', groups: [] });
      renderProjects();
    });
    modal.container.querySelector('.modal-close').addEventListener('click', () => {
      modal.body.querySelectorAll('.modal-project-card').forEach(card => {
        const pIdx = Number(card.dataset.idx);
        const project = ws.projects[pIdx];
        project.name = card.querySelector('.project-name').value.trim() || project.name;
        card.querySelectorAll('.modal-group').forEach(group => {
          const gIdx = Number(group.dataset.gidx);
          const g = project.groups[gIdx];
          g.name = group.querySelector('.group-name').value.trim() || g.name;
          group.querySelectorAll('.modal-project-channel-row').forEach(row => {
            const cIdx = Number(row.dataset.cidx);
            const c = g.channels[cIdx];
            c.name = row.querySelector('.channel-name').value.trim() || c.name;
            c.private = row.querySelector('.channel-private').checked;
          });
        });
      });
      modal.close();
      this.useWorkspace(this.currentWorkspaceId);
      if (this.currentView === 'channel' && !this.findChannel(this.currentChannelId)) {
        this.currentChannelId = this.channels[0]?.id || null;
      }
      this.render();
    });
  }

  computeInbox() {
    const inbox = [];
    this.channels.forEach(c => {
      (this.messagesByChannel[c.id] || []).forEach(m => {
        if (this._isMention(m, this.messagesByChannel[c.id])) {
          inbox.push({ ...m, type: 'channel', channelId: c.id, channelName: c.name });
        }
      });
    });
    this.directMessages.forEach(d => {
      (this.directMessagesById[d.id] || []).forEach(m => {
        if (this._isMention(m, this.directMessagesById[d.id])) {
          inbox.push({ ...m, type: 'dm', dmId: d.id, dmName: d.name });
        }
      });
    });
    return inbox.reverse();
  }

  _isMention(m, messages) {
    if (m.text && m.text.includes('@You')) return true;
    if (m.replyTo) {
      const parent = messages.find(p => p.id === m.replyTo);
      if (parent && parent.author === 'You') return true;
    }
    return false;
  }

  replyToMessage(id) {
    this.replyTo = id;
    this.renderContext();
    this.inputEl.focus();
  }

  renderContext() {
    if (!this.replyTo) {
      this.contextEl.classList.add('hidden');
      this.contextEl.innerHTML = '';
      return;
    }
    const messages = this.currentMessages();
    const msg = messages.find(m => m.id === this.replyTo);
    this.contextEl.classList.remove('hidden');
    this.contextEl.innerHTML = `
      <span>↳ Replying to ${msg ? this._escapeHtml(msg.author) : 'message'}</span>
      <button class="cancel-reply">×</button>
    `;
    this.contextEl.querySelector('.cancel-reply').addEventListener('click', () => {
      this.replyTo = null;
      this.renderContext();
    });
  }

  cycleComposerTag() {
    const currentIndex = this.tags.indexOf(this.currentTag);
    const nextIndex = (currentIndex + 1) % (this.tags.length + 1);
    this.currentTag = nextIndex === this.tags.length ? '' : this.tags[nextIndex];
    this.updateTagButton();
  }

  updateTagButton() {
    this.tagBtn.textContent = this.currentTag || '#';
    this.tagBtn.classList.toggle('active', !!this.currentTag);
    this.tagBtn.title = this.currentTag ? 'Tag: ' + this.currentTag : 'Tag';
  }

  cycleMessageTag(id) {
    const messages = this.currentMessages();
    const msg = messages.find(m => m.id === id);
    if (!msg) return;
    const currentIndex = this.tags.indexOf(msg.tag || '');
    const nextIndex = (currentIndex + 1) % (this.tags.length + 1);
    msg.tag = nextIndex === this.tags.length ? '' : this.tags[nextIndex];
    this.renderMessages(messages);
  }

  addReaction(id, emoji) {
    const messages = this.currentMessages();
    const msg = messages.find(m => m.id === id);
    if (!msg) return;
    if (!msg.reactions) msg.reactions = [];
    const existing = msg.reactions.find(r => r.emoji === emoji);
    if (existing) {
      existing.count += 1;
    } else {
      msg.reactions.push({ emoji, count: 1 });
    }
    this.renderMessages(messages);
  }

  send() {
    const text = this.inputEl.value.trim();
    if (!text) return;
    const messages = this.currentMessages();
    const newMsg = {
      id: Date.now(),
      text,
      author: 'You',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      replyTo: this.replyTo,
      tag: this.currentTag,
      reactions: []
    };
    messages.push(newMsg);
    this.inputEl.value = '';
    this.replyTo = null;
    this.currentTag = '';
    this.updateTagButton();
    this.renderMain();
  }

  insertAtCursor(text) {
    this.inputEl.value += text;
    this.inputEl.focus();
  }

  _replyLabel(id) {
    const messages = this.currentMessages();
    const msg = messages.find(m => m.id === id);
    return msg ? msg.author : 'message';
  }

  _avatarHtml(author, small) {
    const color = this._avatarColor(author);
    const initials = author.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    const sizeClass = small ? ' avatar-small' : '';
    return `<div class="threads-message-avatar${sizeClass}" style="background:${color}" title="${this._escapeHtml(author)}">${initials}</div>`;
  }

  _avatarColor(author) {
    const colors = {
      'Adrian': '#2563eb',
      'You': '#22c55e',
      'Release bot': '#9ca3af',
      'Maya Chen': '#ec4899',
      'Jordan Brooks': '#8b5cf6',
      'Camille Dubois': '#f97316',
      'Fizz': '#10b981',
      'Honey': '#ef4444'
    };
    if (colors[author]) return colors[author];
    let hash = 0;
    for (let i = 0; i < author.length; i++) {
      hash = author.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return 'hsl(' + hue + ', 60%, 45%)';
  }

  _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
};
