'use strict';

const TITLES = {
  kasse: 'Kasse',
  produkte: 'Produkte',
  lager: 'Lager',
  historie: 'Historie',
  statistik: 'Statistik',
  einstellungen: 'Einstellungen',
  wareneingang: 'Wareneingang',
  warenausgang: 'Warenausgang',
  inventur: 'Inventur',
  bewegungen: 'Bewegungsverlauf',
  'produkt-detail': 'Produkt',
  bestellliste: 'Bestellliste',
};

const renderers = {};
let currentTab = 'kasse';
let subviewStack = [];

export function registerRenderer(viewId, fn) {
  renderers[viewId] = fn;
}

function activate(viewId) {
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${viewId}`));
  document.getElementById('view-title').textContent = TITLES[viewId] || '';
}

export function showTab(viewId) {
  currentTab = viewId;
  subviewStack = [];
  activate(viewId);
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === viewId));
  renderers[viewId]?.();
}

export function openSubView(viewId, opts) {
  subviewStack.push(viewId);
  activate(viewId);
  renderers[viewId]?.(opts);
}

export function closeSubView() {
  subviewStack.pop();
  const target = subviewStack[subviewStack.length - 1] || currentTab;
  activate(target);
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === target));
  renderers[target]?.();
}

export function getCurrentView() {
  return subviewStack[subviewStack.length - 1] || currentTab;
}

export function isActive(viewId) {
  return getCurrentView() === viewId;
}

export function refreshCurrent() {
  renderers[getCurrentView()]?.();
}

export function initRouterChrome() {
  document.getElementById('tabbar').addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    showTab(btn.dataset.view);
  });
  document.querySelectorAll('[data-back]').forEach((btn) => {
    btn.addEventListener('click', () => closeSubView());
  });
}
