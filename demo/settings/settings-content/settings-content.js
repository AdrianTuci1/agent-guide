window.SettingsContent = class SettingsContent {
  constructor(el) {
    this.el = el;
    this.selectedId = 'appearance';
    this.items = {
      'profile': { icon: '👤', title: 'Profile', description: 'Manage your display name, avatar, and status.' },
      'appearance': { icon: '🎨', title: 'Appearance', description: 'Choose themes, fonts, and density for the workspace.' },
      'notifications': { icon: '🔔', title: 'Notifications', description: 'Configure mention alerts, sounds, and do-not-disturb.' },
      'shortcuts': { icon: '⌨️', title: 'Shortcuts', description: 'View and customize keyboard shortcuts.' },
      'custom-emoji': { icon: '🙂', title: 'Custom emoji', description: 'Upload and manage custom emoji for your workspace.' },
      'local-archive': { icon: '🗄️', title: 'Local archive', description: 'Browse and export local conversation archives.' },
      'hosted-communities': { icon: '🌐', title: 'Hosted communities', description: 'Manage communities you host and their members.' },
      'templates': { icon: '📄', title: 'Templates', description: 'Create and share project and workflow templates.' },
      'invites': { icon: '✉️', title: 'Invites', description: 'Send and review invitations to your workspace.' },
      'settings-agents': { icon: '🤖', title: 'Agents', description: 'Configure agent roles, permissions, and integrations.' },
      'compute': { icon: '⚙️', title: 'Compute', description: 'Manage compute environments and resource limits.' },
      'experiments': { icon: '🧪', title: 'Experiments', description: 'Toggle beta features and experimental tooling.' },
      'mobile': { icon: '📱', title: 'Mobile', description: 'Mobile app settings and sync preferences.' },
      'updates': { icon: '⬇️', title: 'Updates', description: 'Check for updates and view release notes.' }
    };
    this.render();
  }

  setSelected(id) {
    this.selectedId = id;
    this.render();
  }

  render() {
    const item = this.items[this.selectedId] || { icon: '⚙️', title: 'Settings', description: 'Select a setting from the sidebar.' };
    this.el.innerHTML = `
      <div class="settings-panel">
        <div class="settings-panel-header">
          <span class="settings-panel-icon">${item.icon}</span>
          <h2>${this._escapeHtml(item.title)}</h2>
        </div>
        <p class="settings-panel-description">${this._escapeHtml(item.description)}</p>
        <div class="settings-panel-placeholder">
          <p>This section is a placeholder for the <strong>${this._escapeHtml(item.title)}</strong> settings.</p>
        </div>
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
