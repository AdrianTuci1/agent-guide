window.Composer = class Composer {
  constructor(el, onModeChange = null) {
    this.el = el;
    this.onModeChange = onModeChange;
  }

  clear() {
    this.el.innerHTML = '';
    this._setMode('default');
  }

  _setMode(mode) {
    this._mode = mode;
    this.onModeChange?.(mode);
  }

  setDefault(onSend) {
    this.clear();
    this._setMode('default');
    const div = document.createElement('div');
    div.className = 'default-input';
    div.innerHTML = `<input type="text" placeholder="How can I help you today?" />`;
    const input = div.querySelector('input');
    const submit = () => {
      const value = input.value.trim();
      if (value) onSend?.(value);
      input.value = '';
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    this.el.appendChild(div);
    input.focus();
  }

  showVariants(title, options, onSelect, onCancel) {
    this.clear();
    this._setMode('card');
    const card = this._createCard(title);
    const body = card.querySelector('.composer-body');
    const list = document.createElement('div');
    list.className = 'variant-list';
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'variant-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => onSelect?.(opt));
      list.appendChild(btn);
    });
    body.appendChild(list);
    if (onCancel) {
      this._addTopbarAction(card, 'Cancel', true, () => onCancel());
    }
  }

  showSecret(title, scope, onSubmit, onCancel) {
    this.clear();
    this._setMode('card');
    const card = this._createCard(title);
    const body = card.querySelector('.composer-body');
    body.innerHTML = `
      <div class="secret-field">
        <input type="password" placeholder="Enter secret..." />
      </div>
      <div class="secret-scope">Will be used for: ${this._escape(scope)}</div>
    `;
    const input = body.querySelector('input');
    const submit = () => {
      const value = input.value.trim();
      if (value) onSubmit?.(value);
      input.value = '';
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    if (onCancel) this._addTopbarAction(card, 'Cancel', true, () => onCancel());
    this._addTopbarAction(card, 'Submit', false, submit);
    input.focus();
  }

  showConfirmation(title, message, actions, onAction) {
    this.clear();
    this._setMode('card');
    const card = this._createCard(title);
    const body = card.querySelector('.composer-body');
    body.innerHTML = `<div>${this._escape(message)}</div>`;
    actions.forEach(action => {
      this._addTopbarAction(card, action, action === 'Cancel', () => onAction?.(action));
    });
  }

  showForm(title, fields, onSubmit, onCancel) {
    this.clear();
    this._setMode('card');
    const card = this._createCard(title);
    const body = card.querySelector('.composer-body');
    const form = document.createElement('form');
    fields.forEach(field => {
      const row = document.createElement('div');
      row.className = 'form-row';
      if (field.type === 'select') {
        row.innerHTML = `
          <label>${this._escape(field.label)}</label>
          <select name="${this._escape(field.name)}">
            ${field.options.map(o => `<option value="${this._escape(o)}">${this._escape(o)}</option>`).join('')}
          </select>
        `;
      } else {
        row.innerHTML = `
          <label>${this._escape(field.label)}</label>
          <input type="${this._escape(field.type || 'text')}" name="${this._escape(field.name)}" />
        `;
      }
      form.appendChild(row);
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const data = {};
      new FormData(form).forEach((value, key) => data[key] = value);
      onSubmit?.(data);
    });
    body.appendChild(form);
    if (onCancel) this._addTopbarAction(card, 'Cancel', true, () => onCancel());
    this._addTopbarAction(card, 'Submit', false, () => form.requestSubmit());
  }

  _createCard(title) {
    const card = document.createElement('div');
    card.className = 'composer-card';
    card.innerHTML = `
      <div class="composer-topbar">
        <h4>${this._escape(title)}</h4>
        <div class="composer-topbar-actions"></div>
      </div>
      <div class="composer-body"></div>
    `;
    this.el.appendChild(card);
    return card;
  }

  _addTopbarAction(card, label, secondary, onClick) {
    const actions = card.querySelector('.composer-topbar-actions');
    const btn = document.createElement('button');
    btn.className = `btn ${secondary ? 'secondary' : ''}`;
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    actions.appendChild(btn);
    return btn;
  }

  _escape(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
};
