'use strict';

import { vibrate, openModal, closeModal, confirmDialog } from './utils.js';
import { state } from './state.js';

const SCAN_COOLDOWN_MS = 1500; // ignore repeat detections of the same code
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;
const BURST_PROMPT_THRESHOLD = 50;

let scannerStream = null;
let scannerRafId = null;
let scannerDetector = null;
let scannerCallback = null;
let scannerMode = 'single';
let scannerOnNotFoundCreate = null;

let lastCode = null;
let lastCodeAt = 0;
let lastActivityAt = 0;
let burstCount = 0;
let successCount = 0;
let paused = false;
let inactivityTimer = null;
let audioCtx = null;

function soundEnabled() { return state.settings.scannerSoundEnabled !== false; }
function vibrationEnabled() { return state.settings.scannerVibrationEnabled !== false; }

function playTone(freq, durationMs) {
  if (!soundEnabled()) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    osc.start();
    osc.stop(audioCtx.currentTime + durationMs / 1000);
  } catch (err) { /* ignore - audio not critical */ }
}

function flash(kind) {
  const el = document.getElementById('scanner-flash');
  if (!el) return;
  el.classList.remove('flash-success', 'flash-error');
  void el.offsetWidth;
  el.classList.add(kind === 'error' ? 'flash-error' : 'flash-success');
  setTimeout(() => el.classList.remove('flash-success', 'flash-error'), 220);
}

function updateCounter(count) {
  const el = document.getElementById('scanner-counter');
  if (!el) return;
  el.hidden = scannerMode !== 'continuous';
  el.textContent = `${count} Position${count === 1 ? '' : 'en'} gescannt`;
}

async function getBarcodeDetectorClass() {
  if ('BarcodeDetector' in window) {
    try {
      const formats = await window.BarcodeDetector.getSupportedFormats();
      if (formats && formats.length) return window.BarcodeDetector;
    } catch (e) { /* fall through to polyfill */ }
  }
  const mod = await import('https://cdn.jsdelivr.net/npm/barcode-detector@3.2.2/dist/es/ponyfill.js');
  return mod.BarcodeDetector;
}

/**
 * Opens the camera and scans barcodes.
 *
 * @param {(code: string) => (void|boolean|{success:boolean, message?:string}|Promise<any>)} onDetect
 * @param {{ mode?: 'single'|'continuous', onNotFoundCreate?: (code:string)=>void }} [options]
 */
export async function openScanner(onDetect, options = {}) {
  scannerCallback = onDetect;
  scannerMode = options.mode === 'continuous' ? 'continuous' : 'single';
  scannerOnNotFoundCreate = options.onNotFoundCreate || null;
  lastCode = null;
  lastCodeAt = 0;
  burstCount = 0;
  successCount = 0;
  paused = false;

  const statusEl = document.getElementById('scanner-status');
  const video = document.getElementById('scanner-video');
  const closeBtn = document.getElementById('scanner-close-btn');
  closeBtn.textContent = scannerMode === 'continuous' ? 'Fertig' : '✕';
  document.getElementById('scanner-notfound-banner').hidden = true;
  document.getElementById('scanner-manual-form').hidden = true;
  updateCounter(0);
  statusEl.textContent = 'Kamera wird gestartet …';
  openModal('modal-scanner');

  try {
    scannerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = scannerStream;
    await video.play();
    const DetectorClass = await getBarcodeDetectorClass();
    scannerDetector = new DetectorClass({ formats: ['ean_13', 'ean_8', 'upc_a', 'code_128', 'qr_code'] });
    statusEl.textContent = scannerMode === 'continuous'
      ? 'Barcode in den Rahmen halten – mehrere Scans möglich'
      : 'Barcode in den Rahmen halten …';
    resetInactivityTimer();
    scanLoop();
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Kamera nicht verfügbar: ' + (err.message || err);
  }
}

function resetInactivityTimer() {
  lastActivityAt = Date.now();
  if (inactivityTimer) clearInterval(inactivityTimer);
  inactivityTimer = setInterval(() => {
    if (Date.now() - lastActivityAt > INACTIVITY_TIMEOUT_MS) {
      const statusEl = document.getElementById('scanner-status');
      if (statusEl) statusEl.textContent = 'Scanner wegen Inaktivität geschlossen';
      stopScanner();
      closeModal('modal-scanner');
    }
  }, 10000);
}

async function scanLoop() {
  const video = document.getElementById('scanner-video');
  if (!scannerDetector || !scannerStream) return;
  if (paused || video.readyState < 2) {
    scannerRafId = requestAnimationFrame(scanLoop);
    return;
  }
  try {
    const codes = await scannerDetector.detect(video);
    if (codes && codes.length > 0) {
      const value = codes[0].rawValue;
      const now = Date.now();
      if (value === lastCode && now - lastCodeAt < SCAN_COOLDOWN_MS) {
        scannerRafId = requestAnimationFrame(scanLoop);
        return;
      }
      lastCode = value;
      lastCodeAt = now;
      await handleCode(value);
      if (scannerMode === 'single') return; // handleCode already closed everything
    }
  } catch (e) { /* try again next frame */ }
  if (scannerStream) scannerRafId = requestAnimationFrame(scanLoop);
}

async function handleCode(code) {
  resetInactivityTimer();

  if (scannerMode === 'single') {
    vibrate(20);
    const cb = scannerCallback;
    stopScanner();
    closeModal('modal-scanner');
    if (cb) cb(code);
    return;
  }

  const cb = scannerCallback;
  let result;
  try {
    result = cb ? await cb(code) : { success: true };
  } catch (err) {
    console.error('[Kasse] Scanner-Callback fehlgeschlagen', err);
    result = { success: false, message: 'Fehler' };
  }
  if (result === undefined) result = { success: true };
  if (typeof result === 'boolean') result = { success: result };

  if (result.success) {
    if (vibrationEnabled()) vibrate(50);
    playTone(800, 100);
    flash('success');
    document.getElementById('scanner-notfound-banner').hidden = true;
    burstCount += 1;
    successCount += 1;
    updateCounter(successCount);
  } else {
    vibrate([40, 30, 40]);
    playTone(300, 200);
    flash('error');
    showNotFound(code, result.message);
    burstCount += 1;
  }

  if (burstCount >= BURST_PROMPT_THRESHOLD) {
    burstCount = 0;
    paused = true;
    const weiter = await confirmDialog(`Du hast ${BURST_PROMPT_THRESHOLD} Barcodes am Stück gescannt. Weiter scannen?`);
    paused = false;
    if (!weiter) {
      stopScanner();
      closeModal('modal-scanner');
      return;
    }
  }
}

function showNotFound(code, message) {
  const banner = document.getElementById('scanner-notfound-banner');
  const text = document.getElementById('scanner-notfound-text');
  text.textContent = message || `Nicht gefunden: ${code}`;
  banner.hidden = false;
  banner.dataset.code = code;
}

document.getElementById('scanner-notfound-retry').addEventListener('click', () => {
  document.getElementById('scanner-notfound-banner').hidden = true;
});

document.getElementById('scanner-notfound-create').addEventListener('click', () => {
  const code = document.getElementById('scanner-notfound-banner').dataset.code;
  const handler = scannerOnNotFoundCreate;
  stopScanner();
  closeModal('modal-scanner');
  if (handler) handler(code);
});

document.getElementById('scanner-manual-link').addEventListener('click', () => {
  const form = document.getElementById('scanner-manual-form');
  form.hidden = !form.hidden;
  if (!form.hidden) document.getElementById('scanner-manual-input').focus();
});

document.getElementById('scanner-manual-confirm').addEventListener('click', async () => {
  const input = document.getElementById('scanner-manual-input');
  const code = input.value.trim();
  if (!code) return;
  input.value = '';
  document.getElementById('scanner-manual-form').hidden = true;
  await handleCode(code);
});

export function stopScanner() {
  if (scannerRafId) cancelAnimationFrame(scannerRafId);
  scannerRafId = null;
  scannerDetector = null;
  if (inactivityTimer) { clearInterval(inactivityTimer); inactivityTimer = null; }
  if (scannerStream) {
    scannerStream.getTracks().forEach((t) => t.stop());
    scannerStream = null;
  }
  const video = document.getElementById('scanner-video');
  if (video) video.srcObject = null;
  document.getElementById('scanner-notfound-banner').hidden = true;
  document.getElementById('scanner-manual-form').hidden = true;
}
