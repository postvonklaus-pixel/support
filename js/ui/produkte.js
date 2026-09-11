'use strict';

import { state, getCategories, saveProduct, deleteProduct } from '../state.js';
import { escapeHtml, toast, openModal, closeModal, confirmDialog, uuid } from '../utils.js';
import { formatCurrency, parseAmountInput, applyAmountInputAttrs, getCurrencyConfig } from '../currency.js';
import { openScanner } from '../barcode.js';

const COLOR_PALETTE = ['#2563eb', '#f97316', '#16a34a', '#db2777', '#7c3aed', '#0891b2', '#ca8a04', '#64748b'];
let editingImage = '';
let editingColor = COLOR_PALETTE[0];

export function render() {
  const listEl = document.getElementById('product-list');
  listEl.innerHTML = '';
  if (state.products.length === 0) {
    listEl.innerHTML = '<p class="product-list-empty">Noch keine Produkte angelegt.</p>';
    return;
  }
  const categories = getCategories();
  categories.forEach((cat) => {
    const title = document.createElement('div');
    title.className = 'product-list-group-title';
    title.textContent = cat;
    listEl.appendChild(title);
    state.products.filter((p) => p.category === cat).forEach((product) => {
      const row = document.createElement('div');
      row.className = 'product-list-item';
      const stockBadge = product.trackStock
        ? `<span class="stock-pill ${stockLevelClass(product)}">${product.stock} Stk.</span>`
        : '';
      row.innerHTML = `
        <div class="product-list-swatch" style="${product.imageBase64 ? `background-image:url(${product.imageBase64})` : `background-color:${product.color}`}"></div>
        <div class="product-list-info">
          <div class="product-list-name">${escapeHtml(product.name)}</div>
          <div class="product-list-meta">${formatCurrency(product.price, state.settings.currencyCode)}${product.barcode ? ' · ' + escapeHtml(product.barcode) : ''}</div>
        </div>
        ${stockBadge}
      `;
      row.addEventListener('click', () => openProductModal(product));
      listEl.appendChild(row);
    });
  });
}

export function stockLevelClass(product) {
  if (!product.trackStock) return '';
  if (product.stock <= 0) return 'stock-critical';
  if (product.stock <= product.minStock) return 'stock-warning';
  return 'stock-ok';
}

function refreshCategoryDatalist() {
  const list = document.getElementById('category-list');
  list.innerHTML = getCategories().map((c) => `<option value="${escapeHtml(c)}"></option>`).join('');
}

function renderColorPicker(selected) {
  const wrap = document.getElementById('color-picker');
  wrap.innerHTML = '';
  COLOR_PALETTE.forEach((color) => {
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.className = 'color-swatch' + (color === selected ? ' selected' : '');
    sw.style.backgroundColor = color;
    sw.addEventListener('click', () => {
      editingColor = color;
      wrap.querySelectorAll('.color-swatch').forEach((s) => s.classList.remove('selected'));
      sw.classList.add('selected');
    });
    wrap.appendChild(sw);
  });
}

export function openProductModal(product, prefill) {
  refreshCategoryDatalist();
  const isEdit = !!product;
  document.getElementById('product-modal-title').textContent = isEdit ? 'Produkt bearbeiten' : 'Neues Produkt';
  document.getElementById('product-id').value = isEdit ? product.id : '';
  document.getElementById('product-name').value = isEdit ? product.name : '';
  const priceInput = document.getElementById('product-price');
  priceInput.value = isEdit ? product.price : '';
  applyAmountInputAttrs(priceInput, state.settings.currencyCode);
  document.getElementById('product-price-label').textContent = `Preis (${getCurrencyConfig(state.settings.currencyCode).symbol}) *`;
  document.getElementById('product-category').value = isEdit ? product.category : '';
  document.getElementById('product-barcode').value = isEdit ? (product.barcode || '') : (prefill?.barcode || '');
  document.getElementById('product-track-stock').checked = isEdit ? !!product.trackStock : false;
  document.getElementById('product-stock').value = isEdit ? (product.stock || 0) : 0;
  document.getElementById('product-min-stock').value = isEdit ? (product.minStock || 0) : 0;
  document.getElementById('product-stock-fields').hidden = !(isEdit ? product.trackStock : false);
  document.getElementById('btn-delete-product').hidden = !isEdit;
  editingColor = isEdit ? (product.color || COLOR_PALETTE[0]) : COLOR_PALETTE[0];
  editingImage = isEdit ? (product.imageBase64 || '') : '';
  renderColorPicker(editingColor);
  updateImagePreview();
  openModal('modal-product');
}

document.getElementById('btn-add-product').addEventListener('click', () => openProductModal(null));

document.getElementById('product-track-stock').addEventListener('change', (e) => {
  document.getElementById('product-stock-fields').hidden = !e.target.checked;
});

function updateImagePreview() {
  const img = document.getElementById('product-image-preview');
  const removeBtn = document.getElementById('product-image-remove');
  if (editingImage) {
    img.src = editingImage;
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
    editingImage = await resizeImageToDataUrl(file, 640);
    updateImagePreview();
  } catch (err) {
    toast('Bild konnte nicht geladen werden');
  }
  e.target.value = '';
});

document.getElementById('product-image-remove').addEventListener('click', () => {
  editingImage = '';
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

document.getElementById('product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('product-id').value;
  const name = document.getElementById('product-name').value.trim();
  const price = parseAmountInput(document.getElementById('product-price').value, state.settings.currencyCode);
  const category = document.getElementById('product-category').value.trim();
  const barcode = document.getElementById('product-barcode').value.trim();
  const trackStock = document.getElementById('product-track-stock').checked;
  const stock = trackStock ? Math.max(0, parseInt(document.getElementById('product-stock').value, 10) || 0) : 0;
  const minStock = trackStock ? Math.max(0, parseInt(document.getElementById('product-min-stock').value, 10) || 0) : 0;
  if (!name || !category || price < 0) { toast('Bitte alle Pflichtfelder ausfüllen'); return; }

  try {
    await saveProduct({
      id: id || barcode || uuid(),
      name, price, category, barcode, trackStock, stock, minStock,
      color: editingColor, imageBase64: editingImage,
    });
    closeModal('modal-product');
    toast('Produkt gespeichert');
  } catch (err) {
    console.error('[Kasse] Produkt speichern fehlgeschlagen', err);
    toast('Fehler beim Speichern');
  }
});

document.getElementById('btn-delete-product').addEventListener('click', async () => {
  const id = document.getElementById('product-id').value;
  if (!id) return;
  const ok = await confirmDialog('Produkt wirklich löschen?');
  if (!ok) return;
  await deleteProduct(id);
  closeModal('modal-product');
  toast('Produkt gelöscht');
});

/* ---------------- Barcode scanning ---------------- */

document.getElementById('btn-scan-product').addEventListener('click', () => {
  openScanner((code) => {
    const existing = state.products.find((x) => x.barcode === code || x.id === code);
    if (existing) {
      openProductModal(existing);
      toast('Produkt gefunden');
    } else {
      openProductModal(null, { barcode: code });
      toast('Neuer Barcode – Produkt anlegen');
    }
  });
});

document.getElementById('btn-scan-in-form').addEventListener('click', () => {
  openScanner((code) => {
    const currentId = document.getElementById('product-id').value;
    const owner = state.products.find((x) => x.barcode === code && x.id !== currentId);
    if (owner) toast(`Barcode gehört bereits zu „${owner.name}"`);
    document.getElementById('product-barcode').value = code;
  });
});
