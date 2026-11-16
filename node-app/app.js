// SSHB Online — Express app shared by local dev (server.js) and Vercel (api/index.js).
// Menu data comes from data/menu.json, derived verbatim from sshb.sql
// (tables `products` + `catagory`). No database, no auth, no payments yet.
// Checkout is a deliberate placeholder: POST /api/checkout returns 501.
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

const menu = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'data', 'menu.json'), 'utf8')
);
const products = menu.products;
const categories = menu.categories;

function publicProduct(p) {
  return {
    id: p.id,
    name: p.name,
    price_tk: p.price_tk,
    description: p.description,
    category_id: p.category_id,
    category: p.category,
    image: '/images/' + p.image,
    image_file: p.image,
    stock: p.stock,
    in_stock: p.stock > 0 && p.status === 1,
  };
}

// ---- API ---------------------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    app: 'sshb-online-node-starter',
    version: '0.1.0',
    products: products.length,
    categories: categories.length,
    currency: menu.currency,
    database: 'none — menu served from data/menu.json (from sshb.sql)',
    checkout: 'placeholder — POST /api/checkout returns 501, no order is placed',
  });
});

app.get('/api/categories', (req, res) => res.json(categories));

app.get('/api/slider', (req, res) => res.json(menu.slider));

// GET /api/menu?q=khichuri&category=1  (category = id or name, case-insensitive)
app.get('/api/menu', (req, res) => {
  let list = products.slice();
  const q = (req.query.q || '').trim().toLowerCase();
  const cat = (req.query.category || '').trim().toLowerCase();
  if (q) {
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }
  if (cat) {
    list = list.filter(
      (p) =>
        String(p.category_id) === cat ||
        (p.category || '').toLowerCase() === cat
    );
  }
  res.json({ count: list.length, currency: menu.currency, currency_symbol: menu.currency_symbol, items: list.map(publicProduct) });
});

app.get('/api/menu/:id', (req, res) => {
  const p = products.find((x) => String(x.id) === String(req.params.id));
  if (!p) return res.status(404).json({ error: 'Dish not found', id: req.params.id });
  const related = products
    .filter((x) => x.category_id === p.category_id && x.id !== p.id)
    .map(publicProduct);
  res.json({ ...publicProduct(p), related });
});

// Checkout is NOT wired up: no database, no PayPal keys.
// Returns 501 so nobody mistakes a demo submit for a real order.
app.post('/api/checkout', (req, res) => {
  res.status(501).json({
    error: 'checkout_not_available',
    message:
      'Checkout is a placeholder in this starter. No order was placed and no payment was taken. ' +
      'To enable real orders you need a hosted database plus PayPal credentials — see DEPLOY.md.',
    received_items: Array.isArray(req.body && req.body.items) ? req.body.items.length : 0,
  });
});

// ---- Static frontend ----------------------------------------------------
app.use(express.static(path.join(__dirname, 'public')));

// SPA-style fallback: dish detail uses hash routing, so any unknown
// non-API path serves the single-page frontend.
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Unknown API route' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;
