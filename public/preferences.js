try {
  const saved = localStorage.getItem('mb-theme');
  const dark = saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]').content = dark ? '#191c19' : '#f7f6f2';
} catch {
  /* Fall back to the default theme when storage is unavailable. */
}
