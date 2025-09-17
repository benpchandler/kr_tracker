import React from 'react'
import { useDispatch, useStore } from '../state/store'
import { parseCSV, generateCSVTemplate, importToServer, CSVImportType, CSVImportResult } from '../lib/import/csvImport'
import { generateWeeks } from '../utils/weeks'

export function ImportWizard() {
  const state = useStore(s => s)
  const dispatch = useDispatch()

  const [importType, setImportType] = React.useState<CSVImportType>('goals-plan')
  const [file, setFile] = React.useState<File | null>(null)
  const [parseResult, setParseResult] = React.useState<CSVImportResult | null>(null)
  const [isImporting, setIsImporting] = React.useState(false)
  const [importStatus, setImportStatus] = React.useState<{ ok: boolean; message: string } | null>(null)
  const [lockAfterImport, setLockAfterImport] = React.useState(false)

  const weeks = React.useMemo(() => {
    if (!state.period.startISO || !state.period.endISO) return []
    return generateWeeks(state.period.startISO, state.period.endISO)
  }, [state.period.startISO, state.period.endISO])

  const weekKeys = React.useMemo(() => weeks.map(w => w.iso), [weeks])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setParseResult(null)
      setImportStatus(null)

      const result = await parseCSV(selectedFile, importType)
      setParseResult(result)
    }
  }

  const handleDownloadTemplate = () => {
    const csv = generateCSVTemplate(importType, weekKeys)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kr-tracker-${importType}-template.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async () => {
    if (!parseResult || parseResult.errors.length > 0) return

    setIsImporting(true)
    setImportStatus(null)

    try {
      const result = await importToServer(importType, parseResult.data, { lockBaseline: lockAfterImport })

      if (result.ok) {
        const res = await fetch('/api/state')
        if (res.ok) {
          const fullState = await res.json()
          dispatch({ type: 'IMPORT_STATE', state: fullState })
        }

        const counts = result.created || {}
        const message = `Successfully imported: ${counts.teams || 0} teams, ${counts.pods || 0} pods, ${counts.krs || 0} KRs, ${counts.planValues || 0} plan values`
        setImportStatus({ ok: true, message })

        setFile(null)
        setParseResult(null)
        const fileInput = document.getElementById('csv-file-input') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      } else {
        setImportStatus({
          ok: false,
          message: `Import failed: ${result.errors?.join(', ') || 'Unknown error'}`
        })
      }
    } catch (error) {
      setImportStatus({
        ok: false,
        message: `Import error: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Import Data from CSV</div>

      <div className="row" style={{ gap: 8, alignItems: 'center' }}>
        <label>Import type:</label>
        <select
          value={importType}
          onChange={(e) => {
            setImportType(e.target.value as CSVImportType)
            setFile(null)
            setParseResult(null)
            setImportStatus(null)
          }}
          style={{ padding: '6px 8px', borderRadius: 4, border: '1px solid var(--border)' }}
        >
          <option value="goals-plan">Goals & Plan (KR definitions + weekly targets)</option>
          <option value="initiatives">Initiatives (with impact/confidence)</option>
        </select>

        <button onClick={handleDownloadTemplate} className="secondary">
          Download Template
        </button>
      </div>

      <div className="row" style={{ gap: 8, alignItems: 'center' }}>
        <input
          id="csv-file-input"
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          style={{ padding: '6px 8px' }}
        />
      </div>

      {parseResult && (
        <div style={{
          padding: 12,
          borderRadius: 4,
          border: '1px solid var(--border)',
          background: 'var(--bg-subtle)'
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Parse Results</div>

          {parseResult.errors.length > 0 ? (
            <div style={{ color: 'var(--danger)' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Errors (must fix before importing):</div>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {parseResult.errors.slice(0, 10).map((err, i) => (
                  <li key={i} style={{ fontSize: 12 }}>
                    Row {err.row}, {err.column}: {err.message}
                  </li>
                ))}
                {parseResult.errors.length > 10 && (
                  <li style={{ fontSize: 12 }}>...and {parseResult.errors.length - 10} more errors</li>
                )}
              </ul>
            </div>
          ) : (
            <div style={{ color: 'var(--success)' }}>
              ✓ Successfully parsed {parseResult.data.length} rows
            </div>
          )}

          {parseResult.warnings.length > 0 && (
            <div style={{ marginTop: 8, color: 'var(--warning)' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Warnings:</div>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {parseResult.warnings.map((warn, i) => (
                  <li key={i} style={{ fontSize: 12 }}>{warn}</li>
                ))}
              </ul>
            </div>
          )}

          {parseResult.data.length > 0 && parseResult.errors.length === 0 && (
            <>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Preview (first 5 rows):</div>
                <div style={{
                  fontSize: 11,
                  overflowX: 'auto',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  background: 'var(--bg)'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        {Object.keys(parseResult.data[0]).filter(k => !k.startsWith('plan_') && !k.startsWith('impact_') && !k.startsWith('confidence_')).map(key => (
                          <th key={key} style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600 }}>
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parseResult.data.slice(0, 5).map((row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          {Object.keys(row).filter(k => !k.startsWith('plan_') && !k.startsWith('impact_') && !k.startsWith('confidence_')).map(key => (
                            <td key={key} style={{ padding: '4px 8px' }}>
                              {String(row[key] || '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {importType === 'goals-plan' && (
                <div style={{ marginTop: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={lockAfterImport}
                      onChange={(e) => setLockAfterImport(e.target.checked)}
                    />
                    <span style={{ fontSize: 12 }}>Lock baseline after import (switch to execution phase)</span>
                  </label>
                </div>
              )}

              <div className="row" style={{ gap: 8, marginTop: 12 }}>
                <button
                  onClick={handleImport}
                  className="primary"
                  disabled={isImporting}
                >
                  {isImporting ? 'Importing...' : `Import ${parseResult.data.length} rows`}
                </button>
                <button
                  onClick={() => {
                    setFile(null)
                    setParseResult(null)
                    setImportStatus(null)
                    const fileInput = document.getElementById('csv-file-input') as HTMLInputElement
                    if (fileInput) fileInput.value = ''
                  }}
                  className="secondary"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {importStatus && (
        <div style={{
          padding: 12,
          borderRadius: 4,
          border: `1px solid var(--${importStatus.ok ? 'success' : 'danger'})`,
          background: importStatus.ok ? 'var(--success-bg)' : 'var(--danger-bg)',
          color: importStatus.ok ? 'var(--success)' : 'var(--danger)'
        }}>
          {importStatus.message}
        </div>
      )}
    </div>
  )
}