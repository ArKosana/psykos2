import React, { useEffect } from 'react'

export default function NotificationSystem({ items = [], onDone }) {
  useEffect(() => {
    if (!items?.length) return
    const timers = items.map(n =>
      setTimeout(() => onDone?.(n.id), 2200)
    )
    return () => timers.forEach(clearTimeout)
  }, [items, onDone])

  if (!items?.length) return null

  return (
    <div style={{
      position: 'fixed',
      right: 12,
      bottom: 'calc(env(safe-area-inset-bottom) + 80px)',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      zIndex: 60
    }}>
      {items.map(n => (
        <div key={n.id}
          style={{
            background: '#0f141b',
            border: '1px solid rgba(255,255,255,.12)',
            color: '#e8edf3',
            padding: '10px 12px',
            borderRadius: 12,
            boxShadow: '0 6px 24px rgba(0,0,0,.35)',
            maxWidth: 280,
            fontSize: 13
          }}>
          {n.msg}
        </div>
      ))}
    </div>
  )
}
