window.IdentityManager = {
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  },

  base64ToArrayBuffer(base64) {
    const binary = atob(base64.replace(/\s/g, ''));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  },

  arrayBufferToPemBase64(buffer) {
    const base64 = this.arrayBufferToBase64(buffer);
    let pem = '';
    for (let i = 0; i < base64.length; i += 64) {
      pem += base64.slice(i, i + 64) + '\n';
    }
    return pem.trim();
  },

  async generateUserKeyPair() {
    return await crypto.subtle.generateKey(
      {
        name: 'RSA-PSS',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256'
      },
      true,
      ['sign', 'verify']
    );
  },

  async exportPublicKeyPem(keyPair) {
    const exported = await crypto.subtle.exportKey('spki', keyPair.publicKey);
    return '-----BEGIN PUBLIC KEY-----\n' + this.arrayBufferToPemBase64(exported) + '\n-----END PUBLIC KEY-----';
  },

  async exportPrivateKeyPem(keyPair) {
    const exported = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    return '-----BEGIN PRIVATE KEY-----\n' + this.arrayBufferToPemBase64(exported) + '\n-----END PRIVATE KEY-----';
  },

  async importPublicKeyFromPem(pem) {
    const base64 = pem
      .replace(/-----BEGIN PUBLIC KEY-----/, '')
      .replace(/-----END PUBLIC KEY-----/, '')
      .replace(/\s/g, '');
    const binary = this.base64ToArrayBuffer(base64);
    return await crypto.subtle.importKey(
      'spki',
      binary,
      { name: 'RSA-PSS', hash: 'SHA-256' },
      true,
      ['verify']
    );
  },

  async importPrivateKeyFromPem(pem) {
    const base64 = pem
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\s/g, '');
    const binary = this.base64ToArrayBuffer(base64);
    return await crypto.subtle.importKey(
      'pkcs8',
      binary,
      { name: 'RSA-PSS', hash: 'SHA-256' },
      true,
      ['sign']
    );
  },

  async signChallenge(privateKeyPem, challenge) {
    const privateKey = await this.importPrivateKeyFromPem(privateKeyPem);
    const encoded = new TextEncoder().encode(challenge);
    const signature = await crypto.subtle.sign(
      { name: 'RSA-PSS', saltLength: 32 },
      privateKey,
      encoded
    );
    return this.arrayBufferToBase64(signature);
  },

  async verifyChallenge(publicKeyPem, signatureBase64, challenge) {
    try {
      const publicKey = await this.importPublicKeyFromPem(publicKeyPem);
      const signature = this.base64ToArrayBuffer(signatureBase64);
      const encoded = new TextEncoder().encode(challenge);
      return await crypto.subtle.verify(
        { name: 'RSA-PSS', saltLength: 32 },
        publicKey,
        signature,
        encoded
      );
    } catch {
      return false;
    }
  },

  getWorkspaceMember(workspace, userId) {
    return (workspace.authorizedKeys || []).find(m => m.userId === userId) || null;
  },

  canAccessWorkspace(workspace, userId) {
    return !!this.getWorkspaceMember(workspace, userId);
  },

  canAccessChannel(workspace, channel, userId) {
    if (!channel.private) return true;
    if (!workspace || !this.canAccessWorkspace(workspace, userId)) return false;
    const member = this.getWorkspaceMember(workspace, userId);
    if (member.role === 'owner' || member.role === 'admin') return true;
    if (channel.members && channel.members.includes(userId)) return true;
    if (member.privateChannels && member.privateChannels.includes(channel.id)) return true;
    return false;
  },

  authorizeKey(workspace, { userId, name, publicKeyPem, role = 'member', invitedBy = null, privateChannels = [] }) {
    workspace.authorizedKeys = workspace.authorizedKeys || [];
    const existing = workspace.authorizedKeys.find(m => m.userId === userId);
    if (existing) {
      existing.publicKeyPem = publicKeyPem;
      existing.role = role;
      existing.name = name || existing.name;
      return existing;
    }
    const member = {
      userId,
      name: name || userId,
      publicKeyPem,
      role,
      joinedAt: new Date().toISOString(),
      invitedBy,
      privateChannels: privateChannels || []
    };
    workspace.authorizedKeys.push(member);
    return member;
  },

  revokeKey(workspace, userId) {
    workspace.authorizedKeys = (workspace.authorizedKeys || []).filter(m => m.userId !== userId);
  },

  setPrivateChannelAccess(workspace, userId, channelId, allowed) {
    const member = this.getWorkspaceMember(workspace, userId);
    if (!member) return;
    member.privateChannels = member.privateChannels || [];
    if (allowed) {
      if (!member.privateChannels.includes(channelId)) member.privateChannels.push(channelId);
    } else {
      member.privateChannels = member.privateChannels.filter(id => id !== channelId);
    }
  },

  getAuthorizedPrivateChannels(workspace, userId) {
    const member = this.getWorkspaceMember(workspace, userId);
    if (!member) return [];
    if (member.role === 'owner' || member.role === 'admin') {
      return (workspace.channels || []).filter(c => c.private).map(c => c.id);
    }
    return member.privateChannels || [];
  },

  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  },

  detectPemType(pem) {
    if (/-----BEGIN\s+PUBLIC\s+KEY-----/.test(pem)) return 'public';
    if (/-----BEGIN\s+PRIVATE\s+KEY-----/.test(pem)) return 'private';
    return null;
  },

  async authenticateWithPrivateKey(workspace, privateKeyPem) {
    const challenge = 'workspace-auth-challenge-' + workspace.id;
    try {
      const signature = await this.signChallenge(privateKeyPem, challenge);
      const members = workspace.authorizedKeys || [];
      for (const member of members) {
        const ok = await this.verifyChallenge(member.publicKeyPem, signature, challenge);
        if (ok) return member;
      }
    } catch {
      // ignore
    }
    return null;
  },

  fingerprint(publicKeyPem) {
    if (!publicKeyPem) return '—';
    const base64 = publicKeyPem.replace(/-----[A-Z\s]+-----/g, '').replace(/\s/g, '');
    return base64.slice(0, 16).match(/.{1,4}/g)?.join(':') || '—';
  }
};
