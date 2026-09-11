'use strict';

import { state, getCategories, addToCart, changeCartQty, removeFromCart, cartTotal, recordSale, clearCart } from '../state.js';
import { escapeHtml, vibrate, toast, openModal, closeModal } from '../utils.js';
import { formatCurrency, parseAmountInput, applyAmountInputAttrs, getQuickCashSteps } from '../currency.js';

let checkoutMethod = null;

export function render() {
  renderCategoryTabs();
  renderProductGrid();
  renderCart();
}

function renderCategoryTabs() {
  const wrap = document.getElementById('category-tabs');
  const cats = ['Alle', ...getCategories()];
  if (!cats.includes(state.activeCategory)) state.activeCategory = 'Alle';
  wrap.innerHTML = '';
  cats.forEach((cat) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'category-tab' + (cat === state.activeCategory ? ' active' : '');
    btn.textContent = cat;
    btn.addEventListener('click', () => { state.activeCategory = cat; render(); });
    wrap.appendChild(btn);
  });
}

function renderProductGrid() {
  const grid = document.getElementById('product-grid');
  grid.innerHTML = '';
  const items = state.products.filter((p) => state.activeCategory === 'Alle' || p.category === state.activeCategory);
  if (items.length === 0) {
    grid.innerHTML = '<p class="product-grid-empty">Keine Produkte. Lege welche unter „Produkte" an.</p>';
    return;
  }
  items.forEach((product) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'product-btn';
    const soldOut = product.trackStock && product.stock <= 0;
    const critical = product.trackStock && !soldOut && product.stock <= product.minStock;
    if (soldOut) btn.classList.add('sold-out');
    if (product.imageBase64) {
      btn.style.backgroundImage = `linear-gradient(to bottom, rgba(0,0,0,.15), rgba(0,0,0,.55)), url(${product.imageBase64})`;
    } else {
      btn.style.backgroundColor = product.color || '#2563eb';
    }
    const inCart = state.cart.find((c) => c.productId === product.id);
    btn.innerHTML = `
      <span class="p-name">${escapeHtml(product.name)}</span>
      <span class="p-price">${formatCurrency(product.price, state.settings.currencyCode)}</span>
      ${soldOut ? '<span class="p-soldout-label">Ausverkauft</span>' : ''}
      ${critical ? '<span class="p-warning">⚠️</span>' : ''}
      ${inCart ? `<span class="p-badge">${inCart.quantity}</span>` : ''}
    `;
    btn.disabled = soldOut;
    if (!soldOut) btn.addEventListener('click', () => handleAddToCart(product));
    grid.appendChild(btn);
  });
}

function handleAddToCart(product) {
  vibrate(10);
  addToCart(product);
  render();
}

function renderCart() {
  const itemsEl = document.getElementById('cart-items');
  const countEl = document.getElementById('cart-count');
  const totalEl = document.getElementById('cart-total');
  const payBtn = document.getElementById('btn-pay');

  const totalQty = state.cart.reduce((s, c) => s + c.quantity, 0);
  countEl.textContent = `${totalQty} Artikel`;
  totalEl.textContent = formatCurrency(cartTotal(), state.settings.currencyCode);
  payBtn.disabled = state.cart.length === 0;

  if (state.cart.length === 0) {
    itemsEl.innerHTML = '<p class="cart-empty">Warenkorb ist leer</p>';
    return;
  }
  itemsEl.innerHTML = '';
  state.cart.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <div class="cart-item-info">
        <div class="cart-item-name">${escapeHtml(item.name)}</div>
        <div class="cart-item-price">${formatCurrency(item.price, state.settings.currencyCode)} · ${formatCurrency(item.price * item.quantity, state.settings.currencyCode)}</div>
      </div>
      <div class="qty-control">
        <button type="button" class="qty-btn" data-action="dec">−</button>
        <span class="qty-value">${item.quantity}</span>
        <button type="button" class="qty-btn" data-action="inc">+</button>
      </div>
      <button type="button" class="cart-item-remove" data-action="remove">🗑</button>
    `;
    row.querySelector('[data-action="dec"]').addEventListener('click', () => { changeCartQty(item.productId, -1); render(); });
    row.querySelector('[data-action="inc"]').addEventListener('click', () => { changeCartQty(item.productId, 1); render(); });
    row.querySelector('[data-action="remove"]').addEventListener('click', () => { removeFromCart(item.productId); render(); });
    itemsEl.appendChild(row);
  });
}

document.getElementById('cart-toggle').addEventListener('click', () => {
  document.getElementById('cart').classList.toggle('expanded');
});

/* ---------------- Checkout ---------------- */

document.getElementById('btn-pay').addEventListener('click', openCheckout);

function openCheckout() {
  if (state.cart.length === 0) return;
  checkoutMethod = null;
  document.getElementById('checkout-total-value').textContent = formatCurrency(cartTotal(), state.settings.currencyCode);
  document.querySelectorAll('.payment-method').forEach((b) => b.classList.remove('selected'));
  document.getElementById('cash-input-wrap').hidden = true;
  const cashInput = document.getElementById('cash-given');
  cashInput.value = '';
  applyAmountInputAttrs(cashInput, state.settings.currencyCode);
  document.getElementById('change-value').textContent = formatCurrency(0, state.settings.currencyCode);
  document.getElementById('btn-confirm-pay').disabled = true;
  renderQuickCash();
  openModal('modal-checkout');
}

function renderQuickCash() {
  const total = cartTotal();
  const wrap = document.getElementById('quick-cash');
  wrap.innerHTML = '';
  const steps = getQuickCashSteps(state.settings.currencyCode);
  const suggestions = new Set(steps.map((step) => Math.ceil(total / step) * step));
  [...suggestions].filter((v) => v > 0).sort((a, b) => a - b).slice(0, 4).forEach((v) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'quick-cash-btn';
    btn.textContent = formatCurrency(v, state.settings.currencyCode);
    btn.addEventListener('click', () => {
      document.getElementById('cash-given').value = v;
      updateChange();
    });
    wrap.appendChild(btn);
  });
}

document.getElementById('payment-methods').addEventListener('click', (e) => {
  const btn = e.target.closest('.payment-method');
  if (!btn) return;
  checkoutMethod = btn.dataset.method;
  document.querySelectorAll('.payment-method').forEach((b) => b.classList.toggle('selected', b === btn));
  const cashWrap = document.getElementById('cash-input-wrap');
  cashWrap.hidden = checkoutMethod !== 'cash';
  if (checkoutMethod === 'cash') {
    updateChange();
    document.getElementById('cash-given').focus();
  } else {
    document.getElementById('btn-confirm-pay').disabled = false;
  }
});

function updateChange() {
  const total = cartTotal();
  const given = parseAmountInput(document.getElementById('cash-given').value, state.settings.currencyCode);
  const change = given - total;
  document.getElementById('change-value').textContent = formatCurrency(Math.max(change, 0), state.settings.currencyCode);
  document.getElementById('btn-confirm-pay').disabled = !(checkoutMethod === 'cash' && given >= total);
}
document.getElementById('cash-given').addEventListener('input', updateChange);

document.getElementById('btn-confirm-pay').addEventListener('click', async () => {
  if (!checkoutMethod) return;
  const total = cartTotal();
  let amountGiven;
  if (checkoutMethod === 'cash') {
    amountGiven = parseAmountInput(document.getElementById('cash-given').value, state.settings.currencyCode);
    if (amountGiven < total) return;
  }
  try {
    await recordSale({ items: state.cart, paymentMethod: checkoutMethod, amountGiven });
    clearCart();
    document.getElementById('cart').classList.remove('expanded');
    closeModal('modal-checkout');
    vibrate([15, 40, 15]);
    toast('Verkauf abgeschlossen ✓');
    render();
  } catch (err) {
    console.error('[Kasse] Verkauf fehlgeschlagen', err);
    toast('Fehler beim Speichern des Verkaufs');
  }
});
