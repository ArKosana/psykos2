import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Lobby from './pages/Lobby'
import Game from './pages/Game'
import Results from './pages/Results'

export default function App() {
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
            <Route path="/home" element={<Home />} />
            <Route path="/join/:code" element={<Home />} />
            <Route path="/lobby/:code" element={<Lobby />} />
            <Route path="/game/:code" element={<Game />} />
            <Route path="/results/:code" element={<Results />} />
            <Route path="/over/:code" element={<div className="card"><h3>Game Over</h3></div>} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}
