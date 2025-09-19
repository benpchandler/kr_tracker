import React from 'react'
import { useDispatch } from '../state/store'

export function TeamAdder() {
  const dispatch = useDispatch()
  const [name, setName] = React.useState('')
  return (
    <div className="row" style={{ gap: 8 }}>
      <input type="text" placeholder="Team name" value={name} onChange={(e) => setName(e.target.value)} />
      <button onClick={() => {
        const n = name.trim()
        if (!n) return
        dispatch({ type: 'ADD_TEAM', team: { id: `team-${Date.now()}`, name: n } })
        setName('')
      }}>Add Team</button>
    </div>
  )
}

