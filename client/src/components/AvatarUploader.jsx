// client/src/components/AvatarUploader.jsx
import React, { useRef, useState } from 'react'
import { API_BASE } from '../lib/api'

export default function AvatarUploader({ value, onChange }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)

  const pick = () => inputRef.current?.click()

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { alert('Please select an image'); return }
    if (file.size > 2 * 1024 * 1024) { alert('Max 2MB'); return }

    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('avatar', file)
      const res = await fetch(`${API_BASE}/upload/avatar`, { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.url) throw new Error(data?.error || 'Upload failed')
      onChange?.(data.url)
    } catch (err) {
      console.error('upload', err)
      alert(err.message || 'Upload failed')
    } finally {
      setBusy(false)
      // allow re-selecting same file
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="avatar-uploader" style={{ display:'flex', alignItems:'center', gap:12 }}>
      <div
        className="bubble"
        style={{ width:56, height:56, borderRadius:'50%', overflow:'hidden', background:'#1b2330', display:'grid', placeItems:'center', cursor:'pointer' }}
        onClick={pick}
        title="Upload avatar"
      >
        {value ? <img src={value} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }}/> : '📷'}
      </div>
      <button className="btn" type="button" onClick={pick} disabled={busy}>
        {busy ? 'Uploading…' : 'Choose Avatar'}
      </button>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onFile} />
    </div>
  )
}
