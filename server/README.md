# NuxSell Local Server

This is a minimal Express + SQLite server used to persist products, purchases, sales and orders for the local NuxSell SPA.

Run locally:

```pwsh
cd server
npm install
node server.js
```

The server listens on port `3001` by default and exposes endpoints under `/api/*`:
- `GET /api/ping`
- `GET /api/products`
- `POST /api/products` (single)
- `POST /api/products/bulk` (array)
- `PUT /api/products/:id`
- `DELETE /api/products/:id`
- `GET/POST /api/purchases`
- `GET/POST /api/sales`
- `GET/POST /api/orders`

Frontend behavior:
- The SPA will attempt to POST new/updated products to the server (best-effort). You can also call `POST /api/products/bulk` to import all local products.

Note: This server is intentionally simple and lacks authentication. Do not expose to untrusted networks.
