import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import socket from '../socket'

export default function Results({ pushToast }) {
  const { code } = useParams()
  const me = localStorage.getItem('playerId')
  const [scores, setScores] = useState([])
  const [round, setRound] = useState(1)
  const [totalRounds, setTotalRounds] = useState(8)
  const [details, setDetails] = useState([])
  const [players, setPlayers] = useState([])
  const [ready, setReady] = useState({ count:0, total:0 })

  useEffect(()=>{
    const cached = sessionStorage.getItem('lastResults')
    if (cached) {
      try { const d = JSON.parse(cached); setScores(d.scores||[]); setRound(d.round); setTotalRounds(d.totalRounds); setDetails(d.details||[]) } catch {}
    }
    socket.on('show-results', d=>{ setScores(d.scores||[]); setRound(d.round); setTotalRounds(d.totalRounds); setDetails(d.details||[]); sessionStorage.setItem('lastResults', JSON.stringify(d)) })
    socket.on('players-updated', setPlayers)
    socket.on('ready-count-update', setReady)
    return ()=> { socket.off('show-results'); socket.off('players-updated'); socket.off('ready-count-update') }
  },[])

  const next = ()=> socket.emit('player-ready', { code, playerId: me })

  const nameOf = (id)=> players.find(p=>p.id===id)?.name || 'Someone'
  const mePick = details.find(d=>d.voterId===me)
  const fooledByMeNames = details.filter(d=>d.targetId===me && d.voterId!==me).map(d=>nameOf(d.voterId))
  const iWasFooledBy = mePick?.fooledBy && mePick.fooledBy!=='CORRECT' ? nameOf(mePick.fooledBy) : null

  return (
    <div className="card">
      <div className="top-icons">
        <span className="muted">R {round}/{totalRounds}</span>
        <span className="muted" style={{marginLeft:'auto'}}>{ready.count}/{ready.total} ready</span>
      </div>

      <h3>Results</h3>
      {mePick && mePick.correct && <p className="muted">You picked the correct answer ✅</p>}
      {iWasFooledBy && <p className="muted">You were fooled by <strong>{iWasFooledBy}</strong> 😅</p>}
      {!!fooledByMeNames.length && <p className="muted">You fooled: <strong>{fooledByMeNames.join(', ')}</strong></p>}

      <div className="answer-list" style={{marginTop:8}}>
        {scores.map(s=>(
          <div key={s.playerId} className="answer-item">{s.name} — <strong>{s.score}</strong></div>
        ))}
      </div>
      <div className="actions" style={{marginTop:12}}>
        <button className="btn primary" onClick={next}>Ready</button>
      </div>
    </div>
  )
}
