export function setup_theme_switcher() {
  let darkMode = false;
  if (localStorage.getItem('theme') === 'dark') {
    darkMode = true;
  } else if (localStorage.getItem('theme') === 'light') {
    darkMode = false;
  }
  if (darkMode) {
    document.documentElement.classList.toggle('dark');
  }
  var themeSwitch = document.querySelectorAll('[data-theme-switcher]');
  const themeSwitcher = document.getElementById('theme-switcher')! as HTMLInputElement;
  themeSwitcher.addEventListener('change', () => {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem(
      'theme',
      document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    );
  });
}
