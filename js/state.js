'use strict';

import * as db from './db.js';
import { uuid, logError } from './utils.js';
import { roundToStep } from './currency.js';

const listeners = {};
export function on(event, cb) {
  (listeners[event] || (listeners[event] = [])).push(cb);
  return () => off(event, cb);
}
export function off(event, cb) {
  if (!listeners[event]) return;
  listeners[event] = listeners[event].filter((fn) => fn !== cb);
}
export function emit(event, payload) {
  (listeners[event] || []).forEach((cb) => {
    try { cb(payload); } catch (err) { logError(`listener for ${event}`, err); }
  });
}

export const DEFAULT_SETTINGS = {
  shopName: 'Meine Kasse',
  currencyCode: 'EUR',
  inventoryEnabled: false,
  exampleSet: 'custom',
  scannerSoundEnabled: true,
  scannerVibrationEnabled: true,
  scannerModeKasse: 'single',
};

export const state = {
  products: [],
  sales: [],
  movements: [],
  settings: { ...DEFAULT_SETTINGS },
  cart: [],
  currentView: 'kasse',
  activeCategory: 'Alle',
  unlocked: false,
  pinBuffer: '',
};

export async function loadAll() {
  const [products, sales, movements, settingsRow] = await Promise.all([
    db.getAll(db.STORES.products),
    db.getAll(db.STORES.sales),
    db.getAll(db.STORES.movements),
    db.get(db.STORES.settings, 'main'),
  ]);
  state.products = products;
  state.sales = sales.sort((a, b) => b.timestamp - a.timestamp);
  state.movements = movements.sort((a, b) => b.timestamp - a.timestamp);
  if (settingsRow) {
    state.settings = {
      shopName: settingsRow.shopName ?? DEFAULT_SETTINGS.shopName,
      currencyCode: settingsRow.currencyCode ?? DEFAULT_SETTINGS.currencyCode,
      inventoryEnabled: settingsRow.inventoryEnabled ?? false,
      exampleSet: settingsRow.exampleSet ?? 'custom',
      scannerSoundEnabled: settingsRow.scannerSoundEnabled ?? true,
      scannerVibrationEnabled: settingsRow.scannerVibrationEnabled ?? true,
      scannerModeKasse: settingsRow.scannerModeKasse ?? 'single',
    };
  }
  emit('data:loaded');
}

export function getCategories() {
  const seen = [];
  state.products.forEach((p) => { if (!seen.includes(p.category)) seen.push(p.category); });
  return seen;
}

/* ---------------- Products ---------------- */

export async function saveProduct(product) {
  const now = Date.now();
  const existing = state.products.find((p) => p.id === product.id);
  const record = {
    stock: 0, minStock: 0, trackStock: false,
    ...existing,
    ...product,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  await db.put(db.STORES.products, record);
  const idx = state.products.findIndex((p) => p.id === record.id);
  if (idx >= 0) state.products[idx] = record; else state.products.push(record);

  // Keep the movement log authoritative: whenever tracked stock is set or
  // changes directly via the product form (not through a dedicated
  // Wareneingang/Warenausgang/Inventur action), record it as a movement too,
  // so "Bestände aus Bewegungen neu berechnen" never disagrees with reality.
  const previousStock = existing?.trackStock ? existing.stock : 0;
  if (record.trackStock && record.stock !== previousStock) {
    const wasUntracked = !existing || !existing.trackStock;
    const movement = {
      id: uuid(),
      productId: record.id,
      productName: record.name,
      type: wasUntracked ? 'initial' : 'adjustment',
      quantity: record.stock - previousStock,
      stockBefore: previousStock,
      stockAfter: record.stock,
      timestamp: now,
      note: wasUntracked ? 'Anfangsbestand' : 'Manuelle Korrektur (Produktformular)',
    };
    await db.put(db.STORES.movements, movement);
    state.movements.unshift(movement);
    emit('movements:changed');
  }

  emit('products:changed');
  return record;
}

export async function deleteProduct(id) {
  await db.del(db.STORES.products, id);
  state.products = state.products.filter((p) => p.id !== id);
  state.cart = state.cart.filter((c) => c.productId !== id);
  emit('products:changed');
  emit('cart:changed');
}

/* ---------------- Stock movements ---------------- */

export async function addMovement({ productId, type, quantity, note, referenceId, stockAfterOverride }) {
  const product = state.products.find((p) => p.id === productId);
  if (!product) throw new Error(`Produkt ${productId} nicht gefunden`);
  const stockBefore = product.stock || 0;
  const stockAfter = stockAfterOverride !== undefined
    ? stockAfterOverride
    : stockBefore + quantity;

  const movement = {
    id: uuid(),
    productId,
    productName: product.name,
    type,
    quantity: stockAfterOverride !== undefined ? stockAfter - stockBefore : quantity,
    stockBefore,
    stockAfter,
    timestamp: Date.now(),
    note: note || '',
    referenceId: referenceId || undefined,
  };

  await db.put(db.STORES.movements, movement);
  state.movements.unshift(movement);

  product.stock = stockAfter;
  product.updatedAt = Date.now();
  await db.put(db.STORES.products, product);
  emit('products:changed');
  emit('movements:changed');
  return movement;
}

/* ---------------- Sales ---------------- */

export async function recordSale({ items, paymentMethod, amountGiven }) {
  const subtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const sale = {
    id: uuid(),
    timestamp: Date.now(),
    items: items.map((it) => ({ productId: it.productId, name: it.name, price: it.price, quantity: it.quantity })),
    subtotal,
    total: subtotal,
    paymentMethod,
    amountGiven: paymentMethod === 'cash' ? amountGiven : undefined,
    change: paymentMethod === 'cash' ? amountGiven - subtotal : undefined,
  };
  await db.put(db.STORES.sales, sale);
  state.sales.unshift(sale);

  for (const item of sale.items) {
    const product = state.products.find((p) => p.id === item.productId);
    if (product && product.trackStock) {
      await addMovement({
        productId: product.id,
        type: 'sale',
        quantity: -item.quantity,
        note: `Verkauf`,
        referenceId: sale.id,
      });
    }
  }

  emit('sales:changed');
  return sale;
}

export async function deleteSale(id) {
  await db.del(db.STORES.sales, id);
  state.sales = state.sales.filter((s) => s.id !== id);
  emit('sales:changed');
}

/* ---------------- Settings ---------------- */

export async function saveSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  await db.put(db.STORES.settings, { key: 'main', ...state.settings });
  emit('settings:changed');
  return state.settings;
}

/* ---------------- Cart (in-memory only) ---------------- */

export function addToCart(product) {
  const existing = state.cart.find((c) => c.productId === product.id);
  if (existing) existing.quantity += 1;
  else state.cart.push({ productId: product.id, name: product.name, price: product.price, quantity: 1 });
  emit('cart:changed');
}

export function changeCartQty(productId, delta) {
  const item = state.cart.find((c) => c.productId === productId);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) state.cart = state.cart.filter((c) => c.productId !== productId);
  emit('cart:changed');
}

export function removeFromCart(productId) {
  state.cart = state.cart.filter((c) => c.productId !== productId);
  emit('cart:changed');
}

export function clearCart() {
  state.cart = [];
  emit('cart:changed');
}

export function cartTotal() {
  return state.cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
}

/* ---------------- Consistency repair ---------------- */

export async function recalcStockFromMovements() {
  let fixed = 0;
  for (const product of state.products) {
    if (!product.trackStock) continue;
    const moves = state.movements
      .filter((m) => m.productId === product.id)
      .slice()
      .sort((a, b) => a.timestamp - b.timestamp);
    let stock = 0;
    for (const m of moves) {
      if (m.type === 'adjustment' || m.type === 'initial') stock = m.stockAfter;
      else stock += m.quantity;
    }
    if (stock !== product.stock) {
      product.stock = stock;
      product.updatedAt = Date.now();
      await db.put(db.STORES.products, product);
      fixed += 1;
    }
  }
  emit('products:changed');
  return fixed;
}

/* ---------------- Currency migration (EUR -> IDR price conversion) ---------------- */

export async function getCurrencyMigrationDone() {
  const row = await db.get(db.STORES.meta, 'currencyMigrationDone');
  return !!row?.value;
}

/**
 * One-time conversion of all product prices from EUR to IDR.
 * Historical sales are intentionally left untouched - they happened in EUR
 * at the time and must stay accurate for bookkeeping.
 */
export async function convertPricesEurToIdr({ factor, roundTo }) {
  let count = 0;
  for (const product of state.products) {
    const converted = roundToStep(product.price * factor, roundTo);
    if (converted !== product.price) {
      product.price = converted;
      product.updatedAt = Date.now();
      await db.put(db.STORES.products, product);
      count += 1;
    }
  }
  await saveSettings({ currencyCode: 'IDR' });
  await db.put(db.STORES.meta, { key: 'currencyMigrationDone', value: true });
  emit('products:changed');
  return count;
}

/* ---------------- Full export / import ---------------- */

export async function exportAll() {
  return {
    version: 4,
    exportedAt: Date.now(),
    products: state.products,
    sales: state.sales,
    movements: state.movements,
    settings: state.settings,
  };
}

export async function importAll(data) {
  await db.clearStore(db.STORES.products);
  await db.clearStore(db.STORES.sales);
  await db.clearStore(db.STORES.movements);
  if (Array.isArray(data.products) && data.products.length) await db.putMany(db.STORES.products, data.products);
  if (Array.isArray(data.sales) && data.sales.length) await db.putMany(db.STORES.sales, data.sales);
  if (Array.isArray(data.movements) && data.movements.length) await db.putMany(db.STORES.movements, data.movements);
  if (data.settings) await saveSettings(data.settings);
  await loadAll();
}

export async function wipeAll() {
  await db.clearStore(db.STORES.products);
  await db.clearStore(db.STORES.sales);
  await db.clearStore(db.STORES.movements);
  await db.clearStore(db.STORES.settings);
  await db.clearStore(db.STORES.meta);
}
