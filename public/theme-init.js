// Applies the stored theme before first paint to avoid a light/dark flash.
// Kept as a static file (not inline) so the CSP can be a strict script-src 'self'.
(function () {
  try {
    var p = JSON.parse(localStorage.getItem('spacz.admin.prefs') || '{}').state || {};
    var t = p.theme || 'system';
    var dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    if (p.accent && p.accent !== 'indigo') document.documentElement.dataset.accent = p.accent;
    if (p.density) document.documentElement.dataset.density = p.density;
  } catch (e) {
    /* storage unavailable: default theme */
  }
})();
