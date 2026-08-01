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
          { id: 'profile', label: 'Profile', icon: 'user' },
          { id: 'keys', label: 'Keys', icon: 'key' },
          { id: 'appearance', label: 'Appearance', icon: 'monitor' },
          { id: 'notifications', label: 'Notifications', icon: 'bell' },
          { id: 'shortcuts', label: 'Shortcuts', icon: 'keyboard' },
          { id: 'local-archive', label: 'Local archive', icon: 'archive' }
        ]
      },
      {
        title: 'Communities',
        items: [
          { id: 'members', label: 'Members', icon: 'users' },
          { id: 'hosted-communities', label: 'Hosted communities', icon: 'globe' },
          { id: 'templates', label: 'Templates', icon: 'file' },
          { id: 'invites', label: 'Invites', icon: 'mail' }
        ]
      },
      {
        title: 'App',
        items: [
          { id: 'settings-agents', label: 'Agents', icon: 'robot' },
          { id: 'compute', label: 'Compute', icon: 'server' },
          { id: 'experiments', label: 'Experiments', icon: 'flask' },
          { id: 'mobile', label: 'Mobile', icon: 'phone' },
          { id: 'updates', label: 'Updates', icon: 'download' }
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
      <button class="settings-back"><span class="settings-back-icon">${window.settingsIcons.arrowLeft}</span> Back</button>
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
            <span class="settings-menu-icon">${window.settingsIcons[item.icon] || ''}</span>
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
