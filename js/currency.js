'use strict';

export const CURRENCIES = {
  EUR: {
    code: 'EUR', symbol: '€', position: 'after',
    decimals: 2, decimalSeparator: ',', thousandsSeparator: '.',
    locale: 'de-DE',
  },
  IDR: {
    code: 'IDR', symbol: 'Rp', position: 'before',
    decimals: 0, decimalSeparator: ',', thousandsSeparator: '.',
    locale: 'id-ID',
  },
  USD: {
    code: 'USD', symbol: '$', position: 'before',
    decimals: 2, decimalSeparator: '.', thousandsSeparator: ',',
    locale: 'en-US',
  },
};

export const CURRENCY_LABELS = {
  EUR: 'Euro (EUR)',
  IDR: 'Indonesische Rupiah (IDR)',
  USD: 'US-Dollar (USD)',
};

export function getCurrencyConfig(currencyCode) {
  return CURRENCIES[currencyCode] || CURRENCIES.EUR;
}

function roundToDecimals(amount, decimals) {
  const factor = 10 ** decimals;
  return Math.round((amount + Number.EPSILON) * factor) / factor;
}

function manualFormatNumber(amount, cfg) {
  const rounded = roundToDecimals(amount, cfg.decimals);
  const fixed = Math.abs(rounded).toFixed(cfg.decimals);
  const [intPart, decPart] = fixed.split('.');
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, cfg.thousandsSeparator);
  const sign = rounded < 0 ? '-' : '';
  return decPart ? `${sign}${withThousands}${cfg.decimalSeparator}${decPart}` : `${sign}${withThousands}`;
}

function formatNumber(amount, cfg) {
  try {
    return new Intl.NumberFormat(cfg.locale, {
      minimumFractionDigits: cfg.decimals,
      maximumFractionDigits: cfg.decimals,
    }).format(roundToDecimals(amount, cfg.decimals));
  } catch (err) {
    return manualFormatNumber(amount, cfg);
  }
}

/**
 * formatCurrency(100000, "IDR") -> "Rp 100.000"
 * formatCurrency(5000, "IDR")   -> "Rp 5.000"
 * formatCurrency(1.5, "EUR")    -> "1,50 €"
 */
export function formatCurrency(amount, currencyCode) {
  const cfg = getCurrencyConfig(currencyCode);
  const numberPart = formatNumber(amount || 0, cfg);
  return cfg.position === 'before' ? `${cfg.symbol} ${numberPart}` : `${numberPart} ${cfg.symbol}`;
}

/**
 * Abbreviated form for tight chart/KPI labels with large amounts:
 * < 1.000.000       -> normal formatCurrency
 * >= 1.000.000       -> "Rp 1,2 Mio"
 * >= 1.000.000.000   -> "Rp 1,2 Mrd"
 */
export function formatCurrencyCompact(amount, currencyCode) {
  const cfg = getCurrencyConfig(currencyCode);
  const abs = Math.abs(amount || 0);
  let divisor = 0;
  let suffix = '';
  if (abs >= 1_000_000_000) { divisor = 1_000_000_000; suffix = 'Mrd'; }
  else if (abs >= 1_000_000) { divisor = 1_000_000; suffix = 'Mio'; }
  if (!divisor) return formatCurrency(amount, currencyCode);

  const value = amount / divisor;
  const rounded = Math.round(value * 10) / 10;
  let numStr = rounded.toFixed(1);
  if (numStr.endsWith('.0')) numStr = numStr.slice(0, -2);
  numStr = numStr.replace('.', cfg.decimalSeparator);
  return cfg.position === 'before' ? `${cfg.symbol} ${numStr} ${suffix}` : `${numStr} ${suffix} ${cfg.symbol}`;
}

/**
 * Parses a value coming out of a price/amount <input> back into a plain
 * number, respecting whether the active currency uses decimals.
 */
export function parseAmountInput(value, currencyCode) {
  const cfg = getCurrencyConfig(currencyCode);
  if (cfg.decimals === 0) {
    const digits = String(value).replace(/[^\d-]/g, '');
    const n = parseInt(digits, 10);
    return Number.isFinite(n) ? n : 0;
  }
  const n = parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/** Sets step/inputmode on a price-like <input type="number"> to match the currency. */
export function applyAmountInputAttrs(inputEl, currencyCode) {
  if (!inputEl) return;
  const cfg = getCurrencyConfig(currencyCode);
  if (cfg.decimals === 0) {
    inputEl.step = '1';
    inputEl.setAttribute('inputmode', 'numeric');
  } else {
    inputEl.step = '0.01';
    inputEl.setAttribute('inputmode', 'decimal');
  }
}

export function roundToStep(amount, step) {
  if (!step || step <= 0) return Math.round(amount);
  return Math.round(amount / step) * step;
}

/** Denominations used to suggest "quick cash" amounts at checkout. */
export function getQuickCashSteps(currencyCode) {
  const cfg = getCurrencyConfig(currencyCode);
  return cfg.decimals === 0
    ? [1000, 5000, 10000, 20000, 50000, 100000]
    : [1, 5, 10, 20, 50, 100];
}
