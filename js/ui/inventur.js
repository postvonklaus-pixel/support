'use strict';

import { state, addMovement } from '../state.js';
import { escapeHtml, toast, confirmDialog, vibrate } from '../utils.js';
import { closeSubView } from '../router.js';
import { openScanner } from '../barcode.js';

let counts = {}; // productId -> { counted, note }

export function render() {
  const trackedProducts = state.products.filter((p) => p.trackStock);
  counts = {};
  trackedProducts.forEach((p) => { counts[p.id] = { counted: p.stock, note: '' }; });
  renderList(trackedProducts);
}

function renderList(products) {
  const listEl = document.getElementById('inventur-list');
  if (products.length === 0) {
    listEl.innerHTML = '<p class="product-list-empty">Keine Produkte mit aktiver Bestandsverfolgung.</p>';
    return;
  }
  listEl.innerHTML = '';
  products.forEach((product) => {
    const row = document.createElement('div');
    row.className = 'inventur-row';
    row.dataset.productId = product.id;
    row.innerHTML = `
      <div class="inventur-row-head">
        <span class="inventur-row-name">${escapeHtml(product.name)}</span>
        <span class="inventur-row-expected">Soll: ${product.stock}</span>
      </div>
      <div class="inventur-row-body">
        <input type="number" class="inventur-row-count" min="0" step="1" value="${product.stock}">
        <input type="text" class="inventur-row-note" placeholder="Notiz (optional)">
      </div>
    `;
    const countInput = row.querySelector('.inventur-row-count');
    const noteInput = row.querySelector('.inventur-row-note');
    const updateDeviation = () => {
      const counted = parseInt(countInput.value, 10);
      counts[product.id].counted = Number.isFinite(counted) ? counted : 0;
      const diff = counts[product.id].counted - product.stock;
      row.classList.toggle('inventur-row-diff', diff !== 0);
      row.classList.toggle('inventur-row-diff-neg', diff < 0);
      row.classList.toggle('inventur-row-diff-pos', diff > 0);
    };
    countInput.addEventListener('input', updateDeviation);
    noteInput.addEventListener('input', (e) => { counts[product.id].note = e.target.value; });
    listEl.appendChild(row);
  });
}

document.getElementById('inventur-scan').addEventListener('click', () => {
  openScanner((code) => {
    const product = state.products.find((p) => p.trackStock && (p.barcode === code || p.id === code));
    if (!product) return { success: false, message: `Nicht gefunden: ${code}` };
    const row = Array.from(document.querySelectorAll('.inventur-row')).find((el) => el.dataset.productId === product.id);
    if (!row) return { success: false, message: `${product.name}: keine Bestandsverfolgung` };

    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    row.classList.add('inventur-row-highlight');
    setTimeout(() => row.classList.remove('inventur-row-highlight'), 1000);
    const input = row.querySelector('.inventur-row-count');
    input.focus();
    input.select();
    return { success: true, message: product.name };
  }, { mode: 'continuous' });
});

document.getElementById('inventur-submit').addEventListener('click', async () => {
  const changed = state.products
    .filter((p) => p.trackStock && counts[p.id] && counts[p.id].counted !== p.stock);
  if (changed.length === 0) {
    toast('Keine Abweichungen erfasst');
    closeSubView();
    return;
  }
  const ok = await confirmDialog(`Inventur abschließen: ${changed.length} Abweichung(en) werden gebucht?`);
  if (!ok) return;
  try {
    for (const product of changed) {
      await addMovement({
        productId: product.id,
        type: 'adjustment',
        stockAfterOverride: counts[product.id].counted,
        note: counts[product.id].note || 'Inventur',
      });
    }
    vibrate([15, 40, 15]);
    toast('Inventur abgeschlossen');
    closeSubView();
  } catch (err) {
    console.error('[Kasse] Inventur fehlgeschlagen', err);
    toast('Fehler beim Speichern');
  }
});
