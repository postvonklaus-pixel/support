'use strict';

import { startOfDay } from './utils.js';

export function getSalesInRange(sales, from, to) {
  return sales.filter((s) => s.timestamp >= from && s.timestamp <= to);
}

export function getTopProducts(sales, by = 'revenue', limit = 10) {
  const map = new Map();
  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      const entry = map.get(item.productId) || { productId: item.productId, name: item.name, revenue: 0, quantity: 0 };
      entry.revenue += item.price * item.quantity;
      entry.quantity += item.quantity;
      map.set(item.productId, entry);
    });
  });
  const list = Array.from(map.values());
  list.sort((a, b) => (by === 'quantity' ? b.quantity - a.quantity : b.revenue - a.revenue));
  return list.slice(0, limit);
}

export function getRevenueByCategory(sales, products) {
  const categoryById = new Map(products.map((p) => [p.id, p.category]));
  const map = new Map();
  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      const category = categoryById.get(item.productId) || 'Sonstiges';
      map.set(category, (map.get(category) || 0) + item.price * item.quantity);
    });
  });
  return Array.from(map.entries())
    .map(([category, revenue]) => ({ category, revenue }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function getSalesPerDay(sales, days = 14) {
  const result = [];
  const today = startOfDay(Date.now());
  for (let i = days - 1; i >= 0; i -= 1) {
    const dayStart = today - i * 86400000;
    const dayEnd = dayStart + 86400000;
    const daySales = sales.filter((s) => s.timestamp >= dayStart && s.timestamp < dayEnd);
    result.push({
      date: dayStart,
      revenue: daySales.reduce((sum, s) => sum + s.total, 0),
      count: daySales.length,
    });
  }
  return result;
}

export function getPaymentMethodDistribution(sales) {
  const map = { cash: 0, card: 0, other: 0 };
  sales.forEach((s) => { map[s.paymentMethod] = (map[s.paymentMethod] || 0) + s.total; });
  const total = sales.reduce((sum, s) => sum + s.total, 0);
  return Object.entries(map).map(([method, revenue]) => ({
    method,
    revenue,
    percent: total > 0 ? (revenue / total) * 100 : 0,
  }));
}

export function getStockValue(products) {
  return products.reduce((sum, p) => sum + (p.trackStock ? (p.stock || 0) * p.price : 0), 0);
}

export function getCriticalProducts(products) {
  return products
    .filter((p) => p.trackStock && p.stock <= p.minStock)
    .sort((a, b) => a.stock - b.stock);
}

export function getOutOfStockCount(products) {
  return products.filter((p) => p.trackStock && p.stock <= 0).length;
}

export function getSalesSummary(sales) {
  const total = sales.reduce((sum, s) => sum + s.total, 0);
  const count = sales.length;
  const avg = count > 0 ? total / count : 0;
  const top = getTopProducts(sales, 'quantity', 1)[0];
  return { total, count, avg, topProduct: top ? top.name : '–' };
}
