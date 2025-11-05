import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AvatarUploader from '../components/AvatarUploader.jsx'
import { post } from '../lib/api'

export default function Home({ pushToast }) {
  const [name, setName] = useState(localStorage.getItem('name')||'')
  const [avatar, setAvatar] = useState(localStorage.getItem('avatar')||'')
  const [category, setCategory] = useState('acronyms')
  const [rounds, setRounds] = useState(8)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  const createRoom = async ()=>{
    if (!name.trim()) return pushToast('Enter your name')
    setBusy(true)
    try {
      const data = await post('/create-game', { playerName: name.trim(), category, rounds, avatarUrl: avatar||null })
      localStorage.setItem('name', name.trim())
      if (avatar) localStorage.setItem('avatar', avatar)
      localStorage.setItem('playerId', data.playerId)
      navigate(`/lobby/${data.gameCode}`)
    } catch (e) {
      pushToast('Could not create game')
    } finally { setBusy(false) }
  }

  const goJoin = ()=>{
    if (!name.trim()) return pushToast('Enter your name')
    localStorage.setItem('name', name.trim())
    if (avatar) localStorage.setItem('avatar', avatar)
    navigate('/join/----')
  }

  return (
    <div className="card">
      <h2>Welcome to PSYKOS</h2>
      <p className="muted">Premium mobile party game</p>

      <div className="grid">
        <input className="input" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} maxLength={16}/>
        <AvatarUploader value={avatar} onChange={setAvatar}/>

        <div className="grid cols-2">
          <div>
            <label className="muted">Category</label>
            <select className="input" value={category} onChange={e=>setCategory(e.target.value)}>
              <option value="acronyms">Acronyms</option>
              <option value="is-that-a-fact">Is That a Fact?</option>
              <option value="truth-comes-out">The Truth Comes Out</option>
              <option value="naked-truth">The Naked Truth (18+)</option>
              <option value="ice-breaker">Ice Breaker</option>
              <option value="search-history">Search History</option>
              <option value="who-among-us">Who Among Us</option>
              <option value="ridleys-think-fast">Ridley’s Think Fast</option>
              <option value="caption-this-image">Caption This (Image)</option>
            </select>
          </div>
          <div>
            <label className="muted">Rounds</label>
            <input className="input" type="number" min="3" max="20" value={rounds} onChange={e=>setRounds(parseInt(e.target.value||8,10))}/>
          </div>
        </div>

        <div className="actions">
          <button className="btn primary" onClick={createRoom} disabled={busy}>{busy?'Creating…':'Create Room'}</button>
          <button className="btn" onClick={goJoin}>Join existing</button>
        </div>
      </div>
    </div>
  )
}
