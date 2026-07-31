window.AgentsView = class AgentsView {
  constructor(el, agents, onAddAgent, onSelectAgent) {
    this.el = el;
    this.agents = agents;
    this.onAddAgent = onAddAgent;
    this.onSelectAgent = onSelectAgent;
    this.render();
  }

  render() {
    this.el.innerHTML = `
      <div class="agents-view-header">
        <div>
          <h2>Agents</h2>
          <p class="agents-view-subtitle">Choose an agent to start a chat.</p>
        </div>
        <button class="add-agent-btn">+ Add agent</button>
      </div>
      <div class="agents-grid"></div>
    `;

    this.el.querySelector('.add-agent-btn').addEventListener('click', () => this.onAddAgent?.());

    const grid = this.el.querySelector('.agents-grid');
    this.agents.forEach(agent => {
      const card = document.createElement('div');
      card.className = 'agent-card';
      card.innerHTML = `
        <div class="agent-card-name">${agent.name}</div>
        <div class="agent-card-description">${agent.description}</div>
      `;
      card.addEventListener('click', () => this.onSelectAgent?.(agent.id));
      grid.appendChild(card);
    });
  }

  refresh() {
    this.render();
  }
};
