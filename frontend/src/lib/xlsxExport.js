import * as XLSX from 'xlsx'

const PCTS = ['0pct', '5pct', '10pct', '15pct', '20pct', '25pct', '30pct']
const AGES = ['7d', '28d']

const METAL_COLS = [
  'd10', 'd50', 'd75', 'd90', 'd100',
  'blaine', 'amorphous_phase_pct',
  'specific_gravity',
  'SiO2', 'Al2O3', 'Fe2O3', 'CaO', 'MgO', 'SO3', 'Na2O', 'K2O', 'LOI',
]

const STRENGTH_COLS = AGES.flatMap((age) =>
  ['mpa', 'pctcontrol'].flatMap((suffix) =>
    PCTS.map((p) => `strength_${age}_${p}_${suffix}`)
  )
)

export const DESIRED_COLUMNS = [
  'file_name',
  'paper_title',
  'year',
  'source_or_type',
  'material_analyzed',
  'condition_id',
  'specimen_type',
  'mix_type',
  'concrete_grade_mpa',
  ...METAL_COLS,
  'wb_ratio',
  'admixture_type',
  'admixture_dosage_pct',
  ...STRENGTH_COLS,
]

function findPct(map, pct) {
  if (!map || typeof map !== 'object') return undefined
  const aliases = [pct, `${pct}`, `${pct.replace('pct', '')}`, `${pct.replace('pct', '')}%`]
  for (const a of aliases) {
    if (Object.prototype.hasOwnProperty.call(map, a)) return map[a]
  }
  return undefined
}

function toNum(v) {
  if (v === null || v === undefined || v === '') return undefined
  if (typeof v === 'number') return v
  const n = Number(v)
  return Number.isFinite(n) ? n : v
}

function pick(obj, key) {
  const v = obj ? obj[key] : undefined
  return v === null || v === undefined ? '' : v
}

function matchMaterial(materials, name) {
  if (!Array.isArray(materials) || materials.length === 0) return null
  if (name) {
    const hit = materials.find(
      (m) => String((m && m.material_analyzed) || '').toLowerCase() === String(name).toLowerCase()
    )
    if (hit) return hit
  }
  return materials.length === 1 ? materials[0] : null
}

export function buildRows({ response, fileName }) {
  const paper = (response && response.paper) || {}
  const materials = Array.isArray(response && response.materials) ? response.materials : []
  const conditions = Array.isArray(response && response.conditions) ? response.conditions : []

  const rawName = (fileName || '').replace(/\.(pdf|xlsx)$/i, '')
  const fileBase = paper.file_name || rawName || fileName || ''

  return conditions.map((cond) => {
    const mat = matchMaterial(materials, cond.material_analyzed)
    const row = {}
    row.file_name = fileBase
    row.paper_title = pick(paper, 'paper_title')
    row.year = pick(paper, 'year')
    row.source_or_type = pick(paper, 'source_or_type')
    row.material_analyzed = pick(mat || cond, 'material_analyzed')
    row.condition_id = pick(cond, 'condition_id')
    row.specimen_type = pick(cond, 'specimen_type')
    row.mix_type = pick(cond, 'mix_type')
    row.concrete_grade_mpa = pick(cond, 'concrete_grade_mpa')
    METAL_COLS.forEach((c) => {
      row[c] = pick(mat, c)
    })
    row.wb_ratio = pick(cond, 'wb_ratio')
    row.admixture_type = pick(cond, 'admixture_type')
    row.admixture_dosage_pct = pick(cond, 'admixture_dosage_pct')

    for (const age of AGES) {
      const mpaMap = cond[`strength_${age}_mpa`]
      const base = toNum(findPct(mpaMap, '0pct'))
      PCTS.forEach((p) => {
        const v = toNum(findPct(mpaMap, p))
        row[`strength_${age}_${p}_mpa`] = v ?? ''
        const pctControl =
          v !== undefined && base !== undefined && base > 0
            ? Math.round((v / base) * 100 * 100) / 100
            : ''
        row[`strength_${age}_${p}_pctcontrol`] = pctControl
      })
    }

    return DESIRED_COLUMNS.map((c) => row[c])
  })
}

function buildRawRows(response) {
  const rows = [{ section: 'paper', index: '', data: response && response.paper }]
  const materials = (response && response.materials) || []
  const conditions = (response && response.conditions) || []
  materials.forEach((m, i) => rows.push({ section: 'material', index: i, data: m }))
  conditions.forEach((c, i) => rows.push({ section: 'condition', index: i, data: c }))
  if (materials.length === 0 && conditions.length === 0) {
    rows.push({ section: 'response', index: '', data: response })
  }
  return rows.map((r) => ({
    section: r.section,
    index: r.index,
    json: JSON.stringify(r.data ?? null),
  }))
}

export function exportToXlsx(response, fileName) {
  const baseName = (fileName || 'extraction').replace(/\.(pdf|xlsx)$/i, '')
  const wb = XLSX.utils.book_new()

  const sheet = XLSX.utils.aoa_to_sheet([DESIRED_COLUMNS, ...buildRows({ response, fileName })])
  XLSX.utils.book_append_sheet(wb, sheet, 'desired_schema')

  const raw = XLSX.utils.json_to_sheet(buildRawRows(response))
  XLSX.utils.book_append_sheet(wb, raw, 'raw_extraction')

  XLSX.writeFile(wb, `${baseName}.xlsx`)
}