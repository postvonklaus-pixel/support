'use strict';

import { state, addMovement } from '../state.js';
import { escapeHtml, toast, confirmDialog, vibrate } from '../utils.js';
import { closeSubView } from '../router.js';
import { openScanner } from '../barcode.js';
import { openProductModal } from './produkte.js';

export function createStockFormController({ containerId, addRowBtnId, submitBtnId, scanBtnId, movementType, actionLabel }) {
  let rows = [{ productId: '', quantity: 1, note: '' }];

  function productOptions(selectedId) {
    return state.products
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'de'))
      .map((p) => `<option value="${p.id}" ${p.id === selectedId ? 'selected' : ''}>${escapeHtml(p.name)} (${escapeHtml(p.category)})</option>`)
      .join('');
  }

  function render() {
    rows = [{ productId: '', quantity: 1, note: '' }];
    renderRows();
  }

  function renderRows() {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    rows.forEach((row, idx) => {
      const el = document.createElement('div');
      el.className = 'stock-row';
      el.innerHTML = `
        <select class="stock-row-product" data-idx="${idx}">
          <option value="">Produkt wählen …</option>
          ${productOptions(row.productId)}
        </select>
        <input type="number" class="stock-row-qty" data-idx="${idx}" min="1" step="1" value="${row.quantity}">
        <input type="text" class="stock-row-note" data-idx="${idx}" placeholder="Notiz (optional)" value="${escapeHtml(row.note)}">
        ${rows.length > 1 ? `<button type="button" class="stock-row-remove" data-idx="${idx}">✕</button>` : ''}
      `;
      container.appendChild(el);
    });

    container.querySelectorAll('.stock-row-product').forEach((sel) => {
      sel.addEventListener('change', (e) => { rows[+e.target.dataset.idx].productId = e.target.value; });
    });
    container.querySelectorAll('.stock-row-qty').forEach((inp) => {
      inp.addEventListener('input', (e) => { rows[+e.target.dataset.idx].quantity = Math.max(1, parseInt(e.target.value, 10) || 1); });
    });
    container.querySelectorAll('.stock-row-note').forEach((inp) => {
      inp.addEventListener('input', (e) => { rows[+e.target.dataset.idx].note = e.target.value; });
    });
    container.querySelectorAll('.stock-row-remove').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        rows.splice(+e.target.dataset.idx, 1);
        renderRows();
      });
    });
  }

  document.getElementById(addRowBtnId).addEventListener('click', () => {
    rows.push({ productId: '', quantity: 1, note: '' });
    renderRows();
  });

  if (scanBtnId) {
    document.getElementById(scanBtnId).addEventListener('click', () => {
      openScanner((code) => {
        const product = state.products.find((p) => p.barcode === code || p.id === code);
        if (!product) return { success: false, message: `Nicht gefunden: ${code}` };

        const existingRow = rows.find((r) => r.productId === product.id);
        if (existingRow) {
          existingRow.quantity += 1;
        } else {
          const emptyIdx = rows.findIndex((r) => !r.productId);
          if (emptyIdx >= 0) rows[emptyIdx] = { productId: product.id, quantity: 1, note: '' };
          else rows.push({ productId: product.id, quantity: 1, note: '' });
        }
        renderRows();
        return { success: true, message: product.name };
      }, {
        mode: 'continuous',
        onNotFoundCreate: (code) => openProductModal(null, { barcode: code }),
      });
    });
  }

  document.getElementById(submitBtnId).addEventListener('click', async () => {
    const valid = rows.filter((r) => r.productId && r.quantity > 0);
    if (valid.length === 0) { toast('Bitte mindestens ein Produkt auswählen'); return; }
    const ok = await confirmDialog(`${actionLabel} für ${valid.length} Position(en) buchen?`);
    if (!ok) return;
    try {
      for (const row of valid) {
        await addMovement({
          productId: row.productId,
          type: movementType,
          quantity: movementType === 'in' ? row.quantity : -row.quantity,
          note: row.note,
        });
      }
      vibrate([15, 40, 15]);
      toast(`${actionLabel} gebucht`);
      closeSubView();
    } catch (err) {
      console.error(`[Kasse] ${actionLabel} fehlgeschlagen`, err);
      toast('Fehler beim Speichern');
    }
  });

  return { render, presetProduct: (productId) => { rows = [{ productId, quantity: 1, note: '' }]; renderRows(); } };
}
