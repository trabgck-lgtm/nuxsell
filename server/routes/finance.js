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

// GET /api/finance?month=&year=
router.get('/', (req, res) => {
  const { month, year } = req.query;
  const userId = req.user.userId;

  // totals
  let purchaseQ = 'SELECT SUM(total) as invested FROM purchases WHERE user_id = ?';
  let salesQ = 'SELECT SUM(total) as sold FROM sales WHERE user_id = ?';
  const params = [userId];
  if (month && year) {
    purchaseQ += ' AND strftime("%m", datetime) = ? AND strftime("%Y", datetime) = ?';
    salesQ += ' AND strftime("%m", datetime) = ? AND strftime("%Y", datetime) = ?';
    params.push(String(month).padStart(2,'0'), String(year));
  }
  const investedRow = db.prepare(purchaseQ).get(...params) || {};
  const soldRow = db.prepare(salesQ).get(...params) || {};
  const invested = investedRow.invested || 0;
  const sold = soldRow.sold || 0;
  const profit = sold - invested;

  // ticket médio (average sale)
  let ticketQ = 'SELECT COUNT(*) as cnt, SUM(total) as sum FROM sales WHERE user_id = ?';
  const tparams = [userId];
  if (month && year) { ticketQ += ' AND strftime("%m", datetime) = ? AND strftime("%Y", datetime) = ?'; tparams.push(String(month).padStart(2,'0'), String(year)); }
  const trow = db.prepare(ticketQ).get(...tparams) || {cnt:0, sum:0};
  const ticket = (trow.cnt > 0) ? (trow.sum / trow.cnt) : 0;

  // top products by sales quantity
  let topQ = 'SELECT p.id, p.name, SUM(s.qty) as sold_qty FROM sales s JOIN products p ON s.product_id = p.id WHERE s.user_id = ? GROUP BY p.id ORDER BY sold_qty DESC LIMIT 5';
  const tparams2 = [userId];
  if (month && year) { topQ = 'SELECT p.id, p.name, SUM(s.qty) as sold_qty FROM sales s JOIN products p ON s.product_id = p.id WHERE s.user_id = ? AND strftime("%m", s.datetime) = ? AND strftime("%Y", s.datetime) = ? GROUP BY p.id ORDER BY sold_qty DESC LIMIT 5'; tparams2.push(String(month).padStart(2,'0'), String(year)); }
  const top = db.prepare(topQ).all(...tparams2) || [];

  res.json({ invested, sold, profit, ticket, top });
});

module.exports = router;
