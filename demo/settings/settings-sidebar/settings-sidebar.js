window.SettingsSidebar = class SettingsSidebar {
  constructor(el, onBack) {
    this.el = el;
    this.el.innerHTML = `
      <button class="settings-back">← Back</button>
    `;
    this.el.querySelector('.settings-back').addEventListener('click', onBack);
  }
};
