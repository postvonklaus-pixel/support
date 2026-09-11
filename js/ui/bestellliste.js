'use strict';

import { state } from '../state.js';
import { escapeHtml, toast, startOfDay } from '../utils.js';
import { getCriticalProducts } from '../stats.js';
import * as db from '../db.js';

let lastList = [];

function suggestedQty(product) {
  return Math.max(product.minStock * 2 - product.stock, product.minStock, 1);
}

export async function render() {
  const critical = getCriticalProducts(state.products);
  lastList = critical;
  const body = document.getElementById('bestellliste-body');

  if (critical.length === 0) {
    body.innerHTML = '<p class="product-list-empty">Keine kritischen Bestände – alles im grünen Bereich. 🎉</p>';
    return;
  }

  const ackRow = await db.get(db.STORES.meta, 'bestellliste_ack_date');
  const ackedToday = ackRow && ackRow.value === startOfDay(Date.now());

  const byCategory = new Map();
  critical.forEach((p) => {
    if (!byCategory.has(p.category)) byCategory.set(p.category, []);
    byCategory.get(p.category).push(p);
  });

  let html = '';
  if (ackedToday) {
    html += '<p class="bestellliste-ack-note">✓ Heute bereits zur Kenntnis genommen.</p>';
  }
  byCategory.forEach((products, category) => {
    html += `<div class="product-list-group-title">${escapeHtml(category)}</div>`;
    products.forEach((p) => {
      html += `
        <div class="product-list-item">
          <div class="product-list-swatch" style="background-color:${p.color}"></div>
          <div class="product-list-info">
            <div class="product-list-name">${escapeHtml(p.name)}</div>
            <div class="product-list-meta">Bestand: ${p.stock} / Min: ${p.minStock}</div>
          </div>
          <span class="stock-pill stock-critical">+${suggestedQty(p)}</span>
        </div>
      `;
    });
  });
  body.innerHTML = html;
}

function buildShareText() {
  const lines = ['Bestellliste', ''];
  const byCategory = new Map();
  lastList.forEach((p) => {
    if (!byCategory.has(p.category)) byCategory.set(p.category, []);
    byCategory.get(p.category).push(p);
  });
  byCategory.forEach((products, category) => {
    lines.push(`${category}:`);
    products.forEach((p) => lines.push(`  - ${p.name}: ${suggestedQty(p)} Stk. (Bestand ${p.stock}, Min ${p.minStock})`));
    lines.push('');
  });
  return lines.join('\n');
}

document.getElementById('btn-bestellliste-share').addEventListener('click', async () => {
  if (lastList.length === 0) { toast('Nichts zu teilen'); return; }
  const text = buildShareText();
  if (navigator.share) {
    try { await navigator.share({ title: 'Bestellliste', text }); return; } catch (err) { /* user cancelled or unsupported */ }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast('Bestellliste in Zwischenablage kopiert');
  } catch (err) {
    toast('Teilen nicht verfügbar');
  }
});

document.getElementById('btn-bestellliste-ack').addEventListener('click', async () => {
  await db.put(db.STORES.meta, { key: 'bestellliste_ack_date', value: startOfDay(Date.now()) });
  toast('Als gesehen markiert');
  render();
});
