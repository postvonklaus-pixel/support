'use strict';

import { state } from '../state.js';
import { escapeHtml, formatDate, rangeForPeriod } from '../utils.js';

const TYPE_ICON = { in: '📥', out: '📤', sale: '🛒', adjustment: '🧮', initial: '🏁' };
const TYPE_LABEL = { in: 'Wareneingang', out: 'Warenausgang', sale: 'Verkauf', adjustment: 'Inventur', initial: 'Anfangsbestand' };

let presetProductId = null;

export function render(opts) {
  presetProductId = opts?.productId || null;
  populateProductFilter();
  if (presetProductId) document.getElementById('bewegungen-filter-product').value = presetProductId;
  renderList();
}

function populateProductFilter() {
  const sel = document.getElementById('bewegungen-filter-product');
  const current = sel.value;
  sel.innerHTML = '<option value="alle">Alle Produkte</option>' +
    state.products
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'de'))
      .map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`)
      .join('');
  if (current) sel.value = current;
}

['bewegungen-filter-product', 'bewegungen-filter-type', 'bewegungen-filter-period'].forEach((id) => {
  document.getElementById(id).addEventListener('change', renderList);
});

function renderList() {
  const productFilter = document.getElementById('bewegungen-filter-product').value || 'alle';
  const typeFilter = document.getElementById('bewegungen-filter-type').value || 'alle';
  const periodFilter = document.getElementById('bewegungen-filter-period').value || 'alle';

  let items = state.movements.slice();
  if (productFilter !== 'alle') items = items.filter((m) => m.productId === productFilter);
  if (typeFilter !== 'alle') items = items.filter((m) => m.type === typeFilter);
  if (periodFilter !== 'alle') {
    const { from } = rangeForPeriod(periodFilter);
    items = items.filter((m) => m.timestamp >= from);
  }

  const listEl = document.getElementById('bewegungen-list');
  if (items.length === 0) {
    listEl.innerHTML = '<p class="product-list-empty">Keine Bewegungen im gewählten Zeitraum.</p>';
    return;
  }
  listEl.innerHTML = items.map((m) => `
    <div class="movement-item">
      <div class="movement-icon">${TYPE_ICON[m.type] || '•'}</div>
      <div class="movement-info">
        <div class="movement-title">${escapeHtml(m.productName)} <span class="movement-type">${TYPE_LABEL[m.type] || m.type}</span></div>
        <div class="movement-meta">${formatDate(m.timestamp)} · Bestand ${m.stockBefore} → ${m.stockAfter}${m.note ? ' · ' + escapeHtml(m.note) : ''}</div>
      </div>
      <div class="movement-qty ${m.quantity >= 0 ? 'movement-qty-pos' : 'movement-qty-neg'}">${m.quantity >= 0 ? '+' : ''}${m.quantity}</div>
    </div>
  `).join('');
}
