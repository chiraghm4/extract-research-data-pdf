import { useMemo } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { genericCell, humanizeKey, isMap, isNumericCol, numOrDash } from '../lib/format'

const OXIDES = [
  'SiO2', 'Al2O3', 'Fe2O3', 'CaO',
  'MgO', 'SO3', 'Na2O', 'K2O', 'LOI',
]

const OXIDE_LABELS = {
  SiO2: 'SiO₂',
  Al2O3: 'Al₂O₃',
  Fe2O3: 'Fe₂O₃',
  CaO: 'CaO',
  MgO: 'MgO',
  SO3: 'SO₃',
  Na2O: 'Na₂O',
  K2O: 'K₂O',
  LOI: 'L.O.I.',
}

const CORE = new Set([
  'material_analyzed',
  'specific_gravity',
  'blaine',
  'd10', 'd50', 'd75', 'd90', 'd100',
  'amorphous_phase_pct',
  ...OXIDES,
  'particle_size_note',
])

function buildColumns(rows) {
  const defs = [
    {
      header: 'Material',
      accessorKey: 'material_analyzed',
      cell: (i) =>
        i.getValue() ? <span className="main-name">{i.getValue()}</span> : <span className="null-cell">–</span>,
    },
    {
      header: 'S.G.',
      accessorKey: 'specific_gravity',
      meta: { numeric: true },
      cell: (i) => <span className="measure-cell">{numOrDash(i.getValue(), 2)}</span>,
    },
    {
      header: 'Blaine',
      accessorKey: 'blaine',
      cell: (i) => numOrDash(i.getValue()),
    },
    ['d10', 'd50', 'd75', 'd90', 'd100'].map((k) => ({
      header: k,
      accessorKey: k,
      meta: { numeric: true },
      cell: (i) => numOrDash(i.getValue()),
    })),
    {
      header: 'Amorphous (%)',
      accessorKey: 'amorphous_phase_pct',
      meta: { numeric: true },
      cell: (i) => numOrDash(i.getValue()),
    },
    OXIDES.map((k) => ({
      header: OXIDE_LABELS[k],
      accessorKey: k,
      meta: { numeric: true },
      cell: (i) => numOrDash(i.getValue()),
    })),
    {
      header: 'Particle size',
      accessorKey: 'particle_size_note',
      cell: (i) =>
        i.getValue() ? (
          <div style={{ whiteSpace: 'normal', minWidth: 200, maxWidth: 260 }}>
            {i.getValue()}
          </div>
        ) : (
          <span className="null-cell">–</span>
        ),
    },
  ].flat()

  const extras = []
  rows.forEach((r) => {
    Object.keys(r || {}).forEach((k) => {
      if (!CORE.has(k) && !extras.includes(k)) extras.push(k)
    })
  })

  const extraDefs = extras.map((k) => ({
    header: humanizeKey(k),
    accessorKey: k,
    meta: { numeric: isNumericCol(rows, k) },
    cell: (i) => genericCell(i.getValue()),
  }))

  return [...defs, ...extraDefs]
}

export default function MaterialsTable({ rows }) {
  const data = useMemo(() => rows ?? [], [rows])
  const columns = useMemo(() => {
    const build = buildColumns(data)
    return build.filter((c) => {
      if (c.accessorKey === 'blaine' || ['d10', 'd50', 'd75', 'd90', 'd100'].includes(c.accessorKey)) {
        return data.some((r) => r && r[c.accessorKey] !== null && r[c.accessorKey] !== undefined)
      }
      if (data.some((r) => r && isMap(r[c.accessorKey]) && c.accessorKey !== 'particle_size_note')) return false
      return true
    })
  }, [data])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (data.length === 0) {
    return <div className="empty-note">No materials extracted from this paper.</div>
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          {table.getHeaderGroups().map((g) => (
            <tr key={g.id}>
              {g.headers.map((h) => (
                <th key={h.id} className={h.column.columnDef.meta?.numeric ? 'numeric' : ''}>
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, i) => (
            <tr key={row.id} style={{ animationDelay: `${Math.min(i, 14) * 30}ms` }}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className={cell.column.columnDef.meta?.numeric ? 'numeric' : ''}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}