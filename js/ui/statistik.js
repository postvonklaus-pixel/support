'use strict';

import { state } from '../state.js';
import { escapeHtml, rangeForPeriod, formatDateShort } from '../utils.js';
import { formatCurrencyCompact } from '../currency.js';
import {
  getSalesInRange, getTopProducts, getRevenueByCategory, getSalesPerDay,
  getPaymentMethodDistribution, getStockValue, getCriticalProducts, getOutOfStockCount, getSalesSummary,
} from '../stats.js';

let activePeriod = 'month';

document.querySelectorAll('#stat-period-tabs .category-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    activePeriod = btn.dataset.period;
    document.querySelectorAll('#stat-period-tabs .category-tab').forEach((b) => b.classList.toggle('active', b === btn));
    render();
  });
});

const METHOD_LABEL = { cash: 'Bar', card: 'Karte', other: 'Sonstiges' };

export function render() {
  const currencyCode = state.settings.currencyCode;
  const { from, to } = activePeriod === 'all' ? { from: 0, to: Date.now() } : rangeForPeriod(activePeriod);
  const sales = getSalesInRange(state.sales, from, to);
  const summary = getSalesSummary(sales);

  const byRevenue = getTopProducts(sales, 'revenue', 10);
  const byQuantity = getTopProducts(sales, 'quantity', 10);
  const byCategory = getRevenueByCategory(sales, state.products);
  const perDay = getSalesPerDay(state.sales, 14);
  const paymentDist = getPaymentMethodDistribution(sales);

  const stockValue = getStockValue(state.products);
  const criticalCount = getCriticalProducts(state.products).length;
  const outOfStockCount = getOutOfStockCount(state.products);

  const maxCategoryRevenue = Math.max(1, ...byCategory.map((c) => c.revenue));
  const maxDayRevenue = Math.max(1, ...perDay.map((d) => d.revenue));

  const body = document.getElementById('statistik-body');
  body.innerHTML = `
    <div class="kpi-grid">
      <div class="kpi-card"><span class="kpi-value">${formatCurrencyCompact(summary.total, currencyCode)}</span><span class="kpi-label">Gesamtumsatz</span></div>
      <div class="kpi-card"><span class="kpi-value">${summary.count}</span><span class="kpi-label">Verkäufe</span></div>
      <div class="kpi-card"><span class="kpi-value">${formatCurrencyCompact(summary.avg, currencyCode)}</span><span class="kpi-label">Ø Bon</span></div>
      <div class="kpi-card"><span class="kpi-value kpi-value-small">${escapeHtml(summary.topProduct)}</span><span class="kpi-label">Beliebtestes Produkt</span></div>
    </div>

    <h3 class="detail-section-title">Umsatz pro Kategorie</h3>
    ${byCategory.length ? `<div class="hbar-chart">
      ${byCategory.map((c) => `
        <div class="hbar-row">
          <span class="hbar-label">${escapeHtml(c.category)}</span>
          <div class="hbar-track"><div class="hbar-fill" style="width:${(c.revenue / maxCategoryRevenue) * 100}%"></div></div>
          <span class="hbar-value">${formatCurrencyCompact(c.revenue, currencyCode)}</span>
        </div>
      `).join('')}
    </div>` : '<p class="product-list-empty">Keine Verkäufe im Zeitraum.</p>'}

    <div class="stat-two-col">
      <div>
        <h3 class="detail-section-title">Top 10 nach Umsatz</h3>
        <ol class="top-list">
          ${byRevenue.map((p) => `<li><span>${escapeHtml(p.name)}</span><strong>${formatCurrencyCompact(p.revenue, currencyCode)}</strong></li>`).join('') || '<li class="top-list-empty">–</li>'}
        </ol>
      </div>
      <div>
        <h3 class="detail-section-title">Top 10 nach Menge</h3>
        <ol class="top-list">
          ${byQuantity.map((p) => `<li><span>${escapeHtml(p.name)}</span><strong>${p.quantity} Stk.</strong></li>`).join('') || '<li class="top-list-empty">–</li>'}
        </ol>
      </div>
    </div>

    <h3 class="detail-section-title">Verkäufe letzte 14 Tage</h3>
    <div class="bar-chart bar-chart-14">
      ${perDay.map((d) => `
        <div class="bar-chart-col">
          <div class="bar-chart-bar" style="height:${Math.max(4, (d.revenue / maxDayRevenue) * 100)}%" title="${formatCurrencyCompact(d.revenue, currencyCode)}"></div>
          <div class="bar-chart-label">${formatDateShort(d.date)}</div>
        </div>
      `).join('')}
    </div>

    <h3 class="detail-section-title">Zahlungsarten</h3>
    <div class="hbar-chart">
      ${paymentDist.map((m) => `
        <div class="hbar-row">
          <span class="hbar-label">${METHOD_LABEL[m.method] || m.method}</span>
          <div class="hbar-track"><div class="hbar-fill" style="width:${m.percent}%"></div></div>
          <span class="hbar-value">${m.percent.toFixed(0)}%</span>
        </div>
      `).join('')}
    </div>

    <h3 class="detail-section-title">Bestandsübersicht</h3>
    <div class="kpi-grid">
      <div class="kpi-card"><span class="kpi-value">${formatCurrencyCompact(stockValue, currencyCode)}</span><span class="kpi-label">Lagerwert</span></div>
      <div class="kpi-card"><span class="kpi-value">${criticalCount}</span><span class="kpi-label">Unter Mindestbestand</span></div>
      <div class="kpi-card"><span class="kpi-value">${outOfStockCount}</span><span class="kpi-label">Ausverkauft</span></div>
    </div>
  `;
}
