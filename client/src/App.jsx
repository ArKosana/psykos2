import React from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Join from './pages/Join.jsx'
import Lobby from './pages/Lobby.jsx'
import Game from './pages/Game.jsx'
import Results from './pages/Results.jsx'
import GameOver from './pages/GameOver.jsx'
import Toasts from './components/Toasts.jsx'
import WalkieTalkie from './components/WalkieTalkie.jsx'

export default function App() {
  const [toasts, setToasts] = React.useState([])
  const loc = useLocation()
  const showPTT = /^\/(lobby|game|results)/.test(loc.pathname)

  const pushToast = (msg, type='info')=>{
    const id = crypto.randomUUID()
    setToasts(t=>[...t,{id,msg,type}])
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)), 3500)
  }

  return (
    <div className="app-shell">
      <header className="header">
        <div className="brand">
          PSYKOS <span className="tagline">by Kosana</span>
        </div>
      </header>
      <main className="main-content">
        <Routes>
          <Route path="/home" element={<Home pushToast={pushToast} />} />
          <Route path="/join/:code" element={<Join pushToast={pushToast} />} />
          <Route path="/lobby/:code" element={<Lobby pushToast={pushToast} />} />
          <Route path="/game/:code" element={<Game pushToast={pushToast} />} />
          <Route path="/results/:code" element={<Results pushToast={pushToast} />} />
          <Route path="/over/:code" element={<GameOver pushToast={pushToast} />} />
          <Route path="*" element={<Home pushToast={pushToast}/>} />
        </Routes>
      </main>

      {showPTT && <div className="walkie-talkie-fixed"><WalkieTalkie/></div>}
      <Toasts toasts={toasts}/>
    </div>
  )
}
