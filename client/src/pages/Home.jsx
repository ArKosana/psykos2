import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { post } from '../lib/api'
import AvatarUploader from '../components/AvatarUploader'

export default function Home({ pushToast }) {
  const [name, setName] = useState(localStorage.getItem('playerName') || '')
  const [code, setCode] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem('avatarUrl') || '')
  const [category, setCategory] = useState(localStorage.getItem('category') || 'acronyms')
  const [rounds, setRounds] = useState(Number(localStorage.getItem('rounds') || 8))
  const [busyCreate, setBusyCreate] = useState(false)
  const [busyJoin, setBusyJoin] = useState(false)
  const navigate = useNavigate()
  const [params] = useSearchParams()

  // If opened via share link: /join/ABCD or ?code=ABCD
  useEffect(()=>{
    const paramCode = params.get('code')
    if (paramCode) setCode(paramCode.toUpperCase())
    // hide any in-room-only UI from Home
  }, [])

  // Persist basics locally so refreshes keep UX
  const persistBasics = () => {
    localStorage.setItem('playerName', name.trim())
    if (avatarUrl) localStorage.setItem('avatarUrl', avatarUrl)
    localStorage.setItem('category', category)
    localStorage.setItem('rounds', String(rounds))
  }

  const onCreate = async () => {
    if (!name.trim()) return pushToast('Enter your name')
    setBusyCreate(true)
    try {
      persistBasics()
      const body = { playerName: name.trim(), category, rounds, avatarUrl: avatarUrl || null }
      const res = await post('/create-game', body)
      // Store identifiers for later
      localStorage.setItem('playerId', res.playerId)
      localStorage.setItem('gameCode', res.gameCode)
      // Go to lobby route that uses code param
      navigate(`/lobby/${res.gameCode}`)
    } catch (e) {
      console.error(e)
      pushToast(e.message || 'Could not create room')
    } finally {
      setBusyCreate(false)
    }
  }

  const onJoin = async () => {
    if (!name.trim()) return pushToast('Enter your name')
    if (!code.trim() || code.trim().length !== 4) return pushToast('Enter a valid 4-letter code')
    setBusyJoin(true)
    try {
      persistBasics()
      const body = { code: code.trim().toUpperCase(), playerName: name.trim(), avatarUrl: avatarUrl || null }
      const res = await post('/join-game', body)
      localStorage.setItem('playerId', res.playerId)
      localStorage.setItem('gameCode', code.trim().toUpperCase())
      // If a game is already running, we still route to lobby; server will sync you
      navigate(`/lobby/${code.trim().toUpperCase()}`)
    } catch (e) {
      console.error(e)
      pushToast(e.message || 'Could not join room')
    } finally {
      setBusyJoin(false)
    }
  }

  return (
    <div className="card" style={{ maxWidth: 560, margin: '0 auto' }}>
      <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:12 }}>
        <h1 className="brand" style={{ margin:0 }}>PSYKOS</h1>
        <span className="tagline">by Kosana</span>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
        <AvatarUploader value={avatarUrl} onChange={(url)=>{ setAvatarUrl(url); localStorage.setItem('avatarUrl', url) }} />
        <input
          className="input"
          placeholder="Your name"
          value={name}
          onChange={e=>setName(e.target.value)}
          maxLength={20}
          style={{ flex:1 }}
        />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div>
          <label className="muted" style={{ fontSize:12 }}>Category</label>
          <select className="input" value={category} onChange={e=>setCategory(e.target.value)}>
            <option value="acronyms">Acronyms</option>
            <option value="is-that-a-fact">Is That a Fact?</option>
            <option value="truth-comes-out">The Truth Comes Out</option>
            <option value="naked-truth">The Naked Truth (18+)</option>
            <option value="ice-breaker">Ice Breaker</option>
            <option value="search-history">Search History</option>
            <option value="who-among-us">Who Among Us</option>
            <option value="ridleys-think-fast">Ridley&apos;s Think Fast</option>
            <option value="caption-this-image">Caption This (Image)</option>
          </select>
        </div>
        <div>
          <label className="muted" style={{ fontSize:12 }}>Rounds</label>
          <select className="input" value={rounds} onChange={e=>setRounds(Number(e.target.value))}>
            {[6,8,10,12].map(r=><option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginTop:14 }}>
        <button className="btn primary" onClick={onCreate} disabled={busyCreate}>
          {busyCreate ? 'Creating…' : 'Create Room'}
        </button>
        <button className="btn" onClick={onJoin} disabled={busyJoin}>
          {busyJoin ? 'Joining…' : 'Join Room'}
        </button>
      </div>

      <div style={{ display:'flex', gap:8, marginTop:10 }}>
        <input
          className="input"
          placeholder="Enter 4-letter code"
          value={code}
          onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g,''))}
          maxLength={4}
          style={{ width: 200 }}
        />
        <button className="btn" onClick={()=>{ navigator.clipboard.writeText(`${location.origin}/join/${code || 'XXXX'}`); pushToast('Join link copied') }}>
          Share Link
        </button>
      </div>

      <p className="muted" style={{ marginTop:14, fontSize:12 }}>
        Tip: Share link lets friends join on the same page without going back.
      </p>
    </div>
  )
}
