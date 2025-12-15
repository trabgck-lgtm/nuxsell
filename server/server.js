const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const Database = require('better-sqlite3')
const path = require('path')

const app = express()
app.use(cors())
app.use(bodyParser.json({ limit: '2mb' }))

const DB_PATH = path.join(__dirname, 'data.sqlite')
const db = new Database(DB_PATH)

// Initialize tables
db.prepare(`CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  sku TEXT,
  name TEXT,
  price REAL,
  cost REAL,
  qty REAL,
  qty_per_kit REAL,
  avg_cost REAL,
  meta TEXT
)`).run()

db.prepare(`CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY,
  datetime TEXT,
  product_id INTEGER,
  qty REAL,
  total REAL,
  type TEXT
)`).run()

db.prepare(`CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY,
  datetime TEXT,
  product_id INTEGER,
  qty REAL,
  total REAL,
  status TEXT,
  client TEXT,
  paid REAL
)`).run()

db.prepare(`CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY,
  datetime TEXT,
  product_id INTEGER,
  qty REAL,
  total REAL,
  client TEXT,
  status TEXT
)`).run()

// Simple ping
app.get('/api/ping', (req, res) => res.json({ ok: true }))

// Products endpoints
app.get('/api/products', (req, res) => {
  const rows = db.prepare('SELECT * FROM products ORDER BY sku COLLATE NOCASE').all()
  res.json(rows)
})

app.post('/api/products', (req, res) => {
  const p = req.body
  const stmt = db.prepare('INSERT INTO products (sku,name,price,cost,qty,qty_per_kit,avg_cost,meta) VALUES (?,?,?,?,?,?,?,?)')
  const info = stmt.run(p.sku||'', p.name||'', p.price||0, p.cost||0, p.qty||0, p.qty_per_kit||1, p.avg_cost||0, JSON.stringify(p.meta||{}))
  const created = db.prepare('SELECT * FROM products WHERE id=?').get(info.lastInsertRowid)
  res.json(created)
})

app.post('/api/products/bulk', (req, res) => {
  const arr = req.body || []
  const insert = db.prepare('INSERT INTO products (sku,name,price,cost,qty,qty_per_kit,avg_cost,meta) VALUES (?,?,?,?,?,?,?,?)')
  const info = db.transaction((items)=>{
    for (const p of items){ insert.run(p.sku||'', p.name||'', p.price||0, p.cost||0, p.qty||0, p.qty_per_kit||1, p.avg_cost||0, JSON.stringify(p.meta||{})) }
  })(arr)
  res.json({ ok: true, inserted: arr.length })
})

app.put('/api/products/:id', (req, res) => {
  const id = Number(req.params.id)
  const p = req.body
  db.prepare('UPDATE products SET sku=?, name=?, price=?, cost=?, qty=?, qty_per_kit=?, avg_cost=?, meta=? WHERE id=?')
    .run(p.sku||'', p.name||'', p.price||0, p.cost||0, p.qty||0, p.qty_per_kit||1, p.avg_cost||0, JSON.stringify(p.meta||{}), id)
  const updated = db.prepare('SELECT * FROM products WHERE id=?').get(id)
  res.json(updated)
})

app.delete('/api/products/:id', (req, res) => {
  const id = Number(req.params.id)
  db.prepare('DELETE FROM products WHERE id=?').run(id)
  res.json({ ok: true })
})

// Purchases, sales, orders endpoints (basic create + list)
app.get('/api/purchases', (req, res) => { res.json(db.prepare('SELECT * FROM purchases ORDER BY datetime DESC').all()) })
app.post('/api/purchases', (req, res) => { const p=req.body; const info=db.prepare('INSERT INTO purchases (datetime,product_id,qty,total,type) VALUES (?,?,?,?,?)').run(p.datetime||new Date().toISOString(), p.product_id||0, p.qty||0, p.total||0, p.type||'unit'); res.json({ id: info.lastInsertRowid }) })

app.get('/api/sales', (req, res) => { res.json(db.prepare('SELECT * FROM sales ORDER BY datetime DESC').all()) })
app.post('/api/sales', (req, res) => { const p=req.body; const info=db.prepare('INSERT INTO sales (datetime,product_id,qty,total,status,client,paid) VALUES (?,?,?,?,?,?,?)').run(p.datetime||new Date().toISOString(), p.product_id||0, p.qty||0, p.total||0, p.status||'Pago', p.client||'', p.paid||0); res.json({ id: info.lastInsertRowid }) })

app.get('/api/orders', (req,res)=>{ res.json(db.prepare('SELECT * FROM orders ORDER BY datetime DESC').all()) })
app.post('/api/orders', (req,res)=>{ const p=req.body; const info=db.prepare('INSERT INTO orders (datetime,product_id,qty,total,client,status) VALUES (?,?,?,?,?,?)').run(p.datetime||new Date().toISOString(), p.product_id||0,p.qty||0,p.total||0,p.client||'',p.status||'Pendente'); res.json({ id: info.lastInsertRowid }) })

const PORT = process.env.PORT || 3001
app.listen(PORT, ()=> console.log('NuxSell server running on port', PORT))
