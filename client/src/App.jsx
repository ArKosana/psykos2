import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Lobby from './pages/Lobby'
import Game from './pages/Game'
import Results from './pages/Results'
import WalkieTalkie from './components/WalkieTalkie'
import NotificationSystem from './components/NotificationSystem.jsx' // <— explicit .jsx

export default function App() {
  const [toasts, setToasts] = React.useState([])
  const pushToast = (msg)=> setToasts(t=>[...t,{ id:Date.now(), msg }])

  const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
  const inRoom = /^\/(lobby|game|results|over)\//.test(pathname)

  return (
    <BrowserRouter>
      <div className="main-content" style={{ padding: 16, maxWidth: 920, margin: '0 auto' }}>
        <header className="header">
          <div className="brand">PSYKOS</div>
          <div className="tagline">by Kosana</div>
        </header>

        <div style={{ marginTop: 16 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/home" />} />
            <Route path="/home" element={<Home pushToast={pushToast} />} />
            <Route path="/join/:code" element={<Home pushToast={pushToast} />} />
            <Route path="/lobby/:code" element={<Lobby pushToast={pushToast} />} />
            <Route path="/game/:code" element={<Game pushToast={pushToast} />} />
            <Route path="/results/:code" element={<Results pushToast={pushToast} />} />
            <Route path="/over/:code" element={<div className="card"><h3>Game Over</h3></div>} />
          </Routes>
        </div>

        {/* Mic only when in a room */}
        {inRoom && <div className="walkie-talkie-fixed"><WalkieTalkie /></div>}

        <NotificationSystem items={toasts} onDone={(id)=>setToasts(t=>t.filter(x=>x.id!==id))}/>
      </div>
    </BrowserRouter>
  )
}
