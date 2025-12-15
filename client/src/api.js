const API = (function(){
  const base = '/api'
  function authHeaders(){
    const token = localStorage.getItem('token')
    return token ? { 'Authorization': 'Bearer ' + token } : {}
  }

  return {
    login: (username, password) => fetch(base + '/auth/login', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username,password})}).then(r=>r.json()),
    getProducts: ()=> fetch(base + '/products', { headers: {...authHeaders()} }).then(r=>r.json()),
    createProduct: (p)=> fetch(base + '/products', {method:'POST', headers:{'Content-Type':'application/json', ...authHeaders()}, body: JSON.stringify(p)}).then(r=>r.json()),
    updateProduct: (id,p)=> fetch(base + '/products/' + id, {method:'PUT', headers:{'Content-Type':'application/json', ...authHeaders()}, body: JSON.stringify(p)}).then(r=>r.json()),
    deleteProduct: (id)=> fetch(base + '/products/' + id, {method:'DELETE', headers:{ ...authHeaders()}}).then(r=>r.json()),
    getDashboard: ()=> Promise.all([fetch(base + '/products', {headers:{...authHeaders()}}).then(r=>r.json()), fetch(base + '/purchases', {headers:{...authHeaders()}}).then(r=>r.json()), fetch(base + '/sales', {headers:{...authHeaders()}}).then(r=>r.json())]),
    // purchases
    getPurchases: ()=> fetch(base + '/purchases', { headers: {...authHeaders()} }).then(r=>r.json()),
    createPurchase: (p)=> fetch(base + '/purchases', {method:'POST', headers:{'Content-Type':'application/json', ...authHeaders()}, body: JSON.stringify(p)}).then(r=>r.json()),
    // sales
    getSales: ()=> fetch(base + '/sales', { headers: {...authHeaders()} }).then(r=>r.json()),
    createSale: (s)=> fetch(base + '/sales', {method:'POST', headers:{'Content-Type':'application/json', ...authHeaders()}, body: JSON.stringify(s)}).then(r=>r.json()),
    // history & finance
    getHistory: (query='')=> fetch(base + '/history' + (query?('?'+query):''), { headers: {...authHeaders()} }).then(r=>r.json()),
    getFinance: (query='')=> fetch(base + '/finance' + (query?('?'+query):''), { headers: {...authHeaders()} }).then(r=>r.json())
  }
})()

export default API
