# CSV Import Feature

The KR Tracker app includes a comprehensive CSV/TSV import wizard that allows planning teams to bulk import organizational data from spreadsheets.

## Features

### 4-Step Import Wizard

1. **File Selection**: Upload CSV/TSV files or paste data directly
2. **Column Mapping**: Map CSV columns to application fields with auto-detection
3. **Preview & Validation**: Review data and fix validation errors
4. **Confirmation**: Review import summary and configure options

### Supported Import Types

- **Organizations**: Basic organizational data
- **Teams**: Team information with colors and descriptions
- **Pods**: Pod membership and team assignments
- **People**: Individual contributor and manager relationships
- **Objectives**: Organizational objectives and descriptions
- **Key Results (KRs)**: Full KR lifecycle data including targets, baselines, and weekly planning
- **Initiatives**: Strategic projects linked to KRs

### Entry Points

The import wizard can be accessed from multiple locations in Plan mode:

- Primary **"Bulk Import"** button in the main dashboard
- **"Import"** button in the collapsed Objectives & Key Results header
- **"Import Initiatives"** button in the Initiatives tab

## KR Import Format

### Required Columns

- `kr_title`: The title/name of the key result
- `kr_description`: Detailed description of what the KR measures
- `team`: Team name or ID responsible for the KR
- `owner`: Person responsible for the KR (name or email)
- `quarter`: Quarter identifier (e.g., "Q4 2024")
- `unit`: Unit of measurement (`count`, `percent`, `currency`, `ratio`, `time`)
- `target`: Target value to achieve
- `baseline`: Starting baseline value
- `current`: Current progress value

### Optional Columns

- `objective`: Associated objective name
- `organization`: Organization name
- `pod`: Pod assignment
- `additional_teams`: Pipe-separated list of additional teams
- `status`: Current status (`not-started`, `on-track`, `at-risk`, `off-track`, `completed`)
- `deadline`: Due date in YYYY-MM-DD format
- `sql_query`: SQL query for auto-updating KRs
- `auto_update_enabled`: Boolean for automated updates
- `forecast`: End-of-period forecast value
- `linked_initiatives`: Pipe-separated list of linked initiative names
- `comments`: Pipe-separated comments in format `author|type|content`

### Weekly Data Columns

Weekly planning and actual data can be included using ISO week format:

- `plan_2025-W01`, `plan_2025-W02`, etc.: Weekly plan values
- `actual_2025-W01`, `actual_2025-W02`, etc.: Weekly actual values
- `forecast_2025-W01`, `forecast_2025-W02`, etc.: Weekly forecast values

## Initiative Import Format

### Required Columns

- `initiative_title`: Name of the initiative
- `team`: Team responsible for the initiative

### Optional Columns

- `initiative_description`: Detailed description
- `initiative_owner`: Primary owner name
- `contributors`: Pipe-separated list of contributor names
- `priority`: Priority level (`low`, `medium`, `high`, `urgent`)
- `status`: Current status (`planned`, `active`, `paused`, `completed`)
- `deadline`: Due date in YYYY-MM-DD format
- `progress`: Progress percentage (0-100)
- `tags`: Pipe-separated list of tags
- `budget`: Budget information
- `resources`: Required resources
- `linked_krs`: Pipe-separated list of linked KR names

## Validation & Error Handling

The wizard performs comprehensive validation:

- **Required field checking**: Ensures all mandatory fields are present
- **Data type validation**: Validates numeric fields and enum values
- **Format validation**: Checks ISO week formats and date formats
- **Referential integrity**: Validates team/quarter references

Validation errors are displayed in an interactive preview grid with options to:

- Skip invalid rows and proceed with valid data
- Download an error report CSV for correction
- Fix data directly in the preview

## Import Options

### Lock Plan After Import
Automatically locks the plan baseline after import to transition to execution mode.

### Apply to Actuals
Applies weekly actual data to the actuals tracking system for KRs that have actual values.

## Backend Integration

The import system supports both local-only and backend-integrated modes:

- **Local Mode** (`VITE_USE_BACKEND=false`): Processes imports entirely in the browser
- **Backend Mode** (`VITE_USE_BACKEND=true`): POSTs import data to `/api/import/csv` with fallback to local processing

## Template Downloads

Each import type provides a downloadable CSV template with:
- Pre-configured headers matching the expected format
- Example data rows showing proper formatting
- All supported columns for that entity type

## Tips for Success

1. **Start with templates**: Download and populate CSV templates rather than creating from scratch
2. **Validate externally**: Use spreadsheet tools to verify data formats before import
3. **Use ISO week format**: Weekly data must use `YYYY-Www` format (e.g., `2025-W09`)
4. **Multi-value fields**: Use pipe (`|`) separator for lists (teams, contributors, etc.)
5. **Test with small datasets**: Import a few rows first to verify column mappings
6. **Clean numeric data**: Remove currency symbols, percentages, and commas - the system handles this automatically

## Error Recovery

If an import fails:

1. Check the validation errors in the preview step
2. Download the error CSV to see specific issues
3. Correct data in your source spreadsheet
4. Re-attempt the import with corrected data
5. Use "Skip invalid rows" to proceed with partial imports when needed