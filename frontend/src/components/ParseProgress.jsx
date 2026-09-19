import { useEffect, useState } from 'react'

const STEPS = [
  'Reading pages',
  'Locating tables',
  'Extracting composition',
  'Composing JSON',
]

export function useElapsed(startedAt) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!startedAt) return
    const id = setInterval(() => setElapsed(performance.now() - startedAt), 80)
    return () => clearInterval(id)
  }, [startedAt])
  return elapsed
}

export default function ParseProgress({ startedAt }) {
  const elapsed = useElapsed(startedAt)
  const stepIdx = Math.min(
    STEPS.length - 1,
    Math.floor(elapsed / (STEPS.length * 650))
  )

  return (
    <div className="progress-box">
      <p className="progress-title">
        LLM extraction · {(elapsed / 1000).toFixed(1)}s
      </p>
      <ul className="progress-steps">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={i < stepIdx ? 'done' : i === stepIdx ? 'on' : ''}
          >
            <span className="dot" />
            {label}
          </li>
        ))}
      </ul>
    </div>
  )
}