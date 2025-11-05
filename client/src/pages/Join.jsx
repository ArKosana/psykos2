import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { post } from '../lib/api'
import AvatarUploader from '../components/AvatarUploader'

export default function Join({ pushToast }) {
  const { code } = useParams()
  const [room, setRoom] = useState(code==='----'?'':code)
  const [name, setName] = useState(localStorage.getItem('name')||'')
  const [avatar, setAvatar] = useState(localStorage.getItem('avatar')||'')
  const navigate = useNavigate()

  const join = async ()=>{
    if (!name.trim()) return pushToast('Enter your name')
    if (!room.trim() || room.trim().length<3) return pushToast('Enter a valid code')
    try {
      const data = await post('/join-game', { code: room.trim().toUpperCase(), playerName: name.trim(), avatarUrl: avatar||null })
      localStorage.setItem('name', name.trim())
      if (avatar) localStorage.setItem('avatar', avatar)
      localStorage.setItem('playerId', data.playerId)
      navigate(`/lobby/${room.trim().toUpperCase()}`)
    } catch(e) { pushToast('Unable to join. Check code.') }
  }

  return (
    <div className="card">
      <h2>Join a Room</h2>
      <div className="grid">
        <input className="input" placeholder="Room code" value={room} onChange={e=>setRoom(e.target.value.toUpperCase())} maxLength={4}/>
        <input className="input" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} maxLength={16}/>
        <AvatarUploader value={avatar} onChange={setAvatar}/>
        <button className="btn primary" onClick={join}>Join</button>
      </div>
    </div>
  )
}
