// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// ─── INSTALL BANNER ──────────────────────────────────────────
(function () {
  const banner = document.getElementById('pwaBanner');
  if (!banner) return;

  const closeBtn     = document.getElementById('pwaBannerClose');
  const installBtn   = document.getElementById('pwaInstallBtn');
  const instructions = document.getElementById('pwaBannerInstructions');

  // Already running as installed PWA — never show banner
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                    || navigator.standalone === true;
  if (isStandalone) return;

  // User dismissed within the last 30 days — don't nag
  const dismissedAt = parseInt(localStorage.getItem('pwaDismissedAt') || '0', 10);
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  if (dismissedAt && Date.now() - dismissedAt < THIRTY_DAYS) return;

  let deferredPrompt = null;

  // Chrome / Android — native install prompt
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.style.display = 'inline-flex';
    instructions.textContent = 'Install the app for quick access.';
    showBanner();
  });

  // iOS — show share-sheet instructions
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIOS) {
    instructions.textContent = 'Tap the Share icon ⎎ at the bottom of Safari, then "Add to Home Screen".';
    showBanner();
  }

  installBtn.addEventListener('click', function () {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(function (result) {
      if (result.outcome === 'accepted') hideBanner();
      deferredPrompt = null;
    });
  });

  closeBtn.addEventListener('click', function () {
    hideBanner();
    localStorage.setItem('pwaDismissedAt', Date.now().toString());
  });

  // When the OS confirms install, hide banner and reset dismiss timer
  window.addEventListener('appinstalled', function () {
    hideBanner();
    localStorage.removeItem('pwaDismissedAt');
  });

  function showBanner() {
    setTimeout(function () { banner.classList.add('visible'); }, 1500);
  }

  function hideBanner() {
    banner.classList.remove('visible');
  }
}());
