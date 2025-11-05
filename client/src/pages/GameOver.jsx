import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import socket from '../socket'

export default function GameOver() {
  const { code } = useParams()
  const [scores, setScores] = useState([])
  const navigate = useNavigate()

  useEffect(()=>{
    socket.on('game-over', d=> setScores(d.scores||[]))
    return ()=> socket.off('game-over')
  },[])

  const rematch = ()=> navigate(`/home`)

  const exportCsv = ()=>{
    const lines = ['Name,Score', ...scores.map(s=>`${s.name},${s.score}`)]
    const blob = new Blob([lines.join('\n')], {type:'text/csv'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'scores.csv'; a.click()
  }

  return (
    <div className="card">
      <h2>Game Over</h2>
      <div className="answer-list">
        {scores.map(s=>(
          <div key={s.playerId} className="answer-item">{s.name} — <strong>{s.score}</strong></div>
        ))}
      </div>
      <div className="actions" style={{marginTop:12}}>
        <button className="btn" onClick={exportCsv}>Export Scores</button>
        <button className="btn primary" onClick={rematch}>Rematch</button>
      </div>
    </div>
  )
}
