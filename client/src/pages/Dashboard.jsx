import React, { useEffect, useState } from 'react'
import API from '../api'
import { Link, useNavigate } from 'react-router-dom'

export default function Dashboard(){
  const [cards, setCards] = useState({stock:0, invested:0, sold:0, profit:0})
  const nav = useNavigate()

  useEffect(()=>{
    API.getDashboard().then(([products, purchases, sales])=>{
      const stock = products.reduce((s,p)=>s + (p.qty || 0), 0)
      const invested = purchases.reduce((s,p)=>s + (p.total||0), 0)
      const sold = sales.reduce((s,sale)=>s + (sale.total||0), 0)
      const profit = sold - invested
      setCards({stock, invested, sold, profit})
    })
  },[])

  function logout(){ localStorage.removeItem('token'); nav('/login') }

  return (
    <div>
      <div className="header"><div style={{fontWeight:700,cursor:'pointer'}} onClick={()=>nav('/dashboard')}>NuxSell</div><div><button className="btn" onClick={logout}>Logout</button></div></div>
      <div className="container">
        <div className="grid">
          <div className="card"><div className="muted">Estoque total</div><h2>{cards.stock}</h2></div>
          <div className="card"><div className="muted">Total investido</div><h2>R$ {cards.invested.toFixed(2)}</h2></div>
          <div className="card"><div className="muted">Total vendido</div><h2>R$ {cards.sold.toFixed(2)}</h2></div>
          <div className="card"><div className="muted">Lucro bruto</div><h2 className={cards.profit>=0? 'success':'danger'}>R$ {cards.profit.toFixed(2)}</h2></div>
        </div>

        <div className="card" style={{marginTop:12}}>
          <h3>Atalhos</h3>
          <div style={{display:'flex',gap:8}}>
            <Link to="/products"><button className="btn">Produtos</button></Link>
            <Link to="/purchases"><button className="btn">Compras</button></Link>
            <Link to="/sales"><button className="btn">Vendas</button></Link>
            <Link to="/finance"><button className="btn">Resumo Financeiro</button></Link>
            <Link to="/history"><button className="btn">Histórico</button></Link>
          </div>
        </div>
      </div>
    </div>
  )
}
