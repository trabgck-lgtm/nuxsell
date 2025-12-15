// NuxSell - Single-file Static SPA (organized sections)
(function(){
  // ----------------------
  // Helpers & DOM utils
  // ----------------------
  function q(sel){ return document.querySelector(sel) }
  function el(tag, cls, txt){ const e=document.createElement(tag); if (cls) e.className=cls; if (txt!==undefined) e.textContent=txt; return e }
  function toCurrency(v){ return 'R$ ' + Number(v||0).toFixed(2) }

  // ----------------------
  // Storage & Auth
  // ----------------------
  const USERS_KEY = 'nuxsell_users_v1'
  const AUTH_KEY = 'nuxsell_current'
  function seedUsers(){
    if (localStorage.getItem(USERS_KEY)) return JSON.parse(localStorage.getItem(USERS_KEY))
    const users = [
      { username:'maduxsell', password:'Manumadu2021', isAdmin:true },
      { username:'guixsell', password:'34226905Gui', isAdmin:true }
    ]
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
    return users
  }
  function users(){ return JSON.parse(localStorage.getItem(USERS_KEY) || '[]') }
  function setCurrentUser(u){ localStorage.setItem(AUTH_KEY, u||'') }
  function currentUser(){ const u = localStorage.getItem(AUTH_KEY)||''; return u? { username: u } : null }
  function userDataKey(username){ return `nuxsell_data_${username}_v1` }
  function getData(username){
    const raw = localStorage.getItem(userDataKey(username))
    if (!raw){ const init = { products:[], purchases:[], sales:[], orders:[] }; localStorage.setItem(userDataKey(username), JSON.stringify(init)); return init }
    return JSON.parse(raw)
  }
  function saveData(username, data){ localStorage.setItem(userDataKey(username), JSON.stringify(data)) }

  // ----------------------
  // Product / Inventory logic
  // ----------------------
  function compareSKU(a,b){
    const sa = String(a.sku||'')
    const sb = String(b.sku||'')
    const na = parseFloat(sa.replace(/[^0-9.]/g,''))
    const nb = parseFloat(sb.replace(/[^0-9.]/g,''))
    if (!isNaN(na) && !isNaN(nb)) return na - nb
    return sa.localeCompare(sb, undefined, {numeric:true, sensitivity:'base'})
  }
  function sortProducts(username){ const data = getData(username); data.products.sort(compareSKU); saveData(username,data) }

  function createProduct(username, p){
    const data = getData(username)
    p.id = Date.now() + Math.floor(Math.random()*999)
    data.products.push(p)
    sortProducts(username)
    saveData(username, data)
    // try to send to backend (best-effort)
    trySendProductToServer(p).catch(()=>{})
    return p
  }
  function updateProduct(username, id, updates){
    const data = getData(username)
    const idx = data.products.findIndex(x=>x.id==id)
    if (idx===-1) return null
    data.products[idx] = {...data.products[idx], ...updates}
    sortProducts(username)
    saveData(username, data)
    // try update on server (best-effort)
    trySendProductToServer(data.products[idx]).catch(()=>{})
    return data.products[idx]
  }
  function deleteProduct(username, id){
    const data = getData(username)
    data.products = data.products.filter(x=>x.id!=id)
    data.purchases = data.purchases.filter(p=>p.product_id!=id)
    data.sales = data.sales.filter(s=>s.product_id!=id)
    data.orders = data.orders.filter(o=>o.product_id!=id)
    saveData(username, data)
    // best-effort delete on server
    fetch('/api/products/'+id, { method: 'DELETE' }).catch(()=>{})
  }

  // ----------------------
  // Purchases & Sales
  // Purchases may be kit or unit; sales accept ONLY units
  // ----------------------
  function recordPurchase(username, payload){
    const data = getData(username)
    const prod = data.products.find(p=>p.id==payload.product_id)
    if (!prod) throw new Error('Produto não encontrado')
    const qty = Number(payload.qty)
    const total = Number(payload.total||0)
    const type = payload.type || 'unit'
    let finalQty = qty
    if (type === 'kit') finalQty = qty * (Number(payload.qty_per_kit) || prod.qty_per_kit || 1)
    const oldTotalCost = (prod.avg_cost||0) * (prod.qty||0)
    const newTotalCost = total
    const combinedQty = (prod.qty||0) + finalQty
    const newAvg = combinedQty>0? (oldTotalCost + newTotalCost) / combinedQty : prod.avg_cost || 0
    prod.qty = (prod.qty||0) + finalQty
    prod.avg_cost = Number(newAvg)
    const item = { id: Date.now()+Math.floor(Math.random()*999), datetime: new Date().toISOString(), product_id: prod.id, qty: finalQty, total: Number(total), type }
    data.purchases.unshift(item)
    saveData(username, data)
    route()
    // sync to server purchases endpoint (best-effort)
    fetch('/api/purchases', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(item) }).catch(()=>{})
    return item
  }

  function recordSale(username, payload){
    const data = getData(username)
    const prod = data.products.find(p=>p.id==payload.product_id)
    if (!prod) throw new Error('Produto não encontrado')
    const qty = Number(payload.qty)
    const total = Number(payload.total||0)
    const paid = Number(payload.paid || 0)
    const status = payload.status || 'Pago'
    let finalQty = qty
    if ((prod.qty||0) - finalQty < 0) throw new Error('Estoque insuficiente')
    prod.qty = (prod.qty||0) - finalQty
    const item = { id: Date.now()+Math.floor(Math.random()*999), datetime: new Date().toISOString(), product_id: prod.id, qty: finalQty, total: Number(total), status, client: payload.client||'', paid }
    data.sales.unshift(item)
    saveData(username, data)
    route()
    // sync to server sales endpoint (best-effort)
    fetch('/api/sales', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(item) }).catch(()=>{})
    return item
  }

  // ----------------------
  // Orders (separate from sales)
  // ----------------------
  function createOrder(username, payload){
    const data = getData(username)
    const item = { id: Date.now()+Math.floor(Math.random()*999), datetime: new Date().toISOString(), product_id: payload.product_id, qty: Number(payload.qty), total: Number(payload.total||0), client: payload.client||'', status: payload.status||'Pendente', paid: Number(payload.paid||0) }
    data.orders.unshift(item)
    saveData(username, data)
    return item
  }
  function updateOrder(username, id, updates){
    const data = getData(username)
    const idx = data.orders.findIndex(o=>o.id==id)
    if (idx===-1) return null
    data.orders[idx] = {...data.orders[idx], ...updates}
    saveData(username, data)
    // try to sync order to server
    fetch('/api/orders', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(data.orders[idx]) }).catch(()=>{})
    return data.orders[idx]
  }

  // ----------------------
  // Finance & history
  // ----------------------
  function financeSummary(username, month, year){
    const data = getData(username)
    let purchases = data.purchases.slice()
    let sales = data.sales.slice()
    if (month && year){
      purchases = purchases.filter(p=>{ const d=new Date(p.datetime); return (d.getMonth()+1)==Number(month) && d.getFullYear()==Number(year) })
      sales = sales.filter(s=>{ const d=new Date(s.datetime); return (d.getMonth()+1)==Number(month) && d.getFullYear()==Number(year) })
    }
    const invested = purchases.reduce((s,p)=>s + (p.total||0), 0)
    const sold = sales.reduce((s,sale)=>s + (sale.total||0), 0)
    const profit = sold - invested
    const cnt = sales.length
    const ticket = cnt>0? sold / cnt : 0
    const top = {}
    for (const s of data.sales){ top[s.product_id] = (top[s.product_id]||0) + s.qty }
    const topList = Object.keys(top).map(id=>({ id:Number(id), qty: top[id], name: (data.products.find(p=>p.id==id)||{}).name || '—' })).sort((a,b)=>b.qty-a.qty).slice(0,6)
    return { invested, sold, profit, ticket, top: topList }
  }

  function history(username, opts={}){
    const data = getData(username)
    let items = []
    for (const p of data.purchases) items.push({...p, kind:'purchase'})
    for (const s of data.sales) items.push({...s, kind:'sale'})
    for (const o of data.orders) items.push({...o, kind:'order'})
    items.sort((a,b)=> new Date(b.datetime)-new Date(a.datetime))
    if (opts.type && opts.type!=='all') items = items.filter(i=>i.kind===opts.type)
    if (opts.product_id) items = items.filter(i=>i.product_id==opts.product_id)
    if (opts.status) items = items.filter(i=>i.status==opts.status)
    if (opts.month && opts.year) items = items.filter(i=>{ const d=new Date(i.datetime); return (d.getMonth()+1)==Number(opts.month) && d.getFullYear()==Number(opts.year) })
    return items
  }

  // ----------------------
  // UI rendering (views)
  // ----------------------
  const root = q('#root')
  const topnav = q('#topnav')

  // ----------------------
  // Helpers: server sync
  // ----------------------
  async function trySendProductToServer(p){
    // if server not available, this will fail silently
    try{
      // attempt to create or update based on presence of numeric id on server
      // our client ids are timestamps; server creates its own ids — use bulk for simplicity
      await fetch('/api/products', { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify(p) })
      return true
    }catch(e){ return false }
  }

  function navLinks(){
    return `
      <button data-route="#/dashboard">Dashboard</button>
      <button data-route="#/products">Produtos</button>
      <button data-route="#/purchases">Compras</button>
      <button data-route="#/sales">Vendas</button>
      <button data-route="#/orders">Pedidos</button>
      <button data-route="#/finance">Resumo</button>
      <button data-route="#/history">Histórico</button>
      <button id="btn-logout">Logout</button>
    `
  }

  function renderTopNav(){
    const user = currentUser()
    if (user){ topnav.innerHTML = navLinks(); topnav.querySelectorAll('button[data-route]').forEach(b=>b.onclick=()=>location.hash=b.dataset.route); q('#btn-logout').onclick=()=>{ setCurrentUser(null); location.hash='#/login' } }
    else topnav.innerHTML = ''
  }

  function route(){
    renderTopNav()
    const r = location.hash || '#/login'
    const user = currentUser()
    if (!user && r !== '#/login'){ location.hash = '#/login'; return }
    if (r.startsWith('#/login')) renderLogin()
    else if (r.startsWith('#/dashboard')) renderDashboard()
    else if (r.startsWith('#/products')) renderProducts()
    else if (r.startsWith('#/purchases')) renderPurchases()
    else if (r.startsWith('#/sales')) renderSales()
    else if (r.startsWith('#/orders')) renderOrders()
    else if (r.startsWith('#/finance')) renderFinance()
    else if (r.startsWith('#/history')) renderHistory()
    else renderDashboard()
  }

  // --- Views implementations ---
  function renderLogin(){
    root.innerHTML = ''
    const card = el('div','card')
    const h = el('h2',null,'Entrar no NuxSell')
    const fuser = el('div'); fuser.innerHTML = '<label>Usuário</label><input id="login-user" />'
    const fpass = el('div'); fpass.innerHTML = '<label>Senha</label><input id="login-pass" type="password" />'
    const err = el('div','muted')
    const btn = el('button','btn','Entrar')
    btn.onclick = ()=>{
      const u = q('#login-user').value.trim(); const p = q('#login-pass').value
      const us = users()
      const found = us.find(x=>x.username===u && x.password===p)
      if (!found){ err.textContent = 'Credenciais inválidas'; return }
      setCurrentUser(found.username)
      location.hash = '#/dashboard'
    }

    const note = el('div','muted','Usuários pré-cadastrados: maduxsell / Manumadu2021  —  guixsell / 34226905Gui')
    card.appendChild(h); card.appendChild(fuser); card.appendChild(fpass); card.appendChild(err); card.appendChild(btn); card.appendChild(note)
    root.appendChild(card)
  }

  function renderDashboard(){
    const user = currentUser(); const data = getData(user.username)
    root.innerHTML = ''
    const grid = el('div','grid')
    const stock = data.products.reduce((s,p)=>s + (Number(p.qty)||0), 0)
    const invested = data.purchases.reduce((s,p)=>s + (Number(p.total)||0), 0)
    const sold = data.sales.reduce((s,sale)=>s + (Number(sale.total)||0), 0)
    const profit = sold - invested

    grid.appendChild(cardStat('Estoque total', stock))
    grid.appendChild(cardStat('Total investido', toCurrency(invested)))
    grid.appendChild(cardStat('Total vendido', toCurrency(sold)))
    grid.appendChild(cardStat('Lucro bruto', toCurrency(profit), profit>=0))

    const c = el('div','card'); c.appendChild(el('h3',null,'Visão rápida')); c.appendChild(grid)
    root.appendChild(c)
  }

  function cardStat(title, value, positive=true){ const c = el('div','card'); c.innerHTML = `<div class="muted">${title}</div><h2 class="${positive? 'success':''}">${value}</h2>`; return c }

  // Products view (SKU first, Duplicate action, sorted by SKU)
  function renderProducts(){
    const u = currentUser(); if (!u) return renderLogin()
    const data = getData(u.username)
    root.innerHTML = ''
    const top = el('div','top')
    top.appendChild(el('h2',null,'Estoque'))
    const add = el('button','btn','Adicionar Produto')
    add.onclick = ()=>{ const p = { sku:'', name:'', price:0, cost:0, qty:0, qty_per_kit:1 }; createProduct(u.username,p); renderProducts(); renderProductForm(p) }
    top.appendChild(add)
    root.appendChild(top)

    const syncAllBtn = el('button','btn secondary','Salvar todos no DB')
    syncAllBtn.onclick = async ()=>{
      const confirmMsg = 'Enviar todos os produtos locais para o servidor (criar/duplicar). Prosseguir?'
      if (!confirm(confirmMsg)) return
      const list = getData(u.username).products || []
      try{
        const res = await fetch('/api/products/bulk', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(list) })
        if (res.ok) alert('Produtos enviados ao servidor (bulk)')
        else alert('Falha ao enviar')
      }catch(e){ alert('Servidor não disponível') }
    }
    top.appendChild(syncAllBtn)

    // ensure products sorted by SKU
    sortProducts(u.username)

    const list = el('div','list')
    for (const p of getData(u.username).products){
      const row = el('div','product')
      const info = el('div','info')
      info.innerHTML = `<div style="display:flex;gap:12px;align-items:center;width:100%"><div style="width:140px;font-weight:700">${p.sku||''}</div><div style="flex:1">${p.name||''}</div><div style="width:120px;text-align:right">${toCurrency(p.price||0)}</div></div>`
      const actions = el('div','actions')
      const edit = el('button','btn','Editar'); edit.onclick = ()=> renderProductForm(p)
      const dup = el('button','btn','Duplicar'); dup.onclick = ()=>{
        const newSku = prompt('SKU para o produto duplicado', (p.sku||'') + '-copy')
        if (!newSku) return
        const copy = {...p, id: Date.now()+Math.floor(Math.random()*999), sku: newSku}
        const d = getData(u.username); d.products.push(copy); sortProducts(u.username); saveData(u.username, d)
        renderProducts(); renderProductForm(copy)
      }
      const del = el('button','btn warning','Excluir'); del.onclick = ()=>{ if (confirm('Excluir?')){ deleteProduct(u.username,p.id); renderProducts() } }
      actions.appendChild(edit); actions.appendChild(dup); actions.appendChild(del)
      row.appendChild(info); row.appendChild(actions); list.appendChild(row)
    }
    root.appendChild(list)

    function renderProductForm(prod){
      const modal = el('div','modal')
      const form = el('div','form')
      form.innerHTML = `
        <h3>Produto</h3>
        <label>SKU</label><input id="sku" value="${prod.sku||''}" />
        <label>Nome</label><input id="name" value="${prod.name||''}" />
        <label>Preço venda</label><input id="price" value="${prod.price||0}" type="number" />
        <label>Custo unitário</label><input id="cost" value="${prod.cost||0}" type="number" />
        <label>Quantidade em estoque</label><input id="qty" value="${prod.qty||0}" type="number" />
        <label>Unidades por kit (se aplicável)</label><input id="qty_per_kit" value="${prod.qty_per_kit||1}" type="number" />
        <div class="actions"><button id="save" class="btn">Salvar</button> <button id="cancel" class="btn warning">Cancelar</button></div>
      `
      modal.appendChild(form); root.appendChild(modal)
      q('#cancel').onclick = ()=>{ renderProducts() }
      q('#save').onclick = ()=>{
        const updates = { sku: q('#sku').value, name: q('#name').value, price: Number(q('#price').value), cost: Number(q('#cost').value), qty: Number(q('#qty').value), qty_per_kit: Number(q('#qty_per_kit').value) }
        if (prod.id) updateProduct(u.username, prod.id, updates)
        else createProduct(u.username, updates)
        renderProducts()
      }
    }
  }

  // Purchases view: allow unit or kit purchases
  function renderPurchases(){
    const u = currentUser(); if (!u) return renderLogin()
    const data = getData(u.username)
    root.innerHTML = ''
    const top = el('div','card'); top.appendChild(el('h3',null,'Registrar Compra'))
    const form = el('div'); form.style.display='grid'; form.style.gridTemplateColumns='1fr 1fr'; form.style.gap='8px'
    form.innerHTML = `
      <div><label>Produto</label><select id="buy-product"><option value="">-- selecione --</option>${data.products.map(p=>`<option value="${p.id}">${p.sku?('['+p.sku+'] '):''}${p.name} (estoque ${p.qty||0})</option>`).join('')}</select></div>
      <div><label>Tipo</label><select id="buy-type"><option value="unit">Unidade</option><option value="kit">Kit</option></select></div>
      <div><label>Quantidade</label><input id="buy-qty" type="number" value="1" /></div>
      <div><label>Unidades por kit</label><input id="buy-qtykit" type="number" value="1" /></div>
      <div><label>Valor total</label><input id="buy-total" type="number" value="0" /></div>
      <div></div>
    `
    top.appendChild(form)
    const btn = el('button','btn','Registrar compra')
    btn.onclick = ()=>{
      try{
        const payload = { product_id: Number(q('#buy-product').value), type: q('#buy-type').value, qty: Number(q('#buy-qty').value||0), qty_per_kit: Number(q('#buy-qtykit').value||1), total: Number(q('#buy-total').value||0) }
        if (!payload.product_id) return alert('Selecione o produto')
        recordPurchase(u.username, payload)
        renderPurchases()
      }catch(e){ alert(e.message) }
    }
    top.appendChild(btn); root.appendChild(top)

    const hist = el('div','card'); hist.appendChild(el('h4',null,'Histórico de compras'))
    const list = el('div','list')
    for (const p of data.purchases) list.appendChild(histItem(p,'purchase',data))
    hist.appendChild(list); root.appendChild(hist)
  }

  // Sales view: units only (quantity in units)
  function renderSales(){
    const u = currentUser(); if (!u) return renderLogin()
    const data = getData(u.username)
    root.innerHTML = ''
    const top = el('div','card'); top.appendChild(el('h3',null,'Registrar Venda'))
    const form = el('div'); form.style.display='grid'; form.style.gridTemplateColumns='1fr 1fr'; form.style.gap='8px'
    form.innerHTML = `
      <div><label>Produto</label><select id="sell-product"><option value="">-- selecione --</option>${data.products.map(p=>`<option value="${p.id}">${p.sku?('['+p.sku+'] '):''}${p.name} (Estoque: ${p.qty||0})</option>`).join('')}</select></div>
      <div><label>Quantidade (unidades)</label><input id="sell-qty" type="number" value="1" /></div>
      <div><label>Valor total</label><input id="sell-total" type="number" value="0" /></div>
      <div><label>Cliente</label><input id="sell-client" /></div>
      <div><label>Status</label><select id="sell-status"><option>Pago</option><option>Pendente</option><option>Inadimplente</option><option>Parcial</option></select></div>
      <div><label>Valor pago (se parcial)</label><input id="sell-paid" type="number" value="0" /></div>
    `
    top.appendChild(form)
    const btn = el('button','btn','Registrar venda')
    btn.onclick = ()=>{
      try{
        const payload = { product_id: Number(q('#sell-product').value), qty: Number(q('#sell-qty').value||0), total: Number(q('#sell-total').value||0), client: q('#sell-client').value, status: q('#sell-status').value, paid: Number(q('#sell-paid').value||0) }
        if (!payload.product_id) return alert('Selecione o produto')
        recordSale(u.username, payload)
        renderSales()
      }catch(e){ alert(e.message) }
    }
    top.appendChild(btn); root.appendChild(top)

    const hist = el('div','card'); hist.appendChild(el('h4',null,'Histórico de vendas'))
    const list = el('div','list')
    for (const s of data.sales) list.appendChild(histItem(s,'sale',data))
    hist.appendChild(list); root.appendChild(hist)
  }

  // Orders view (separate from sales)
  function renderOrders(){
    const u = currentUser(); if (!u) return renderLogin()
    const data = getData(u.username)
    root.innerHTML = ''
    const top = el('div','card'); top.appendChild(el('h3',null,'Pedidos (Orders)'))
    const form = el('div'); form.style.display='grid'; form.style.gridTemplateColumns='1fr 1fr'; form.style.gap='8px'
    form.innerHTML = `
      <div><label>Produto</label><select id="order-product"><option value="">-- selecione --</option>${data.products.map(p=>`<option value="${p.id}">${p.sku?('['+p.sku+'] '):''}${p.name} (Estoque: ${p.qty||0})</option>`).join('')}</select></div>
      <div><label>Quantidade (unidades)</label><input id="order-qty" type="number" value="1" /></div>
      <div><label>Valor total estimado</label><input id="order-total" type="number" value="0" /></div>
      <div><label>Cliente</label><input id="order-client" /></div>
      <div><label>Status</label><select id="order-status"><option>Pendente</option><option>Confirmado</option><option>Cancelado</option></select></div>
    `
    top.appendChild(form)
    const btn = el('button','btn','Criar Pedido')
    btn.onclick = ()=>{
      const pid = Number(q('#order-product').value)
      const qty = Number(q('#order-qty').value||0)
      const total = Number(q('#order-total').value||0)
      const client = q('#order-client').value
      const status = q('#order-status').value
      if (!pid) return alert('Selecione um produto')
      createOrder(u.username, { product_id: pid, qty, total, client, status })
      renderOrders()
    }
    top.appendChild(btn); root.appendChild(top)

    const list = el('div','list')
    for (const o of data.orders){
      const prod = data.products.find(p=>p.id==o.product_id)
      const row = el('div','list-item')
      const left = el('div',null); left.innerHTML = `<div style="font-weight:700">${prod?prod.name:'?'} <span class="muted">(${prod?prod.sku:'—'})</span></div><div class="muted">${o.datetime} — ${o.qty} un — ${toCurrency(o.total)} — ${o.status}</div>`
      const actions = el('div',null)
      const confirm = el('button','btn','Confirmar -> Venda')
      confirm.onclick = ()=>{
        if (!confirm('Confirmar e converter para venda? Isso reduzirá o estoque.')) return
        try{ recordSale(u.username, { product_id: o.product_id, qty: o.qty, total: o.total, client: o.client }); updateOrder(u.username, o.id, { status: 'Confirmado' }); renderOrders() }catch(e){ alert(e.message) }
      }
      const cancel = el('button','btn warning','Cancelar')
      cancel.onclick = ()=>{ if (confirm('Cancelar pedido?')){ updateOrder(u.username, o.id, { status: 'Cancelado' }); renderOrders() } }
      actions.appendChild(confirm); actions.appendChild(cancel)
      row.appendChild(left); row.appendChild(actions); list.appendChild(row)
    }
    root.appendChild(list)
  }

  // Finance & history views
  function renderFinance(){
    const u = currentUser(); if (!u) return renderLogin()
    const data = getData(u.username)
    root.innerHTML = ''
    const c = el('div','card'); c.appendChild(el('h3',null,'Resumo Financeiro'))
    const f = el('div'); f.style.display='flex'; f.style.gap='8px'; f.innerHTML = '<input id="f-month" placeholder="Mês (MM)" style="width:100px"/><input id="f-year" placeholder="Ano (YYYY)" style="width:120px"/>'
    const btn = el('button','btn','Filtrar'); btn.onclick=()=>{ const m=q('#f-month').value; const y=q('#f-year').value; renderFinanceResults(financeSummary(u.username,m,y)) }
    c.appendChild(f); c.appendChild(btn); root.appendChild(c)
    renderFinanceResults(financeSummary(u.username))
  }
  function renderFinanceResults(r){ const old = root.querySelector('.finance-results'); if (old) old.remove(); const res = el('div','card finance-results'); res.innerHTML = `<div class="grid"><div class="card"><div class="muted">Total investido</div><h2>${toCurrency(r.invested)}</h2></div><div class="card"><div class="muted">Total vendido</div><h2>${toCurrency(r.sold)}</h2></div><div class="card"><div class="muted">Lucro bruto</div><h2 class="${r.profit>=0? 'success':''}">${toCurrency(r.profit)}</h2></div><div class="card"><div class="muted">Ticket médio</div><h2>${toCurrency(r.ticket)}</h2></div></div>`; res.appendChild(el('h4',null,'Produtos mais vendidos')); const list = el('div','list'); for (const t of r.top) list.appendChild(el('div','list-item',`${t.name} — ${t.qty}`)); res.appendChild(list); root.appendChild(res) }

  function renderHistory(){ const u=currentUser(); if (!u) return renderLogin(); const data=getData(u.username); root.innerHTML=''; const c=el('div','card'); c.appendChild(el('h3',null,'Histórico / Contabilidade')); const f=el('div'); f.style.display='grid'; f.style.gridTemplateColumns='repeat(5,1fr)'; f.style.gap='8px'; f.innerHTML=`<select id="h-type"><option value="all">Todos</option><option value="purchase">Compra</option><option value="sale">Venda</option><option value="order">Pedido</option></select><input id="h-product" placeholder="Produto (id)"/><input id="h-status" placeholder="Status"/><input id="h-month" placeholder="Mês (MM)"/><input id="h-year" placeholder="Ano (YYYY)"/>`; const btn=el('button','btn','Filtrar'); btn.onclick=()=>{ const opts={ type:q('#h-type').value, product_id:q('#h-product').value, status:q('#h-status').value, month:q('#h-month').value, year:q('#h-year').value }; renderHistoryList(history(u.username,opts), getData(u.username)) }; c.appendChild(f); c.appendChild(btn); root.appendChild(c); renderHistoryList(history(u.username,{}), getData(u.username)) }
  function renderHistoryList(items,data){ const old=root.querySelector('.history-list'); if(old) old.remove(); const box=el('div','card history-list'); const list=el('div','list'); for(const e of items) list.appendChild(histItem(e,e.kind|| (e.total? 'order':'purchase'), data)); box.appendChild(list); root.appendChild(box) }
  function histItem(it, kind, data){ const row=el('div','list-item'); const left=el('div',null); left.innerHTML=`<strong>${(kind||'item').toUpperCase()}</strong> <div class="muted">${(new Date(it.datetime)).toLocaleString()}</div>`; const right=el('div',null); const prodName=(data.products.find(p=>p.id==it.product_id)||{}).name || it.product_id; right.innerHTML=`${prodName} — Qtd: ${it.qty} — ${toCurrency(it.total)} ${it.status? '<span class="muted">— '+it.status+'</span>':''}`; row.appendChild(left); row.appendChild(right); return row }

  // ----------------------
  // Init
  // ----------------------
  seedUsers()
  q('#nav-home').onclick = ()=> location.hash = '#/dashboard'
  window.addEventListener('hashchange', route)
  if (!location.hash) location.hash = '#/login'
  route()

  // expose API for debug
  window.NuxSell = { getData, users: users, seedUsers, createProduct, updateProduct, deleteProduct, recordPurchase, recordSale, createOrder, updateOrder, financeSummary, history }
})();
