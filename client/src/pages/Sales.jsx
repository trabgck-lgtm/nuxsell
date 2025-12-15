import React, { useEffect, useState } from 'react'
import API from '../api'

export default function Sales(){
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [form, setForm] = useState({product_id:'', qty:1, qty_per_kit:1, type:'unit', total:0, client:'', status:'Pago', paid:0})

  useEffect(()=>{ load() },[])
  function load(){ API.getProducts().then(setProducts); API.getSales().then(setSales) }

  async function submit(){
    if (!form.product_id) return alert('Escolha um produto')
    const res = await API.createSale(form)
    if (res.error) return alert(res.error)
    setForm({product_id:'', qty:1, qty_per_kit:1, type:'unit', total:0, client:'', status:'Pago', paid:0})
    load()
  }

  return (
    <div>
      <div className="header"><div style={{fontWeight:700,cursor:'pointer'}} onClick={()=>window.location.href='/dashboard'}>NuxSell</div><div></div></div>
      <div className="container">
        <h3>Vendas</h3>
        <div className="card">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <select value={form.product_id} onChange={e=>setForm({...form,product_id:e.target.value})}>
              <option value="">-- selecione --</option>
              {products.map(p=> <option key={p.id} value={p.id}>{p.name} ({p.sku}) - Estoque: {p.qty}</option>)}
            </select>
            <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
              <option value="unit">Unidade</option>
              <option value="kit">Kit</option>
            </select>
            <input type="number" value={form.qty} onChange={e=>setForm({...form,qty:parseInt(e.target.value||0)})} />
            <input type="number" value={form.qty_per_kit} onChange={e=>setForm({...form,qty_per_kit:parseInt(e.target.value||1)})} />
            <input type="number" value={form.total} onChange={e=>setForm({...form,total:parseFloat(e.target.value||0)})} />
            <input placeholder="Cliente" value={form.client} onChange={e=>setForm({...form,client:e.target.value})} />
            <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
              <option>Pago</option>
              <option>Pendente</option>
              <option>Inadimplente</option>
              <option>Parcial</option>
            </select>
            <input type="number" value={form.paid} onChange={e=>setForm({...form,paid:parseFloat(e.target.value||0)})} placeholder="Valor pago (se parcial)" />
          </div>
          <div style={{marginTop:8}}><button className="btn" onClick={submit}>Registrar venda</button></div>
        </div>

        <div className="card" style={{marginTop:12}}>
          <h4>Histórico de vendas</h4>
          <div className="list">
            {sales.map(s=> (
              <div key={s.id} className="list-item">
                <div>{s.datetime} <div className="muted">Produto: {s.product_id}</div></div>
                <div>Qtd: {s.qty} — R$ {s.total.toFixed(2)} — <span className="muted">{s.status}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
