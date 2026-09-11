'use strict';

import { uuid } from './utils.js';

function p(name, price, category, color, stock, minStock, trackStock = true) {
  const now = Date.now();
  return {
    id: uuid(), name, price, category, color, barcode: '', imageBase64: '',
    stock, minStock, trackStock, createdAt: now, updatedAt: now,
  };
}

export function demoSetDrinks() {
  const drink = '#2563eb', snack = '#16a34a';
  return [
    p('Cola 0,33l', 1.50, 'Getränke', drink, 24, 6),
    p('Fanta 0,33l', 1.50, 'Getränke', drink, 24, 6),
    p('Sprite 0,33l', 1.50, 'Getränke', drink, 24, 6),
    p('Wasser 0,5l', 1.00, 'Getränke', drink, 36, 12),
    p('Apfelsaft 0,2l', 1.80, 'Getränke', drink, 12, 4),
    p('Bier 0,5l', 2.50, 'Getränke', drink, 48, 12),
    p('Weißbier 0,5l', 3.00, 'Getränke', drink, 24, 6),
    p('Radler 0,5l', 2.50, 'Getränke', drink, 24, 6),
    p('Kaffee', 2.00, 'Getränke', drink, 100, 20),
    p('Tee', 1.80, 'Getränke', drink, 100, 20),
    p('Brezel', 1.50, 'Snacks', snack, 20, 5),
    p('Chips', 1.20, 'Snacks', snack, 15, 5),
    p('Schokoriegel', 1.00, 'Snacks', snack, 30, 10),
    p('Salzstangen', 1.00, 'Snacks', snack, 15, 5),
  ];
}

export function demoSetFestival() {
  const drink = '#2563eb', food = '#f97316', misc = '#16a34a';
  return [
    p('Bier 0,5l', 3.00, 'Getränke', drink, 120, 24),
    p('Radler 0,5l', 3.00, 'Getränke', drink, 60, 12),
    p('Weißwein 0,2l', 3.50, 'Getränke', drink, 30, 6),
    p('Rotwein 0,2l', 3.50, 'Getränke', drink, 30, 6),
    p('Aperol Spritz', 5.00, 'Getränke', drink, 40, 10),
    p('Cola/Mezzo 0,3l', 2.00, 'Getränke', drink, 60, 12),
    p('Wasser 0,5l', 1.50, 'Getränke', drink, 80, 20),
    p('Kaffee', 2.00, 'Getränke', drink, 200, 40),
    p('Bratwurst im Brötchen', 3.50, 'Essen', food, 40, 10),
    p('Steak im Brötchen', 4.50, 'Essen', food, 30, 8),
    p('Pommes', 3.00, 'Essen', food, 50, 15),
    p('Flammkuchen', 5.00, 'Essen', food, 20, 5),
    p('Kuchen (Stück)', 2.50, 'Essen', food, 30, 10),
    p('Lose (5 Stück)', 1.00, 'Sonstiges', misc, 200, 50, true),
    p('Tombola-Los', 2.00, 'Sonstiges', misc, 100, 20),
  ];
}

export function demoSetDrinksIDR() {
  const drink = '#2563eb', snack = '#16a34a';
  return [
    p('Cola 0,33l', 5000, 'Getränke', drink, 24, 6),
    p('Fanta 0,33l', 5000, 'Getränke', drink, 24, 6),
    p('Sprite 0,33l', 5000, 'Getränke', drink, 24, 6),
    p('Wasser 0,5l', 3000, 'Getränke', drink, 36, 12),
    p('Apfelsaft 0,2l', 8000, 'Getränke', drink, 12, 4),
    p('Bier 0,5l', 25000, 'Getränke', drink, 48, 12),
    p('Weißbier 0,5l', 30000, 'Getränke', drink, 24, 6),
    p('Radler 0,5l', 25000, 'Getränke', drink, 24, 6),
    p('Kaffee', 15000, 'Getränke', drink, 100, 20),
    p('Tee', 10000, 'Getränke', drink, 100, 20),
    p('Brezel', 8000, 'Snacks', snack, 20, 5),
    p('Chips', 10000, 'Snacks', snack, 15, 5),
    p('Schokoriegel', 8000, 'Snacks', snack, 30, 10),
    p('Salzstangen', 8000, 'Snacks', snack, 15, 5),
  ];
}

export function demoSetFestivalIDR() {
  const drink = '#2563eb', food = '#f97316', misc = '#16a34a';
  return [
    p('Bier 0,5l', 30000, 'Getränke', drink, 120, 24),
    p('Radler 0,5l', 30000, 'Getränke', drink, 60, 12),
    p('Weißwein 0,2l', 40000, 'Getränke', drink, 30, 6),
    p('Rotwein 0,2l', 40000, 'Getränke', drink, 30, 6),
    p('Aperol Spritz', 60000, 'Getränke', drink, 40, 10),
    p('Cola/Mezzo 0,3l', 15000, 'Getränke', drink, 60, 12),
    p('Wasser 0,5l', 5000, 'Getränke', drink, 80, 20),
    p('Kaffee', 15000, 'Getränke', drink, 200, 40),
    p('Bratwurst im Brötchen', 35000, 'Essen', food, 40, 10),
    p('Steak im Brötchen', 45000, 'Essen', food, 30, 8),
    p('Pommes', 25000, 'Essen', food, 50, 15),
    p('Flammkuchen', 50000, 'Essen', food, 20, 5),
    p('Kuchen (Stück)', 20000, 'Essen', food, 30, 10),
    p('Lose (5 Stück)', 10000, 'Sonstiges', misc, 200, 50, true),
    p('Tombola-Los', 20000, 'Sonstiges', misc, 100, 20),
  ];
}
