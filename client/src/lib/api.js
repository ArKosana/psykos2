const API = import.meta.env.VITE_API_URL || 'http://localhost:5174' // EDIT ME
export async function post(path, body) {
  const res = await fetch(`${API}${path}`, {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
export const API_BASE = API
