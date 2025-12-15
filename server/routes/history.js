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

// GET /api/history?type=all|purchase|sale&product_id=&status=&month=&year=
router.get('/', (req, res) => {
  const { type = 'all', product_id, status, month, year } = req.query;
  const userId = req.user.userId;

  const results = [];

  if (type === 'all' || type === 'purchase') {
    let q = 'SELECT id, "purchase" as kind, datetime, product_id, qty, total, NULL as status, NULL as client FROM purchases WHERE user_id = ?';
    const params = [userId];
    if (product_id) { q += ' AND product_id = ?'; params.push(product_id) }
    if (month && year) { q += ' AND strftime("%m", datetime) = ? AND strftime("%Y", datetime) = ?'; params.push(String(month).padStart(2,'0'), String(year)) }
    const rows = db.prepare(q).all(...params);
    results.push(...rows);
  }

  if (type === 'all' || type === 'sale') {
    let q = 'SELECT id, "sale" as kind, datetime, product_id, qty, total, status, client FROM sales WHERE user_id = ?';
    const params = [userId];
    if (product_id) { q += ' AND product_id = ?'; params.push(product_id) }
    if (status) { q += ' AND status = ?'; params.push(status) }
    if (month && year) { q += ' AND strftime("%m", datetime) = ? AND strftime("%Y", datetime) = ?'; params.push(String(month).padStart(2,'0'), String(year)) }
    const rows = db.prepare(q).all(...params);
    results.push(...rows);
  }

  // sort by datetime desc
  results.sort((a,b)=> new Date(b.datetime) - new Date(a.datetime));
  res.json(results);
});

module.exports = router;
