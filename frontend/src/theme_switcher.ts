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
  const themeSwitch = document.getElementById('theme-switch')! as HTMLInputElement;
  themeSwitch.addEventListener('change', () => {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem(
      'theme',
      document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    );
  });
}
