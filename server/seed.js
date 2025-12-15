const bcrypt = require('bcrypt');
const db = require('./db');

async function seed() {
  const users = [
    { username: 'maduxsell', password: 'Manumadu2021' },
    { username: 'guixsell', password: '34226905Gui' }
  ];

  const insert = db.prepare('INSERT OR IGNORE INTO users (username, passwordHash, isAdmin) VALUES (?, ?, ? )');
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    insert.run(u.username, hash, 1);
  }

  console.log('Seed complete');
}

seed().catch(err => console.error(err));
