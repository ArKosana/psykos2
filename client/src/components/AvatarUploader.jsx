import React, { useRef, useState } from 'react'
import { API_BASE } from '../lib/api'

export default function AvatarUploader({ value, onChange }) {
  const ref = useRef()
  const [busy, setBusy] = useState(false)
  const open = ()=> ref.current?.click()

  const pick = async (e)=>{
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return alert('Please select an image')
    if (file.size > 2*1024*1024) return alert('Max 2MB')

    const form = new FormData()
    form.append('avatar', file)
    setBusy(true)
    try {
      const res = await fetch(`${API_BASE}/upload/avatar`, { method:'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Upload failed')
      onChange?.(data.url)
    } catch (e) {
      alert(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="players" style={{marginBottom:8}}>
        <div className="bubble" style={{height:72,width:72,cursor:'pointer'}} onClick={open}>
          {value ? <img src={value} alt="avatar"/> : <span>+</span>}
        </div>
      </div>
      <button className="btn" onClick={open} disabled={busy}>{busy?'Uploading...':'Upload Avatar'}</button>
      <input type="file" ref={ref} onChange={pick} accept="image/*" style={{display:'none'}}/>
    </div>
  )
}
