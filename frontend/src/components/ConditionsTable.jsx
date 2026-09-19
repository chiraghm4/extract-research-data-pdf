import { useMemo } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  genericCell,
  humanizeKey,
  isMap,
  isNumericCol,
  numOrDash,
  orderConditionExtras,
  strengthChips,
} from '../lib/format'

const CORE = new Set([
  'condition_id',
  'material_analyzed',
  'specimen_type',
  'mix_type',
  'concrete_grade_mpa',
  'wb_ratio',
  'admixture_type',
  'admixture_dosage_pct',
  'data_source',
  'low_confidence',
])

function buildColumns(rows) {
  const defs = [
    {
      header: 'Condition',
      accessorKey: 'condition_id',
      cell: (i) =>
        i.getValue() ? <span className="cond-id">{i.getValue()}</span> : <span className="null-cell">–</span>,
    },
    {
      header: 'Material',
      accessorKey: 'material_analyzed',
      cell: (i) =>
        i.getValue() ? <span className="main-name">{i.getValue()}</span> : <span className="null-cell">–</span>,
    },
    { header: 'Specimen', accessorKey: 'specimen_type', cell: (i) => numOrDash(i.getValue()) },
    { header: 'Mix', accessorKey: 'mix_type', cell: (i) => numOrDash(i.getValue()) },
    {
      header: 'Grade (MPa)',
      accessorKey: 'concrete_grade_mpa',
      meta: { numeric: true },
      cell: (i) => numOrDash(i.getValue()),
    },
    {
      header: 'w/b',
      accessorKey: 'wb_ratio',
      meta: { numeric: true },
      cell: (i) => numOrDash(i.getValue()),
    },
    { header: 'Admixture', accessorKey: 'admixture_type', cell: (i) => numOrDash(i.getValue()) },
    {
      header: 'Dosage (%)',
      accessorKey: 'admixture_dosage_pct',
      meta: { numeric: true },
      cell: (i) => numOrDash(i.getValue()),
    },
  ]

  const extras = []
  rows.forEach((r) => {
    Object.keys(r || {}).forEach((k) => {
      if (!CORE.has(k) && !extras.includes(k)) extras.push(k)
    })
  })

  const extraDefs = orderConditionExtras(extras).map((k) => ({
    header: humanizeKey(k),
    accessorKey: k,
    meta: { numeric: isNumericCol(rows, k) && !isMap(rows[0] && rows[0][k]) },
    cell: (i) => (isMap(i.getValue()) ? strengthChips(i.getValue()) : genericCell(i.getValue())),
  }))

  return [
    ...defs,
    ...extraDefs,
    { header: 'Source', accessorKey: 'data_source', cell: (i) => numOrDash(i.getValue()) },
    {
      header: 'Confidence',
      accessorKey: 'low_confidence',
      cell: (i) =>
        i.getValue() ? <span className="badge low">low conf.</span> : <span className="null-cell">–</span>,
    },
  ]
}

export default function ConditionsTable({ rows }) {
  const data = useMemo(() => rows ?? [], [rows])
  const columns = useMemo(() => buildColumns(data), [data])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (data.length === 0) {
    return <div className="empty-note">No experimental conditions extracted from this paper.</div>
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