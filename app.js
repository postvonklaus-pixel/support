'use strict';

/* ============================================================
   Konstanten & Storage-Keys
   ============================================================ */
const STORAGE = {
  pin: 'pos_pin_hash',
  products: 'pos_products',
  sales: 'pos_sales',
  settings: 'pos_settings',
  cart: 'pos_cart',
  initialized: 'pos_initialized',
};

const DEFAULT_SETTINGS = { businessName: 'Meine Kasse', currency: '€' };
const LOCK_TIMEOUT_MS = 5 * 60 * 1000;
const COLOR_PALETTE = ['#2563eb', '#f97316', '#16a34a', '#db2777', '#7c3aed', '#0891b2', '#ca8a04', '#64748b'];

/* ============================================================
   Demo-Produktsets
   ============================================================ */
function demoSetA() {
  const drink = '#2563eb', snack = '#16a34a';
  return [
    p('Cola 0,33l', 1.50, 'Getränke', drink),
    p('Fanta 0,33l', 1.50, 'Getränke', drink),
    p('Sprite 0,33l', 1.50, 'Getränke', drink),
    p('Wasser 0,5l', 1.00, 'Getränke', drink),
    p('Apfelsaft 0,2l', 1.80, 'Getränke', drink),
    p('Bier 0,5l', 2.50, 'Getränke', drink),
    p('Weißbier 0,5l', 3.00, 'Getränke', drink),
    p('Radler 0,5l', 2.50, 'Getränke', drink),
    p('Kaffee', 2.00, 'Getränke', drink),
    p('Tee', 1.80, 'Getränke', drink),
    p('Brezel', 1.50, 'Snacks', snack),
    p('Chips', 1.20, 'Snacks', snack),
    p('Schokoriegel', 1.00, 'Snacks', snack),
    p('Salzstangen', 1.00, 'Snacks', snack),
  ];
}

function demoSetB() {
  const drink = '#2563eb', food = '#f97316', misc = '#16a34a';
  return [
    p('Bier 0,5l', 3.00, 'Getränke', drink),
    p('Radler 0,5l', 3.00, 'Getränke', drink),
    p('Weißwein 0,2l', 3.50, 'Getränke', drink),
    p('Rotwein 0,2l', 3.50, 'Getränke', drink),
    p('Aperol Spritz', 5.00, 'Getränke', drink),
    p('Cola/Mezzo 0,3l', 2.00, 'Getränke', drink),
    p('Wasser 0,5l', 1.50, 'Getränke', drink),
    p('Kaffee', 2.00, 'Getränke', drink),
    p('Bratwurst im Brötchen', 3.50, 'Essen', food),
    p('Steak im Brötchen', 4.50, 'Essen', food),
    p('Pommes', 3.00, 'Essen', food),
    p('Flammkuchen', 5.00, 'Essen', food),
    p('Kuchen (Stück)', 2.50, 'Essen', food),
    p('Lose (5 Stück)', 1.00, 'Sonstiges', misc),
    p('Tombola-Los', 2.00, 'Sonstiges', misc),
  ];
}

function p(name, price, category, color) {
  return { id: uuid(), name, price, category, color, barcode: '', image: '' };
}

/* ============================================================
   Utilities
   ============================================================ */
function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function formatCurrency(amount, currency) {
  const cur = currency || state.settings.currency || '€';
  const val = (Math.round((amount + Number.EPSILON) * 100) / 100).toFixed(2).replace('.', ',');
  return `${val} ${cur}`;
}

function parseGermanNumber(str) {
  if (typeof str !== 'string') return Number(str) || 0;
  return parseFloat(str.replace(',', '.')) || 0;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function isToday(iso) {
  const d = new Date(iso), now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function vibrate(pattern) {
  if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) {} }
}

async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (e) { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.error('Speichern fehlgeschlagen', e); }
}

let toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
}

function confirmDialog(message) {
  return new Promise(resolve => {
    const overlay = document.getElementById('modal-confirm');
    document.getElementById('confirm-message').textContent = message;
    overlay.hidden = false;
    const cleanup = (result) => {
      overlay.hidden = true;
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      resolve(result);
    };
    const okBtn = document.getElementById('confirm-ok');
    const cancelBtn = document.getElementById('confirm-cancel');
    const onOk = () => cleanup(true);
    const onCancel = () => cleanup(false);
    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
  });
}

function openModal(id) { document.getElementById(id).hidden = false; }
function closeModal(id) { document.getElementById(id).hidden = true; }

/* ============================================================
   State
   ============================================================ */
const state = {
  products: [],
  sales: [],
  settings: { ...DEFAULT_SETTINGS },
  cart: [],
  currentView: 'kasse',
  activeCategory: 'Alle',
  unlocked: false,
  pinBuffer: '',
  editingProductImage: '',
  editingProductColor: COLOR_PALETTE[0],
  checkoutMethod: null,
};

function loadAllState() {
  state.products = load(STORAGE.products, []);
  state.sales = load(STORAGE.sales, []);
  state.settings = { ...DEFAULT_SETTINGS, ...load(STORAGE.settings, {}) };
  state.cart = load(STORAGE.cart, []);
}
function persistCart() { save(STORAGE.cart, state.cart); }
function persistProducts() { save(STORAGE.products, state.products); }
function persistSales() { save(STORAGE.sales, state.sales); }
function persistSettings() { save(STORAGE.settings, state.settings); }

/* ============================================================
   PIN Screen
   ============================================================ */
const pinDotsEl = document.getElementById('pin-dots');
const pinErrorEl = document.getElementById('pin-error');
const pinTitleEl = document.getElementById('pin-title');
const pinSubtitleEl = document.getElementById('pin-subtitle');

function showPinScreen(subtitle) {
  state.unlocked = false;
  state.pinBuffer = '';
  document.getElementById('app').hidden = true;
  document.getElementById('screen-onboarding').hidden = true;
  document.getElementById('screen-pin').hidden = false;
  pinTitleEl.textContent = 'Kasse entsperren';
  pinSubtitleEl.textContent = subtitle || 'PIN eingeben';
  pinErrorEl.hidden = true;
  renderPinDots();
}

function renderPinDots() {
  const dots = pinDotsEl.querySelectorAll('.pin-dot');
  dots.forEach((dot, i) => dot.classList.toggle('filled', i < state.pinBuffer.length));
}

async function handlePinKey(key) {
  if (key === 'del') {
    state.pinBuffer = state.pinBuffer.slice(0, -1);
    renderPinDots();
    return;
  }
  if (state.pinBuffer.length >= 4) return;
  state.pinBuffer += key;
  renderPinDots();
  vibrate(8);
  if (state.pinBuffer.length === 4) {
    const hash = await sha256Hex(state.pinBuffer);
    const stored = load(STORAGE.pin, '');
    if (hash === stored) {
      unlockApp();
    } else {
      vibrate([80, 60, 80]);
      pinErrorEl.hidden = true;
      void pinErrorEl.offsetWidth;
      pinErrorEl.hidden = false;
      setTimeout(() => {
        state.pinBuffer = '';
        renderPinDots();
      }, 350);
    }
  }
}

document.getElementById('pin-keypad').addEventListener('click', (e) => {
  const btn = e.target.closest('.pin-key[data-key]');
  if (!btn) return;
  handlePinKey(btn.dataset.key);
});

function unlockApp() {
  state.unlocked = true;
  document.getElementById('screen-pin').hidden = true;
  document.getElementById('app').hidden = false;
  resetInactivityTimer();
  renderAll();
}

/* ---- Inaktivitäts-Sperre ---- */
let lastActivity = Date.now();
function resetInactivityTimer() { lastActivity = Date.now(); }
['click', 'touchstart', 'keydown', 'scroll'].forEach(evt => {
  document.addEventListener(evt, () => { if (state.unlocked) resetInactivityTimer(); }, { passive: true });
});
setInterval(() => {
  if (state.unlocked && Date.now() - lastActivity > LOCK_TIMEOUT_MS) {
    showPinScreen('PIN eingeben');
  }
}, 10000);

/* ============================================================
   Onboarding (erster Start)
   ============================================================ */
let onboardingReloadMode = false;

function showOnboarding(reloadMode) {
  onboardingReloadMode = !!reloadMode;
  document.getElementById('app').hidden = true;
  document.getElementById('screen-pin').hidden = true;
  document.getElementById('screen-onboarding').hidden = false;
}

async function applyOnboardingChoice(setName) {
  let products = [];
  if (setName === 'a') products = demoSetA();
  else if (setName === 'b') products = demoSetB();
  state.products = products;
  persistProducts();

  if (onboardingReloadMode) {
    document.getElementById('screen-onboarding').hidden = true;
    document.getElementById('app').hidden = false;
    renderAll();
    toast('Beispieldaten geladen');
    return;
  }

  save(STORAGE.initialized, true);
  document.getElementById('screen-onboarding').hidden = true;
  showPinScreen('Standard-PIN: 1234');
  toast('Standard-PIN ist 1234 – änderbar in Einstellungen');
}

document.getElementById('choice-set-a').addEventListener('click', () => applyOnboardingChoice('a'));
document.getElementById('choice-set-b').addEventListener('click', () => applyOnboardingChoice('b'));
document.getElementById('choice-empty').addEventListener('click', () => applyOnboardingChoice('empty'));

/* ============================================================
   Navigation / Tabs
   ============================================================ */
const VIEW_TITLES = { kasse: 'Kasse', produkte: 'Produkte', historie: 'Historie', einstellungen: 'Einstellungen' };

function switchView(view) {
  state.currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === `view-${view}`));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  document.getElementById('view-title').textContent = VIEW_TITLES[view] || '';
  if (view === 'produkte') renderProductList();
  if (view === 'historie') renderHistorie();
  if (view === 'einstellungen') renderEinstellungen();
  if (view === 'kasse') renderKasse();
}

document.getElementById('tabbar').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  switchView(btn.dataset.view);
});

/* generic modal close handlers */
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.close;
    if (id === 'modal-scanner') stopScanner();
    closeModal(id);
  });
});

/* ============================================================
   Kasse: Kategorien, Produktraster, Warenkorb
   ============================================================ */
function getCategories() {
  const seen = [];
  state.products.forEach(pr => { if (!seen.includes(pr.category)) seen.push(pr.category); });
  return seen;
}

function renderKasse() {
  renderCategoryTabs();
  renderProductGrid();
  renderCart();
}

function renderCategoryTabs() {
  const wrap = document.getElementById('category-tabs');
  const cats = ['Alle', ...getCategories()];
  if (!cats.includes(state.activeCategory)) state.activeCategory = 'Alle';
  wrap.innerHTML = '';
  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'category-tab' + (cat === state.activeCategory ? ' active' : '');
    btn.textContent = cat;
    btn.addEventListener('click', () => { state.activeCategory = cat; renderKasse(); });
    wrap.appendChild(btn);
  });
}

function renderProductGrid() {
  const grid = document.getElementById('product-grid');
  grid.innerHTML = '';
  const items = state.products.filter(pr => state.activeCategory === 'Alle' || pr.category === state.activeCategory);
  if (items.length === 0) {
    grid.innerHTML = '<p class="product-grid-empty">Keine Produkte. Lege welche unter „Produkte“ an.</p>';
    return;
  }
  items.forEach(pr => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'product-btn';
    if (pr.image) {
      btn.style.backgroundImage = `linear-gradient(to bottom, rgba(0,0,0,.15), rgba(0,0,0,.55)), url(${pr.image})`;
    } else {
      btn.style.backgroundColor = pr.color || COLOR_PALETTE[0];
    }
    const inCart = state.cart.find(c => c.id === pr.id);
    btn.innerHTML = `
      <span class="p-name">${escapeHtml(pr.name)}</span>
      <span class="p-price">${formatCurrency(pr.price)}</span>
      ${inCart ? `<span class="p-badge">${inCart.qty}</span>` : ''}
    `;
    btn.addEventListener('click', () => addToCart(pr));
    grid.appendChild(btn);
  });
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function addToCart(product) {
  vibrate(10);
  const existing = state.cart.find(c => c.id === product.id);
  if (existing) existing.qty += 1;
  else state.cart.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
  persistCart();
  renderKasse();
}

function changeQty(id, delta) {
  const item = state.cart.find(c => c.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) state.cart = state.cart.filter(c => c.id !== id);
  persistCart();
  renderKasse();
}

function removeFromCart(id) {
  state.cart = state.cart.filter(c => c.id !== id);
  persistCart();
  renderKasse();
}

function cartTotal() {
  return state.cart.reduce((sum, c) => sum + c.price * c.qty, 0);
}

function renderCart() {
  const itemsEl = document.getElementById('cart-items');
  const countEl = document.getElementById('cart-count');
  const totalEl = document.getElementById('cart-total');
  const payBtn = document.getElementById('btn-pay');

  const totalQty = state.cart.reduce((s, c) => s + c.qty, 0);
  countEl.textContent = `${totalQty} Artikel`;
  totalEl.textContent = formatCurrency(cartTotal());
  payBtn.disabled = state.cart.length === 0;

  if (state.cart.length === 0) {
    itemsEl.innerHTML = '<p class="cart-empty">Warenkorb ist leer</p>';
    return;
  }
  itemsEl.innerHTML = '';
  state.cart.forEach(item => {
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <div class="cart-item-info">
        <div class="cart-item-name">${escapeHtml(item.name)}</div>
        <div class="cart-item-price">${formatCurrency(item.price)} · ${formatCurrency(item.price * item.qty)}</div>
      </div>
      <div class="qty-control">
        <button type="button" class="qty-btn" data-action="dec">−</button>
        <span class="qty-value">${item.qty}</span>
        <button type="button" class="qty-btn" data-action="inc">+</button>
      </div>
      <button type="button" class="cart-item-remove" data-action="remove">🗑</button>
    `;
    row.querySelector('[data-action="dec"]').addEventListener('click', () => changeQty(item.id, -1));
    row.querySelector('[data-action="inc"]').addEventListener('click', () => changeQty(item.id, 1));
    row.querySelector('[data-action="remove"]').addEventListener('click', () => removeFromCart(item.id));
    itemsEl.appendChild(row);
  });
}

document.getElementById('cart-toggle').addEventListener('click', () => {
  document.getElementById('cart').classList.toggle('expanded');
});

/* ============================================================
   Bezahlvorgang
   ============================================================ */
document.getElementById('btn-pay').addEventListener('click', openCheckout);

function openCheckout() {
  if (state.cart.length === 0) return;
  state.checkoutMethod = null;
  document.getElementById('checkout-total-value').textContent = formatCurrency(cartTotal());
  document.querySelectorAll('.payment-method').forEach(b => b.classList.remove('selected'));
  document.getElementById('cash-input-wrap').hidden = true;
  document.getElementById('cash-given').value = '';
  document.getElementById('change-value').textContent = formatCurrency(0);
  document.getElementById('btn-confirm-pay').disabled = true;
  renderQuickCash();
  openModal('modal-checkout');
}

function renderQuickCash() {
  const total = cartTotal();
  const wrap = document.getElementById('quick-cash');
  wrap.innerHTML = '';
  const suggestions = new Set([Math.ceil(total), Math.ceil(total / 5) * 5, Math.ceil(total / 10) * 10, Math.ceil(total / 20) * 20]);
  [...suggestions].filter(v => v > 0).sort((a, b) => a - b).slice(0, 4).forEach(v => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'quick-cash-btn';
    btn.textContent = formatCurrency(v);
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
  state.checkoutMethod = btn.dataset.method;
  document.querySelectorAll('.payment-method').forEach(b => b.classList.toggle('selected', b === btn));
  const cashWrap = document.getElementById('cash-input-wrap');
  cashWrap.hidden = state.checkoutMethod !== 'bar';
  if (state.checkoutMethod === 'bar') {
    updateChange();
    document.getElementById('cash-given').focus();
  } else {
    document.getElementById('btn-confirm-pay').disabled = false;
  }
});

function updateChange() {
  const total = cartTotal();
  const given = parseGermanNumber(document.getElementById('cash-given').value);
  const change = given - total;
  document.getElementById('change-value').textContent = formatCurrency(Math.max(change, 0));
  document.getElementById('btn-confirm-pay').disabled = !(state.checkoutMethod === 'bar' && given >= total);
}
document.getElementById('cash-given').addEventListener('input', updateChange);

document.getElementById('btn-confirm-pay').addEventListener('click', () => {
  if (!state.checkoutMethod) return;
  const total = cartTotal();
  let given = null, change = null;
  if (state.checkoutMethod === 'bar') {
    given = parseGermanNumber(document.getElementById('cash-given').value);
    if (given < total) return;
    change = given - total;
  }
  const sale = {
    id: uuid(),
    date: new Date().toISOString(),
    items: state.cart.map(c => ({ id: c.id, name: c.name, price: c.price, qty: c.qty })),
    total,
    paymentMethod: state.checkoutMethod,
    given,
    change,
  };
  state.sales.unshift(sale);
  persistSales();
  state.cart = [];
  persistCart();
  document.getElementById('cart').classList.remove('expanded');
  closeModal('modal-checkout');
  vibrate([15, 40, 15]);
  toast('Verkauf abgeschlossen ✓');
  renderKasse();
});

/* ============================================================
   Produktverwaltung
   ============================================================ */
function renderProductList() {
  const listEl = document.getElementById('product-list');
  listEl.innerHTML = '';
  if (state.products.length === 0) {
    listEl.innerHTML = '<p class="product-list-empty">Noch keine Produkte angelegt.</p>';
    return;
  }
  const categories = getCategories();
  categories.forEach(cat => {
    const title = document.createElement('div');
    title.className = 'product-list-group-title';
    title.textContent = cat;
    listEl.appendChild(title);
    state.products.filter(pr => pr.category === cat).forEach(pr => {
      const row = document.createElement('div');
      row.className = 'product-list-item';
      row.innerHTML = `
        <div class="product-list-swatch" style="${pr.image ? `background-image:url(${pr.image})` : `background-color:${pr.color}`}"></div>
        <div class="product-list-info">
          <div class="product-list-name">${escapeHtml(pr.name)}</div>
          <div class="product-list-meta">${formatCurrency(pr.price)}${pr.barcode ? ' · ' + escapeHtml(pr.barcode) : ''}</div>
        </div>
      `;
      row.addEventListener('click', () => openProductModal(pr));
      listEl.appendChild(row);
    });
  });
}

document.getElementById('btn-add-product').addEventListener('click', () => openProductModal(null));

function renderColorPicker(selected) {
  const wrap = document.getElementById('color-picker');
  wrap.innerHTML = '';
  COLOR_PALETTE.forEach(color => {
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.className = 'color-swatch' + (color === selected ? ' selected' : '');
    sw.style.backgroundColor = color;
    sw.addEventListener('click', () => {
      state.editingProductColor = color;
      wrap.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
    });
    wrap.appendChild(sw);
  });
}

function refreshCategoryDatalist() {
  const list = document.getElementById('category-list');
  list.innerHTML = getCategories().map(c => `<option value="${escapeHtml(c)}"></option>`).join('');
}

function openProductModal(product) {
  refreshCategoryDatalist();
  const isEdit = !!product;
  document.getElementById('product-modal-title').textContent = isEdit ? 'Produkt bearbeiten' : 'Neues Produkt';
  document.getElementById('product-id').value = isEdit ? product.id : '';
  document.getElementById('product-name').value = isEdit ? product.name : '';
  document.getElementById('product-price').value = isEdit ? product.price : '';
  document.getElementById('product-category').value = isEdit ? product.category : '';
  document.getElementById('product-barcode').value = isEdit ? (product.barcode || '') : '';
  document.getElementById('btn-delete-product').hidden = !isEdit;
  state.editingProductColor = isEdit ? (product.color || COLOR_PALETTE[0]) : COLOR_PALETTE[0];
  state.editingProductImage = isEdit ? (product.image || '') : '';
  renderColorPicker(state.editingProductColor);
  updateImagePreview();
  openModal('modal-product');
}

function updateImagePreview() {
  const img = document.getElementById('product-image-preview');
  const removeBtn = document.getElementById('product-image-remove');
  if (state.editingProductImage) {
    img.src = state.editingProductImage;
    img.hidden = false;
    removeBtn.hidden = false;
  } else {
    img.hidden = true;
    removeBtn.hidden = true;
  }
}

document.getElementById('product-image-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    state.editingProductImage = await resizeImageToDataUrl(file, 640);
    updateImagePreview();
  } catch (err) {
    toast('Bild konnte nicht geladen werden');
  }
  e.target.value = '';
});

document.getElementById('product-image-remove').addEventListener('click', () => {
  state.editingProductImage = '';
  updateImagePreview();
});

function resizeImageToDataUrl(file, maxSize) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) { height = height * maxSize / width; width = maxSize; }
        else if (height > maxSize) { width = width * maxSize / height; height = maxSize; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

document.getElementById('product-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('product-id').value;
  const name = document.getElementById('product-name').value.trim();
  const price = parseGermanNumber(document.getElementById('product-price').value);
  const category = document.getElementById('product-category').value.trim();
  const barcode = document.getElementById('product-barcode').value.trim();
  if (!name || !category || price < 0) { toast('Bitte alle Pflichtfelder ausfüllen'); return; }

  if (id) {
    const pr = state.products.find(x => x.id === id);
    Object.assign(pr, { name, price, category, barcode, color: state.editingProductColor, image: state.editingProductImage });
  } else {
    state.products.push({
      id: barcode || uuid(), name, price, category, barcode,
      color: state.editingProductColor, image: state.editingProductImage,
    });
  }
  persistProducts();
  closeModal('modal-product');
  renderProductList();
  renderKasse();
  toast('Produkt gespeichert');
});

document.getElementById('btn-delete-product').addEventListener('click', async () => {
  const id = document.getElementById('product-id').value;
  if (!id) return;
  const ok = await confirmDialog('Produkt wirklich löschen?');
  if (!ok) return;
  state.products = state.products.filter(x => x.id !== id);
  state.cart = state.cart.filter(c => c.id !== id);
  persistProducts();
  persistCart();
  closeModal('modal-product');
  renderProductList();
  renderKasse();
  toast('Produkt gelöscht');
});

/* ============================================================
   Barcode-Scanner
   ============================================================ */
let scannerStream = null;
let scannerRafId = null;
let scannerDetector = null;
let scannerCallback = null;

async function getBarcodeDetectorClass() {
  if ('BarcodeDetector' in window) {
    try {
      const formats = await window.BarcodeDetector.getSupportedFormats();
      if (formats && formats.length) return window.BarcodeDetector;
    } catch (e) { /* fall through to polyfill */ }
  }
  const mod = await import('https://cdn.jsdelivr.net/npm/barcode-detector@3.2.2/dist/es/ponyfill.js');
  return mod.BarcodeDetector;
}

async function openScanner(onDetect) {
  scannerCallback = onDetect;
  const statusEl = document.getElementById('scanner-status');
  const video = document.getElementById('scanner-video');
  statusEl.textContent = 'Kamera wird gestartet …';
  openModal('modal-scanner');
  try {
    scannerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = scannerStream;
    await video.play();
    const DetectorClass = await getBarcodeDetectorClass();
    scannerDetector = new DetectorClass({ formats: ['ean_13', 'ean_8', 'upc_a', 'code_128', 'qr_code'] });
    statusEl.textContent = 'Barcode in den Rahmen halten …';
    scanLoop();
  } catch (err) {
    console.error(err);
    statusEl.textContent = 'Kamera nicht verfügbar: ' + (err.message || err);
  }
}

async function scanLoop() {
  const video = document.getElementById('scanner-video');
  if (!scannerDetector || video.readyState < 2) {
    scannerRafId = requestAnimationFrame(scanLoop);
    return;
  }
  try {
    const codes = await scannerDetector.detect(video);
    if (codes && codes.length > 0) {
      const value = codes[0].rawValue;
      vibrate(20);
      const cb = scannerCallback;
      stopScanner();
      closeModal('modal-scanner');
      if (cb) cb(value);
      return;
    }
  } catch (e) { /* try again next frame */ }
  scannerRafId = requestAnimationFrame(scanLoop);
}

function stopScanner() {
  if (scannerRafId) cancelAnimationFrame(scannerRafId);
  scannerRafId = null;
  scannerDetector = null;
  if (scannerStream) {
    scannerStream.getTracks().forEach(t => t.stop());
    scannerStream = null;
  }
  const video = document.getElementById('scanner-video');
  video.srcObject = null;
}

document.getElementById('btn-scan-product').addEventListener('click', () => {
  openScanner((code) => {
    const existing = state.products.find(x => x.barcode === code || x.id === code);
    if (existing) {
      openProductModal(existing);
      toast('Produkt gefunden');
    } else {
      openProductModal(null);
      document.getElementById('product-barcode').value = code;
      toast('Neuer Barcode – Produkt anlegen');
    }
  });
});

document.getElementById('btn-scan-in-form').addEventListener('click', () => {
  openScanner((code) => {
    const currentId = document.getElementById('product-id').value;
    const owner = state.products.find(x => x.barcode === code && x.id !== currentId);
    if (owner) toast(`Barcode gehört bereits zu „${owner.name}“`);
    document.getElementById('product-barcode').value = code;
  });
});

/* ============================================================
   Historie
   ============================================================ */
function renderHistorie() {
  const listEl = document.getElementById('sale-list');
  const todayTotal = state.sales.filter(s => isToday(s.date)).reduce((sum, s) => sum + s.total, 0);
  document.getElementById('today-summary-value').textContent = formatCurrency(todayTotal);

  listEl.innerHTML = '';
  if (state.sales.length === 0) {
    listEl.innerHTML = '<p class="sale-list-empty">Noch keine Verkäufe.</p>';
    return;
  }
  const methodIcon = { bar: '💵', karte: '💳', sonstiges: '🔖' };
  const methodLabel = { bar: 'Bar', karte: 'Karte', sonstiges: 'Sonstiges' };
  state.sales.forEach(sale => {
    const row = document.createElement('div');
    row.className = 'sale-item';
    row.innerHTML = `
      <div class="sale-item-icon">${methodIcon[sale.paymentMethod] || '🧾'}</div>
      <div class="sale-item-info">
        <div class="sale-item-date">${formatDate(sale.date)}</div>
        <div class="sale-item-method">${methodLabel[sale.paymentMethod] || sale.paymentMethod}</div>
      </div>
      <div class="sale-item-total">${formatCurrency(sale.total)}</div>
    `;
    row.addEventListener('click', () => openSaleDetail(sale.id));
    listEl.appendChild(row);
  });
}

function openSaleDetail(saleId) {
  const sale = state.sales.find(s => s.id === saleId);
  if (!sale) return;
  const methodLabel = { bar: 'Bar', karte: 'Karte', sonstiges: 'Sonstiges' };
  const itemsHtml = sale.items.map(it => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${escapeHtml(it.name)}</div>
        <div class="cart-item-price">${it.qty} × ${formatCurrency(it.price)}</div>
      </div>
      <strong>${formatCurrency(it.price * it.qty)}</strong>
    </div>
  `).join('');
  let extra = '';
  if (sale.paymentMethod === 'bar') {
    extra = `
      <div class="change-row"><span>Gegeben</span><strong>${formatCurrency(sale.given)}</strong></div>
      <div class="change-row"><span>Rückgeld</span><strong>${formatCurrency(sale.change)}</strong></div>
    `;
  }
  document.getElementById('sale-detail-content').innerHTML = `
    <p class="cart-item-price">${formatDate(sale.date)} · ${methodLabel[sale.paymentMethod] || sale.paymentMethod}</p>
    ${itemsHtml}
    <div class="checkout-total"><span>Gesamt</span><strong>${formatCurrency(sale.total)}</strong></div>
    ${extra}
  `;
  document.getElementById('btn-delete-sale').dataset.saleId = sale.id;
  openModal('modal-sale-detail');
}

document.getElementById('btn-delete-sale').addEventListener('click', async (e) => {
  const id = e.currentTarget.dataset.saleId;
  const ok = await confirmDialog('Diesen Verkauf wirklich löschen?');
  if (!ok) return;
  state.sales = state.sales.filter(s => s.id !== id);
  persistSales();
  closeModal('modal-sale-detail');
  renderHistorie();
  toast('Verkauf gelöscht');
});

/* ============================================================
   Einstellungen
   ============================================================ */
function renderEinstellungen() {
  document.getElementById('setting-business-name').value = state.settings.businessName;
  document.getElementById('setting-currency').value = state.settings.currency;
}

document.getElementById('setting-business-name').addEventListener('change', (e) => {
  state.settings.businessName = e.target.value.trim() || DEFAULT_SETTINGS.businessName;
  persistSettings();
  toast('Gespeichert');
});
document.getElementById('setting-currency').addEventListener('change', (e) => {
  state.settings.currency = e.target.value.trim() || DEFAULT_SETTINGS.currency;
  persistSettings();
  renderKasse();
  toast('Gespeichert');
});

document.getElementById('pin-change-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const current = document.getElementById('pin-current').value;
  const next = document.getElementById('pin-new').value;
  const repeat = document.getElementById('pin-new-repeat').value;
  if (!/^\d{4}$/.test(current) || !/^\d{4}$/.test(next)) { toast('PIN muss 4-stellig sein'); return; }
  const currentHash = await sha256Hex(current);
  const stored = load(STORAGE.pin, '');
  if (currentHash !== stored) { toast('Aktueller PIN ist falsch'); vibrate([80, 60, 80]); return; }
  if (next !== repeat) { toast('Neue PINs stimmen nicht überein'); return; }
  save(STORAGE.pin, await sha256Hex(next));
  e.target.reset();
  toast('PIN geändert');
});

document.getElementById('btn-export').addEventListener('click', () => {
  const data = { products: state.products, sales: state.sales, settings: state.settings, exportedAt: new Date().toISOString() };
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
    const ok = await confirmDialog('Vorhandene Daten werden durch die Importdatei ersetzt. Fortfahren?');
    if (!ok) return;
    state.products = data.products;
    state.sales = data.sales;
    state.settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
    persistProducts(); persistSales(); persistSettings();
    renderAll();
    toast('Import erfolgreich');
  } catch (err) {
    toast('Import fehlgeschlagen: ungültige Datei');
  }
  e.target.value = '';
});

document.getElementById('btn-reload-demo').addEventListener('click', async () => {
  const ok = await confirmDialog('Aktuelle Produkte werden durch Beispieldaten ersetzt. Verkäufe bleiben erhalten. Fortfahren?');
  if (!ok) return;
  showOnboarding(true);
});

document.getElementById('btn-delete-all').addEventListener('click', async () => {
  const ok = await confirmDialog('Wirklich ALLE Daten (Produkte, Verkäufe, Einstellungen, PIN) löschen? Dies kann nicht rückgängig gemacht werden.');
  if (!ok) return;
  Object.values(STORAGE).forEach(key => localStorage.removeItem(key));
  toast('Alle Daten gelöscht');
  setTimeout(() => location.reload(), 600);
});

/* ============================================================
   Render alles
   ============================================================ */
function renderAll() {
  document.getElementById('topbar-extra').textContent = state.settings.businessName;
  renderKasse();
  if (state.currentView === 'produkte') renderProductList();
  if (state.currentView === 'historie') renderHistorie();
  if (state.currentView === 'einstellungen') renderEinstellungen();
}

/* ============================================================
   Bootstrap
   ============================================================ */
async function bootstrap() {
  loadAllState();
  const hasPin = !!load(STORAGE.pin, null);
  if (!hasPin) {
    save(STORAGE.pin, await sha256Hex('1234'));
    showOnboarding(false);
  } else {
    showPinScreen('PIN eingeben');
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}

bootstrap();
