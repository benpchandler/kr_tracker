import Papa from 'papaparse'
import { KeyResult, Team, Pod, Objective, Initiative } from '../../models/types'

export type CSVImportType = 'goals-plan' | 'initiatives'

export interface ParsedGoalsPlanRow {
  team?: string
  pod?: string
  objective?: string
  kr_id?: string
  kr_name: string
  unit: 'count' | 'percent' | 'currency'
  aggregation: 'cumulative' | 'snapshot' | 'average'
  goal_start?: number
  goal_end?: number
  status?: string
  dri_name?: string
  dri_email?: string
  [key: string]: any
}

export interface ParsedInitiativeRow {
  team?: string
  pod?: string
  kr_id?: string
  kr_name?: string
  initiative_id?: string
  initiative_name: string
  impact: number
  confidence: number
  is_placeholder?: boolean
  status?: string
  [key: string]: any
}

export interface CSVValidationError {
  row: number
  column: string
  message: string
}

export interface CSVImportResult {
  type: CSVImportType
  data: any[]
  errors: CSVValidationError[]
  warnings: string[]
}

function sanitizeNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null
  const str = String(value).replace(/[$,%]/g, '').trim()
  const num = parseFloat(str)
  return isNaN(num) ? null : num
}

function validateUnit(unit: string): 'count' | 'percent' | 'currency' | null {
  const normalized = unit?.toLowerCase().trim()
  if (normalized === 'count' || normalized === 'percent' || normalized === 'currency') {
    return normalized as 'count' | 'percent' | 'currency'
  }
  return null
}

function validateAggregation(agg: string): 'cumulative' | 'snapshot' | 'average' | null {
  const normalized = agg?.toLowerCase().trim()
  if (normalized === 'cumulative' || normalized === 'snapshot' || normalized === 'average') {
    return normalized as 'cumulative' | 'snapshot' | 'average'
  }
  return null
}

export async function parseCSV(file: File, type: CSVImportType): Promise<CSVImportResult> {
  return new Promise((resolve) => {
    const errors: CSVValidationError[] = []
    const warnings: string[] = []
    const data: any[] = []

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.errors.length > 0) {
          result.errors.forEach(err => {
            errors.push({
              row: err.row || 0,
              column: 'parse',
              message: err.message
            })
          })
        }

        if (type === 'goals-plan') {
          result.data.forEach((row: any, index: number) => {
            const parsed: ParsedGoalsPlanRow = {
              team: row.team?.trim(),
              pod: row.pod?.trim(),
              objective: row.objective?.trim(),
              kr_id: row.kr_id?.trim(),
              kr_name: row.kr_name?.trim(),
              unit: validateUnit(row.unit) || 'count',
              aggregation: validateAggregation(row.aggregation) || 'cumulative',
              goal_start: sanitizeNumber(row.goal_start) ?? undefined,
              goal_end: sanitizeNumber(row.goal_end) ?? undefined,
              status: row.status?.trim(),
              dri_name: row.dri_name?.trim(),
              dri_email: row.dri_email?.trim()
            }

            if (!parsed.kr_name) {
              errors.push({
                row: index + 2,
                column: 'kr_name',
                message: 'KR name is required'
              })
              return
            }

            if (!validateUnit(row.unit)) {
              errors.push({
                row: index + 2,
                column: 'unit',
                message: `Invalid unit: ${row.unit}. Must be count, percent, or currency`
              })
            }

            if (!validateAggregation(row.aggregation)) {
              errors.push({
                row: index + 2,
                column: 'aggregation',
                message: `Invalid aggregation: ${row.aggregation}. Must be cumulative, snapshot, or average`
              })
            }

            Object.keys(row).forEach(key => {
              if (key.startsWith('plan_')) {
                const value = sanitizeNumber(row[key])
                if (value !== null) {
                  parsed[key] = value
                }
              }
            })

            data.push(parsed)
          })

          const weekColumns = Object.keys(result.data[0] || {}).filter(k => k.startsWith('plan_'))
          if (weekColumns.length === 0) {
            warnings.push('No weekly plan columns found. Will use linear interpolation from goal_start to goal_end')
          }
        } else if (type === 'initiatives') {
          result.data.forEach((row: any, index: number) => {
            const parsed: ParsedInitiativeRow = {
              team: row.team?.trim(),
              pod: row.pod?.trim(),
              kr_id: row.kr_id?.trim(),
              kr_name: row.kr_name?.trim(),
              initiative_id: row.initiative_id?.trim(),
              initiative_name: row.initiative_name?.trim(),
              impact: sanitizeNumber(row.impact) || 0,
              confidence: sanitizeNumber(row.confidence) || 0,
              is_placeholder: row.is_placeholder?.toLowerCase() === 'true',
              status: row.status?.trim()
            }

            if (!parsed.initiative_name) {
              errors.push({
                row: index + 2,
                column: 'initiative_name',
                message: 'Initiative name is required'
              })
              return
            }

            if (!parsed.kr_name && !parsed.kr_id) {
              errors.push({
                row: index + 2,
                column: 'kr_name',
                message: 'Either kr_name or kr_id is required'
              })
              return
            }

            Object.keys(row).forEach(key => {
              if (key.startsWith('impact_') || key.startsWith('confidence_')) {
                const value = sanitizeNumber(row[key])
                if (value !== null) {
                  parsed[key] = value
                }
              }
            })

            data.push(parsed)
          })
        }

        resolve({
          type,
          data,
          errors,
          warnings
        })
      },
      error: (error) => {
        errors.push({
          row: 0,
          column: 'file',
          message: error.message
        })
        resolve({
          type,
          data: [],
          errors,
          warnings
        })
      }
    })
  })
}

export function generateCSVTemplate(type: CSVImportType, weeks: string[]): string {
  if (type === 'goals-plan') {
    const headers = [
      'team',
      'pod',
      'objective',
      'kr_name',
      'unit',
      'aggregation',
      'goal_start',
      'goal_end',
      'status',
      'dri_name',
      'dri_email',
      ...weeks.map(w => `plan_${w}`)
    ]

    const exampleRows = [
      [
        'Live Order Experience',
        'Dasher',
        'Improve Delivery Quality',
        'Dasher Handoff Time',
        'percent',
        'snapshot',
        '85',
        '95',
        'on_track',
        'John Doe',
        'john@example.com',
        ...weeks.map((_, i) => (85 + i * (10 / weeks.length)).toFixed(1))
      ],
      [
        'Support',
        'Quality',
        'Reduce Support Volume',
        'Weekly Support Tickets',
        'count',
        'average',
        '1000',
        '800',
        'on_track',
        'Jane Smith',
        'jane@example.com',
        ...weeks.map((_, i) => (1000 - i * (200 / weeks.length)).toFixed(0))
      ]
    ]

    return [headers.join(','), ...exampleRows.map(row => row.join(','))].join('\n')
  } else {
    const headers = [
      'team',
      'pod',
      'kr_name',
      'initiative_name',
      'impact',
      'confidence',
      'is_placeholder',
      'status',
      ...weeks.flatMap(w => [`impact_${w}`, `confidence_${w}`])
    ]

    const exampleRows = [
      [
        'Live Order Experience',
        'Dasher',
        'Dasher Handoff Time',
        'Optimize handoff flow',
        '3',
        '0.8',
        'false',
        'on_track',
        ...weeks.flatMap(() => ['3', '0.8'])
      ],
      [
        'Support',
        'Quality',
        'Weekly Support Tickets',
        'Implement AI chat',
        '5',
        '0.6',
        'false',
        'at_risk',
        ...weeks.flatMap(() => ['5', '0.6'])
      ]
    ]

    return [headers.join(','), ...exampleRows.map(row => row.join(','))].join('\n')
  }
}

export async function importToServer(
  type: CSVImportType,
  data: any[],
  options: { lockBaseline?: boolean }
): Promise<{ ok: boolean; created?: any; updated?: any; errors?: string[] }> {
  try {
    const response = await fetch('/api/import/csv', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        data,
        by: localStorage.getItem('kr-user-name') || 'import',
        ...options
      })
    })

    const result = await response.json()
    return result
  } catch (error) {
    return {
      ok: false,
      errors: [error instanceof Error ? error.message : 'Import failed']
    }
  }
}