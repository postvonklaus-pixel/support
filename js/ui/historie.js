'use strict';

import { state, deleteSale } from '../state.js';
import { formatDate, escapeHtml, isToday, toast, openModal, closeModal, confirmDialog } from '../utils.js';
import { formatCurrency } from '../currency.js';

const METHOD_ICON = { cash: '💵', card: '💳', other: '🔖' };
const METHOD_LABEL = { cash: 'Bar', card: 'Karte', other: 'Sonstiges' };

export function render() {
  const todayTotal = state.sales.filter((s) => isToday(s.timestamp)).reduce((sum, s) => sum + s.total, 0);
  document.getElementById('today-summary-value').textContent = formatCurrency(todayTotal, state.settings.currencyCode);

  const listEl = document.getElementById('sale-list');
  if (state.sales.length === 0) {
    listEl.innerHTML = '<p class="sale-list-empty">Noch keine Verkäufe.</p>';
    return;
  }
  listEl.innerHTML = '';
  state.sales.forEach((sale) => {
    const row = document.createElement('div');
    row.className = 'sale-item';
    row.innerHTML = `
      <div class="sale-item-icon">${METHOD_ICON[sale.paymentMethod] || '🧾'}</div>
      <div class="sale-item-info">
        <div class="sale-item-date">${formatDate(sale.timestamp)}</div>
        <div class="sale-item-method">${METHOD_LABEL[sale.paymentMethod] || sale.paymentMethod}</div>
      </div>
      <div class="sale-item-total">${formatCurrency(sale.total, state.settings.currencyCode)}</div>
    `;
    row.addEventListener('click', () => openSaleDetail(sale.id));
    listEl.appendChild(row);
  });
}

function openSaleDetail(saleId) {
  const sale = state.sales.find((s) => s.id === saleId);
  if (!sale) return;
  const itemsHtml = sale.items.map((it) => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${escapeHtml(it.name)}</div>
        <div class="cart-item-price">${it.quantity} × ${formatCurrency(it.price, state.settings.currencyCode)}</div>
      </div>
      <strong>${formatCurrency(it.price * it.quantity, state.settings.currencyCode)}</strong>
    </div>
  `).join('');
  let extra = '';
  if (sale.paymentMethod === 'cash') {
    extra = `
      <div class="change-row"><span>Gegeben</span><strong>${formatCurrency(sale.amountGiven, state.settings.currencyCode)}</strong></div>
      <div class="change-row"><span>Rückgeld</span><strong>${formatCurrency(sale.change, state.settings.currencyCode)}</strong></div>
    `;
  }
  const relatedMovements = state.movements.filter((m) => m.referenceId === sale.id);
  const movementsHtml = relatedMovements.length ? `
    <h3 class="detail-section-title">Bestandsänderungen</h3>
    <div class="movement-list-compact">
      ${relatedMovements.map((m) => `
        <div class="movement-item">
          <div class="movement-info">
            <div class="movement-title">${escapeHtml(m.productName)}</div>
            <div class="movement-meta">${m.stockBefore} → ${m.stockAfter}</div>
          </div>
          <div class="movement-qty movement-qty-neg">${m.quantity}</div>
        </div>
      `).join('')}
    </div>
  ` : '';

  document.getElementById('sale-detail-content').innerHTML = `
    <p class="cart-item-price">${formatDate(sale.timestamp)} · ${METHOD_LABEL[sale.paymentMethod] || sale.paymentMethod}</p>
    ${itemsHtml}
    <div class="checkout-total"><span>Gesamt</span><strong>${formatCurrency(sale.total, state.settings.currencyCode)}</strong></div>
    ${extra}
    ${movementsHtml}
  `;
  document.getElementById('btn-delete-sale').dataset.saleId = sale.id;
  openModal('modal-sale-detail');
}

document.getElementById('btn-delete-sale').addEventListener('click', async (e) => {
  const id = e.currentTarget.dataset.saleId;
  const ok = await confirmDialog('Diesen Verkauf wirklich löschen? Bestandsbuchungen bleiben zu Dokumentationszwecken erhalten.');
  if (!ok) return;
  await deleteSale(id);
  closeModal('modal-sale-detail');
  toast('Verkauf gelöscht');
});
