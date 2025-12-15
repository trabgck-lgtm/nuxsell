import React, { useEffect, useState } from 'react'
import API from '../api'

export default function Purchases(){
  const [products, setProducts] = useState([])
  const [purchases, setPurchases] = useState([])
  const [form, setForm] = useState({product_id:'', qty:1, qty_per_kit:1, type:'unit', total:0})

  useEffect(()=>{ load() },[])
  function load(){ API.getProducts().then(setProducts); API.getPurchases().then(setPurchases) }

  async function submit(){
    if (!form.product_id) return alert('Escolha um produto')
    await API.createPurchase(form)
    setForm({product_id:'', qty:1, qty_per_kit:1, type:'unit', total:0})
    load()
  }

  return (
    <div>
      <div className="header"><div style={{fontWeight:700,cursor:'pointer'}} onClick={()=>window.location.href='/dashboard'}>NuxSell</div><div></div></div>
      <div className="container">
        <h3>Compras</h3>
        <div className="card">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <select value={form.product_id} onChange={e=>setForm({...form,product_id:e.target.value})}>
              <option value="">-- selecione --</option>
              {products.map(p=> <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </select>
            <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
              <option value="unit">Unidade</option>
              <option value="kit">Kit</option>
            </select>
            <input type="number" value={form.qty} onChange={e=>setForm({...form,qty:parseInt(e.target.value||0)})} />
            <input type="number" value={form.qty_per_kit} onChange={e=>setForm({...form,qty_per_kit:parseInt(e.target.value||1)})} />
            <input type="number" value={form.total} onChange={e=>setForm({...form,total:parseFloat(e.target.value||0)})} />
            <div></div>
          </div>
          <div style={{marginTop:8}}><button className="btn" onClick={submit}>Registrar compra</button></div>
        </div>

        <div className="card" style={{marginTop:12}}>
          <h4>Histórico de compras</h4>
          <div className="list">
            {purchases.map(p=> (
              <div key={p.id} className="list-item">
                <div>{p.datetime} <div className="muted">Produto: {p.product_id}</div></div>
                <div>Qtd: {p.qty} — R$ {p.total.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
