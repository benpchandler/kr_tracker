import Papa from 'papaparse';

export interface ParseResult<T = any> {
  data: T[];
  errors: ParseError[];
  meta: {
    fields?: string[];
    delimiter: string;
    linebreak: string;
    truncated: boolean;
    aborted: boolean;
  };
}

export interface ParseError {
  row?: number;
  message: string;
  field?: string;
  value?: any;
  code?: string;
}

export interface CSVColumn {
  csvHeader: string;
  mappedTo?: string;
  required?: boolean;
  scope?: ImportScope;
}

export type ImportScope =
  | 'organization'
  | 'team'
  | 'pod'
  | 'person'
  | 'objective'
  | 'kr'
  | 'initiative'
  | 'weekly_plan'
  | 'weekly_actual'
  | 'weekly_forecast';

export interface ImportConfig {
  scope: ImportScope;
  columns: CSVColumn[];
  skipInvalidRows?: boolean;
  lockPlanAfterImport?: boolean;
  applyToActuals?: boolean;
}

// Standard column mappings for each entity type
export const STANDARD_COLUMNS: Record<ImportScope, Record<string, string>> = {
  organization: {
    'organization_name': 'name',
    'organization_description': 'description',
    'organization_industry': 'industry',
    'organization_headquarters': 'headquarters',
  },
  team: {
    'team_name': 'name',
    'team_description': 'description',
    'team_color': 'color',
    'organization': 'organizationId',
  },
  pod: {
    'pod_name': 'name',
    'pod_description': 'description',
    'pod_members': 'members',
    'team': 'teamId',
  },
  person: {
    'person_name': 'name',
    'email': 'email',
    'function': 'functionId',
    'manager': 'managerId',
    'team': 'teamId',
    'pod': 'podId',
  },
  objective: {
    'objective_title': 'title',
    'objective_description': 'description',
    'owner': 'owner',
    'organization': 'organizationId',
    'team': 'teamId',
    'pod': 'podId',
    'status': 'status',
  },
  kr: {
    'kr_title': 'title',
    'kr_description': 'description',
    'team': 'teamId',
    'additional_teams': 'teamIds',
    'owner': 'owner',
    'quarter': 'quarterId',
    'unit': 'unit',
    'target': 'target',
    'baseline': 'baseline',
    'current': 'current',
    'objective': 'objectiveId',
    'organization': 'organizationId',
    'pod': 'podId',
    'status': 'status',
    'deadline': 'deadline',
    'sql_query': 'sqlQuery',
    'auto_update_enabled': 'autoUpdateEnabled',
    'forecast': 'forecast',
    'linked_initiatives': 'linkedInitiativeIds',
    'comments': 'comments',
  },
  initiative: {
    'initiative_title': 'title',
    'initiative_description': 'description',
    'initiative_owner': 'owner',
    'contributors': 'contributors',
    'priority': 'priority',
    'status': 'status',
    'deadline': 'deadline',
    'progress': 'progress',
    'tags': 'tags',
    'budget': 'budget',
    'resources': 'resources',
    'linked_krs': 'linkedKRIds',
    'team': 'teamId',
  },
  weekly_plan: {},
  weekly_actual: {},
  weekly_forecast: {},
};

// Required fields for each scope
export const REQUIRED_FIELDS: Record<ImportScope, string[]> = {
  organization: ['name'],
  team: ['name'],
  pod: ['name', 'teamId'],
  person: ['name', 'email'],
  objective: ['title', 'organizationId'],
  kr: ['title', 'description', 'teamId', 'owner', 'quarterId', 'unit', 'target', 'baseline', 'current'],
  initiative: ['title', 'teamId'],
  weekly_plan: [],
  weekly_actual: [],
  weekly_forecast: [],
};

export function parseCSV<T = any>(
  content: string | File,
  config?: Papa.ParseConfig
): Promise<ParseResult<T>> {
  return new Promise((resolve) => {
    const parseConfig = {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim().toLowerCase().replace(/\s+/g, '_'),
      ...config,
      complete: (results: Papa.ParseResult<T>) => {
        const errors: ParseError[] = results.errors.map((error) => ({
          row: error.row,
          message: error.message,
          code: error.code,
        }));

        resolve({
          data: results.data as T[],
          errors,
          meta: {
            fields: results.meta.fields,
            delimiter: results.meta.delimiter,
            linebreak: results.meta.linebreak,
            truncated: results.meta.truncated,
            aborted: results.meta.aborted,
          },
        });
      },
    };

    Papa.parse(content, parseConfig);
  });
}

export function detectDelimiter(sample: string): string {
  const delimiters = [',', '\t', '|', ';'];
  const counts = delimiters.map(d => ({
    delimiter: d,
    count: (sample.match(new RegExp(`\\${d}`, 'g')) || []).length,
  }));

  return counts.sort((a, b) => b.count - a.count)[0].delimiter;
}

export function autoMapColumns(
  csvHeaders: string[],
  scope: ImportScope
): CSVColumn[] {
  const standardMapping = STANDARD_COLUMNS[scope];
  const requiredFields = REQUIRED_FIELDS[scope];

  return csvHeaders.map(header => {
    const normalizedHeader = header.trim().toLowerCase().replace(/\s+/g, '_');

    // Check for standard mappings
    const mappedTo = standardMapping[normalizedHeader];

    // Check for weekly columns
    let weeklyScope: ImportScope | undefined;
    if (normalizedHeader.startsWith('plan_') && normalizedHeader.match(/^\d{4}-w\d{2}$/)) {
      weeklyScope = 'weekly_plan';
    } else if (normalizedHeader.startsWith('actual_') && normalizedHeader.match(/^\d{4}-w\d{2}$/)) {
      weeklyScope = 'weekly_actual';
    } else if (normalizedHeader.startsWith('forecast_') && normalizedHeader.match(/^\d{4}-w\d{2}$/)) {
      weeklyScope = 'weekly_forecast';
    }

    return {
      csvHeader: header,
      mappedTo: mappedTo || (weeklyScope ? normalizedHeader : undefined),
      required: mappedTo ? requiredFields.includes(mappedTo) : false,
      scope: weeklyScope || scope,
    };
  });
}

export function sanitizeNumericValue(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Remove currency symbols, percentages, and commas
    const cleaned = value.replace(/[$%,]/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export function parseMultiValue(value: string, delimiter = '|'): string[] {
  if (!value) return [];
  return value.split(delimiter).map(v => v.trim()).filter(Boolean);
}

export function validateRow(
  row: Record<string, any>,
  columns: CSVColumn[],
  scope: ImportScope
): ParseError[] {
  const errors: ParseError[] = [];
  const _requiredFields = REQUIRED_FIELDS[scope];

  // Check required fields
  columns.forEach(column => {
    if (column.required && column.mappedTo) {
      const value = row[column.csvHeader];
      if (value === null || value === undefined || value === '') {
        errors.push({
          field: column.csvHeader,
          message: `Required field "${column.csvHeader}" is missing`,
          code: 'REQUIRED_FIELD_MISSING',
        });
      }
    }
  });

  // Validate specific field formats
  if (scope === 'kr') {
    // Validate unit
    if (row.unit && !['count', 'percent', 'currency', 'ratio', 'time'].includes(row.unit)) {
      errors.push({
        field: 'unit',
        value: row.unit,
        message: `Invalid unit "${row.unit}". Must be one of: count, percent, currency, ratio, time`,
        code: 'INVALID_ENUM',
      });
    }

    // Validate status
    if (row.status && !['not-started', 'on-track', 'at-risk', 'off-track', 'completed'].includes(row.status)) {
      errors.push({
        field: 'status',
        value: row.status,
        message: `Invalid status "${row.status}"`,
        code: 'INVALID_ENUM',
      });
    }
  }

  // Validate ISO week format for weekly columns
  columns.forEach(column => {
    if (column.scope && column.scope.startsWith('weekly_')) {
      const weekMatch = column.csvHeader.match(/(\d{4}-w\d{2})/i);
      if (weekMatch) {
        const weekFormat = weekMatch[1];
        if (!weekFormat.match(/^\d{4}-w\d{2}$/i)) {
          errors.push({
            field: column.csvHeader,
            message: `Invalid week format in column "${column.csvHeader}". Use YYYY-Www format`,
            code: 'INVALID_WEEK_FORMAT',
          });
        }
      }
    }
  });

  return errors;
}

export function generateCSVTemplate(scope: ImportScope): string {
  const headers: string[] = [];
  const exampleRow: string[] = [];

  // Add standard columns
  Object.entries(STANDARD_COLUMNS[scope]).forEach(([csvHeader, field]) => {
    headers.push(csvHeader);

    // Add example data
    switch (field) {
      case 'name':
      case 'title':
        exampleRow.push('Example Name');
        break;
      case 'description':
        exampleRow.push('Example description text');
        break;
      case 'email':
        exampleRow.push('user@example.com');
        break;
      case 'color':
        exampleRow.push('#3B82F6');
        break;
      case 'unit':
        exampleRow.push('count');
        break;
      case 'target':
      case 'baseline':
      case 'current':
        exampleRow.push('100');
        break;
      case 'status':
        exampleRow.push('on-track');
        break;
      case 'deadline':
        exampleRow.push('2025-03-31');
        break;
      case 'autoUpdateEnabled':
        exampleRow.push('false');
        break;
      default:
        exampleRow.push('');
    }
  });

  // Add weekly columns for KRs
  if (scope === 'kr') {
    // Add example weekly plan columns
    for (let week = 1; week <= 4; week++) {
      const weekStr = `2025-W${week.toString().padStart(2, '0')}`;
      headers.push(`plan_${weekStr}`);
      exampleRow.push((25 * week).toString());
    }
  }

  // Generate CSV
  return [
    headers.join(','),
    exampleRow.join(','),
  ].join('\n');
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}