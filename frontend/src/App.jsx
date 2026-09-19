import { useState } from 'react'
import Dropzone from './components/Dropzone'
import ParseProgress, { useElapsed } from './components/ParseProgress'
import MaterialsTable from './components/MaterialsTable'
import ConditionsTable from './components/ConditionsTable'
import { parsePdf } from './api'
import { exportToXlsx } from './lib/xlsxExport'

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export default function App() {
  const [phase, setPhase] = useState('idle')
  const [file, setFile] = useState(null)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [startedAt, setStartedAt] = useState(null)
  const [elapsedFinal, setElapsedFinal] = useState(null)
  const ticking = useElapsed(startedAt)

  const run = async (f) => {
    if (!f) return
    setFile(f)
    setData(null)
    setError(null)
    setElapsedFinal(null)
    setStartedAt(performance.now())
    setPhase('parsing')
    try {
      const result = await parsePdf(f)
      setData(result)
      setElapsedFinal(performance.now() - (startedAt ?? performance.now()))
      setPhase('done')
    } catch (err) {
      setError(err.message || 'Unknown error')
      setElapsedFinal(performance.now() - (startedAt ?? performance.now()))
      setPhase('error')
    }
  }

  const reset = () => {
    setPhase('idle')
    setFile(null)
    setData(null)
    setError(null)
    setElapsedFinal(null)
    setStartedAt(null)
  }

  const elapsedMs = phase === 'parsing' ? ticking : elapsedFinal
  const elapsed = elapsedMs === null ? null : elapsedMs / 1000
  const busy = phase === 'parsing'
  const materialCount = data?.materials?.length ?? 0
  const conditionCount = data?.conditions?.length ?? 0

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><span>P</span></div>
          <div className="brand-name">
            Parse<span className="accent">PDF</span>
          </div>
        </div>
        <div className="meta">
          specimen extraction service
          <br />
          POST /parsefile/
        </div>
      </header>

      <section className="hero">
        <p className="kicker">Materials-science paper parser</p>
        <h1>Turn a paper into<br />structured data.</h1>
        <p className="lede">
          Feed in a PDF. Get back tables of material composition and compressive
          strength conditions — extracted by LLM, rendered for inspection.
        </p>
      </section>

      <div className="workbench">
        <div className={busy ? 'scanstage' : ''}>
          {busy && <div className="scanline" />}
          <Dropzone onFile={run} busy={busy} />
          {busy && <ParseProgress startedAt={startedAt} />}
        </div>

        <aside className="specimen-tray">
          <div className="tray-label">Workbench</div>
          <div className="tray-row">
            <span className="k">Specimen</span>
            <span className="v">{file ? file.name : '—'}</span>
          </div>
          <div className="tray-row">
            <span className="k">Mass</span>
            <span className="v">{file ? formatBytes(file.size) : '—'}</span>
          </div>
          <div className="tray-row">
            <span className="k">Status</span>
            <span className={`v ${phase === 'done' ? 'measure' : phase === 'error' ? 'accent' : ''}`}>
              {busy ? 'EXTRACTING' : phase === 'done' ? 'READY' : phase === 'error' ? 'FAILED' : 'IDLE'}
            </span>
          </div>
          <div className="tray-row">
            <span className="k">Latency</span>
            <span className="v">{elapsed === null ? '—' : `${elapsed.toFixed(1)}s`}</span>
          </div>
          <div className="tray-row">
            <span className="k">Materials</span>
            <span className="v">{materialCount}</span>
          </div>
          <div className="tray-row">
            <span className="k">Conditions</span>
            <span className="v">{conditionCount}</span>
          </div>

          {(phase === 'done' || phase === 'error' || phase === 'parsing') && (
            <button
              className="btn-ghost"
              style={{ borderColor: 'rgba(242,238,230,0.5)', color: 'var(--paper)' }}
              onClick={reset}
              disabled={busy}
            >
              New specimen
            </button>
          )}
          {busy && !file && <div className="tray-spinner" />}
          {!busy && (
            <p className="tray-note">
              Tables are read straight from the paper text; chart-only numbers are
              flagged low-confidence.
            </p>
          )}
        </aside>
      </div>

      {phase === 'error' && (
        <div className="error-panel">
          <p className="error-title">Extraction failed</p>
          <p className="error-msg">{error}</p>
          <p className="error-msg">
            Make sure the backend is running (<code>/parsefile/</code> via the Vite proxy
            on port 8000) and the PDF is a readable materials paper.
          </p>
          <button className="btn-ghost" onClick={reset}>Try again</button>
        </div>
      )}

      {phase === 'done' && data && (
        <div className="results">
          <div className="results-toolbar">
            <span className="results-toolbar-note">
              extraction complete · columns above adapt to the paper's tables
            </span>
            <button
              className="btn-export"
              onClick={() => exportToXlsx(data, file ? file.name : 'extraction')}
            >
              Export .xlsx
            </button>
          </div>

          <section className="section">
            <div className="section-head">
              <span className="section-index">01</span>
              <span className="section-title">Materials</span>
              <span className="section-count">{materialCount} rows</span>
            </div>
            <MaterialsTable rows={data.materials} />
          </section>

          <section className="section">
            <div className="section-head">
              <span className="section-index">02</span>
              <span className="section-title">Conditions</span>
              <span className="section-count">{conditionCount} rows</span>
            </div>
            <ConditionsTable rows={data.conditions} />
          </section>
        </div>
      )}

      <footer className="foot">
        <span>ParSE PDF · v0.1</span>
        <span>react-table · vite proxy → :8000</span>
      </footer>
    </div>
  )
}