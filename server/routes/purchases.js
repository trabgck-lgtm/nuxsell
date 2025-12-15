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
  const rows = db.prepare('SELECT * FROM purchases WHERE user_id = ? ORDER BY datetime DESC').all(req.user.userId);
  res.json(rows);
});

router.post('/', (req, res) => {
  const { product_id, qty, total, type = 'unit', datetime = new Date().toISOString() } = req.body;
  const prod = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(product_id, req.user.userId);
  if (!prod) return res.status(400).json({ error: 'product not found' });

  if (!Number.isFinite(qty) || qty <= 0) return res.status(400).json({ error: 'qty must be a positive number' });
  if (!Number.isFinite(total) || total < 0) return res.status(400).json({ error: 'total must be a non-negative number' });

  // Calculate final qty when type is kit
  let finalQty = qty;
  if (type === 'kit' && req.body.qty_per_kit) {
    finalQty = qty * (req.body.qty_per_kit || prod.qty_per_kit || 1);
  }

  // Update stock
  const newQty = prod.qty + finalQty;

  // Recalculate average cost: (old_total + new_total)/(old_qty + new_qty)
  const oldTotalCost = prod.avg_cost * prod.qty;
  const newTotalCost = total;
  const combinedQty = prod.qty + finalQty;
  const newAvg = combinedQty > 0 ? (oldTotalCost + newTotalCost) / combinedQty : prod.avg_cost;

  const insert = db.prepare('INSERT INTO purchases (user_id, product_id, datetime, qty, total, type) VALUES (?, ?, ?, ?, ?, ?)');
  const info = insert.run(req.user.userId, product_id, datetime, finalQty, total, type);

  db.prepare('UPDATE products SET qty = ?, avg_cost = ? WHERE id = ?').run(newQty, newAvg, product_id);

  // Ensure stock non-negative (should always be true here)
  if (newQty < 0) return res.status(500).json({ error: 'resulting stock negative' });

  const row = db.prepare('SELECT * FROM purchases WHERE id = ?').get(info.lastInsertRowid);
  res.json(row);
});

module.exports = router;
