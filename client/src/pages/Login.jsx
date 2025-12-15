import React, { useState } from 'react'
import API from '../api'
import { useNavigate } from 'react-router-dom'

export default function Login(){
  const [user,setUser] = useState('')
  const [pass,setPass] = useState('')
  const [err,setErr] = useState('')
  const nav = useNavigate()

  async function submit(e){
    e.preventDefault()
    const res = await API.login(user, pass)
    if (res.token){
      localStorage.setItem('token', res.token)
      nav('/dashboard')
    } else {
      setErr(res.error || 'Login failed')
    }
  }

  return (
    <div>
      <div className="header"> <div style={{fontWeight:700}}>NuxSell</div></div>
      <div className="container" style={{maxWidth:420, margin:'40px auto'}}>
        <div className="card">
          <h3>Login</h3>
          <form onSubmit={submit}>
            <div style={{marginBottom:8}}>
              <input placeholder="Usuário" value={user} onChange={e=>setUser(e.target.value)} style={{width:'100%',padding:8}} />
            </div>
            <div style={{marginBottom:8}}>
              <input placeholder="Senha" type="password" value={pass} onChange={e=>setPass(e.target.value)} style={{width:'100%',padding:8}} />
            </div>
            {err && <div className="muted" style={{marginBottom:8,color:'#b91c1c'}}>{err}</div>}
            <button className="btn" type="submit">Entrar</button>
          </form>
          <div className="muted" style={{marginTop:12}}>Usuários pré-cadastrados: <br/>maduxsell / Manumadu2021<br/>guixsell / 34226905Gui</div>
        </div>
      </div>
    </div>
  )
}
