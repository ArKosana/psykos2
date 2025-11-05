import React from 'react'
export default function Toasts({ toasts }) {
  return (
    <div className="toasts">
      {toasts.map(t=> <div key={t.id} className="toast">{t.msg}</div>)}
    </div>
  )
}
