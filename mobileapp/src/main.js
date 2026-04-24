/**
 * ARC Controller — Application Entry Point
 * Bootstraps the app, checks backend health, and mounts the UI.
 */

import './styles/index.css';
import './styles/components.css';
import './styles/animations.css';
import { checkHealth } from './api/http.js';
import appState from './state/appState.js';
import { mountMainScreen } from './screens/MainScreen.js';
import { mountPairingScreen } from './screens/PairingScreen.js';
import CONFIG from './utils/config.js';

let healthTimer = null;

/**
 * Check backend health and update app state.
 */
async function performHealthCheck() {
  try {
    const res = await checkHealth();
    appState.setConnected(true);
    appState.setBackendBooted(res.booted === true);

    // If backend is fully booted, disable mock mode
    if (res.booted && appState.useMocks) {
      appState.setUseMocks(false);
      console.log('ARC backend is ready — switching to live mode.');
    }
  } catch {
    appState.setConnected(false);
    appState.setBackendBooted(false);
  }
}

/**
 * Try health check with retries before giving up.
 */
async function initialHealthCheck(retries = 3, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await checkHealth();
      appState.setConnected(true);
      appState.setBackendBooted(res.booted === true);
      return; // Success
    } catch {
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }
  // All retries failed
  appState.setConnected(false);
  appState.setBackendBooted(false);
}

/**
 * Initialize the application.
 */
async function init() {
  // Initial health check with retries (don't enable mock mode during boot)
  await initialHealthCheck();

  // Only enable mock mode if the server is truly unreachable after retries
  if (!appState.connected) {
    appState.setUseMocks(true);
    console.log('ARC backend not reachable after retries — mock mode enabled.');
  } else if (!appState.backendBooted) {
    // Server running but still booting — don't use mocks, just wait
    console.log('ARC backend still booting — will switch to live mode when ready.');
  }

  // Keep track of current screen so we don't remount unnecessarily
  let currentScreen = null;

  function renderScreen() {
    const shouldBePairing = !appState.token;
    if (shouldBePairing && currentScreen !== 'pairing') {
      mountPairingScreen();
      currentScreen = 'pairing';
    } else if (!shouldBePairing && currentScreen !== 'main') {
      mountMainScreen();
      currentScreen = 'main';
    }
  }

  // Initial render
  renderScreen();

  // Re-render when token changes (e.g. login or automatic logout)
  appState.subscribe(renderScreen);

  // Periodic health checks (only when tab is visible)
  healthTimer = setInterval(performHealthCheck, CONFIG.HEALTH_CHECK_INTERVAL);

  // Pause health checks when tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearInterval(healthTimer);
      healthTimer = null;
    } else {
      performHealthCheck();
      healthTimer = setInterval(performHealthCheck, CONFIG.HEALTH_CHECK_INTERVAL);
    }
  });

  console.log('ARC Controller initialized.');
}

// Boot
document.addEventListener('DOMContentLoaded', init);

