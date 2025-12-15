import React, { useEffect, useState } from 'react'
import API from '../api'

export default function Products(){
  const [products, setProducts] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({name:'', sku:'', type:'unit', qty:0, price:0, avg_cost:0, min_stock:0})

  function load(){ API.getProducts().then(setProducts) }
  useEffect(()=>{ load() },[])

  function startCreate(){ setEditing(null); setForm({name:'', sku:'', type:'unit', qty:0, price:0, avg_cost:0, min_stock:0}) }
  function startEdit(p){ setEditing(p.id); setForm(p) }

  async function save(){
    if (editing) {
      await API.updateProduct(editing, form)
    } else {
      await API.createProduct(form)
    }
    load()
  }

  async function del(id){ if (!confirm('Excluir?')) return; await API.deleteProduct(id); load() }

  return (
    <div>
      <div className="header"><div style={{fontWeight:700}}>NuxSell</div><div></div></div>
      <div className="container">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h3>Produtos</h3>
          <div>
            <button className="btn" onClick={startCreate}>Novo produto</button>
          </div>
        </div>

        <div className="card">
          <div style={{display:'flex',gap:8}}>
            <input placeholder="Buscar..." style={{flex:1,padding:8}} />
          </div>

          <div className="list">
            {products.map(p=> (
              <div key={p.id} className="list-item">
                <div>
                  <div style={{fontWeight:600}}>{p.name} <span className="muted">({p.sku})</span></div>
                  <div className="muted">Estoque: {p.qty} {p.qty < p.min_stock ? <span className="danger">(abaixo do mínimo)</span> : null}</div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button className="btn" onClick={()=>startEdit(p)}>Editar</button>
                  <button className="btn" style={{background:'#ef4444'}} onClick={()=>del(p.id)}>Excluir</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{marginTop:12}}>
          <h4>{editing? 'Editar produto':'Novo produto'}</h4>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            <input placeholder="Nome" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
            <input placeholder="SKU" value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})} />
            <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
              <option value="unit">Unidade</option>
              <option value="kit">Kit</option>
            </select>
            <input type="number" placeholder="Quantidade" value={form.qty} onChange={e=>setForm({...form,qty:parseInt(e.target.value||0)})} />
            <input type="number" placeholder="Preço venda" value={form.price} onChange={e=>setForm({...form,price:parseFloat(e.target.value||0)})} />
            <input type="number" placeholder="Preço médio compra" value={form.avg_cost} onChange={e=>setForm({...form,avg_cost:parseFloat(e.target.value||0)})} />
            <input type="number" placeholder="Estoque mínimo" value={form.min_stock} onChange={e=>setForm({...form,min_stock:parseInt(e.target.value||0)})} />
          </div>
          <div style={{marginTop:8}}>
            <button className="btn" onClick={save}>Salvar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
