window.ChatWindow = class ChatWindow {
  constructor(el) {
    this.el = el;
    this.el.innerHTML = `
      <div class="chat-header">
        <div class="chat-header-actions">
          <button class="header-btn info-btn" title="Info">i</button>
        </div>
      </div>
      <div id="chat-window"><div class="chat-spacer"></div></div>
      <div id="composer-status-bar">
        <div class="running-label"><span class="running-dot"></span>Running...</div>
        <div class="running-actions">
          <button class="running-btn fast-forward" title="Auto approve" aria-label="Auto approve">⏩</button>
          <button class="running-btn stop" title="Stop" aria-label="Stop">⏹</button>
        </div>
      </div>
      <div id="composer"></div>
    `;
    this.chatEl = this.el.querySelector('#chat-window');
    this.runningBarEl = this.el.querySelector('#composer-status-bar');
    this.composerEl = this.el.querySelector('#composer');
    this.composer = new window.Composer(this.composerEl, mode => this.chat.setComposerMode(mode));
    this.chat = new window.Chat(this.chatEl, this.composer, this.runningBarEl, document.getElementById('render-bar'), document.getElementById('render-label'));
    this.runningBarEl.querySelector('.fast-forward').addEventListener('click', () => this.chat.toggleAutoApprove());
    this.runningBarEl.querySelector('.stop').addEventListener('click', () => this.chat.stop());
    this.el.querySelector('.info-btn').addEventListener('click', () => {
      this.el.dispatchEvent(new CustomEvent('rightsidebartoggle', { bubbles: true }));
    });
    this.flowId = null;
    this.flowTitle = '';
    this.flowMeta = null;
  }

  setFlow(id, title, meta) {
    this.flowId = id;
    this.flowTitle = title || '';
    this.flowMeta = meta || {};
  }

  clear() {
    this.chat.clear();
    this.composer.clear();
  }

  setEmpty(empty) {
    this.el.classList.toggle('empty', empty);
  }
};
