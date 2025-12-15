const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'nuxsell_dev_secret';

function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'no token' });
  const token = auth.split(' ')[1];
  try {
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data;
    next();
  } catch (e) {
    res.status(401).json({ error: 'invalid token' });
  }
}

router.use(verifyToken);

router.get('/', (req, res) => {
  const stmt = db.prepare('SELECT * FROM products WHERE user_id = ?');
  const rows = stmt.all(req.user.userId);
  res.json(rows);
});

router.post('/', (req, res) => {
  const { name, sku, type = 'unit', qty = 0, qty_per_kit = 1, avg_cost = 0, price = 0, min_stock = 0 } = req.body;
  const stmt = db.prepare('INSERT INTO products (user_id, name, sku, type, qty, qty_per_kit, avg_cost, price, min_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const info = stmt.run(req.user.userId, name, sku, type, qty, qty_per_kit, avg_cost, price, min_stock);
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid);
  res.json(row);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(req.params.id, req.user.userId);
  if (!row) return res.status(404).json({ error: 'not found' });
  res.json(row);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(req.params.id, req.user.userId);
  if (!existing) return res.status(404).json({ error: 'not found' });
  const { name, sku, type, qty, qty_per_kit, avg_cost, price, min_stock } = req.body;
  db.prepare('UPDATE products SET name = ?, sku = ?, type = ?, qty = ?, qty_per_kit = ?, avg_cost = ?, price = ?, min_stock = ? WHERE id = ?')
    .run(name, sku, type, qty, qty_per_kit, avg_cost, price, min_stock, req.params.id);
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  res.json(row);
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ? AND user_id = ?').run(req.params.id, req.user.userId);
  res.json({ ok: true });
});

module.exports = router;
