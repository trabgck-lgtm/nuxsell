# NuxSell Server

Express API using SQLite (better-sqlite3).

Install and run:

```pwsh
cd server
npm install
npm run seed    # creates initial users
npm run dev     # starts server with nodemon
```

Default port: 3001

The API exposes:
- POST /api/auth/login { username, password }
- /api/products (CRUD) - protected
- /api/purchases - protected
- /api/sales - protected
- /api/history - protected
- /api/finance - protected
