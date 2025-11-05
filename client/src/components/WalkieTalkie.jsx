import React, { useEffect, useRef, useState } from 'react'
import socket from '../socket'

export default function WalkieTalkie() {
  const [ready, setReady] = useState(false)
  const [talking, setTalking] = useState(false)
  const [lock, setLock] = useState(false)
  const streamRef = useRef(null)
  const ctxRef = useRef(null)
  const procRef = useRef(null)

  useEffect(()=>{
    const prime = async ()=> {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation:true, noiseSuppression:true } })
        streamRef.current = s
        setReady(true)
      } catch {
        setReady(false)
      }
    }
    const once = ()=>{ window.removeEventListener('touchstart', once); window.removeEventListener('mousedown', once); prime() }
    window.addEventListener('touchstart', once, { passive:true })
    window.addEventListener('mousedown', once)
    return ()=> { window.removeEventListener('touchstart', once); window.removeEventListener('mousedown', once) }
  },[])

  const start = async ()=>{
    if (!streamRef.current || talking) return
    const ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint:'interactive' })
    const src = ctx.createMediaStreamSource(streamRef.current)
    const proc = ctx.createScriptProcessor(2048,1,1)
    proc.onaudioprocess = (e)=>{
      const f = e.inputBuffer.getChannelData(0)
      const buf = new ArrayBuffer(f.length*2)
      const view = new DataView(buf)
      for (let i=0;i<f.length;i++) {
        let s = Math.max(-1, Math.min(1, f[i]))
        view.setInt16(i*2, s<0? s*0x8000 : s*0x7fff, true)
      }
      socket.emit('voice-data', buf)
    }
    src.connect(proc); proc.connect(ctx.destination)
    ctxRef.current = ctx; procRef.current = proc
    setTalking(true); socket.emit('voice-start')
  }
  const stop = ()=>{
    if (procRef.current) try{procRef.current.disconnect()}catch{}
    if (ctxRef.current) try{ctxRef.current.close()}catch{}
    procRef.current=null; ctxRef.current=null
    if (talking) socket.emit('voice-end'); setTalking(false)
  }

  const pressDown = ()=> { if (!lock) start() }
  const pressUp = ()=> { if (!lock) stop() }
  const toggleLock = ()=> {
    const next = !lock; setLock(next)
    if (next) start(); else stop()
  }

  useEffect(()=>{
    const ac = new (window.AudioContext || window.webkitAudioContext)()
    let script = ac.createScriptProcessor(2048,1,1)
    const queue = []
    script.onaudioprocess = (e)=>{
      const out = e.outputBuffer.getChannelData(0)
      if (queue.length) {
        const data = new Int16Array(queue.shift())
        for (let i=0;i<out.length;i++) out[i] = (i<data.length? data[i]/0x7fff : 0)
      } else out.fill(0)
    }
    script.connect(ac.destination)
    const onData = ({data})=> queue.push(data)
    socket.on('voice-start', ()=>{})
    socket.on('voice-data', onData)
    socket.on('voice-end', ()=>{})
    return ()=> {
      socket.off('voice-data', onData)
      try{script.disconnect()}catch{}
      try{ac.close()}catch{}
    }
  },[])

  return (
    <div className="ptt"
      onMouseDown={pressDown} onMouseUp={pressUp} onMouseLeave={pressUp}
      onTouchStart={pressDown} onTouchEnd={pressUp}
    >
      <div className="ptt-indicator" style={{opacity: talking?1:.7}}/>
      <button className={`ptt-btn ${talking?'speaking':''}`} disabled={!ready}>{talking?'TALKING…':'HOLD TO TALK'}</button>
      <button className={`ptt-lock ${lock?'active':''}`} onClick={toggleLock} disabled={!ready}>{lock?'UNLOCK':'LOCK'}</button>
    </div>
  )
}
