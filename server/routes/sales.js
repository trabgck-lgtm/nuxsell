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
  const rows = db.prepare('SELECT * FROM sales WHERE user_id = ? ORDER BY datetime DESC').all(req.user.userId);
  res.json(rows);
});

router.post('/', (req, res) => {
  const { product_id, qty, total, status = 'Pago', client = '', datetime = new Date().toISOString(), type = 'unit', paid = 0 } = req.body;
  const prod = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(product_id, req.user.userId);
  if (!prod) return res.status(400).json({ error: 'product not found' });

  // handle kit
  let finalQty = qty;
  if (type === 'kit' && req.body.qty_per_kit) {
    finalQty = qty * (req.body.qty_per_kit || prod.qty_per_kit || 1);
  }

  if (!Number.isFinite(qty) || qty <= 0) return res.status(400).json({ error: 'qty must be a positive number' });
  if (!Number.isFinite(total) || total < 0) return res.status(400).json({ error: 'total must be a non-negative number' });
  if (!Number.isFinite(paid) || paid < 0) return res.status(400).json({ error: 'paid must be a non-negative number' });

  if (prod.qty - finalQty < 0) return res.status(400).json({ error: 'insufficient stock' });

  const newQty = prod.qty - finalQty;
  const insert = db.prepare('INSERT INTO sales (user_id, product_id, datetime, qty, total, status, client, paid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const info = insert.run(req.user.userId, product_id, datetime, finalQty, total, status, client, paid);

  db.prepare('UPDATE products SET qty = ? WHERE id = ?').run(newQty, product_id);

  const row = db.prepare('SELECT * FROM sales WHERE id = ?').get(info.lastInsertRowid);
  res.json(row);
});

module.exports = router;
