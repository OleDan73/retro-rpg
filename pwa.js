'use strict';
/* PWA glue: registers the service worker and shows an INSTALL button when the browser allows it. */
(() => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch((err) => console.warn('Service worker registration failed:', err));
    });
  }

  const btn = document.getElementById('install');
  let deferred = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // show our own button instead of the browser's mini-infobar
    deferred = e;
    btn.hidden = false;
  });
  btn.addEventListener('click', async () => {
    if (!deferred) return;
    btn.hidden = true;
    deferred.prompt();
    await deferred.userChoice;
    deferred = null;
  });
  window.addEventListener('appinstalled', () => { btn.hidden = true; deferred = null; });
})();
