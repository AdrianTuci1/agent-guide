window.SettingsContent = class SettingsContent {
  constructor(el, threadsData, currentUser) {
    this.el = el;
    this.threadsData = threadsData;
    this.currentUser = currentUser;
    this.selectedId = 'appearance';
    this.membersState = {
      selectedWorkspaceId: threadsData?.workspaces?.[0]?.id || null
    };
    this.keysState = {
      selectedWorkspaceId: threadsData?.workspaces?.[0]?.id || null,
      message: null
    };
    this.profile = {
      displayName: 'Adrian Tucicovenco',
      role: 'Engineering',
      status: 'Building agent workflows'
    };
    this.design = {
      theme: 'dark',
      accent: 'blue',
      font: 'system',
      density: 'default',
      radius: 'default'
    };
    this.render();
    this._applyDesign();
  }

  setSelected(id) {
    this.selectedId = id;
    this.render();
  }

  render() {
    this.el.innerHTML = this._renderPanel();
    this._attachListeners();
  }

  _renderPanel() {
    switch (this.selectedId) {
      case 'profile': return this._renderProfile();
      case 'keys': return this._renderKeys();
      case 'members': return this._renderMembers();
      case 'appearance': return this._renderAppearance();
      default: return this._renderPlaceholder();
    }
  }

  _renderProfile() {
    const icon = window.settingsIcons.user;
    return `
      <div class="settings-panel">
        <div class="settings-panel-header">
          <span class="settings-panel-icon">${icon}</span>
          <h2>Profile</h2>
        </div>
        <p class="settings-panel-description">Manage your display name, role, and status.</p>
        <div class="settings-form">
          <div class="settings-avatar">
            <div class="settings-avatar-placeholder">${this._escapeHtml(this.profile.displayName.charAt(0))}</div>
            <button class="settings-btn secondary" data-action="upload-avatar">Upload avatar</button>
          </div>
          <div class="settings-row">
            <label for="profile-name">Display name</label>
            <input type="text" id="profile-name" value="${this._escapeHtml(this.profile.displayName)}" />
          </div>
          <div class="settings-row">
            <label for="profile-role">Role</label>
            <input type="text" id="profile-role" value="${this._escapeHtml(this.profile.role)}" />
          </div>
          <div class="settings-row">
            <label for="profile-status">Status</label>
            <input type="text" id="profile-status" value="${this._escapeHtml(this.profile.status)}" />
          </div>
          <div class="settings-actions">
            <button class="settings-btn primary" data-action="save-profile">Save profile</button>
          </div>
        </div>
      </div>
    `;
  }

  _renderAppearance() {
    const icon = window.settingsIcons.monitor;
    const themes = [
      { id: 'dark', label: 'Dark' },
      { id: 'light', label: 'Light' },
      { id: 'midnight', label: 'Midnight' }
    ];
    const accents = [
      { id: 'blue', label: 'Blue', value: '#2563eb' },
      { id: 'green', label: 'Green', value: '#22c55e' },
      { id: 'purple', label: 'Purple', value: '#8b5cf6' },
      { id: 'orange', label: 'Orange', value: '#f97316' }
    ];
    const fonts = [
      { id: 'system', label: 'System' },
      { id: 'mono', label: 'Monospace' },
      { id: 'serif', label: 'Serif' }
    ];
    const densities = [
      { id: 'compact', label: 'Compact' },
      { id: 'default', label: 'Default' },
      { id: 'spacious', label: 'Spacious' }
    ];
    const radii = [
      { id: 'sharp', label: 'Sharp' },
      { id: 'default', label: 'Default' },
      { id: 'rounded', label: 'Rounded' }
    ];
    return `
      <div class="settings-panel">
        <div class="settings-panel-header">
          <span class="settings-panel-icon">${icon}</span>
          <h2>Appearance</h2>
        </div>
        <p class="settings-panel-description">Define the design system for the workspace: theme, accent, typography, density, and radius.</p>
        <div class="settings-form">
          <div class="settings-row">
            <label>Theme</label>
            <div class="settings-segmented" data-control="theme">
              ${themes.map(t => `<button class="settings-segment ${this.design.theme === t.id ? 'active' : ''}" data-value="${t.id}">${this._escapeHtml(t.label)}</button>`).join('')}
            </div>
          </div>
          <div class="settings-row">
            <label>Accent color</label>
            <div class="settings-color-grid" data-control="accent">
              ${accents.map(a => `<button class="settings-color-option ${this.design.accent === a.id ? 'active' : ''}" data-value="${a.id}" style="background:${a.value}" title="${this._escapeHtml(a.label)}"><span class="settings-color-check">${this.design.accent === a.id ? window.settingsIcons.check : ''}</span></button>`).join('')}
            </div>
          </div>
          <div class="settings-row">
            <label>Font family</label>
            <div class="settings-segmented" data-control="font">
              ${fonts.map(f => `<button class="settings-segment ${this.design.font === f.id ? 'active' : ''}" data-value="${f.id}">${this._escapeHtml(f.label)}</button>`).join('')}
            </div>
          </div>
          <div class="settings-row">
            <label>Density</label>
            <div class="settings-segmented" data-control="density">
              ${densities.map(d => `<button class="settings-segment ${this.design.density === d.id ? 'active' : ''}" data-value="${d.id}">${this._escapeHtml(d.label)}</button>`).join('')}
            </div>
          </div>
          <div class="settings-row">
            <label>Border radius</label>
            <div class="settings-segmented" data-control="radius">
              ${radii.map(r => `<button class="settings-segment ${this.design.radius === r.id ? 'active' : ''}" data-value="${r.id}">${this._escapeHtml(r.label)}</button>`).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  _renderKeys() {
    const icon = window.settingsIcons.key;
    const workspaces = this.threadsData?.workspaces || [];
    const selectedId = this.keysState.selectedWorkspaceId || workspaces[0]?.id;
    const workspace = workspaces.find(w => w.id === selectedId);
    const member = workspace ? window.IdentityManager.getWorkspaceMember(workspace, this.currentUser?.id) : null;
    const hasAccess = !!member;
    const status = hasAccess ? 'Authorized' : 'No access';
    const storedKey = this.currentUser?.keys?.[workspace?.id];
    return `
      <div class="settings-panel">
        <div class="settings-panel-header">
          <span class="settings-panel-icon">${icon}</span>
          <h2>Keys</h2>
        </div>
        <p class="settings-panel-description">Each workspace has its own key authorization. Upload a PEM file to register or authenticate.</p>
        ${workspaces.length ? `
          <div class="settings-row">
            <label>Select workspace</label>
            <div class="settings-workspace-tabs" data-control="keys-workspace">
              ${workspaces.map(ws => `
                <button class="settings-workspace-tab ${ws.id === selectedId ? 'active' : ''}" data-value="${ws.id}">
                  <span class="workspace-color-dot" style="background:${ws.color}"></span>
                  ${this._escapeHtml(ws.name)}
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}
        ${workspace ? `
          <div class="settings-form">
            <div class="settings-access-card ${hasAccess ? 'authorized' : 'denied'}">
              <div class="settings-access-icon">
                ${hasAccess ? window.settingsIcons.shield : window.settingsIcons.lock}
              </div>
              <div class="settings-access-info">
                <div class="settings-access-status">${this._escapeHtml(status)}</div>
                <div class="settings-access-meta">${hasAccess ? 'Fingerprint ' + this._escapeHtml(window.IdentityManager.fingerprint(member.publicKeyPem)) : 'Upload a PEM key file to gain access.'}</div>
              </div>
            </div>
            <div class="settings-row">
              <label>Upload PEM key file</label>
              <label class="settings-upload-zone">
                <input type="file" class="settings-file-input" accept=".pem,.txt" data-action="upload-key" data-workspace-id="${workspace.id}" />
                <span class="settings-upload-icon">${window.settingsIcons.key}</span>
                <span class="settings-upload-text">Click or drag a PEM file here</span>
                <span class="settings-upload-hint">public key to register · private key to authenticate</span>
              </label>
            </div>
            ${this.keysState.message ? `
              <div class="settings-row">
                <div class="settings-banner ${this.keysState.message.type}">
                  <span class="settings-banner-icon">${this.keysState.message.type === 'error' ? window.settingsIcons.minus : window.settingsIcons.check}</span>
                  <span>${this._escapeHtml(this.keysState.message.text)}</span>
                </div>
              </div>
            ` : ''}
            ${hasAccess ? `
              <div class="settings-actions">
                ${storedKey?.privateKeyPem ? `<button class="settings-btn secondary" data-action="download-workspace-key" data-workspace-id="${workspace.id}">Download private key</button>` : ''}
                <button class="settings-btn danger" data-action="remove-workspace-key" data-workspace-id="${workspace.id}">Remove my access</button>
              </div>
            ` : ''}
          </div>
        ` : '<div class="settings-panel-placeholder"><p>No workspaces available.</p></div>'}
      </div>
    `;
  }

  _renderMembers() {
    const icon = window.settingsIcons.users;
    const workspaces = this.threadsData?.workspaces || [];
    const selectedId = this.membersState.selectedWorkspaceId || workspaces[0]?.id;
    const workspace = workspaces.find(w => w.id === selectedId);
    const privateChannels = workspace ? this._allPrivateChannels(workspace) : [];
    return `
      <div class="settings-panel">
        <div class="settings-panel-header">
          <span class="settings-panel-icon">${icon}</span>
          <h2>Members</h2>
        </div>
        <p class="settings-panel-description">Authorize members by public key and grant access to private channels per workspace.</p>
        ${workspaces.length ? `
          <div class="settings-row">
            <label>Workspace</label>
            <div class="settings-workspace-tabs" data-control="members-workspace">
              ${workspaces.map(ws => `
                <button class="settings-workspace-tab ${ws.id === selectedId ? 'active' : ''}" data-value="${ws.id}">
                  <span class="workspace-color-dot" style="background:${ws.color}"></span>
                  ${this._escapeHtml(ws.name)}
                </button>
              `).join('')}
            </div>
          </div>
        ` : ''}
        ${workspace ? `
          <div class="settings-form">
            <div class="settings-row">
              <label>Add member</label>
              <div class="settings-add-member">
                <input type="text" class="member-name-input" placeholder="Name" />
                <select class="member-role-input">
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Owner</option>
                </select>
                <textarea class="member-key-input" rows="3" placeholder="Paste PEM public key"></textarea>
                <button class="settings-btn primary" data-action="add-member" data-workspace-id="${workspace.id}">
                  <span class="icon">${window.settingsIcons.plus}</span>
                  Authorize key
                </button>
              </div>
            </div>
            <div class="settings-row">
              <label>Authorized members (${workspace.authorizedKeys?.length || 0})</label>
              <div class="settings-member-list">
                ${(workspace.authorizedKeys || []).map(m => this._renderMemberRow(workspace, m, privateChannels)).join('')}
                ${!(workspace.authorizedKeys || []).length ? '<div class="settings-empty">No authorized members yet.</div>' : ''}
              </div>
            </div>
          </div>
        ` : '<div class="settings-panel-placeholder"><p>No workspaces available.</p></div>'}
      </div>
    `;
  }

  _renderMemberRow(workspace, member, privateChannels) {
    const isSelf = member.userId === this.currentUser?.id;
    const roleLabel = member.role ? member.role.charAt(0).toUpperCase() + member.role.slice(1) : 'Member';
    const keyPreview = member.publicKeyPem ? member.publicKeyPem.split('\n').slice(1, 3).join('') : '';
    return `
      <div class="settings-member-row ${isSelf ? 'self' : ''}" data-user-id="${member.userId}">
        <div class="settings-member-info">
          <div class="settings-member-name">
            ${this._escapeHtml(member.name || member.userId)}
            <span class="settings-member-role">${this._escapeHtml(roleLabel)}</span>
            ${isSelf ? '<span class="settings-member-badge">You</span>' : ''}
          </div>
          <div class="settings-member-key" title="${this._escapeHtml(member.publicKeyPem || '')}">${this._escapeHtml(keyPreview)}…</div>
        </div>
        <div class="settings-member-actions">
          <button class="settings-btn icon-btn danger" data-action="revoke-member" data-user-id="${member.userId}" data-workspace-id="${workspace.id}" title="Revoke workspace access">
            <span class="icon">${window.settingsIcons.trash}</span>
          </button>
        </div>
        ${privateChannels.length ? `
          <div class="settings-member-channels">
            <div class="settings-member-channels-label">Private channel access</div>
            <div class="settings-channel-toggles">
              ${privateChannels.map(c => {
                const allowed = window.IdentityManager.canAccessChannel(workspace, c, member.userId);
                const disabled = member.role === 'owner' || member.role === 'admin' ? 'disabled' : '';
                return `
                  <label class="settings-channel-toggle ${disabled ? 'disabled' : ''}">
                    <input type="checkbox" ${allowed ? 'checked' : ''} ${disabled} data-action="toggle-channel" data-user-id="${member.userId}" data-workspace-id="${workspace.id}" data-channel-id="${c.id}" />
                    <span class="toggle-track"><span class="toggle-thumb"></span></span>
                    <span class="toggle-label">
                      <span class="toggle-lock">${window.settingsIcons.lock}</span>
                      ${this._escapeHtml(c.name)}
                    </span>
                  </label>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  _allPrivateChannels(workspace) {
    const list = [];
    const add = c => { if (c.private) list.push(c); };
    (workspace.channels || []).forEach(add);
    (workspace.projects || []).forEach(p => (p.groups || []).forEach(g => (g.channels || []).forEach(add)));
    return list;
  }

  _keyFingerprint(publicKey) {
    if (!publicKey) return '—';
    const base64 = publicKey.replace(/-----[A-Z\s]+-----/g, '').replace(/\s/g, '');
    return base64.slice(0, 16).match(/.{1,4}/g)?.join(':') || '—';
  }

  _renderPlaceholder() {
    const titles = {
      'notifications': { icon: 'bell', description: 'Configure mention alerts, sounds, and do-not-disturb.' },
      'shortcuts': { icon: 'keyboard', description: 'View and customize keyboard shortcuts.' },
      'local-archive': { icon: 'archive', description: 'Browse and export local conversation archives.' },
      'hosted-communities': { icon: 'globe', description: 'Manage communities you host and their members.' },
      'templates': { icon: 'file', description: 'Create and share project and workflow templates.' },
      'invites': { icon: 'mail', description: 'Send and review invitations to your workspace.' },
      'settings-agents': { icon: 'robot', description: 'Configure agent roles, permissions, and integrations.' },
      'compute': { icon: 'server', description: 'Manage compute environments and resource limits.' },
      'experiments': { icon: 'flask', description: 'Toggle beta features and experimental tooling.' },
      'mobile': { icon: 'phone', description: 'Mobile app settings and sync preferences.' },
      'updates': { icon: 'download', description: 'Check for updates and view release notes.' }
    };
    const item = titles[this.selectedId] || { icon: 'monitor', description: 'Select a setting from the sidebar.' };
    return `
      <div class="settings-panel">
        <div class="settings-panel-header">
          <span class="settings-panel-icon">${window.settingsIcons[item.icon] || ''}</span>
          <h2>${this._escapeHtml(this._titleFor(this.selectedId))}</h2>
        </div>
        <p class="settings-panel-description">${this._escapeHtml(item.description)}</p>
        <div class="settings-panel-placeholder">
          <p>This section is a placeholder for the <strong>${this._escapeHtml(this._titleFor(this.selectedId))}</strong> settings.</p>
        </div>
      </div>
    `;
  }

  _titleFor(id) {
    const map = {
      'profile': 'Profile',
      'keys': 'Keys',
      'members': 'Members',
      'appearance': 'Appearance',
      'notifications': 'Notifications',
      'shortcuts': 'Shortcuts',
      'local-archive': 'Local archive',
      'hosted-communities': 'Hosted communities',
      'templates': 'Templates',
      'invites': 'Invites',
      'settings-agents': 'Agents',
      'compute': 'Compute',
      'experiments': 'Experiments',
      'mobile': 'Mobile',
      'updates': 'Updates'
    };
    return map[id] || 'Settings';
  }

  _attachListeners() {
    this.el.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => this._handleAction(btn.dataset.action, btn));
    });
    this.el.querySelectorAll('[data-control]').forEach(group => {
      const control = group.dataset.control;
      group.querySelectorAll('[data-value]').forEach(btn => {
        btn.addEventListener('click', () => {
          if (control === 'members-workspace') {
            this.membersState.selectedWorkspaceId = btn.dataset.value;
            this.render();
            return;
          }
          if (control === 'keys-workspace') {
            this.keysState.selectedWorkspaceId = btn.dataset.value;
            this.keysState.message = null;
            this.render();
            return;
          }
          this.design[control] = btn.dataset.value;
          this._applyDesign();
          this.render();
        });
      });
    });
    this.el.querySelectorAll('input[data-action="toggle-channel"]').forEach(input => {
      input.addEventListener('change', () => this._handleChannelToggle(input));
    });
    this.el.querySelectorAll('input[type="file"][data-action="upload-key"]').forEach(input => {
      input.addEventListener('change', () => this._handleKeyUpload(input));
    });
  }

  async _handleAction(action, btn) {
    if (action === 'save-profile') {
      const name = this.el.querySelector('#profile-name')?.value.trim();
      const role = this.el.querySelector('#profile-role')?.value.trim();
      const status = this.el.querySelector('#profile-status')?.value.trim();
      if (name) this.profile.displayName = name;
      if (role) this.profile.role = role;
      if (status) this.profile.status = status;
      btn.textContent = 'Saved';
      setTimeout(() => { btn.textContent = 'Save profile'; }, 1500);
      this.render();
      return;
    }
    if (action === 'remove-workspace-key') {
      const workspaceId = btn.dataset.workspaceId;
      const workspace = this.threadsData.workspaces.find(w => w.id === workspaceId);
      if (workspace) {
        window.IdentityManager.revokeKey(workspace, this.currentUser?.id);
      }
      window.refreshWorkspaceView?.();
      this.keysState.message = { type: 'info', text: 'Access removed for this workspace.' };
      this.render();
      return;
    }
    if (action === 'download-workspace-key') {
      const workspaceId = btn.dataset.workspaceId;
      const privateKeyPem = this.currentUser?.keys?.[workspaceId]?.privateKeyPem;
      if (privateKeyPem) {
        const blob = new Blob([privateKeyPem], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `workspace-${workspaceId}-private-key.pem`;
        a.click();
        URL.revokeObjectURL(url);
      }
      return;
    }
    if (action === 'add-member') {
      const workspaceId = btn.dataset.workspaceId;
      const workspace = this.threadsData.workspaces.find(w => w.id === workspaceId);
      const name = this.el.querySelector('.member-name-input')?.value.trim();
      const role = this.el.querySelector('.member-role-input')?.value || 'member';
      const key = this.el.querySelector('.member-key-input')?.value.trim();
      if (!workspace || !name || !key) return;
      const userId = 'user-' + key.slice(-16).replace(/[^a-zA-Z0-9]/g, '');
      window.IdentityManager.authorizeKey(workspace, {
        userId,
        name,
        publicKeyPem: key,
        role,
        invitedBy: this.currentUser?.id || null
      });
      window.refreshWorkspaceView?.();
      this.render();
      return;
    }
    if (action === 'revoke-member') {
      const workspaceId = btn.dataset.workspaceId;
      const userId = btn.dataset.userId;
      const workspace = this.threadsData.workspaces.find(w => w.id === workspaceId);
      if (workspace && userId !== this.currentUser?.id) {
        window.IdentityManager.revokeKey(workspace, userId);
      }
      window.refreshWorkspaceView?.();
      this.render();
      return;
    }
  }

  _handleChannelToggle(input) {
    const workspaceId = input.dataset.workspaceId;
    const userId = input.dataset.userId;
    const channelId = input.dataset.channelId;
    const workspace = this.threadsData.workspaces.find(w => w.id === workspaceId);
    if (!workspace) return;
    window.IdentityManager.setPrivateChannelAccess(workspace, userId, channelId, input.checked);
    window.refreshWorkspaceView?.();
  }

  async _handleKeyUpload(input) {
    const workspaceId = input.dataset.workspaceId;
    const workspace = this.threadsData.workspaces.find(w => w.id === workspaceId);
    const file = input.files?.[0];
    if (!workspace || !file) return;
    try {
      const pem = await window.IdentityManager.readFile(file);
      const type = window.IdentityManager.detectPemType(pem);
      if (type === 'public') {
        window.IdentityManager.authorizeKey(workspace, {
          userId: this.currentUser?.id,
          name: this.currentUser?.name || 'Unknown',
          publicKeyPem: pem,
          role: 'member',
          invitedBy: 'self'
        });
        this.keysState.message = { type: 'success', text: 'Public key registered. Access granted.' };
        window.refreshWorkspaceView?.();
      } else if (type === 'private') {
        const member = await window.IdentityManager.authenticateWithPrivateKey(workspace, pem);
        if (member) {
          this.currentUser.id = member.userId;
          this.currentUser.name = member.name || member.userId;
          this.currentUser.keys = this.currentUser.keys || {};
          this.currentUser.keys[workspaceId] = {
            publicKeyPem: member.publicKeyPem,
            privateKeyPem: pem
          };
          this.keysState.message = { type: 'success', text: `Authenticated as ${member.name || member.userId}.` };
          window.refreshWorkspaceView?.();
        } else {
          this.keysState.message = { type: 'error', text: 'No matching authorized public key found in this workspace.' };
        }
      } else {
        this.keysState.message = { type: 'error', text: 'Unrecognized PEM file. Expected public or private key.' };
      }
    } catch {
      this.keysState.message = { type: 'error', text: 'Failed to read file.' };
    }
    input.value = '';
    this.render();
  }

  _keyFingerprint(publicKey) {
    return window.IdentityManager.fingerprint(publicKey);
  }

  _applyDesign() {
    applyDesignSystem(this.design);
  }

  _escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
};
