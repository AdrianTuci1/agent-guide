window.SettingsSidebar = class SettingsSidebar {
  constructor(el, onBack, onSelect) {
    this.el = el;
    this.onBack = onBack;
    this.onSelect = onSelect;
    this.selectedId = 'appearance';
    this.groups = [
      {
        title: 'Personal',
        items: [
          { id: 'profile', label: 'Profile', icon: '👤' },
          { id: 'appearance', label: 'Appearance', icon: '🎨' },
          { id: 'notifications', label: 'Notifications', icon: '🔔' },
          { id: 'shortcuts', label: 'Shortcuts', icon: '⌨️' },
          { id: 'custom-emoji', label: 'Custom emoji', icon: '🙂' },
          { id: 'local-archive', label: 'Local archive', icon: '🗄️' }
        ]
      },
      {
        title: 'Communities',
        items: [
          { id: 'hosted-communities', label: 'Hosted communities', icon: '🌐' },
          { id: 'templates', label: 'Templates', icon: '📄' },
          { id: 'invites', label: 'Invites', icon: '✉️' }
        ]
      },
      {
        title: 'App',
        items: [
          { id: 'settings-agents', label: 'Agents', icon: '🤖' },
          { id: 'compute', label: 'Compute', icon: '⚙️' },
          { id: 'experiments', label: 'Experiments', icon: '🧪' },
          { id: 'mobile', label: 'Mobile', icon: '📱' },
          { id: 'updates', label: 'Updates', icon: '⬇️' }
        ]
      }
    ];
    this.render();
  }

  select(id) {
    this.selectedId = id;
    this.render();
    this.onSelect?.(id);
  }

  render() {
    this.el.innerHTML = `
      <button class="settings-back">← Back</button>
      <div class="settings-menu">
        ${this.groups.map(g => this._renderGroup(g)).join('')}
      </div>
    `;
    this.el.querySelector('.settings-back').addEventListener('click', () => this.onBack?.());
    this.el.querySelectorAll('.settings-menu-item').forEach(item => {
      item.addEventListener('click', () => this.select(item.dataset.id));
    });
  }

  _renderGroup(group) {
    return `
      <div class="settings-menu-group">
        <h4 class="settings-menu-title">${this._escapeHtml(group.title)}</h4>
        ${group.items.map(item => `
          <div class="settings-menu-item ${item.id === this.selectedId ? 'selected' : ''}" data-id="${item.id}">
            <span class="settings-menu-icon">${item.icon}</span>
            <span class="settings-menu-label">${this._escapeHtml(item.label)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
};
