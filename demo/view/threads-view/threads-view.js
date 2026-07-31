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
    return `
      <div class="dm-item ${selected ? 'selected' : ''}" data-type="directMessage" data-id="${d.id}">
        <span class="dm-status ${d.online ? 'online' : ''}"></span>
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
    this.channels = data.channels || [];
    this.projects = data.projects || [];
    this.directMessages = data.directMessages || [];
    this.messagesByChannel = data.messagesByChannel || {};
    this.directMessagesById = data.directMessagesById || {};
    this.tags = data.tags || ['#bug', '#feature', '#question', '#release'];
    this.reactionEmojis = ['👀', '💬', '🎉', '👍', '🔥'];
    this.currentView = 'channel';
    this.currentChannelId = this.channels[0]?.id || null;
    this.currentProjectId = null;
    this.currentDirectMessageId = null;
    this.replyTo = null;
    this.currentTag = '';
    this.showNewProjectForm = false;
    this.render();
  }

  render() {
    this.el.innerHTML = `
      <div class="threads-view">
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

    this.sidebarEl = this.el.querySelector('.threads-sidebar');
    this.headerIconEl = this.el.querySelector('.header-icon');
    this.headerTitleEl = this.el.querySelector('.header-title');
    this.mainContentEl = this.el.querySelector('.threads-main-content');
    this.composerEl = this.el.querySelector('.threads-composer');
    this.contextEl = this.el.querySelector('.composer-context');
    this.inputEl = this.el.querySelector('.composer-input');
    this.tagBtn = this.el.querySelector('.tag-btn');
    this.sendBtn = this.el.querySelector('.composer-send');

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

  selectItem(item) {
    this.replyTo = null;
    this.currentTag = '';
    this.showNewProjectForm = false;
    if (item.type === 'agents') {
      this.onAgents?.();
      return;
    }
    if (item.type === 'inbox') {
      this.currentView = 'inbox';
    } else if (item.type === 'projects') {
      this.currentView = 'projects';
      this.currentProjectId = null;
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
      this.mainContentEl.innerHTML = '<div class="projects-view"></div>';
      this.renderProjects();
    } else {
      this.mainContentEl.innerHTML = '<div class="threads-messages"></div>';
      this.messagesEl = this.mainContentEl.querySelector('.threads-messages');
      this.renderMessages(this.currentMessages());
    }
  }

  _headerIcon() {
    if (this.currentView === 'inbox') return '📥';
    if (this.currentView === 'projects') return '📁';
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
    if (this.currentView === 'projects') return 'Projects';
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
      el.querySelector('.react-btn').addEventListener('click', () => this.addReaction(msg.id, '👀'));
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

  renderProjects() {
    const container = this.mainContentEl.querySelector('.projects-view');
    container.innerHTML = `
      <div class="projects-header">
        <button class="new-project-btn">+ New project</button>
      </div>
      <div class="projects-list"></div>
    `;
    const list = container.querySelector('.projects-list');
    if (this.showNewProjectForm) {
      const form = document.createElement('div');
      form.className = 'new-project-form';
      form.innerHTML = `
        <input type="text" class="new-project-name" placeholder="Project name" />
        <input type="text" class="new-project-group" placeholder="First group (e.g. Engineering)" />
        <div class="new-project-actions">
          <button class="create-project-btn btn">Create</button>
          <button class="cancel-project-btn btn secondary">Cancel</button>
        </div>
      `;
      list.appendChild(form);
      form.querySelector('.create-project-btn').addEventListener('click', () => this.createProject());
      form.querySelector('.cancel-project-btn').addEventListener('click', () => {
        this.showNewProjectForm = false;
        this.renderProjects();
      });
      form.querySelector('.new-project-name').addEventListener('keydown', e => { if (e.key === 'Enter') this.createProject(); });
      form.querySelector('.new-project-group').addEventListener('keydown', e => { if (e.key === 'Enter') this.createProject(); });
    }
    this.projects.forEach(p => {
      const card = document.createElement('div');
      card.className = 'project-card';
      let channelsHtml = '';
      (p.groups || []).forEach(g => {
        channelsHtml += `<div class="project-group-name">${this._escapeHtml(g.name)}</div>`;
        channelsHtml += `<div class="project-group-channels">`;
        (g.channels || []).forEach(c => {
          const icon = c.private ? '🔒' : '#';
          channelsHtml += `
            <div class="project-channel-item" data-channel-id="${c.id}">
              <span class="channel-icon">${icon}</span>
              <span class="channel-name">${this._escapeHtml(c.name)}</span>
              ${c.unread ? `<span class="unread-badge">${c.unread}</span>` : ''}
            </div>
          `;
        });
        channelsHtml += `</div>`;
      });
      card.innerHTML = `
        <div class="project-header">
          <span class="project-icon">📁</span>
          <span class="project-name">${this._escapeHtml(p.name)}</span>
        </div>
        ${channelsHtml}
      `;
      card.querySelectorAll('.project-channel-item').forEach(item => {
        item.addEventListener('click', () => {
          this.selectItem({ type: 'channel', id: item.dataset.channelId });
        });
      });
      list.appendChild(card);
    });
    container.querySelector('.new-project-btn').addEventListener('click', () => {
      this.showNewProjectForm = true;
      this.renderProjects();
    });
  }

  createProject() {
    const container = this.mainContentEl.querySelector('.projects-view');
    const nameInput = container.querySelector('.new-project-name');
    const groupInput = container.querySelector('.new-project-group');
    const name = nameInput.value.trim();
    const groupName = groupInput.value.trim() || 'General';
    if (!name) return;
    const id = 'project-' + Date.now();
    this.projects.push({
      id,
      name,
      groups: [{ name: groupName, channels: [{ id: id + '-general', name: 'general', private: false, unread: 0 }] }]
    });
    this.messagesByChannel[id + '-general'] = [];
    this.showNewProjectForm = false;
    this.renderProjects();
    this.sidebar.update(this._sidebarData(), this._selectedItem());
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
