'use strict';

import * as db from './db.js';
import { uuid, logError } from './utils.js';

const OLD_KEYS = {
  pin: 'pos_pin_hash',
  products: 'pos_products',
  sales: 'pos_sales',
  settings: 'pos_settings',
  cart: 'pos_cart',
};

const PAYMENT_MAP = { bar: 'cash', karte: 'card', sonstiges: 'other' };
const CURRENT_DATA_VERSION = 4;

function readOldJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch (err) {
    logError(`localStorage read ${key}`, err);
    return null;
  }
}

function migrateProduct(old) {
  const now = Date.now();
  return {
    id: old.id,
    name: old.name,
    price: old.price,
    category: old.category,
    color: old.color || '#2563eb',
    barcode: old.barcode || '',
    imageBase64: old.image || '',
    stock: 0,
    minStock: 0,
    trackStock: false,
    createdAt: now,
    updatedAt: now,
  };
}

function migrateSale(old) {
  return {
    id: old.id,
    timestamp: old.date ? new Date(old.date).getTime() : Date.now(),
    items: (old.items || []).map((it) => ({
      productId: it.id,
      name: it.name,
      price: it.price,
      quantity: it.qty,
    })),
    subtotal: old.total,
    total: old.total,
    paymentMethod: PAYMENT_MAP[old.paymentMethod] || 'other',
    amountGiven: old.given ?? undefined,
    change: old.change ?? undefined,
  };
}

function migrateSettings(old) {
  return {
    shopName: old?.businessName || 'Meine Kasse',
    // Legacy installs only ever entered prices as plain numbers with a
    // free-text currency symbol - there is no reliable way to infer IDR
    // from that, so they always land on EUR and can convert explicitly
    // via "Alle Preise EUR -> IDR umrechnen" in Einstellungen.
    currencyCode: 'EUR',
    inventoryEnabled: false,
    exampleSet: 'custom',
  };
}

/**
 * Runs once on startup. Returns { status: 'migrated' | 'fresh' | 'existing' }.
 * Never deletes the old localStorage keys - they stay as a safety net.
 */
export async function checkAndMigrate() {
  const metaVersion = await db.get(db.STORES.meta, 'dataVersion');
  if (metaVersion) {
    return { status: 'existing' };
  }

  const oldProducts = readOldJson(OLD_KEYS.products);
  const oldPinHash = localStorage.getItem(OLD_KEYS.pin);
  const hasOldData = Array.isArray(oldProducts) && oldProducts.length > 0 || !!oldPinHash;

  if (!hasOldData) {
    return { status: 'fresh' };
  }

  try {
    const oldSales = readOldJson(OLD_KEYS.sales) || [];
    const oldSettings = readOldJson(OLD_KEYS.settings) || {};

    const newProducts = (oldProducts || []).map(migrateProduct);
    const newSales = oldSales.map(migrateSale);
    const newSettings = migrateSettings(oldSettings);

    if (newProducts.length) await db.putMany(db.STORES.products, newProducts);
    if (newSales.length) await db.putMany(db.STORES.sales, newSales);
    await db.put(db.STORES.settings, { key: 'main', ...newSettings });

    if (oldPinHash) {
      await db.put(db.STORES.meta, { key: 'pinHash', value: oldPinHash });
    }
    await db.put(db.STORES.meta, { key: 'dataVersion', value: CURRENT_DATA_VERSION });
    await db.put(db.STORES.meta, { key: 'migratedFrom', value: 'localStorage' });
    await db.put(db.STORES.meta, { key: 'migratedAt', value: Date.now() });

    return { status: 'migrated', productCount: newProducts.length, saleCount: newSales.length };
  } catch (err) {
    logError('Migration', err);
    return { status: 'error', error: err };
  }
}

/**
 * In-place schema upgrade for installs that already have IndexedDB data
 * at an older dataVersion (e.g. 3, from before the IDR/currency feature).
 * Idempotent - a no-op once meta.dataVersion already matches current.
 */
export async function upgradeSchema() {
  const versionRow = await db.get(db.STORES.meta, 'dataVersion');
  const currentVersion = versionRow?.value;
  if (!currentVersion || currentVersion >= CURRENT_DATA_VERSION) {
    return { upgraded: false };
  }

  // v3 -> v4: introduce settings.currencyCode (existing prices are EUR)
  if (currentVersion < 4) {
    const settingsRow = await db.get(db.STORES.settings, 'main');
    if (settingsRow && !settingsRow.currencyCode) {
      await db.put(db.STORES.settings, { ...settingsRow, currencyCode: 'EUR' });
    }
  }

  await db.put(db.STORES.meta, { key: 'dataVersion', value: CURRENT_DATA_VERSION });
  return { upgraded: true, from: currentVersion, to: CURRENT_DATA_VERSION };
}

export { CURRENT_DATA_VERSION };
