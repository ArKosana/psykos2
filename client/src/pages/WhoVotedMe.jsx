import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import socket from '../socket'

export default function WhoVotedMe() {
  const { code } = useParams()
  const [summary, setSummary] = useState([])
  const [topTargetId, setTopTargetId] = useState(null)
  const [required, setRequired] = useState(0)
  const me = localStorage.getItem('playerId')
  const [choices, setChoices] = useState([])

  useEffect(()=>{
    socket.on('who-guess-phase', (p)=>{
      setSummary(p.summary||[])
      setTopTargetId(p.topTargetId||null)
      const myVotes = p.summary.find(s=>s.playerId===me)?.votes || 0
      const targetId = myVotes>0 ? me : p.topTargetId
      const req = p.summary.find(s=>s.playerId===targetId)?.votes || 0
      setRequired(req)
    })
    return ()=> socket.off('who-guess-phase')
  },[])

  const toggle = (pid)=>{
    setChoices(prev=>{
      if (prev.includes(pid)) return prev.filter(x=>x!==pid)
      if (prev.length>=required) return prev
      return [...prev, pid]
    })
  }
  const submit = ()=>{
    socket.emit('submit-vote', { code, voterId: me, targetId: choices[0] || me }) // simplified
  }

  const players = summary.filter(s=>s.playerId!==me)

  return (
    <div className="card">
      <h3>Who Voted Me</h3>
      <p>Select exactly {required} player(s)</p>
      <div className="answer-list">
        {players.map(p=>(
          <div key={p.playerId} className={`answer-item clickable ${choices.includes(p.playerId)?'selected':''}`} onClick={()=>toggle(p.playerId)}>
            {p.name}
          </div>
        ))}
      </div>
      <div className="actions">
        <button className="btn primary" onClick={submit} disabled={choices.length!==required}>Submit</button>
      </div>
    </div>
  )
}
