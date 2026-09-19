import { useCallback, useRef, useState } from 'react'

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export default function Dropzone({ onFile, busy }) {
  const inputRef = useRef(null)
  const [drag, setDrag] = useState(false)
  const [selected, setSelected] = useState(null)

  const accept = useCallback((file) => {
    setSelected(file)
    onFile(file)
  }, [onFile])

  const onDragOver = (e) => {
    e.preventDefault()
    if (!busy) setDrag(true)
  }
  const onDragLeave = () => setDrag(false)
  const onDrop = (e) => {
    e.preventDefault()
    setDrag(false)
    if (busy) return
    const file = e.dataTransfer.files && e.dataTransfer.files[0]
    if (file) accept(file)
  }

  return (
    <div
      className={['dropzone-shell', drag && !busy ? 'drag' : ''].filter(Boolean).join(' ')}
      onClick={() => !busy && inputRef.current && inputRef.current.click()}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className={['dropzone', drag && !busy ? 'drag' : ''].filter(Boolean).join(' ')}>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => {
            const file = e.target.files && e.target.files[0]
            if (file) accept(file)
            e.target.value = ''
          }}
        />
        {busy ? (
          <div className="inner">
            <div className="label-main">Extracting…</div>
            <div className="file-name">{selected && selected.name}</div>
            <div className="file-size">{selected && formatBytes(selected.size)}</div>
          </div>
        ) : selected ? (
          <div className="inner">
            <div className="icon">▤</div>
            <div className="file-name">{selected.name}</div>
            <div className="file-size">{formatBytes(selected.size)}</div>
            <button className="btn-run" onClick={(e) => { e.stopPropagation(); onFile(selected) }}>
              Parse specimen
            </button>
          </div>
        ) : (
          <div className="inner">
            <div className="icon">+</div>
            <div className="label-main">Drop specimen PDF</div>
            <div className="label-sub">or click to browse · materials-science papers preferred</div>
          </div>
        )}
      </div>
    </div>
  )
}