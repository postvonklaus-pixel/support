'use strict';

import { vibrate, openModal, closeModal } from './utils.js';

let scannerStream = null;
let scannerRafId = null;
let scannerDetector = null;
let scannerCallback = null;

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

export async function openScanner(onDetect) {
  scannerCallback = onDetect;
  const statusEl = document.getElementById('scanner-status');
  const video = document.getElementById('scanner-video');
  statusEl.textContent = 'Kamera wird gestartet …';
  openModal('modal-scanner');
  try {
    scannerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = scannerStream;
    await video.play();
    const DetectorClass = await getBarcodeDetectorClass();
    scannerDetector = new DetectorClass({ formats: ['ean_13', 'ean_8', 'upc_a', 'code_128', 'qr_code'] });
    statusEl.textContent = 'Barcode in den Rahmen halten …';
    scanLoop();
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Kamera nicht verfügbar: ' + (err.message || err);
  }
}

async function scanLoop() {
  const video = document.getElementById('scanner-video');
  if (!scannerDetector || video.readyState < 2) {
    scannerRafId = requestAnimationFrame(scanLoop);
    return;
  }
  try {
    const codes = await scannerDetector.detect(video);
    if (codes && codes.length > 0) {
      const value = codes[0].rawValue;
      vibrate(20);
      const cb = scannerCallback;
      stopScanner();
      closeModal('modal-scanner');
      if (cb) cb(value);
      return;
    }
  } catch (e) { /* try again next frame */ }
  scannerRafId = requestAnimationFrame(scanLoop);
}

export function stopScanner() {
  if (scannerRafId) cancelAnimationFrame(scannerRafId);
  scannerRafId = null;
  scannerDetector = null;
  if (scannerStream) {
    scannerStream.getTracks().forEach((t) => t.stop());
    scannerStream = null;
  }
  const video = document.getElementById('scanner-video');
  if (video) video.srcObject = null;
}
