import React, { useEffect, useState } from 'react'
import API from '../api'

export default function History(){
  const [entries, setEntries] = useState([])
  const [filters, setFilters] = useState({type:'all', product_id:'', status:'', month:'', year:''})

  function qp(){
    const qs = []
    for (const k of Object.keys(filters)) if (filters[k]) qs.push(`${k}=${encodeURIComponent(filters[k])}`)
    return qs.join('&')
  }

  function load(){ API.getHistory(qp()).then(setEntries) }
  useEffect(()=>{ load() },[])

  return (
    <div>
      <div className="header"><div style={{fontWeight:700,cursor:'pointer'}} onClick={()=>window.location.href='/dashboard'}>NuxSell</div><div></div></div>
      <div className="container">
        <h3>Histórico / Contabilidade</h3>
        <div className="card">
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8}}>
            <select value={filters.type} onChange={e=>setFilters({...filters,type:e.target.value})}><option value="all">Todos</option><option value="purchase">Compra</option><option value="sale">Venda</option></select>
            <input placeholder="Produto (id)" value={filters.product_id} onChange={e=>setFilters({...filters,product_id:e.target.value})} />
            <input placeholder="Status" value={filters.status} onChange={e=>setFilters({...filters,status:e.target.value})} />
            <input placeholder="Mês (MM)" value={filters.month} onChange={e=>setFilters({...filters,month:e.target.value})} />
            <input placeholder="Ano (YYYY)" value={filters.year} onChange={e=>setFilters({...filters,year:e.target.value})} />
          </div>
          <div style={{marginTop:8}}><button className="btn" onClick={load}>Filtrar</button></div>
        </div>

        <div className="card" style={{marginTop:12}}>
          <div className="list">
            {entries.map(e=> (
              <div key={e.kind + '-' + e.id} className="list-item">
                <div><strong>{e.kind.toUpperCase()}</strong> <div className="muted">{e.datetime}</div></div>
                <div>{e.product_id} — Qtd: {e.qty} — R$ {e.total.toFixed(2)} {e.status ? <span className="muted">— {e.status}</span>:null}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
