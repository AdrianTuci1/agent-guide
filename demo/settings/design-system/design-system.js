window.applyDesignSystem = function(design) {
  const app = document.getElementById('app');
  if (!app) return;

  app.classList.remove(
    'theme-dark', 'theme-light', 'theme-midnight',
    'accent-blue', 'accent-green', 'accent-purple', 'accent-orange',
    'font-system', 'font-mono', 'font-serif',
    'density-compact', 'density-default', 'density-spacious',
    'radius-sharp', 'radius-default', 'radius-rounded'
  );

  app.classList.add(
    `theme-${design.theme || 'dark'}`,
    `accent-${design.accent || 'blue'}`,
    `font-${design.font || 'system'}`,
    `density-${design.density || 'default'}`,
    `radius-${design.radius || 'default'}`
  );

  const accentMap = {
    blue: '#2563eb',
    green: '#22c55e',
    purple: '#8b5cf6',
    orange: '#f97316'
  };
  app.style.setProperty('--ds-accent', accentMap[design.accent] || accentMap.blue);
};

window.getDefaultDesign = function() {
  return {
    theme: 'dark',
    accent: 'blue',
    font: 'system',
    density: 'default',
    radius: 'default'
  };
};
