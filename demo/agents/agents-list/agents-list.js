window.AgentsView = class AgentsView {
  constructor(el, agents, onAdd) {
    this.el = el;
    this.agents = agents;
    this.onAdd = onAdd;
    this.render();
  }

  render() {
    this.el.innerHTML = `
      <div class="agents-header">
        <h3>Agents</h3>
        <button class="add-agent-btn">+ Add agent</button>
      </div>
      <div class="agents-list">
        ${this.agents.map(agent => `
          <div class="agent-card">
            <div class="agent-avatar">${this._initial(agent.name)}</div>
            <div class="agent-name">${this._escape(agent.name)}</div>
          </div>
        `).join('')}
      </div>
    `;
    this.el.querySelector('.add-agent-btn').addEventListener('click', () => this.onAdd?.());
  }

  _initial(name) {
    return String(name || '?').charAt(0).toUpperCase();
  }

  _escape(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
};
