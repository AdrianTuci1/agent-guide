window.RightSidebar = class RightSidebar {
  constructor(el, renderInfo, renderHistory) {
    this.el = el;
    this.renderInfo = renderInfo;
    this.renderHistory = renderHistory;
    this.activeTab = 'info';
    this.render();
  }

  render() {
    this.el.innerHTML = `
      <div class="right-sidebar-header">
        <div class="right-sidebar-tabs">
          <button class="right-sidebar-tab ${this.activeTab === 'info' ? 'active' : ''}" data-tab="info">Info</button>
          <button class="right-sidebar-tab ${this.activeTab === 'history' ? 'active' : ''}" data-tab="history">History</button>
        </div>
        <button class="right-sidebar-close" title="Close">×</button>
      </div>
      <div class="right-sidebar-content"></div>
    `;
    this.contentEl = this.el.querySelector('.right-sidebar-content');
    this.el.querySelectorAll('.right-sidebar-tab').forEach(btn => {
      btn.addEventListener('click', () => this.setTab(btn.dataset.tab));
    });
    this.el.querySelector('.right-sidebar-close').addEventListener('click', () => this.close());
    this.refresh();
  }

  setTab(tab) {
    this.activeTab = tab;
    this.el.querySelectorAll('.right-sidebar-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    this.refresh();
  }

  refresh() {
    this.contentEl.innerHTML = '';
    if (this.activeTab === 'info') {
      this.renderInfo(this.contentEl);
    } else {
      this.renderHistory(this.contentEl);
    }
  }

  open(tab = 'info') {
    this.activeTab = tab;
    this.el.classList.add('active');
    this.render();
  }

  close() {
    this.el.classList.remove('active');
  }

  toggle() {
    if (this.el.classList.contains('active')) {
      this.close();
    } else {
      this.open();
    }
  }
};
