'use strict';

import { state } from '../state.js';
import { escapeHtml, debounce } from '../utils.js';
import { formatCurrency } from '../currency.js';
import { openSubView } from '../router.js';
import { stockLevelClass } from './produkte.js';

let activeFilter = 'alle';
let searchTerm = '';

export function render() {
  renderFilterButtons();
  renderList();
}

function renderFilterButtons() {
  document.querySelectorAll('#lager-filters .category-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.filter === activeFilter);
  });
}

document.querySelectorAll('#lager-filters .category-tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    activeFilter = btn.dataset.filter;
    render();
  });
});

document.getElementById('lager-search').addEventListener('input', debounce((e) => {
  searchTerm = e.target.value.trim().toLowerCase();
  renderList();
}, 150));

function getFilteredProducts() {
  let items = state.products.slice();
  if (searchTerm) items = items.filter((p) => p.name.toLowerCase().includes(searchTerm));
  if (activeFilter === 'kritisch') {
    items = items.filter((p) => p.trackStock && p.stock > 0 && p.stock <= p.minStock);
  } else if (activeFilter === 'ausverkauft') {
    items = items.filter((p) => p.trackStock && p.stock <= 0);
  }
  items.sort((a, b) => {
    const rank = (p) => (!p.trackStock ? 2 : p.stock <= 0 ? 0 : p.stock <= p.minStock ? 1 : 3);
    return rank(a) - rank(b) || a.name.localeCompare(b.name, 'de');
  });
  return items;
}

function renderList() {
  const listEl = document.getElementById('lager-list');
  const items = getFilteredProducts();
  if (items.length === 0) {
    listEl.innerHTML = '<p class="product-list-empty">Keine Produkte gefunden.</p>';
    return;
  }
  listEl.innerHTML = '';
  items.forEach((product) => {
    const row = document.createElement('div');
    row.className = 'product-list-item';
    const badge = product.trackStock
      ? `<span class="stock-pill ${stockLevelClass(product)}">${product.stock} / min ${product.minStock}</span>`
      : '<span class="stock-pill stock-untracked">nicht verfolgt</span>';
    row.innerHTML = `
      <div class="product-list-swatch" style="${product.imageBase64 ? `background-image:url(${product.imageBase64})` : `background-color:${product.color}`}"></div>
      <div class="product-list-info">
        <div class="product-list-name">${escapeHtml(product.name)}</div>
        <div class="product-list-meta">${formatCurrency(product.price, state.settings.currencyCode)} · ${escapeHtml(product.category)}</div>
      </div>
      ${badge}
    `;
    row.addEventListener('click', () => openSubView('produkt-detail', { productId: product.id }));
    listEl.appendChild(row);
  });
}

document.getElementById('btn-wareneingang').addEventListener('click', () => openSubView('wareneingang'));
document.getElementById('btn-warenausgang').addEventListener('click', () => openSubView('warenausgang'));
document.getElementById('btn-inventur').addEventListener('click', () => openSubView('inventur'));
document.getElementById('btn-bewegungen').addEventListener('click', () => openSubView('bewegungen'));
document.getElementById('btn-bestellliste').addEventListener('click', () => openSubView('bestellliste'));
