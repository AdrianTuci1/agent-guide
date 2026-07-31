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
      <div class="threads-sidebar-header">
        <h3>Channels</h3>
      </div>
      <div class="threads-channel-list"></div>
    `;
    const list = this.el.querySelector('.threads-channel-list');
    this.channels.forEach(channel => {
      const item = document.createElement('div');
      item.className = 'channel-item' + (channel.id === this.currentChannelId ? ' active' : '');
      item.dataset.id = channel.id;
      item.innerHTML = `<span class="channel-hash">#</span><span class="channel-name">${channel.name}</span>`;
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
    this.currentChannelId = this.channels[0]?.id || null;
    this.replyTo = null;
    this.currentTag = '';
    this.render();
  }

  render() {
    this.el.innerHTML = `
      <div class="threads-sidebar"></div>
      <div class="threads-main">
        <div class="threads-header"></div>
        <div class="threads-messages"></div>
        <div class="threads-composer">
          <div class="composer-context hidden"></div>
          <div class="composer-row">
            <select class="composer-tag">
              <option value="">Tag</option>
              ${this.tags.map(tag => `<option value="${tag}">${tag}</option>`).join('')}
            </select>
            <input type="text" class="composer-input" placeholder="Message #${this.currentChannelName()}" />
            <button class="composer-send">Send</button>
          </div>
        </div>
      </div>
    `;

    this.sidebarEl = this.el.querySelector('.threads-sidebar');
    this.headerEl = this.el.querySelector('.threads-header');
    this.messagesEl = this.el.querySelector('.threads-messages');
    this.contextEl = this.el.querySelector('.composer-context');
    this.inputEl = this.el.querySelector('.composer-input');
    this.tagEl = this.el.querySelector('.composer-tag');
    this.sendBtn = this.el.querySelector('.composer-send');

    this.sidebar = new window.ThreadsSidebar(this.sidebarEl, this.channels, id => this.selectChannel(id));

    this.tagEl.addEventListener('change', () => {
      this.currentTag = this.tagEl.value;
    });

    this.sendBtn.addEventListener('click', () => this.send());
    this.inputEl.addEventListener('keydown', e => {
      if (e.key === 'Enter') this.send();
    });

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
    this.headerEl.textContent = `#${this.currentChannelName()}`;
    this.inputEl.placeholder = `Message #${this.currentChannelName()}`;
    this.renderMessages();
    this.renderContext();
  }

  renderMessages() {
    this.messagesEl.innerHTML = '';
    const messages = this.messagesByChannel[this.currentChannelId] || [];
    if (messages.length === 0) {
      this.messagesEl.innerHTML = '<div class="threads-empty">No messages yet</div>';
      return;
    }
    messages.forEach(msg => {
      const el = document.createElement('div');
      el.className = 'threads-message';
      el.dataset.id = msg.id;
      el.innerHTML = `
        <div class="threads-message-header">
          <span class="threads-message-author">${msg.author}</span>
          <span class="threads-message-time">${msg.time}</span>
          ${msg.tag ? `<span class="threads-message-tag">${msg.tag}</span>` : ''}
        </div>
        <div class="threads-message-body">${this._escapeHtml(msg.text)}</div>
        ${msg.replyTo ? `<div class="threads-message-reply">↳ replying to ${this._replyLabel(msg.replyTo)}</div>` : ''}
        <div class="threads-message-actions">
          <button class="threads-action reply-btn">Reply</button>
          <select class="threads-action tag-btn">
            <option value="">Tag</option>
            ${this.tags.map(tag => `<option value="${tag}" ${msg.tag === tag ? 'selected' : ''}>${tag}</option>`).join('')}
          </select>
        </div>
      `;
      el.querySelector('.reply-btn').addEventListener('click', () => this.replyToMessage(msg.id));
      el.querySelector('.tag-btn').addEventListener('change', e => this.tagMessage(msg.id, e.target.value));
      this.messagesEl.appendChild(el);
    });
  }

  replyToMessage(id) {
    this.replyTo = id;
    this.renderContext();
    this.inputEl.focus();
  }

  tagMessage(id, tag) {
    const messages = this.messagesByChannel[this.currentChannelId] || [];
    const msg = messages.find(m => m.id === id);
    if (msg) {
      msg.tag = tag;
      this.renderMessages();
    }
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
      <span>↳ Replying to ${msg ? msg.author : 'message'}</span>
      <button class="cancel-reply">×</button>
    `;
    this.contextEl.querySelector('.cancel-reply').addEventListener('click', () => {
      this.replyTo = null;
      this.renderContext();
    });
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
      tag: this.currentTag
    };
    messages.push(newMsg);
    this.messagesByChannel[this.currentChannelId] = messages;
    this.inputEl.value = '';
    this.replyTo = null;
    this.currentTag = '';
    this.tagEl.value = '';
    this.renderMain();
  }

  _replyLabel(id) {
    const messages = this.messagesByChannel[this.currentChannelId] || [];
    const msg = messages.find(m => m.id === id);
    return msg ? `${msg.author}` : 'message';
  }

  _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
};
