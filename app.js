// NuxSell - Static SPA (stores data in localStorage)
(function(){
  // --- Storage helpers ---
  const USERS_KEY = 'nuxsell_users_v1'
  const AUTH_KEY = 'nuxsell_current'

  function seedUsers(){
    const existing = JSON.parse(localStorage.getItem(USERS_KEY) || 'null')
    if (existing) return existing
    const users = [
      { username:'maduxsell', password:'Manumadu2021', isAdmin:true },
      { username:'guixsell', password:'34226905Gui', isAdmin:true }
    ]
    localStorage.setItem(USERS_KEY, JSON.stringify(users))
    return users
  }

  function users(){ return JSON.parse(localStorage.getItem(USERS_KEY) || '[]') }
  function saveUsers(u){ localStorage.setItem(USERS_KEY, JSON.stringify(u)) }

  function userDataKey(username){ return `nuxsell_data_${username}` }
  function getData(username){
    const raw = localStorage.getItem(userDataKey(username))
    if (!raw) {
      const init = { products:[], purchases:[], sales:[] }
      localStorage.setItem(userDataKey(username), JSON.stringify(init))
      return init
    }
    return JSON.parse(raw)
  }
  function saveData(username, data){ localStorage.setItem(userDataKey(username), JSON.stringify(data)) }

  // --- Auth ---
  function currentUser(){ return localStorage.getItem(AUTH_KEY) }
  function setCurrentUser(u){ if (u) localStorage.setItem(AUTH_KEY, u); else localStorage.removeItem(AUTH_KEY) }

  // --- Utils ---
  function q(sel){ return document.querySelector(sel) }
  function el(tag, cls, txt){ const e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e }

  // --- Business logic ---
  function createProduct(username, p){
    const data = getData(username)
    p.id = Date.now() + Math.floor(Math.random()*999)
    data.products.push(p)
    saveData(username, data)
    return p
  }

  function updateProduct(username, id, updates){
    const data = getData(username)
    const idx = data.products.findIndex(x=>x.id==id)
    if (idx===-1) return null
    data.products[idx] = {...data.products[idx], ...updates}
    saveData(username, data)
    return data.products[idx]
  }

  function deleteProduct(username, id){
    const data = getData(username)
    data.products = data.products.filter(x=>x.id!=id)
    // also remove related sales/purchases
    data.purchases = data.purchases.filter(p=>p.product_id!=id)
    data.sales = data.sales.filter(s=>s.product_id!=id)
    saveData(username, data)
  }

  function recordPurchase(username, payload){
    const data = getData(username)
    const prod = data.products.find(p=>p.id==payload.product_id)
    if (!prod) throw new Error('Produto não encontrado')

    const qty = Number(payload.qty)
    const total = Number(payload.total)
    const type = payload.type || 'unit'
    let finalQty = qty
    if (type === 'kit') finalQty = qty * (Number(payload.qty_per_kit)||prod.qty_per_kit || 1)
    // recalc avg cost
    const oldTotalCost = (prod.avg_cost||0) * (prod.qty||0)
    const newTotalCost = total
    const combinedQty = (prod.qty||0) + finalQty
    const newAvg = combinedQty>0? (oldTotalCost + newTotalCost) / combinedQty : prod.avg_cost || 0
    prod.qty = (prod.qty||0) + finalQty
    prod.avg_cost = Number(newAvg)

    const item = { id: Date.now()+Math.floor(Math.random()*999), datetime: new Date().toISOString(), product_id: prod.id, qty: finalQty, total: Number(total), type }
    data.purchases.unshift(item)
    saveData(username, data)
    return item
  }

  function recordSale(username, payload){
    const data = getData(username)
    const prod = data.products.find(p=>p.id==payload.product_id)
    if (!prod) throw new Error('Produto não encontrado')
    const qty = Number(payload.qty)
    const total = Number(payload.total)
    const paid = Number(payload.paid || 0)
    const status = payload.status || 'Pago'
    const type = payload.type || 'unit'
    let finalQty = qty
    if (type === 'kit') finalQty = qty * (Number(payload.qty_per_kit)||prod.qty_per_kit || 1)
    if ((prod.qty||0) - finalQty < 0) throw new Error('Estoque insuficiente')
    prod.qty = (prod.qty||0) - finalQty
    const item = { id: Date.now()+Math.floor(Math.random()*999), datetime: new Date().toISOString(), product_id: prod.id, qty: finalQty, total: Number(total), status, client: payload.client||'', paid }
    data.sales.unshift(item)
    saveData(username, data)
    return item
  }

  // --- Finance & History ---
  function financeSummary(username, month, year){
    const data = getData(username)
    let purchases = data.purchases.slice()
    let sales = data.sales.slice()
    if (month && year){
      purchases = purchases.filter(p=>{
        const d = new Date(p.datetime); return (d.getMonth()+1)==Number(month) && d.getFullYear()==Number(year)
      })
      sales = sales.filter(s=>{
        const d = new Date(s.datetime); return (d.getMonth()+1)==Number(month) && d.getFullYear()==Number(year)
      })
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
    items.sort((a,b)=> new Date(b.datetime)-new Date(a.datetime))
    // simple filters
    if (opts.type && opts.type!=='all') items = items.filter(i=>i.kind===opts.type)
    if (opts.product_id) items = items.filter(i=>i.product_id==opts.product_id)
    if (opts.status) items = items.filter(i=>i.status==opts.status)
    if (opts.month && opts.year) items = items.filter(i=>{ const d=new Date(i.datetime); return (d.getMonth()+1)==Number(opts.month) && d.getFullYear()==Number(opts.year) })
    return items
  }

  // --- UI rendering ---
  const root = q('#root')
  const topnav = q('#topnav')

  function navLinks(){
    return `
      <button data-route="#/dashboard">Dashboard</button>
      <button data-route="#/products">Produtos</button>
      <button data-route="#/purchases">Compras</button>
      <button data-route="#/sales">Vendas</button>
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

  function toCurrency(v){ return 'R$ ' + Number(v||0).toFixed(2) }

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
    else if (r.startsWith('#/finance')) renderFinance()
    else if (r.startsWith('#/history')) renderHistory()
    else renderDashboard()
  }

  // --- Views ---
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
    const user = currentUser(); const data = getData(user)
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

  function renderProducts(){
    const user = currentUser(); const data = getData(user)
    root.innerHTML = ''
    const top = el('div','card'); top.appendChild(el('h3',null,'Produtos'))
    const btn = el('button','btn','Novo produto'); btn.onclick=()=>renderProductForm()
    top.appendChild(btn); root.appendChild(top)

    const listc = el('div','card')
    const list = el('div','list')
    // sort by low stock
    const sorted = data.products.slice().sort((a,b)=> (a.qty||0)-(b.qty||0))
    for (const p of sorted){
      const it = el('div','list-item')
      const info = el('div',null)
      info.innerHTML = `<div style="font-weight:600">${p.name} <span class="muted">(${p.sku||'—'})</span></div><div class="muted">Estoque: ${p.qty||0} ${p.qty < (p.min_stock||0)? '<span class="danger">(abaixo do mínimo)</span>':''}</div>`
      const actions = el('div',null)
      const e = el('button','btn','Editar'); e.onclick=()=>renderProductForm(p)
      const d = el('button','btn','Excluir'); d.style.background='#ef4444'; d.onclick=()=>{ if(confirm('Excluir produto?')){ deleteProduct(user,p.id); renderProducts() } }
      actions.appendChild(e); actions.appendChild(d)
      it.appendChild(info); it.appendChild(actions); list.appendChild(it)
    }
    listc.appendChild(list); root.appendChild(listc)

    function renderProductForm(product){
      const modal = el('div','card')
      modal.innerHTML = `<h3>${product? 'Editar produto':'Novo produto'}</h3>`
      const form = document.createElement('div')
      form.style.display='grid'; form.style.gridTemplateColumns='1fr 1fr'; form.style.gap='8px'
      form.innerHTML = `
        <div><label>Nome</label><input id="p-name" value="${product?product.name:''}" /></div>
        <div><label>SKU</label><input id="p-sku" value="${product?product.sku:''}" /></div>
        <div><label>Tipo</label><select id="p-type"><option value="unit">Unidade</option><option value="kit">Kit</option></select></div>
        <div><label>Quantidade</label><input id="p-qty" type="number" value="${product?product.qty:0}" /></div>
        <div><label>Preço venda</label><input id="p-price" type="number" value="${product?product.price:0}" /></div>
        <div><label>Preço médio compra</label><input id="p-avg" type="number" value="${product?product.avg_cost:0}" /></div>
        <div><label>Estoque mínimo</label><input id="p-min" type="number" value="${product?product.min_stock:0}" /></div>
      `
      modal.appendChild(form)
      const save = el('button','btn','Salvar'); save.onclick=()=>{
        const p = { name: q('#p-name').value, sku: q('#p-sku').value, type: q('#p-type').value, qty: Number(q('#p-qty').value||0), price: Number(q('#p-price').value||0), avg_cost: Number(q('#p-avg').value||0), min_stock: Number(q('#p-min').value||0) }
        if (product) updateProduct(user, product.id, p); else createProduct(user, p)
        renderProducts();
      }
      const cancel = el('button','btn','Fechar'); cancel.style.background='#9ca3af'; cancel.onclick=()=>renderProducts()
      modal.appendChild(save); modal.appendChild(cancel)
      root.prepend(modal)
    }
  }

  function renderPurchases(){
    const user = currentUser(); const data = getData(user)
    root.innerHTML = ''
    const top = el('div','card'); top.appendChild(el('h3',null,'Registrar Compra'))
    const form = el('div')
    form.style.display='grid'; form.style.gridTemplateColumns='1fr 1fr'; form.style.gap='8px'
    form.innerHTML = `
      <div><label>Produto</label><select id="buy-product"><option value="">-- selecione --</option>${data.products.map(p=>`<option value="${p.id}">${p.name} (${p.sku||'—'})</option>`).join('')}</select></div>
      <div><label>Tipo</label><select id="buy-type"><option value="unit">Unidade</option><option value="kit">Kit</option></select></div>
      <div><label>Quantidade</label><input id="buy-qty" type="number" value="1" /></div>
      <div><label>Unidades por kit</label><input id="buy-qtykit" type="number" value="1" /></div>
      <div><label>Valor total</label><input id="buy-total" type="number" value="0" /></div>
      <div></div>
    `
    top.appendChild(form)
    const btn = el('button','btn','Registrar compra'); btn.onclick=()=>{
      try{
        const payload = { product_id: Number(q('#buy-product').value), type: q('#buy-type').value, qty: Number(q('#buy-qty').value||0), qty_per_kit: Number(q('#buy-qtykit').value||1), total: Number(q('#buy-total').value||0) }
        if (!payload.product_id) return alert('Selecione o produto')
        recordPurchase(user, payload)
        renderPurchases()
      }catch(e){ alert(e.message) }
    }
    top.appendChild(btn); root.appendChild(top)

    const hist = el('div','card'); hist.appendChild(el('h4',null,'Histórico de compras'))
    const list = el('div','list')
    for (const p of data.purchases) list.appendChild(histItem(p,'purchase',data))
    hist.appendChild(list); root.appendChild(hist)
  }

  function renderSales(){
    const user = currentUser(); const data = getData(user)
    root.innerHTML = ''
    const top = el('div','card'); top.appendChild(el('h3',null,'Registrar Venda'))
    const form = el('div')
    form.style.display='grid'; form.style.gridTemplateColumns='1fr 1fr'; form.style.gap='8px'
    form.innerHTML = `
      <div><label>Produto</label><select id="sell-product"><option value="">-- selecione --</option>${data.products.map(p=>`<option value="${p.id}">${p.name} (Estoque: ${p.qty||0})</option>`).join('')}</select></div>
      <div><label>Tipo</label><select id="sell-type"><option value="unit">Unidade</option><option value="kit">Kit</option></select></div>
      <div><label>Quantidade</label><input id="sell-qty" type="number" value="1" /></div>
      <div><label>Unidades por kit</label><input id="sell-qtykit" type="number" value="1" /></div>
      <div><label>Valor total</label><input id="sell-total" type="number" value="0" /></div>
      <div><label>Cliente</label><input id="sell-client" /></div>
      <div><label>Status</label><select id="sell-status"><option>Pago</option><option>Pendente</option><option>Inadimplente</option><option>Parcial</option></select></div>
      <div><label>Valor pago (se parcial)</label><input id="sell-paid" type="number" value="0" /></div>
    `
    top.appendChild(form)
    const btn = el('button','btn','Registrar venda'); btn.onclick=()=>{
      try{
        const payload = { product_id: Number(q('#sell-product').value), type: q('#sell-type').value, qty: Number(q('#sell-qty').value||0), qty_per_kit: Number(q('#sell-qtykit').value||1), total: Number(q('#sell-total').value||0), client: q('#sell-client').value, status: q('#sell-status').value, paid: Number(q('#sell-paid').value||0) }
        if (!payload.product_id) return alert('Selecione o produto')
        recordSale(user, payload)
        renderSales()
      }catch(e){ alert(e.message) }
    }
    top.appendChild(btn); root.appendChild(top)

    const hist = el('div','card'); hist.appendChild(el('h4',null,'Histórico de vendas'))
    const list = el('div','list')
    for (const s of data.sales) list.appendChild(histItem(s,'sale',data))
    hist.appendChild(list); root.appendChild(hist)
  }

  function renderFinance(){
    const user = currentUser(); const data = getData(user)
    root.innerHTML = ''
    const c = el('div','card'); c.appendChild(el('h3',null,'Resumo Financeiro'))
    const f = el('div'); f.style.display='flex'; f.style.gap='8px'; f.innerHTML = '<input id="f-month" placeholder="Mês (MM)" style="width:100px"/><input id="f-year" placeholder="Ano (YYYY)" style="width:120px"/>'
    const btn = el('button','btn','Filtrar'); btn.onclick=()=>{ const m=q('#f-month').value; const y=q('#f-year').value; const r = financeSummary(user,m,y); renderFinanceResults(r); }
    c.appendChild(f); c.appendChild(btn); root.appendChild(c)
    renderFinanceResults(financeSummary(user))
  }

  function renderFinanceResults(r){
    // remove old results
    const old = root.querySelector('.finance-results'); if (old) old.remove()
    const res = el('div','card finance-results')
    res.innerHTML = `<div class="grid"><div class="card"><div class="muted">Total investido</div><h2>${toCurrency(r.invested)}</h2></div><div class="card"><div class="muted">Total vendido</div><h2>${toCurrency(r.sold)}</h2></div><div class="card"><div class="muted">Lucro bruto</div><h2 class="${r.profit>=0? 'success':''}">${toCurrency(r.profit)}</h2></div><div class="card"><div class="muted">Ticket médio</div><h2>${toCurrency(r.ticket)}</h2></div></div>`
    res.appendChild(el('h4',null,'Produtos mais vendidos'))
    const list = el('div','list')
    for (const t of r.top) list.appendChild(el('div','list-item',`${t.name} — ${t.qty}`))
    res.appendChild(list)
    root.appendChild(res)
  }

  function renderHistory(){
    const user = currentUser(); const data = getData(user)
    root.innerHTML = ''
    const c = el('div','card'); c.appendChild(el('h3',null,'Histórico / Contabilidade'))
    const f = el('div'); f.style.display='grid'; f.style.gridTemplateColumns='repeat(5,1fr)'; f.style.gap='8px'
    f.innerHTML = `<select id="h-type"><option value="all">Todos</option><option value="purchase">Compra</option><option value="sale">Venda</option></select><input id="h-product" placeholder="Produto (id)"/><input id="h-status" placeholder="Status"/><input id="h-month" placeholder="Mês (MM)"/><input id="h-year" placeholder="Ano (YYYY)"/>`
    const btn = el('button','btn','Filtrar'); btn.onclick=()=>{ const opts = { type: q('#h-type').value, product_id: q('#h-product').value, status: q('#h-status').value, month: q('#h-month').value, year: q('#h-year').value }; renderHistoryList(history(user,opts), data) }
    c.appendChild(f); c.appendChild(btn); root.appendChild(c)
    renderHistoryList(history(user,{}), data)
  }

  function renderHistoryList(items, data){
    const old = root.querySelector('.history-list'); if (old) old.remove()
    const box = el('div','card history-list')
    const list = el('div','list')
    for (const e of items) list.appendChild(histItem(e, e.kind, data))
    box.appendChild(list); root.appendChild(box)
  }

  function histItem(it, kind, data){
    const row = el('div','list-item')
    const left = el('div',null)
    left.innerHTML = `<strong>${kind.toUpperCase()}</strong> <div class="muted">${(new Date(it.datetime)).toLocaleString()}</div>`
    const right = el('div',null)
    const prodName = (data.products.find(p=>p.id==it.product_id)||{}).name || it.product_id
    right.innerHTML = `${prodName} — Qtd: ${it.qty} — ${toCurrency(it.total)} ${it.status? '<span class="muted">— '+it.status+'</span>':''}`
    row.appendChild(left); row.appendChild(right); return row
  }

  // --- Initialize ---
  seedUsers()
  // top brand click
  q('#nav-home').onclick = ()=> location.hash = '#/dashboard'
  window.addEventListener('hashchange', route)
  // initial route
  if (!location.hash) location.hash = '#/login'
  route()

  // expose small API for debugging
  window.NuxSell = { getData, users, seedUsers, createProduct, updateProduct, deleteProduct, recordPurchase, recordSale, financeSummary, history }
})();
