import GameScene from './GameScene.js';

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  scene: [GameScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

const game = new Phaser.Game(config);

window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});

// Service Worker Update Notification
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js')
    .then((registration) => {
      console.log('Service Worker registered with scope:', registration.scope);
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateNotification();
          }
        });
      });
    }).catch((error) => {
      console.log('Service Worker registration failed:', error);
    });

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data.type === 'NEW_VERSION') {
      showUpdateNotification();
    }
  });
}

function showUpdateNotification() {
  const updatePopup = document.createElement('div');
  updatePopup.className = 'update-popup';
  updatePopup.innerHTML = `
    <p>A new version is available. Refresh to update.</p>
    <button id="refresh-button">Refresh</button>
    <button id="dismiss-update-button">Dismiss</button>
  `;
  document.body.appendChild(updatePopup);

  document.getElementById('refresh-button').addEventListener('click', () => {
    updatePopup.remove();
    window.location.reload();
  });

  document.getElementById('dismiss-update-button').addEventListener('click', () => {
    updatePopup.remove();
  });
}

// Handle installation prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallPromotion();
});

function showInstallPromotion() {
  const installPopup = document.createElement('div');
  installPopup.className = 'install-popup';
  installPopup.innerHTML = `
    <p>Install TiBlocks on your device for a better experience.</p>
    <button id="install-button">Install</button>
    <button id="dismiss-button">Dismiss</button>
  `;
  document.body.appendChild(installPopup);

  document.getElementById('install-button').addEventListener('click', () => {
    installPopup.remove();
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      deferredPrompt = null;
    });
  });

  document.getElementById('dismiss-button').addEventListener('click', () => {
    installPopup.remove();
  });
}
