'use strict';

import { state } from '../state.js';
import { formatDate, escapeHtml, startOfDay, rangeForPeriod } from '../utils.js';
import { openSubView } from '../router.js';
import { openProductModal } from './produkte.js';
import { presetProduct as presetWareneingang } from './wareneingang.js';

let currentProductId = null;

export function render(opts) {
  if (opts?.productId) currentProductId = opts.productId;
  const product = state.products.find((p) => p.id === currentProductId);
  const body = document.getElementById('produkt-detail-body');
  const titleEl = document.getElementById('produkt-detail-title');
  if (!product) {
    titleEl.textContent = 'Produkt';
    body.innerHTML = '<p class="product-list-empty">Produkt nicht gefunden.</p>';
    return;
  }
  titleEl.textContent = product.name;

  const salesForProduct = state.sales.flatMap((sale) =>
    sale.items.filter((it) => it.productId === product.id).map((it) => ({ ...it, timestamp: sale.timestamp }))
  );

  const sumFor = (period) => {
    const { from } = rangeForPeriod(period);
    return salesForProduct.filter((it) => it.timestamp >= from).reduce((sum, it) => sum + it.quantity, 0);
  };

  const movements = state.movements.filter((m) => m.productId === product.id).slice(0, 10);

  const days = [];
  const today = startOfDay(Date.now());
  for (let i = 6; i >= 0; i -= 1) {
    const dayStart = today - i * 86400000;
    const dayEnd = dayStart + 86400000;
    const qty = salesForProduct.filter((it) => it.timestamp >= dayStart && it.timestamp < dayEnd).reduce((s, it) => s + it.quantity, 0);
    days.push({ dayStart, qty });
  }
  const maxQty = Math.max(1, ...days.map((d) => d.qty));

  body.innerHTML = `
    <div class="detail-stock-hero ${product.trackStock ? '' : 'detail-stock-hero-untracked'}">
      <div class="detail-stock-value">${product.trackStock ? product.stock : '–'}</div>
      <div class="detail-stock-label">${product.trackStock ? `Bestand (Min. ${product.minStock})` : 'Bestand nicht verfolgt'}</div>
    </div>

    <div class="kpi-grid">
      <div class="kpi-card"><span class="kpi-value">${sumFor('today')}</span><span class="kpi-label">Heute verkauft</span></div>
      <div class="kpi-card"><span class="kpi-value">${sumFor('week')}</span><span class="kpi-label">Diese Woche</span></div>
      <div class="kpi-card"><span class="kpi-value">${sumFor('month')}</span><span class="kpi-label">Diesen Monat</span></div>
      <div class="kpi-card"><span class="kpi-value">${salesForProduct.reduce((s, it) => s + it.quantity, 0)}</span><span class="kpi-label">Gesamt</span></div>
    </div>

    <h3 class="detail-section-title">Verkäufe letzte 7 Tage</h3>
    <div class="bar-chart bar-chart-7">
      ${days.map((d) => `
        <div class="bar-chart-col">
          <div class="bar-chart-value">${d.qty || ''}</div>
          <div class="bar-chart-bar" style="height:${Math.max(4, (d.qty / maxQty) * 100)}%"></div>
          <div class="bar-chart-label">${new Date(d.dayStart).toLocaleDateString('de-DE', { weekday: 'short' })}</div>
        </div>
      `).join('')}
    </div>

    <h3 class="detail-section-title">Letzte Bewegungen</h3>
    <div class="movement-list-compact">
      ${movements.length ? movements.map((m) => `
        <div class="movement-item">
          <div class="movement-info">
            <div class="movement-title">${escapeHtml(m.type)}</div>
            <div class="movement-meta">${formatDate(m.timestamp)} · ${m.stockBefore} → ${m.stockAfter}</div>
          </div>
          <div class="movement-qty ${m.quantity >= 0 ? 'movement-qty-pos' : 'movement-qty-neg'}">${m.quantity >= 0 ? '+' : ''}${m.quantity}</div>
        </div>
      `).join('') : '<p class="product-list-empty">Keine Bewegungen.</p>'}
    </div>

    <div class="detail-actions">
      <button type="button" class="btn btn-secondary" id="detail-btn-edit">Bearbeiten</button>
      <button type="button" class="btn btn-secondary" id="detail-btn-wareneingang">Wareneingang</button>
      <button type="button" class="btn btn-secondary" id="detail-btn-inventur">Inventur</button>
    </div>
  `;

  document.getElementById('detail-btn-edit').addEventListener('click', () => openProductModal(product));
  document.getElementById('detail-btn-wareneingang').addEventListener('click', () => {
    openSubView('wareneingang');
    presetWareneingang(product.id);
  });
  document.getElementById('detail-btn-inventur').addEventListener('click', () => openSubView('inventur'));
}
