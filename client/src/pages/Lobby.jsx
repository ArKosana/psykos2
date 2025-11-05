import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import socket from '../socket'

export default function Lobby({ pushToast }) {
  const { code } = useParams()
  const [players, setPlayers] = useState([])
  const [category, setCategory] = useState('ice-breaker')
  const [isHost, setIsHost] = useState(false)
  const [showLeave, setShowLeave] = useState(false)
  const navigate = useNavigate()
  const me = localStorage.getItem('playerId')

  useEffect(()=>{
    if (!me) { navigate(`/join/${code}`); return }
    socket.connect()
    socket.emit('join-live', { code, playerId: me })
    socket.on('players-updated', (pls)=> { setPlayers(pls); setIsHost(!!pls.find(p=>p.id===me && p.isHost)) })
    socket.on('game-started', ()=> navigate(`/game/${code}`))
    socket.on('game-state', s=> { setCategory(s.category) })
    socket.on('toast', pushToast); socket.on('notice', pushToast)
    socket.on('kicked', ()=> { alert('You were kicked'); navigate('/home') })
    socket.on('left-success', ({goHome})=> navigate(goHome?'/home':`/lobby/${code}`))
    socket.on('game-aborted-to-lobby', ()=> navigate(`/lobby/${code}`))
    return ()=> { socket.off('players-updated'); socket.off('game-started'); socket.off('game-state'); socket.off('toast'); socket.off('notice'); socket.off('kicked'); socket.off('left-success'); socket.off('game-aborted-to-lobby') }
  },[code])

  const share = ()=>{
    const url = `${location.origin}/join/${code}`
    navigator.clipboard.writeText(url)
    pushToast('Join link copied')
  }
  const start = ()=> { if (isHost) socket.emit('start-game', code) }
  const leaveToHome = ()=> { setShowLeave(false); socket.emit('leave-game', { code, playerId: me, goHome:true }) }
  const leaveToLobby = ()=> { setShowLeave(false); socket.emit('leave-game', { code, playerId: me, goHome:false }) }
  const kick = (pid)=> { if (isHost && pid!==me) socket.emit('kick-player', { code, hostId: me, targetId: pid }) }

  const canStart = players.length >= 2

  return (
    <div className="card">
      <div className="top-icons">
        <button className="icon-btn" title="Share" onClick={share}>🔗</button>
        {isHost && <button className="icon-btn" title="Start" onClick={start} disabled={!canStart}>▶️</button>}
        <button className="icon-btn" title="Leave" onClick={()=>setShowLeave(true)}>⎋</button>
      </div>

      <h2>Lobby — {code}</h2>
      <p className="muted">Category: {category}</p>

      <div className="players">
        {players.map(p=>(
          <div key={p.id} className="player-col">
            <div className="bubble">{p.avatar ? <img src={p.avatar}/> : (p.name?.[0]||'?').toUpperCase()}</div>
            <div className="player-name">{p.name}{p.isHost?' ⭐':''}</div>
            {isHost && p.id!==me && <button className="btn ghost small" onClick={()=>kick(p.id)}>Kick</button>}
          </div>
        ))}
      </div>
      {!canStart && <p className="muted">Need at least 2 players to start.</p>}

      {showLeave && (
        <div className="sheet">
          <div className="sheet-card">
            <h4>Leave</h4>
            <div className="actions">
              <button className="btn" onClick={leaveToLobby}>To Lobby</button>
              <button className="btn danger" onClick={leaveToHome}>To Home</button>
            </div>
            <button className="btn ghost" onClick={()=>setShowLeave(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
