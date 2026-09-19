export function isMap(v) {
  return (
    v !== null &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    Object.keys(v).length > 0
  )
}

export function numOrDash(v, digits) {
  if (v === null || v === undefined || v === '') return <span className="null-cell">–</span>
  const n = Number(v)
  if (typeof v === 'number' && Number.isFinite(n)) {
    return typeof digits === 'number' ? n.toFixed(digits) : n
  }
  return v
}

export function strengthChips(map) {
  if (!isMap(map)) return <span className="null-cell">–</span>
  const entries = Object.entries(map).sort(
    (a, b) => parseFloat(a[0]) - parseFloat(b[0])
  )
  return (
    <div className="strength-chips">
      {entries.map(([k, v]) => (
        <span className="chip" key={k}>
          <b>{String(k).replace('pct', '%')}</b> → {typeof v === 'number' ? Number(v).toFixed(2) : v}
        </span>
      ))}
    </div>
  )
}

export function humanizeKey(key) {
  let m
  if ((m = key.match(/^strength_(\d+)d_mpa$/))) return `f₍c₎ ${m[1]}d (MPa)`
  if ((m = key.match(/^strength_(\d+)d_pctcontrol$/))) return `f₍c₎ ${m[1]}d (%control)`
  if ((m = key.match(/^flexural_(\d+)d_mpa$/))) return `Flexural ${m[1]}d (MPa)`
  if ((m = key.match(/^modulus_(\d+)d_mpa$/))) return `Modulus ${m[1]}d (MPa)`
  return key
    .split('_')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ')
}

export function genericCell(v) {
  if (v === null || v === undefined || v === '') return <span className="null-cell">–</span>
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'number') return Number.isFinite(v) ? v : String(v)
  if (isMap(v)) return strengthChips(v)
  if (typeof v === 'string') return v
  return JSON.stringify(v)
}

export function isNumericCol(rows, key) {
  for (const r of rows) {
    const v = r && r[key]
    if (typeof v === 'number') return true
    if (v !== null && v !== undefined && !isMap(v)) return false
  }
  return false
}

export function orderConditionExtras(keys) {
  const rank = (k) =>
    k.startsWith('strength_') ? 0 : k.startsWith('flexural_') ? 1 : k.startsWith('modulus_') ? 2 : 3
  const age = (k) => {
    const m = k.match(/_(\d+)d_/)
    return m ? Number(m[1]) : 999
  }
  return [...keys].sort((a, b) => rank(a) - rank(b) || age(a) - age(b) || a.localeCompare(b))
}