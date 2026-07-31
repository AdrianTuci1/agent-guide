window.ThreadsSidebar = class ThreadsSidebar {
  constructor(el, channels, onSelect) {
    this.el = el;
    this.channels = channels;
    this.onSelect = onSelect;
    this.currentChannelId = channels[0]?.id || null;
    this.render();
  }

  setChannels(channels) {
    this.channels = channels;
    this.render();
  }

  select(channelId) {
    this.currentChannelId = channelId;
    this.el.querySelectorAll('.channel-item').forEach(item => {
      item.classList.toggle('active', item.dataset.id === channelId);
    });
    this.onSelect?.(channelId);
  }

  render() {
    this.el.innerHTML = `
      <div class='threads-sidebar-header'>
        <h3>Channels</h3>
      </div>
      <div class='threads-channel-list'></div>
    `;
    const list = this.el.querySelector('.threads-channel-list');
    this.channels.forEach(channel => {
      const item = document.createElement('div');
      item.className = 'channel-item' + (channel.id === this.currentChannelId ? ' active' : '');
      item.dataset.id = channel.id;
      item.innerHTML = `<span class='channel-hash'>#</span><span class='channel-name'>${channel.name}</span>`;
      item.addEventListener('click', () => this.select(channel.id));
      list.appendChild(item);
    });
  }
};

window.ThreadsView = class ThreadsView {
  constructor(el, data) {
    this.el = el;
    this.channels = data.channels || [];
    this.messagesByChannel = data.messagesByChannel || {};
    this.tags = data.tags || ['#bug', '#feature', '#question', '#release'];
    this.reactionEmojis = ['👀', '💬', '🎉', '👍', '🔥'];
    this.currentChannelId = this.channels[0]?.id || null;
    this.replyTo = null;
    this.currentTag = '';
    this.render();
  }

  render() {
    this.el.innerHTML = `
      <div class='threads-view'>
        <div class='threads-sidebar'></div>
        <div class='threads-main'>
          <div class='threads-header'>
            <div class='header-left'>
              <span class='header-hash'>#</span>
              <span class='header-title'></span>
            </div>
            <div class='header-right'>
              <button class='header-action members-btn' title='Members'>👤</button>
              <button class='header-action call-btn' title='Call'>🎧</button>
            </div>
          </div>
          <div class='threads-messages'></div>
          <div class='threads-composer'>
            <div class='composer-context hidden'></div>
            <input type='text' class='composer-input' placeholder='Message #${this.currentChannelName()}' />
            <div class='composer-toolbar'>
              <div class='toolbar-left'>
                <button class='toolbar-btn mention-btn' title='Mention'>@</button>
                <button class='toolbar-btn attach-btn' title='Attach'>📎</button>
                <button class='toolbar-btn emoji-btn' title='Emoji'>☺</button>
                <button class='toolbar-btn tag-btn' title='Tag'>#</button>
                <button class='toolbar-btn format-btn' title='Format'>Aa</button>
              </div>
              <button class='composer-send' title='Send'>↑</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.sidebarEl = this.el.querySelector('.threads-sidebar');
    this.headerTitleEl = this.el.querySelector('.header-title');
    this.messagesEl = this.el.querySelector('.threads-messages');
    this.contextEl = this.el.querySelector('.composer-context');
    this.inputEl = this.el.querySelector('.composer-input');
    this.tagBtn = this.el.querySelector('.tag-btn');
    this.sendBtn = this.el.querySelector('.composer-send');

    this.sidebar = new window.ThreadsSidebar(this.sidebarEl, this.channels, id => this.selectChannel(id));

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

  currentChannelName() {
    return this.channels.find(c => c.id === this.currentChannelId)?.name || '';
  }

  selectChannel(id) {
    this.currentChannelId = id;
    this.replyTo = null;
    this.renderMain();
  }

  renderMain() {
    const name = this.currentChannelName();
    this.headerTitleEl.textContent = name;
    this.inputEl.placeholder = 'Message #' + name;
    this.renderMessages();
    this.renderContext();
    this.updateTagButton();
  }

  renderMessages() {
    this.messagesEl.innerHTML = '';
    const messages = this.messagesByChannel[this.currentChannelId] || [];
    if (messages.length === 0) {
      this.messagesEl.innerHTML = '<div class=\'threads-empty\'>No messages yet</div>';
      return;
    }
    messages.forEach((msg, idx) => {
      const prev = messages[idx - 1];
      const isGrouped = prev && prev.author === msg.author;
      const replyCount = messages.filter(m => m.replyTo === msg.id).length;
      const el = document.createElement('div');
      el.className = 'threads-message' + (isGrouped ? ' grouped' : '');
      el.dataset.id = msg.id;
      const avatarHtml = isGrouped ? '<div class=\'threads-message-avatar placeholder\'></div>' : this._avatarHtml(msg.author);
      const headerHtml = isGrouped ? '' : `
        <div class='threads-message-header'>
          <span class='threads-message-author'>${this._escapeHtml(msg.author)}</span>
          <span class='threads-message-time'>${this._escapeHtml(msg.time)}</span>
        </div>
      `;
      const replyToHtml = msg.replyTo ? `<div class='threads-message-reply'>↳ replying to ${this._escapeHtml(this._replyLabel(msg.replyTo))}</div>` : '';
      const reactionsHtml = (msg.reactions || []).map(r => `<button class='reaction' data-emoji='${r.emoji}'>${r.emoji} ${r.count}</button>`).join('');
      const tagHtml = msg.tag ? `<span class='message-tag'>${this._escapeHtml(msg.tag)}</span>` : '';
      const replyBadgeHtml = replyCount ? `<button class='reply-badge' data-reply-id='${msg.id}'>💬 ${replyCount}</button>` : '';
      el.innerHTML = `
        ${avatarHtml}
        <div class='threads-message-content'>
          ${headerHtml}
          <div class='threads-message-body'>${this._escapeHtml(msg.text)}</div>
          ${replyToHtml}
          <div class='threads-message-footer'>
            <button class='msg-action reply-btn'>Reply</button>
            <button class='msg-action tag-btn'>Tag</button>
            <button class='msg-action react-btn'>React</button>
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
    const messages = this.messagesByChannel[this.currentChannelId] || [];
    const msg = messages.find(m => m.id === this.replyTo);
    this.contextEl.classList.remove('hidden');
    this.contextEl.innerHTML = `
      <span>↳ Replying to ${msg ? this._escapeHtml(msg.author) : 'message'}</span>
      <button class='cancel-reply'>×</button>
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
    const messages = this.messagesByChannel[this.currentChannelId] || [];
    const msg = messages.find(m => m.id === id);
    if (!msg) return;
    const currentIndex = this.tags.indexOf(msg.tag || '');
    const nextIndex = (currentIndex + 1) % (this.tags.length + 1);
    msg.tag = nextIndex === this.tags.length ? '' : this.tags[nextIndex];
    this.renderMessages();
  }

  addReaction(id, emoji) {
    const messages = this.messagesByChannel[this.currentChannelId] || [];
    const msg = messages.find(m => m.id === id);
    if (!msg) return;
    if (!msg.reactions) msg.reactions = [];
    const existing = msg.reactions.find(r => r.emoji === emoji);
    if (existing) {
      existing.count += 1;
    } else {
      msg.reactions.push({ emoji, count: 1 });
    }
    this.renderMessages();
  }

  send() {
    const text = this.inputEl.value.trim();
    if (!text) return;
    const messages = this.messagesByChannel[this.currentChannelId] || [];
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
    this.messagesByChannel[this.currentChannelId] = messages;
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
    const messages = this.messagesByChannel[this.currentChannelId] || [];
    const msg = messages.find(m => m.id === id);
    return msg ? msg.author : 'message';
  }

  _avatarHtml(author) {
    const color = this._avatarColor(author);
    const initials = author.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    return `<div class='threads-message-avatar' style='background:${color}' title='${this._escapeHtml(author)}'>${initials}</div>`;
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
