const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'data.db');
const db = new Database(dbPath);

function init() {
  db.prepare(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    passwordHash TEXT,
    isAdmin INTEGER DEFAULT 1
  )`).run();

  db.prepare(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    sku TEXT,
    type TEXT,
    qty INTEGER DEFAULT 0,
    qty_per_kit INTEGER DEFAULT 1,
    avg_cost REAL DEFAULT 0,
    price REAL DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`).run();

  db.prepare(`CREATE TABLE IF NOT EXISTS purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    product_id INTEGER,
    datetime TEXT,
    qty INTEGER,
    total REAL,
    type TEXT,
    note TEXT
  )`).run();

  db.prepare(`CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    product_id INTEGER,
    datetime TEXT,
    qty INTEGER,
    total REAL,
    status TEXT,
    client TEXT,
    paid REAL DEFAULT 0
  )`).run();
}

init();

module.exports = db;
