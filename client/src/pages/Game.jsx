import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import socket from '../socket'

export default function Game({ pushToast }) {
  const { code } = useParams()
  const me = localStorage.getItem('playerId')
  const [state, setState] = useState('playing')
  const [question, setQuestion] = useState('')
  const [round, setRound] = useState(1)
  const [totalRounds, setTotalRounds] = useState(8)
  const [answer, setAnswer] = useState('')
  const [answers, setAnswers] = useState([])
  const [skip, setSkip] = useState({ skipVotes:0, totalPlayers:0 })
  const [submitted, setSubmitted] = useState(false)
  const [voteSubmitted, setVoteSubmitted] = useState(false)
  const [answerCount, setAnswerCount] = useState({ submitted:0, total:0 })
  const [voteCount, setVoteCount] = useState({ count:0, total:0 })
  const [showLeave, setShowLeave] = useState(false)
  const navigate = useNavigate()

  useEffect(()=>{
    socket.on('game-started', d=> { setState('playing'); setRound(d.round); setTotalRounds(d.totalRounds); setQuestion(d.question); setSubmitted(false); setVoteSubmitted(false); setAnswer('') })
    socket.on('next-round', d=> { setState('playing'); setRound(d.round); setQuestion(d.question); setSubmitted(false); setVoteSubmitted(false); setAnswer('') })
    socket.on('start-voting', d=> { setState('voting'); setAnswers(d.answers||[]); setQuestion(d.question); setVoteSubmitted(false) })
    socket.on('answer-count-update', c=> setAnswerCount(c))
    socket.on('vote-count-update', c=> setVoteCount(c))
    socket.on('skip-votes-update', s=> setSkip(s))
    socket.on('show-results', d=> { sessionStorage.setItem('lastResults', JSON.stringify(d)); navigate(`/results/${code}`) })
    socket.on('game-over', ()=> navigate(`/over/${code}`))
    socket.on('game-state', s=> { if (s.currentPrompt) setQuestion(s.currentPrompt); if (s.state) setState(s.state); if (s.round) setRound(s.round); if (s.totalRounds) setTotalRounds(s.totalRounds) })
    socket.on('notice', pushToast)
    return ()=> { socket.off('game-started'); socket.off('next-round'); socket.off('start-voting'); socket.off('answer-count-update'); socket.off('vote-count-update'); socket.off('skip-votes-update'); socket.off('show-results'); socket.off('game-over'); socket.off('game-state'); socket.off('notice') }
  },[])

  const submit = ()=>{
    if (!answer.trim()) return
    socket.emit('submit-answer', { code, playerId: me, text: answer.trim() })
    setSubmitted(true)
  }
  const vote = (targetId)=>{
    if (targetId===me) return
    socket.emit('submit-vote', { code, voterId: me, targetId })
    setVoteSubmitted(true)
  }
  const skipQ = ()=> socket.emit('skip-question', { code, playerId: me })
  const leaveToLobby = ()=> { setShowLeave(false); socket.emit('leave-game', { code, playerId: me, goHome:false }) }
  const leaveToHome = ()=> { setShowLeave(false); socket.emit('leave-game', { code, playerId: me, goHome:true }) }

  const filteredAnswers = answers.filter(a => a.playerId==='CORRECT' || a.playerId!==me)

  if (state==='who-guess') return <div className="card"><h3>Preparing…</h3></div>

  return (
    <div className="card">
      <div className="top-icons">
        <button className="icon-btn" title="Menu" onClick={()=>setShowLeave(true)}>☰</button>
        <span className="muted" style={{marginLeft:'auto'}}>R {round}/{totalRounds}</span>
      </div>

      <div className="question">{question || '…'}</div>

      {state==='playing' ? (
        submitted ? (
          <div className="waiting">
            <h3>Waiting for others…</h3>
            <p className="muted">{answerCount.submitted}/{answerCount.total} answered</p>
            <button className="btn small" onClick={skipQ}>⤼ Skip ({skip.skipVotes}/{skip.totalPlayers})</button>
          </div>
        ) : (
          <>
            <textarea className="input" rows="4" placeholder="Type your answer…" value={answer} onChange={e=>setAnswer(e.target.value)} />
            <div className="actions">
              <button className="btn primary" onClick={submit} disabled={!answer.trim()}>Submit</button>
              <button className="btn" onClick={skipQ}>⤼ Skip ({skip.skipVotes}/{skip.totalPlayers})</button>
            </div>
          </>
        )
      ) : state==='voting' ? (
        voteSubmitted ? (
          <div className="waiting">
            <h3>Waiting for votes…</h3>
            <p className="muted">{voteCount.count}/{voteCount.total} voted</p>
          </div>
        ) : (
          <>
            <h3>Vote:</h3>
            <div className="answer-list">
              {filteredAnswers.map((a,i)=>(
                <div key={i} className="answer-item clickable" onClick={()=>vote(a.playerId)}>
                  <div>{a.answer}</div>
                </div>
              ))}
            </div>
          </>
        )
      ) : null}

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
