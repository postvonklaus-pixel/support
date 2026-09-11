'use strict';

export function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function formatCurrency(amount, currency) {
  const cur = currency || '€';
  const val = (Math.round((amount + Number.EPSILON) * 100) / 100).toFixed(2).replace('.', ',');
  return `${val} ${cur}`;
}

export function parseGermanNumber(str) {
  if (typeof str !== 'string') return Number(str) || 0;
  return parseFloat(str.replace(',', '.')) || 0;
}

export function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateShort(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

export function startOfDay(ts) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function isToday(ts) {
  return startOfDay(ts) === startOfDay(Date.now());
}

export function isThisWeek(ts) {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // Monday = 0
  const monday = startOfDay(now.getTime()) - day * 86400000;
  return ts >= monday;
}

export function isThisMonth(ts) {
  const d = new Date(ts), now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export function isThisYear(ts) {
  const d = new Date(ts), now = new Date();
  return d.getFullYear() === now.getFullYear();
}

export function rangeForPeriod(period) {
  const now = Date.now();
  switch (period) {
    case 'today': return { from: startOfDay(now), to: now };
    case 'week': {
      const d = new Date();
      const day = (d.getDay() + 6) % 7;
      return { from: startOfDay(now) - day * 86400000, to: now };
    }
    case 'month': {
      const d = new Date();
      return { from: new Date(d.getFullYear(), d.getMonth(), 1).getTime(), to: now };
    }
    case 'year': {
      const d = new Date();
      return { from: new Date(d.getFullYear(), 0, 1).getTime(), to: now };
    }
    default: return { from: 0, to: now };
  }
}

export function vibrate(pattern) {
  if (navigator.vibrate) { try { navigator.vibrate(pattern); } catch (e) { /* ignore */ } }
}

let toastTimer = null;
export function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
}

export function confirmDialog(message) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('modal-confirm');
    document.getElementById('confirm-message').textContent = message;
    overlay.hidden = false;
    const okBtn = document.getElementById('confirm-ok');
    const cancelBtn = document.getElementById('confirm-cancel');
    const cleanup = (result) => {
      overlay.hidden = true;
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      resolve(result);
    };
    const onOk = () => cleanup(true);
    const onCancel = () => cleanup(false);
    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
  });
}

export function openModal(id) { document.getElementById(id).hidden = false; }
export function closeModal(id) { document.getElementById(id).hidden = true; }

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function debounce(fn, delay) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

export function logError(context, err) {
  console.error(`[Kasse] ${context}:`, err);
}

export async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
