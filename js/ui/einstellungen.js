'use strict';

import { state, saveSettings, recalcStockFromMovements, exportAll, importAll, wipeAll } from '../state.js';
import { toast, confirmDialog, sha256Hex } from '../utils.js';
import { verifyPin, setPinHash, showOnboardingForReload } from './pin.js';

export function render() {
  document.getElementById('setting-business-name').value = state.settings.shopName;
  document.getElementById('setting-currency').value = state.settings.currency;
  document.getElementById('setting-inventory-enabled').checked = !!state.settings.inventoryEnabled;
}

document.getElementById('setting-business-name').addEventListener('change', async (e) => {
  await saveSettings({ shopName: e.target.value.trim() || 'Meine Kasse' });
  toast('Gespeichert');
});
document.getElementById('setting-currency').addEventListener('change', async (e) => {
  await saveSettings({ currency: e.target.value.trim() || '€' });
  toast('Gespeichert');
});
document.getElementById('setting-inventory-enabled').addEventListener('change', async (e) => {
  await saveSettings({ inventoryEnabled: e.target.checked });
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

document.getElementById('btn-export').addEventListener('click', async () => {
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
