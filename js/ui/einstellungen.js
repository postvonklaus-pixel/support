'use strict';

import { state, saveSettings, recalcStockFromMovements, exportAll, importAll, wipeAll, getCurrencyMigrationDone, convertPricesEurToIdr } from '../state.js';
import { toast, confirmDialog, sha256Hex, openModal, closeModal } from '../utils.js';
import { formatCurrency, roundToStep, CURRENCY_LABELS } from '../currency.js';
import { verifyPin, setPinHash, showOnboardingForReload } from './pin.js';

export async function render() {
  document.getElementById('setting-business-name').value = state.settings.shopName;
  document.getElementById('setting-currency-select').value = state.settings.currencyCode;
  document.getElementById('setting-inventory-enabled').checked = !!state.settings.inventoryEnabled;
  document.getElementById('setting-scanner-sound').checked = !!state.settings.scannerSoundEnabled;
  document.getElementById('setting-scanner-vibration').checked = !!state.settings.scannerVibrationEnabled;
  document.getElementById('setting-scanner-mode-kasse').value = state.settings.scannerModeKasse;

  const migrationDone = await getCurrencyMigrationDone();
  const alreadyIdr = state.settings.currencyCode === 'IDR';
  const convertBtn = document.getElementById('btn-convert-prices');
  const hintEl = document.getElementById('convert-prices-hint');
  convertBtn.disabled = migrationDone || alreadyIdr;
  hintEl.hidden = !(migrationDone || alreadyIdr);
  hintEl.textContent = migrationDone
    ? 'Preis-Migration bereits durchgeführt.'
    : 'Währung ist bereits IDR – nichts umzurechnen.';
}

document.getElementById('setting-business-name').addEventListener('change', async (e) => {
  await saveSettings({ shopName: e.target.value.trim() || 'Meine Kasse' });
  toast('Gespeichert');
});
document.getElementById('setting-currency-select').addEventListener('change', async (e) => {
  const newCode = e.target.value;
  const previousCode = state.settings.currencyCode;
  if (newCode === previousCode) return;
  const ok = await confirmDialog(
    `Währung wird auf ${CURRENCY_LABELS[newCode]} umgestellt. Bestehende Preise werden NICHT umgerechnet, nur neu formatiert. Fortfahren?`
  );
  if (!ok) { e.target.value = previousCode; return; }
  await saveSettings({ currencyCode: newCode });
  toast('Gespeichert');
});
document.getElementById('setting-inventory-enabled').addEventListener('change', async (e) => {
  await saveSettings({ inventoryEnabled: e.target.checked });
  toast('Gespeichert');
});
document.getElementById('setting-scanner-sound').addEventListener('change', async (e) => {
  await saveSettings({ scannerSoundEnabled: e.target.checked });
  toast('Gespeichert');
});
document.getElementById('setting-scanner-vibration').addEventListener('change', async (e) => {
  await saveSettings({ scannerVibrationEnabled: e.target.checked });
  toast('Gespeichert');
});
document.getElementById('setting-scanner-mode-kasse').addEventListener('change', async (e) => {
  await saveSettings({ scannerModeKasse: e.target.value });
  toast('Gespeichert');
});

document.getElementById('pin-change-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const current = document.getElementById('pin-current').value;
  const next = document.getElementById('pin-new').value;
  const repeat = document.getElementById('pin-new-repeat').value;
  if (!/^\d{4}$/.test(current) || !/^\d{4}$/.test(next)) { toast('PIN muss 4-stellig sein'); return; }
  const ok = await verifyPin(current);
  if (!ok) { toast('Aktueller PIN ist falsch'); return; }
  if (next !== repeat) { toast('Neue PINs stimmen nicht überein'); return; }
  await setPinHash(await sha256Hex(next));
  e.target.reset();
  toast('PIN geändert');
});

document.getElementById('btn-recalc-stock').addEventListener('click', async () => {
  const fixed = await recalcStockFromMovements();
  toast(fixed > 0 ? `${fixed} Produkt(e) korrigiert` : 'Alle Bestände waren konsistent');
});

async function downloadExport() {
  const data = await exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kasse-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

document.getElementById('btn-export').addEventListener('click', async () => {
  await downloadExport();
  toast('Export erstellt');
});

document.getElementById('btn-import').addEventListener('click', () => document.getElementById('import-file').click());
document.getElementById('import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!Array.isArray(data.products) || !Array.isArray(data.sales)) throw new Error('Ungültiges Format');
    const ok = await confirmDialog('Alle aktuellen Daten werden überschrieben. Fortfahren?');
    if (!ok) return;
    await importAll(data);
    toast('Import erfolgreich');
  } catch (err) {
    console.error('[Kasse] Import fehlgeschlagen', err);
    toast('Import fehlgeschlagen: ungültige Datei');
  }
  e.target.value = '';
});

document.getElementById('btn-reload-demo').addEventListener('click', async () => {
  const ok = await confirmDialog('Aktuelle Produkte bleiben erhalten, Beispieldaten werden ergänzt. Fortfahren?');
  if (!ok) return;
  showOnboardingForReload();
});

document.getElementById('btn-delete-all').addEventListener('click', async () => {
  const ok1 = await confirmDialog('Wirklich ALLE Daten (Produkte, Verkäufe, Bewegungen, Einstellungen, PIN) löschen?');
  if (!ok1) return;
  const ok2 = await confirmDialog('Letzte Bestätigung: Dies kann NICHT rückgängig gemacht werden. Fortfahren?');
  if (!ok2) return;
  await wipeAll();
  toast('Alle Daten gelöscht');
  setTimeout(() => location.reload(), 600);
});

/* ---------------- Preis-Migration EUR -> IDR ---------------- */

document.getElementById('btn-convert-prices').addEventListener('click', () => {
  document.getElementById('convert-factor').value = 16000;
  document.getElementById('convert-rounding').value = '1000';
  renderConvertPreview();
  openModal('modal-convert-prices');
});

document.getElementById('convert-factor').addEventListener('input', renderConvertPreview);
document.getElementById('convert-rounding').addEventListener('change', renderConvertPreview);

function renderConvertPreview() {
  const factor = parseFloat(document.getElementById('convert-factor').value) || 0;
  const roundTo = parseInt(document.getElementById('convert-rounding').value, 10) || 0;
  const previewEl = document.getElementById('convert-preview');

  const sample = state.products.slice(0, 3);
  if (sample.length === 0) {
    previewEl.innerHTML = '<p class="product-list-empty">Keine Produkte vorhanden.</p>';
    return;
  }
  previewEl.innerHTML = `<p class="convert-preview-title">Vorschau (${state.products.length} Produkt(e) betroffen):</p>` +
    sample.map((p) => {
      const converted = roundToStep(p.price * factor, roundTo);
      return `<div class="convert-preview-row">
        <span>${p.name}</span>
        <span>${formatCurrency(p.price, 'EUR')} → ${formatCurrency(converted, 'IDR')}</span>
      </div>`;
    }).join('');
}

document.getElementById('btn-convert-confirm').addEventListener('click', async () => {
  const factor = parseFloat(document.getElementById('convert-factor').value);
  const roundTo = parseInt(document.getElementById('convert-rounding').value, 10) || 0;
  if (!factor || factor <= 0) { toast('Bitte einen gültigen Umrechnungsfaktor eingeben'); return; }

  const ok = await confirmDialog(
    `${state.products.length} Produktpreise werden mit Faktor ${factor} umgerechnet. Diese Aktion kann nicht rückgängig gemacht werden. ` +
    `Backup wird automatisch heruntergeladen. Bereits erfasste Verkäufe behalten ihren ursprünglichen EUR-Betrag, werden ab jetzt aber mit dem IDR-Format angezeigt. Fortfahren?`
  );
  if (!ok) return;

  await downloadExport();
  const count = await convertPricesEurToIdr({ factor, roundTo });
  closeModal('modal-convert-prices');
  toast(`${count} Produkt(e) umgerechnet. Verkaufshistorie bleibt in EUR.`);
  render();
});
