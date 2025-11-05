import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import socket from '../socket'

export default function Results() {
  const { code } = useParams()
  const me = localStorage.getItem('playerId')
  const [scores, setScores] = useState([])
  const [round, setRound] = useState(1)
  const [totalRounds, setTotalRounds] = useState(8)
  const [details, setDetails] = useState([])

  useEffect(()=>{
    const cached = sessionStorage.getItem('lastResults')
    if (cached) {
      try {
        const d = JSON.parse(cached)
        setScores(d.scores||[]); setRound(d.round); setTotalRounds(d.totalRounds); setDetails(d.details||[])
      } catch {}
    }
    const onShow = d=>{ setScores(d.scores||[]); setRound(d.round); setTotalRounds(d.totalRounds); setDetails(d.details||[]); sessionStorage.setItem('lastResults', JSON.stringify(d)) }
    socket.on('show-results', onShow)
    return ()=> socket.off('show-results', onShow)
  },[])

  const next = ()=> socket.emit('player-ready', { code, playerId: me })

  const my = details.find(d=>d.voterId===me)
  const status = my ? (my.correct ? 'You picked the correct answer! ✅' :
                       my.fooledBy ? 'You were fooled by another player 😅' :
                       'You picked a player’s answer.') : null
  const fooledByMe = details.filter(d=>d.targetId===me && d.voterId!==me).length

  return (
    <div className="card">
      <div className="top-icons"><span className="muted">R {round}/{totalRounds}</span></div>
      <h3>Results</h3>
      {status && <p className="muted">{status} {fooledByMe?`(${fooledByMe} voted your answer)`:''}</p>}
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
