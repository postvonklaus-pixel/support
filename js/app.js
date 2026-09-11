'use strict';

import * as db from './db.js';
import { checkAndMigrate } from './migration.js';
import { state, loadAll, on } from './state.js';
import { closeModal } from './utils.js';
import { stopScanner } from './barcode.js';
import * as router from './router.js';
import * as pin from './ui/pin.js';
import * as kasse from './ui/kasse.js';
import * as produkte from './ui/produkte.js';
import * as lager from './ui/lager.js';
import * as wareneingang from './ui/wareneingang.js';
import * as warenausgang from './ui/warenausgang.js';
import * as inventur from './ui/inventur.js';
import * as bewegungen from './ui/bewegungen.js';
import * as produktDetail from './ui/produkt-detail.js';
import * as bestellliste from './ui/bestellliste.js';
import * as historie from './ui/historie.js';
import * as statistik from './ui/statistik.js';
import * as einstellungen from './ui/einstellungen.js';

router.registerRenderer('kasse', kasse.render);
router.registerRenderer('produkte', produkte.render);
router.registerRenderer('lager', lager.render);
router.registerRenderer('wareneingang', wareneingang.render);
router.registerRenderer('warenausgang', warenausgang.render);
router.registerRenderer('inventur', inventur.render);
router.registerRenderer('bewegungen', bewegungen.render);
router.registerRenderer('produkt-detail', produktDetail.render);
router.registerRenderer('bestellliste', bestellliste.render);
router.registerRenderer('historie', historie.render);
router.registerRenderer('statistik', statistik.render);
router.registerRenderer('einstellungen', einstellungen.render);

router.initRouterChrome();

document.querySelectorAll('[data-close]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const id = btn.dataset.close;
    if (id === 'modal-scanner') stopScanner();
    closeModal(id);
  });
});

function refreshActiveView() {
  document.getElementById('topbar-extra').textContent = state.settings.shopName;
  router.refreshCurrent();
}

on('data:loaded', refreshActiveView);
on('products:changed', refreshActiveView);
on('sales:changed', refreshActiveView);
on('movements:changed', refreshActiveView);
on('cart:changed', () => { if (router.isActive('kasse')) kasse.render(); });
on('settings:changed', refreshActiveView);

async function onUnlock() {
  await loadAll();
  router.showTab('kasse');
}

async function bootstrap() {
  try {
    await db.openDB();
    const migrationResult = await checkAndMigrate();
    await loadAll();
    await pin.initAuth({ onUnlock, migrationResult });
  } catch (err) {
    console.error('[Kasse] Fehler beim Start', err);
    document.getElementById('screen-pin').hidden = false;
    document.getElementById('pin-subtitle').textContent =
      'Fehler beim Laden der Datenbank. Bitte Seite neu laden.';
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}

bootstrap();
