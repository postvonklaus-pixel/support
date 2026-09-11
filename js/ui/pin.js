'use strict';

import * as db from '../db.js';
import { state, saveSettings } from '../state.js';
import { sha256Hex, vibrate, toast } from '../utils.js';
import { demoSetDrinks, demoSetFestival } from '../demo-data.js';

const LOCK_TIMEOUT_MS = 5 * 60 * 1000;

const pinDotsEl = document.getElementById('pin-dots');
const pinErrorEl = document.getElementById('pin-error');
const pinTitleEl = document.getElementById('pin-title');
const pinSubtitleEl = document.getElementById('pin-subtitle');

let pinBuffer = '';
let onUnlockCallback = null;
let onboardingReloadMode = false;
let lastActivity = Date.now();

export async function getPinHash() {
  const row = await db.get(db.STORES.meta, 'pinHash');
  return row ? row.value : null;
}

export async function setPinHash(hash) {
  await db.put(db.STORES.meta, { key: 'pinHash', value: hash });
}

export async function verifyPin(pin) {
  const hash = await sha256Hex(pin);
  const stored = await getPinHash();
  return hash === stored;
}

function showPinScreen(subtitle) {
  state.unlocked = false;
  pinBuffer = '';
  document.getElementById('app').hidden = true;
  document.getElementById('screen-onboarding').hidden = true;
  document.getElementById('screen-pin').hidden = false;
  pinTitleEl.textContent = 'Kasse entsperren';
  pinSubtitleEl.textContent = subtitle || 'PIN eingeben';
  pinErrorEl.hidden = true;
  renderPinDots();
}

function renderPinDots() {
  const dots = pinDotsEl.querySelectorAll('.pin-dot');
  dots.forEach((dot, i) => dot.classList.toggle('filled', i < pinBuffer.length));
}

async function handlePinKey(key) {
  if (key === 'del') {
    pinBuffer = pinBuffer.slice(0, -1);
    renderPinDots();
    return;
  }
  if (pinBuffer.length >= 4) return;
  pinBuffer += key;
  renderPinDots();
  vibrate(8);
  if (pinBuffer.length === 4) {
    const ok = await verifyPin(pinBuffer);
    if (ok) {
      unlockApp();
    } else {
      vibrate([80, 60, 80]);
      pinErrorEl.hidden = true;
      void pinErrorEl.offsetWidth;
      pinErrorEl.hidden = false;
      setTimeout(() => { pinBuffer = ''; renderPinDots(); }, 350);
    }
  }
}

document.getElementById('pin-keypad').addEventListener('click', (e) => {
  const btn = e.target.closest('.pin-key[data-key]');
  if (!btn) return;
  handlePinKey(btn.dataset.key);
});

function unlockApp() {
  state.unlocked = true;
  document.getElementById('screen-pin').hidden = true;
  document.getElementById('app').hidden = false;
  resetInactivityTimer();
  if (onUnlockCallback) onUnlockCallback();
}

function resetInactivityTimer() { lastActivity = Date.now(); }
['click', 'touchstart', 'keydown', 'scroll'].forEach((evt) => {
  document.addEventListener(evt, () => { if (state.unlocked) resetInactivityTimer(); }, { passive: true });
});
setInterval(() => {
  if (state.unlocked && Date.now() - lastActivity > LOCK_TIMEOUT_MS) {
    showPinScreen('PIN eingeben');
  }
}, 10000);

/* ---------------- Onboarding ---------------- */

async function applyOnboardingChoice(setName) {
  const { saveProduct } = await import('../state.js');
  let products = [];
  if (setName === 'drinks') products = demoSetDrinks();
  else if (setName === 'festival') products = demoSetFestival();

  for (const product of products) {
    await saveProduct(product);
  }
  await saveSettings({ exampleSet: setName === '' ? 'custom' : setName });

  if (onboardingReloadMode) {
    document.getElementById('screen-onboarding').hidden = true;
    document.getElementById('app').hidden = false;
    toast('Beispieldaten geladen');
    if (onUnlockCallback) onUnlockCallback();
    return;
  }

  await db.put(db.STORES.meta, { key: 'dataVersion', value: 3 });
  document.getElementById('screen-onboarding').hidden = true;
  showPinScreen('Standard-PIN: 1234');
  toast('Standard-PIN ist 1234 – änderbar in Einstellungen');
}

function showOnboarding(reloadMode) {
  onboardingReloadMode = !!reloadMode;
  document.getElementById('app').hidden = true;
  document.getElementById('screen-pin').hidden = true;
  document.getElementById('screen-onboarding').hidden = false;
}

document.getElementById('choice-set-drinks').addEventListener('click', () => applyOnboardingChoice('drinks'));
document.getElementById('choice-set-festival').addEventListener('click', () => applyOnboardingChoice('festival'));
document.getElementById('choice-empty').addEventListener('click', () => applyOnboardingChoice(''));

export function showOnboardingForReload() {
  showOnboarding(true);
}

/* ---------------- Migration notice ---------------- */

function showMigrationNotice(message) {
  document.getElementById('migration-message').textContent = message;
  document.getElementById('modal-migration').hidden = false;
}
document.getElementById('migration-ok').addEventListener('click', () => {
  document.getElementById('modal-migration').hidden = true;
});

/* ---------------- Bootstrap entry point ---------------- */

export async function initAuth({ onUnlock, migrationResult }) {
  onUnlockCallback = onUnlock;

  if (migrationResult.status === 'migrated') {
    showPinScreen('PIN eingeben (bisheriger PIN gilt weiter)');
    showMigrationNotice(
      `Deine bisherigen Daten (${migrationResult.productCount} Produkte, ${migrationResult.saleCount} Verkäufe) ` +
      `wurden erfolgreich in die neue Datenbank migriert. Empfehlung: Erstelle unter Einstellungen einen Export als Backup.`
    );
    return;
  }

  if (migrationResult.status === 'fresh') {
    await setPinHash(await sha256Hex('1234'));
    showOnboarding(false);
    return;
  }

  // existing IndexedDB data
  const hash = await getPinHash();
  if (!hash) {
    await setPinHash(await sha256Hex('1234'));
  }
  showPinScreen('PIN eingeben');
}
