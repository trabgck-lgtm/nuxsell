NuxSell — versão local

Esta versão roda como SPA estático (abra `index.html`) e pode sincronizar com um servidor local SQLite para persistência.

Para ativar o servidor local (opcional):

```pwsh
cd server
npm install
node server.js
```

Por padrão o servidor escuta em `http://localhost:3001`.

No SPA há um botão em `Produtos` chamado `Salvar todos no DB` que envia todos os produtos locais para o servidor via `/api/products/bulk`.

Observações:
- O servidor é "best-effort": o SPA tentará enviar cada produto quando criado/atualizado/excluído, mas continuará a operar localmente mesmo que o servidor esteja desligado.
- O servidor não possui autenticação — apenas use localmente.
