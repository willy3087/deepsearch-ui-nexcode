function initializeAppearance() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  const logo = document.getElementById('logo');
  const themeLightIcon = document.getElementById('light-icon');
  const themeDarkIcon = document.getElementById('dark-icon');
  if (logo) {
    logo.src = savedTheme === 'dark' ? 'jina-dark.svg' : 'jina-light.svg';
  }
  if (themeLightIcon) {
    themeLightIcon.style.display = savedTheme === 'dark' ? 'block' : 'none';
  }
  if (themeDarkIcon) {
    themeDarkIcon.style.display = savedTheme === 'light' ? 'block' : 'none';
  }
}

// Execute immediately for preload
if (typeof window !== 'undefined') {
  initializeAppearance();
}

// Export for app.js
window.initializeAppearance = initializeAppearance;