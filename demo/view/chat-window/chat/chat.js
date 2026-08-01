window.Chat = class Chat {
  constructor(chatEl, composer, runningBarEl, renderBarEl, renderLabelEl) {
    this.chatEl = chatEl;
    this.composer = composer;
    this.runningBarEl = runningBarEl;
    this.renderBarEl = renderBarEl;
    this.renderLabelEl = renderLabelEl;
    this.onComposerModeChange = null;
    this.autoApprove = false;
    this.renderMode = null;
    this.composerMode = 'default';
    this.stateSteps = [];
    this.history = [];
  }

  getStateSteps() {
    return this.stateSteps;
  }

  getHistory() {
    return this.history;
  }

  addMessage(text, sender = 'agent') {
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    div.textContent = text;
    this.chatEl.appendChild(div);
    this._scroll();
  }

  addMessageChunk(text, done = false) {
    let last = this.chatEl.querySelector('.message.agent[data-streaming="true"]');
    if (!last) {
      last = document.createElement('div');
      last.className = 'message agent';
      last.dataset.streaming = 'true';
      this.chatEl.appendChild(last);
    }
    if (text) {
      last.textContent += text;
    }
    if (done) {
      delete last.dataset.streaming;
    }
    this._scroll();
  }

  addRichMessage(html, sender = 'agent') {
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    div.innerHTML = html;
    this.chatEl.appendChild(div);
    this._scroll();
  }

  addCodeBlock(language, code) {
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block-wrapper';
    const pre = document.createElement('pre');
    pre.className = 'code-block';
    if (language) pre.dataset.lang = language;
    pre.textContent = code;
    const toggle = document.createElement('button');
    toggle.className = 'code-block-toggle';
    toggle.textContent = 'Show more';
    toggle.addEventListener('click', () => {
      const expanded = wrapper.classList.toggle('expanded');
      toggle.textContent = expanded ? 'Show less' : 'Show more';
    });
    wrapper.appendChild(pre);
    wrapper.appendChild(toggle);
    this.chatEl.appendChild(wrapper);
    this._scroll();
  }

  addCodeChangeCard(description, files) {
    const card = document.createElement('div');
    card.className = 'code-change-card composer-card collapsed';

    const topbar = document.createElement('div');
    topbar.className = 'code-change-topbar composer-topbar';

    const title = document.createElement('div');
    title.className = 'code-change-title';
    const icon = document.createElement('span');
    icon.className = 'code-change-icon';
    icon.textContent = '✓';
    const h4 = document.createElement('h4');
    h4.textContent = description;
    title.appendChild(icon);
    title.appendChild(h4);

    const toggle = document.createElement('button');
    toggle.className = 'code-change-toggle btn secondary';
    toggle.textContent = '▼';

    const actions = document.createElement('div');
    actions.className = 'composer-topbar-actions';
    actions.appendChild(toggle);

    topbar.appendChild(title);
    topbar.appendChild(actions);
    card.appendChild(topbar);

    const body = document.createElement('div');
    body.className = 'code-change-body';
    body.style.display = 'none';

    const tabs = document.createElement('div');
    tabs.className = 'code-change-tabs';
    const content = document.createElement('div');
    content.className = 'code-change-content';

    const pres = files.map((file, index) => {
      const tab = document.createElement('button');
      tab.className = `code-change-tab ${index === 0 ? 'active' : ''}`;
      tab.textContent = file.path;
      tab.addEventListener('click', (e) => {
        e.stopPropagation();
        tabs.querySelectorAll('.code-change-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        pres.forEach(p => p.classList.remove('active'));
        pres[index].classList.add('active');
      });
      tabs.appendChild(tab);

      const pre = document.createElement('pre');
      pre.className = `code-change-pre ${index === 0 ? 'active' : ''}`;
      if (file.mode) pre.dataset.mode = file.mode;
      pre.textContent = file.content;
      return pre;
    });

    const expand = () => {
      const collapsed = body.style.display === 'none';
      body.style.display = collapsed ? 'block' : 'none';
      toggle.textContent = collapsed ? '▲' : '▼';
      card.classList.toggle('collapsed', !collapsed);
    };

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      expand();
    });
    topbar.addEventListener('click', expand);

    pres.forEach(pre => content.appendChild(pre));
    body.appendChild(tabs);
    body.appendChild(content);
    card.appendChild(body);

    this.chatEl.appendChild(card);
    this._scroll();
  }

  setRenderMode(mode) {
    this.renderMode = mode;
    this.renderLabelEl.textContent = mode || 'idle';
    if (mode) {
      this.renderBarEl.classList.add('active');
      const label = this._renderModeLabel(mode);
      const time = new Date().toLocaleTimeString();
      this.stateSteps.push({ mode, label, time });
      this.history.push({
        time,
        label,
        mode,
        response: this._renderModeResponse(mode)
      });
    } else {
      this.renderBarEl.classList.remove('active');
    }
    this._updateRunningBar();
  }

  _renderModeLabel(mode) {
    const labels = {
      thinking: 'Thinking about the request',
      searching: 'Searching through files',
      generating: 'Generating a response',
      running: 'Running commands',
      syncing: 'Syncing changes',
      connecting: 'Connecting to environment',
      'analyzing-image': 'Analyzing the image',
      planning: 'Planning the steps'
    };
    return labels[mode] || `Running: ${mode}`;
  }

  _renderModeResponse(mode) {
    return `Agent state: ${this._renderModeLabel(mode)}.

This is the full execution context captured at this timestamp for observability. In a production integration this would contain the complete model response, tool outputs, and decision trace.`;
  }

  setComposerMode(mode) {
    this.composerMode = mode;
    this._updateRunningBar();
    this.onComposerModeChange?.(mode);
  }

  _updateRunningBar() {
    const mainComposerVisible = this.composer.el.style.display !== 'none';
    const show = this.renderMode && this.composerMode === 'default' && mainComposerVisible;
    this.runningBarEl.classList.toggle('active', show);
  }

  toggleAutoApprove() {
    this.autoApprove = !this.autoApprove;
    const btn = this.runningBarEl.querySelector('.fast-forward');
    if (btn) btn.classList.toggle('active', this.autoApprove);
  }

  stop() {
    this.setRenderMode(null);
    this.addMessage('Stopped.', 'agent');
  }

  addToolCall(tool, args, result) {
    const div = document.createElement('div');
    div.className = 'tool-call';
    div.textContent = this._toolSummary(tool, args);
    this.chatEl.appendChild(div);
    this._scroll();
  }

  showVariants(title, options, onSelect) {
    if (this.autoApprove && options.length) {
      onSelect?.(options[0]);
      return;
    }
    this._showInlineComposer(wrapper => {
      const inline = new window.Composer(wrapper);
      inline.showVariants(title, options, choice => {
        this._removeInlineComposer(wrapper);
        onSelect?.(choice);
      });
    });
  }

  showSecret(title, scope, onSubmit) {
    this._showInlineComposer(wrapper => {
      const inline = new window.Composer(wrapper);
      inline.showSecret(title, scope, value => {
        this._removeInlineComposer(wrapper);
        onSubmit?.(value);
      });
    });
  }

  showConfirmation(title, message, actions, onAction) {
    if (this.autoApprove && actions.length) {
      const action = actions.find(a => a !== 'Cancel') || actions[0];
      onAction?.(action);
      return;
    }
    this._showInlineComposer(wrapper => {
      const inline = new window.Composer(wrapper);
      inline.showConfirmation(title, message, actions, action => {
        this._removeInlineComposer(wrapper);
        onAction?.(action);
      });
    });
  }

  showForm(title, fields, onSubmit) {
    this._showInlineComposer(wrapper => {
      const inline = new window.Composer(wrapper);
      inline.showForm(title, fields, data => {
        this._removeInlineComposer(wrapper);
        onSubmit?.(data);
      });
    });
  }

  addActionList(items, callbacks) {
    const onActivate = typeof callbacks === 'function' ? callbacks : callbacks?.onActivate;
    const onComplete = typeof callbacks === 'object' ? callbacks?.onComplete : null;
    return new window.ActionList(this, items, onActivate, (status) => {
      this.composer.el.style.display = '';
      onComplete?.(status);
    });
  }

  clear() {
    this.chatEl.innerHTML = '<div class="chat-spacer"></div>';
    this.composer.el.style.display = '';
    this.setRenderMode(null);
    this.setComposerMode('default');
    this.autoApprove = false;
    this.stateSteps = [];
    this.history = [];
    const btn = this.runningBarEl?.querySelector('.fast-forward');
    if (btn) btn.classList.remove('active');
  }

  _showInlineComposer(renderer) {
    this.composer.el.style.display = 'none';
    this.setComposerMode('inline');
    const wrapper = document.createElement('div');
    wrapper.className = 'inline-composer';
    this.chatEl.appendChild(wrapper);
    renderer(wrapper);
    this._scroll();
  }

  _removeInlineComposer(wrapper) {
    wrapper.remove();
    this.composer.el.style.display = '';
    this.setComposerMode('default');
    this._scroll();
  }

  _scroll() {
    this.chatEl.scrollTop = this.chatEl.scrollHeight;
  }

  _toolSummary(tool, args) {
    const a = args || {};
    let arg = '';
    if (tool === 'run_shell') arg = a.command || '';
    else if (tool === 'read_file') arg = a.path || '';
    else if (tool === 'read_files') arg = Array.isArray(a.paths) ? a.paths.join(', ') : '';
    else if (tool === 'browse' || tool === 'read_pages' || tool === 'fetch') arg = Array.isArray(a.urls) ? a.urls.join(', ') : a.url || '';
    else if (tool === 'deploy') arg = [a.env && `env=${a.env}`, a.region && `region=${a.region}`].filter(Boolean).join(' ');
    return arg ? `${tool}: ${arg}` : tool;
  }

  _escape(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
};

window.ActionList = class ActionList {
  constructor(chat, items, onActivate, onComplete) {
    this.chat = chat;
    this.onActivate = onActivate;
    this.onComplete = onComplete;
    this.items = items.map((item, index) => ({
      id: item.id || index,
      label: item.label,
      status: item.status || 'pending',
      text: '',
      el: null,
      bodyEl: null,
      statusTextEl: null,
      active: false
    }));
    this.container = document.createElement('div');
    this.container.className = 'action-list';
    this.chat.chatEl.appendChild(this.container);
    this.chat._scroll();
    this._render();
    const first = this.items.findIndex(i => i.status === 'pending');
    if (first !== -1) this._activate(first);
  }

  _render() {
    this.container.innerHTML = '';
    this.items.forEach((item, index) => {
      const el = document.createElement('div');
      el.className = `action-item status-${item.status}`;
      el.innerHTML = `
        <div class="action-header">
          <span class="action-icon"></span>
          <span class="action-label">${this.chat._escape(item.label)}</span>
          <span class="action-status-text"></span>
        </div>
        <div class="action-body"></div>
      `;
      item.el = el;
      item.bodyEl = el.querySelector('.action-body');
      item.statusTextEl = el.querySelector('.action-status-text');
      this.container.appendChild(el);
    });
  }

  _updateItem(index) {
    const item = this.items[index];
    if (!item || !item.el) return;
    item.el.className = `action-item status-${item.status}${item.active ? ' active' : ''}`;
    item.statusTextEl.textContent = item.text;
  }

  _activate(index) {
    const item = this.items[index];
    if (!item || item.active || item.status !== 'pending') return;
    if (this.chat.autoApprove) {
      this._resolve(index, 'done', 'Auto-approved');
      return;
    }
    item.active = true;
    item.bodyEl.innerHTML = '';
    this._updateItem(index);
    this.chat.composer.el.style.display = 'none';
    this.chat._scroll();
    this.onActivate?.(index, item.bodyEl, (status, text) => this._resolve(index, status, text));
  }

  _resolve(index, status, text) {
    const item = this.items[index];
    if (!item) return;
    item.active = false;
    item.status = status;
    item.text = text || '';
    item.bodyEl.innerHTML = '';
    this._updateItem(index);
    this.chat._scroll();

    if (status === 'done') {
      const next = this.items.findIndex(i => i.status === 'pending');
      if (next !== -1) {
        this._activate(next);
        return;
      }
    }
    this.onComplete?.(status);
  }
};
