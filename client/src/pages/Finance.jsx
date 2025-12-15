import React, { useEffect, useState } from 'react'
import API from '../api'

export default function Finance(){
  const [filters, setFilters] = useState({month:'', year:''})
  const [data, setData] = useState(null)

  useEffect(()=>{ load() },[])
  function qp(){
    const qs = []
    if (filters.month) qs.push('month=' + filters.month)
    if (filters.year) qs.push('year=' + filters.year)
    return qs.join('&')
  }

  function load(){ API.getFinance(qp()).then(setData) }

  return (
    <div>
      <div className="header"><div style={{fontWeight:700,cursor:'pointer'}} onClick={()=>window.location.href='/dashboard'}>NuxSell</div><div></div></div>
      <div className="container">
        <h3>Resumo Financeiro</h3>
        <div className="card">
          <div style={{display:'flex',gap:8}}>
            <input placeholder="Mês (MM)" value={filters.month} onChange={e=>setFilters({...filters,month:e.target.value})} />
            <input placeholder="Ano (YYYY)" value={filters.year} onChange={e=>setFilters({...filters,year:e.target.value})} />
            <button className="btn" onClick={load}>Filtrar</button>
          </div>
        </div>

        {data && (
          <div className="grid" style={{marginTop:12}}>
            <div className="card"><div className="muted">Total investido</div><h2>R$ {data.invested.toFixed(2)}</h2></div>
            <div className="card"><div className="muted">Total vendido</div><h2>R$ {data.sold.toFixed(2)}</h2></div>
            <div className="card"><div className="muted">Lucro bruto</div><h2 className={data.profit>=0? 'success':'danger'}>R$ {data.profit.toFixed(2)}</h2></div>
            <div className="card"><div className="muted">Ticket médio</div><h2>R$ {data.ticket.toFixed(2)}</h2></div>
          </div>
        )}

        {data && (
          <div className="card" style={{marginTop:12}}>
            <h4>Produtos mais vendidos</h4>
            <div className="list">
              {data.top.map(t=> (
                <div key={t.id} className="list-item"><div>{t.name}</div><div>{t.sold_qty}</div></div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
