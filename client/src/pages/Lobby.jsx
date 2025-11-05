import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import socket from '../socket'

const HOWTO = {
  'acronyms': 'You will see an acronym (e.g., NASA). Type a believable expansion. The real one is mixed in. 10 points for picking the real one; 20 points for fooling others.',
  'is-that-a-fact': 'You will see a seed word (e.g., pig). Type a believable fact. The real fact is mixed in. 10 points for picking the real one; 20 for fooling others.',
  'truth-comes-out': 'Question about a random player. That player writes the true answer. Others guess. AI scores closeness 1–10.',
  'naked-truth': '18+ version of Truth Comes Out.',
  'ice-breaker': 'Open prompts. Write your best answer. Group votes best answer (+10).',
  'search-history': 'Complete the search (e.g., “what is white…”). Group votes best completion (+10).',
  'who-among-us': 'Vote who fits the description. Then guess who voted for you (+10 per correct).',
  'ridleys-think-fast': 'Rapid prompts. Short answers. Vote fast (+10).',
  'caption-this-image': 'You get an image. Write the funniest caption. Vote (+10).'
}

export default function Lobby({ pushToast }) {
  const { code } = useParams()
  const [players, setPlayers] = useState([])
  const [category, setCategory] = useState('acronyms')
  const [isHost, setIsHost] = useState(false)
  const [showLeave, setShowLeave] = useState(false)
  const [readyCount, setReadyCount] = useState({ count:0, total:0 })
  const navigate = useNavigate()
  const me = localStorage.getItem('playerId')

  useEffect(()=>{
    if (!me) { navigate(`/join/${code}`); return }
    socket.connect()
    socket.emit('join-live', { code, playerId: me })

    socket.on('players-updated', (pls)=> {
      // pls objects should include .avatarUrl on server; we normalize to .avatar for UI
      const norm = (pls||[]).map(p=>({ ...p, avatar: p.avatar || p.avatarUrl }))
      setPlayers(norm)
      setIsHost(!!norm.find(p=>p.id===me && p.isHost))
    })
    socket.on('game-started', ()=> navigate(`/game/${code}`))
    socket.on('game-state', s=> { setCategory(s.category) })
    socket.on('lobby-ready-count', setReadyCount)
    socket.on('toast', pushToast); socket.on('notice', pushToast)
    socket.on('kicked', ()=> { alert('You were kicked'); navigate('/home') })
    socket.on('left-success', ({goHome})=> navigate(goHome?'/home':`/lobby/${code}`))
    socket.on('game-aborted-to-lobby', ()=> navigate(`/lobby/${code}`))

    return ()=> {
      socket.off('players-updated'); socket.off('game-started'); socket.off('game-state')
      socket.off('lobby-ready-count'); socket.off('toast'); socket.off('notice')
      socket.off('kicked'); socket.off('left-success'); socket.off('game-aborted-to-lobby')
    }
  },[code])

  const share = ()=>{
    const url = `${location.origin}/join/${code}`
    navigator.clipboard.writeText(url)
    pushToast('Join link copied')
  }
  const start = ()=> { if (isHost) socket.emit('start-game', code) }
  const ready = (v)=> socket.emit('lobby-ready', { code, playerId: me, ready: v })
  const leaveToHome = ()=> { setShowLeave(false); socket.emit('leave-game', { code, playerId: me, goHome:true }) }
  const leaveToLobby = ()=> { setShowLeave(false); socket.emit('leave-game', { code, playerId: me, goHome:false }) }

  const kickMenu = ()=>{
    const others = players.filter(p=>p.id!==me)
    const name = prompt('Kick who? Enter exact name:\n' + others.map(p=>p.name).join('\n'))
    const target = others.find(p=>p.name===name)
    if (target) socket.emit('kick-player', { code, hostId: me, targetId: target.id })
  }

  const canStart = (readyCount.count===readyCount.total) && players.length>=2

  return (
    <div className="card">
      <div className="top-icons">
        <button className="icon-btn" title="Menu" onClick={()=>setShowLeave(true)}>☰</button>
        <div style={{marginLeft:'auto', display:'flex', gap:8}}>
          <button className="icon-btn" title="Share" onClick={share}>🔗</button>
          {isHost && <button className="icon-btn" title="Start" onClick={start} disabled={!canStart}>▶️</button>}
          {isHost && <button className="icon-btn" title="Kick" onClick={kickMenu}>⛔</button>}
        </div>
      </div>

      <h2 style={{marginTop:8, marginBottom:4}}>Lobby — {code}</h2>
      <p className="muted" style={{marginTop:0}}>Category: {category}</p>

      <div className="players">
        {players.map(p=>(
          <div key={p.id} className="player-col">
            <div className="bubble">{p.avatar ? <img src={p.avatar} alt={p.name}/> : (p.name?.[0]||'?').toUpperCase()}</div>
            <div className="player-name">{p.name}{p.isHost?' ⭐':''}</div>
          </div>
        ))}
      </div>

      <div className="howto" style={{marginTop:12}}>
        <details>
          <summary>How to play</summary>
          <p className="muted" style={{marginTop:8}}>{HOWTO[category] || 'Have fun!'}</p>
        </details>
      </div>

      <div className="ready-row">
        <button className="btn" onClick={()=>ready(true)}>✅ Ready</button>
        <button className="btn ghost" onClick={()=>ready(false)}>❌ Not Ready</button>
        <div className="muted">{readyCount.count}/{readyCount.total} ready</div>
      </div>

      {showLeave && (
        <div className="sheet">
          <div className="sheet-card">
            <h4>Menu</h4>
            <div className="actions">
              <button className="btn" onClick={leaveToLobby}>Leave to Lobby</button>
              <button className="btn danger" onClick={leaveToHome}>Leave to Home</button>
            </div>
            <button className="btn ghost" onClick={()=>setShowLeave(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
