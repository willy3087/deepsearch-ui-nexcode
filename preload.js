function initializeAppearance() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  const logo = document.getElementById('logo');
  console.log(logo);
  const themeToggle = document.getElementById('theme-toggle');
  if (logo) {
    logo.src = savedTheme === 'dark' ? 'Jina - Dark.svg' : 'Jina - Light.svg';
  }
  if (themeToggle) {
    themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌒';
  }
}

// Execute immediately for preload
if (typeof window !== 'undefined') {
  initializeAppearance();
}

// Export for app.js
window.initializeAppearance = initializeAppearance;