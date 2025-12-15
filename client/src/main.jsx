import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Purchases from './pages/Purchases'
import Sales from './pages/Sales'
import Finance from './pages/Finance'
import History from './pages/History'
import './styles.css'

function App() {
  const token = localStorage.getItem('token')
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login/>} />
        <Route path="/dashboard" element={token ? <Dashboard/> : <Navigate to="/login" />} />
        <Route path="/products" element={token ? <Products/> : <Navigate to="/login" />} />
        <Route path="/purchases" element={token ? <Purchases/> : <Navigate to="/login" />} />
        <Route path="/sales" element={token ? <Sales/> : <Navigate to="/login" />} />
        <Route path="/finance" element={token ? <Finance/> : <Navigate to="/login" />} />
        <Route path="/history" element={token ? <History/> : <Navigate to="/login" />} />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')).render(<App />)
