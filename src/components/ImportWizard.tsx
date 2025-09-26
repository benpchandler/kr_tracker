import React, { useState, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ScrollArea } from './ui/scroll-area';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { HTTP_PREFIX } from '../config';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  Users,
  Target,
  Lightbulb,
  Building2,
  User,
  ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  parseCSV,
  autoMapColumns,
  validateRow,
  sanitizeNumericValue,
  parseMultiValue,
  generateCSVTemplate,
  downloadCSV,
  REQUIRED_FIELDS,
  STANDARD_COLUMNS,
  type ParseResult,
  type ParseError,
  type CSVColumn,
  type ImportScope
} from '../utils/csvParser';
import { useAppState } from '../state/store';
import type { KR, Initiative } from '../types';

interface ImportWizardProps {
  open: boolean;
  onClose: () => void;
}

type WizardStep = 'file' | 'mapping' | 'preview' | 'confirm';

interface ImportSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  toCreate: number;
  toUpdate: number;
  toSkip: number;
  entities: {
    organizations: { create: number; update: number };
    teams: { create: number; update: number };
    pods: { create: number; update: number };
    people: { create: number; update: number };
    objectives: { create: number; update: number };
    krs: { create: number; update: number };
    initiatives: { create: number; update: number };
  };
}

const STEP_TITLES: Record<WizardStep, string> = {
  file: 'Select Data Source',
  mapping: 'Map Columns',
  preview: 'Preview & Validate',
  confirm: 'Confirm Import',
};

const STEP_DESCRIPTIONS: Record<WizardStep, string> = {
  file: 'Upload a CSV/TSV file or paste data directly',
  mapping: 'Map CSV columns to data fields',
  preview: 'Review data and fix validation errors',
  confirm: 'Review import summary and confirm',
};

const SCOPE_ICONS: Record<ImportScope, React.ReactNode> = {
  organization: <Building2 className="h-4 w-4" />,
  team: <Users className="h-4 w-4" />,
  pod: <Users className="h-4 w-4" />,
  person: <User className="h-4 w-4" />,
  objective: <Target className="h-4 w-4" />,
  kr: <Target className="h-4 w-4" />,
  initiative: <Lightbulb className="h-4 w-4" />,
  weekly_plan: <FileSpreadsheet className="h-4 w-4" />,
  weekly_actual: <FileSpreadsheet className="h-4 w-4" />,
  weekly_forecast: <FileSpreadsheet className="h-4 w-4" />,
};

export function ImportWizard({ open, onClose }: ImportWizardProps) {
  const { state, dispatch } = useAppState();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('file');
  const [rawData, setRawData] = useState<string>('');
  const [_fileName, setFileName] = useState<string>('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importScope, setImportScope] = useState<ImportScope>('kr');
  const [columns, setColumns] = useState<CSVColumn[]>([]);
  const [validationErrors, setValidationErrors] = useState<Map<number, ParseError[]>>(new Map());
  const [skipInvalidRows, setSkipInvalidRows] = useState(false);
  const [lockPlanAfterImport, setLockPlanAfterImport] = useState(false);
  const [applyToActuals, setApplyToActuals] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);

  const stepIndex = ['file', 'mapping', 'preview', 'confirm'].indexOf(currentStep);
  const progress = ((stepIndex + 1) / 4) * 100;

  const handleFileSelect = useCallback(async (file: File) => {
    setFileName(file.name);
    setIsProcessing(true);

    try {
      const result = await parseCSV(file);
      setParseResult(result);

      if (result.meta.fields) {
        const autoMapped = autoMapColumns(result.meta.fields, importScope);
        setColumns(autoMapped);
      }

      setIsProcessing(false);
      setCurrentStep('mapping');
    } catch (error) {
      console.error('Error parsing file:', error);
      setIsProcessing(false);
    }
  }, [importScope]);

  const handleTextPaste = useCallback(async () => {
    if (!rawData.trim()) return;

    setFileName('Pasted Data');
    setIsProcessing(true);

    try {
      const result = await parseCSV(rawData);
      setParseResult(result);

      if (result.meta.fields) {
        const autoMapped = autoMapColumns(result.meta.fields, importScope);
        setColumns(autoMapped);
      }

      setIsProcessing(false);
      setCurrentStep('mapping');
    } catch (error) {
      console.error('Error parsing data:', error);
      setIsProcessing(false);
    }
  }, [rawData, importScope]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'text/csv' || file.type === 'text/tab-separated-values' || file.name.endsWith('.csv') || file.name.endsWith('.tsv')) {
        handleFileSelect(file);
      }
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const validateData = useCallback(() => {
    if (!parseResult) return;

    const errors = new Map<number, ParseError[]>();

    parseResult.data.forEach((row, index) => {
      const rowErrors = validateRow(row, columns, importScope);
      if (rowErrors.length > 0) {
        errors.set(index, rowErrors);
      }
    });

    setValidationErrors(errors);

    // Calculate import summary
    const validRows = parseResult.data.length - errors.size;
    const summary: ImportSummary = {
      totalRows: parseResult.data.length,
      validRows,
      invalidRows: errors.size,
      toCreate: validRows, // Simplified for now
      toUpdate: 0,
      toSkip: skipInvalidRows ? errors.size : 0,
      entities: {
        organizations: { create: 0, update: 0 },
        teams: { create: 0, update: 0 },
        pods: { create: 0, update: 0 },
        people: { create: 0, update: 0 },
        objectives: { create: 0, update: 0 },
        krs: { create: 0, update: 0 },
        initiatives: { create: 0, update: 0 },
      },
    };

    // Count entities based on scope
    if (importScope === 'kr') {
      summary.entities.krs.create = validRows;
    } else if (importScope === 'initiative') {
      summary.entities.initiatives.create = validRows;
    } else if (importScope === 'organization') {
      summary.entities.organizations.create = validRows;
    } else if (importScope === 'team') {
      summary.entities.teams.create = validRows;
    }

    setImportSummary(summary);
  }, [parseResult, columns, importScope, skipInvalidRows]);

  const handleColumnMapping = useCallback((csvHeader: string, mappedTo: string | undefined) => {
    setColumns(prev =>
      prev.map(col =>
        col.csvHeader === csvHeader
          ? { ...col, mappedTo, required: mappedTo ? REQUIRED_FIELDS[importScope].includes(mappedTo) : false }
          : col
      )
    );
  }, [importScope]);

  const handleScopeChange = useCallback((newScope: ImportScope) => {
    setImportScope(newScope);
    if (parseResult?.meta.fields) {
      const autoMapped = autoMapColumns(parseResult.meta.fields, newScope);
      setColumns(autoMapped);
    }
  }, [parseResult]);

  const handleNext = useCallback(() => {
    if (currentStep === 'file') {
      // File step - handled by file select
    } else if (currentStep === 'mapping') {
      validateData();
      setCurrentStep('preview');
    } else if (currentStep === 'preview') {
      if (validationErrors.size > 0 && !skipInvalidRows) {
        // Can't proceed with errors unless skipping
        return;
      }
      setCurrentStep('confirm');
    }
  }, [currentStep, validateData, validationErrors, skipInvalidRows]);

  const handleBack = useCallback(() => {
    const steps: WizardStep[] = ['file', 'mapping', 'preview', 'confirm'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  }, [currentStep]);

  const handleImport = useCallback(async () => {
    if (!parseResult || !importSummary) return;

    setIsProcessing(true);

    try {
      // Transform and import data based on scope
      const validData = parseResult.data.filter((_, index) =>
        !validationErrors.has(index) || skipInvalidRows
      );

      // Check if backend is enabled
      const useBackend = import.meta.env.VITE_USE_BACKEND === 'true';

      if (useBackend) {
        // Backend-enabled import flow
        const importData = {
          type: importScope === 'kr' ? 'goals-plan' : 'initiatives',
          data: validData,
          columns,
          lockBaseline: lockPlanAfterImport,
          applyToActuals,
        };

        try {
          const response = await fetch(`${HTTP_PREFIX}localhost:3000/api/import/csv`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(importData),
          });

          if (!response.ok) {
            throw new Error(`Import failed: ${response.statusText}`);
          }

          const result = await response.json();

          // Reconcile response into local state
          if (result.krs) {
            dispatch({ type: 'SET_KRS', payload: result.krs });
          }
          if (result.initiatives) {
            dispatch({ type: 'SET_INITIATIVES', payload: result.initiatives });
          }
          if (result.baseline && lockPlanAfterImport) {
            dispatch({ type: 'LOCK_PLAN', baseline: result.baseline });
          }
          if (result.actuals && applyToActuals) {
            dispatch({ type: 'BULK_UPDATE_ACTUALS', updates: result.actuals });
          }
        } catch (error) {
          console.error('Backend import failed, falling back to local:', error);
          // Fall back to local processing
          processLocalImport();
        }
      } else {
        // Local-only processing
        processLocalImport();
      }

      function processLocalImport() {
        // Process imports based on scope
        if (importScope === 'kr') {
          const krs = validData.map(row => transformRowToKR(row, columns, state));
          dispatch({ type: 'SET_KRS', payload: [...state.krs, ...krs] });
        } else if (importScope === 'initiative') {
          const initiatives = validData.map(row => transformRowToInitiative(row, columns, state));
          dispatch({ type: 'SET_INITIATIVES', payload: [...state.initiatives, ...initiatives] });
        }

        // Handle weekly data if present
        if (applyToActuals) {
          const actualsData = extractWeeklyData(validData, columns, 'actual_');
          if (Object.keys(actualsData).length > 0) {
            dispatch({ type: 'BULK_UPDATE_ACTUALS', updates: actualsData });
          }
        }

        // Lock plan if requested
        if (lockPlanAfterImport) {
          const planData = extractWeeklyData(validData, columns, 'plan_');
          if (Object.keys(planData).length > 0) {
            const baseline = {
              id: `baseline-${Date.now()}`,
              version: 1,
              lockedAt: new Date().toISOString(),
              lockedBy: 'Import',
              data: planData,
            };
            dispatch({ type: 'LOCK_PLAN', baseline });
          }
        }
      }

      setIsProcessing(false);
      onClose();
    } catch (error) {
      console.error('Import error:', error);
      setIsProcessing(false);
    }
  }, [parseResult, importSummary, validationErrors, skipInvalidRows, importScope, columns, state, dispatch, applyToActuals, lockPlanAfterImport, onClose]);

  const downloadTemplate = useCallback(() => {
    const template = generateCSVTemplate(importScope);
    downloadCSV(template, `${importScope}_template.csv`);
  }, [importScope]);

  const downloadErrors = useCallback(() => {
    if (!parseResult) return;

    const errorRows = Array.from(validationErrors.entries()).map(([index, errors]) => {
      const row = parseResult.data[index];
      return {
        ...row,
        _errors: errors.map(e => e.message).join('; '),
      };
    });

    const errorCSV = Papa.unparse(errorRows);
    downloadCSV(errorCSV, 'import_errors.csv');
  }, [parseResult, validationErrors]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between mb-4">
            <div>
              <DialogTitle>{STEP_TITLES[currentStep]}</DialogTitle>
              <DialogDescription>{STEP_DESCRIPTIONS[currentStep]}</DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span className={cn(stepIndex >= 0 && 'text-primary font-medium')}>1. File</span>
            <span className={cn(stepIndex >= 1 && 'text-primary font-medium')}>2. Mapping</span>
            <span className={cn(stepIndex >= 2 && 'text-primary font-medium')}>3. Preview</span>
            <span className={cn(stepIndex >= 3 && 'text-primary font-medium')}>4. Confirm</span>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {currentStep === 'file' && (
            <div className="space-y-4">
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">Upload File</TabsTrigger>
                  <TabsTrigger value="paste">Paste Data</TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-4">
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                      isDragging ? "border-primary bg-primary/10" : "border-muted hover:border-primary/50"
                    )}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium mb-2">Drop your CSV/TSV file here</p>
                    <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
                    <Button variant="secondary" size="sm">
                      Select File
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.tsv,text/csv,text/tab-separated-values"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    />
                  </div>

                  <Alert>
                    <FileSpreadsheet className="h-4 w-4" />
                    <AlertDescription>
                      Accepted formats: CSV (.csv) and TSV (.tsv) files with headers in the first row
                    </AlertDescription>
                  </Alert>
                </TabsContent>

                <TabsContent value="paste" className="space-y-4">
                  <Textarea
                    placeholder="Paste your CSV or TSV data here..."
                    className="min-h-[200px] font-mono text-sm"
                    value={rawData}
                    onChange={(e) => setRawData(e.target.value)}
                  />
                  <Button onClick={handleTextPaste} disabled={!rawData.trim()}>
                    Parse Data
                  </Button>
                </TabsContent>
              </Tabs>

              <div className="flex items-center justify-between pt-4">
                <div className="space-y-2">
                  <Label>Import Type</Label>
                  <Select value={importScope} onValueChange={handleScopeChange}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="organization">Organizations</SelectItem>
                      <SelectItem value="team">Teams</SelectItem>
                      <SelectItem value="pod">Pods</SelectItem>
                      <SelectItem value="person">People</SelectItem>
                      <SelectItem value="objective">Objectives</SelectItem>
                      <SelectItem value="kr">Key Results</SelectItem>
                      <SelectItem value="initiative">Initiatives</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </div>
          )}

          {currentStep === 'mapping' && parseResult && (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4 pr-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Map your CSV columns to the appropriate fields. Required fields are marked with an asterisk (*).
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  {columns.map((column) => (
                    <div key={column.csvHeader} className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Label className="text-sm font-medium">
                            {column.csvHeader}
                            {column.required && <span className="text-destructive">*</span>}
                          </Label>
                          {column.scope && column.scope !== importScope && (
                            <Badge variant="outline" className="text-xs">
                              {column.scope}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <Select
                        value={column.mappedTo || 'unmapped'}
                        onValueChange={(value) => handleColumnMapping(column.csvHeader, value === 'unmapped' ? undefined : value)}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unmapped">-- Not Mapped --</SelectItem>
                          {Object.entries(STANDARD_COLUMNS[importScope]).map(([_, field]) => (
                            <SelectItem key={field as string} value={field as string}>
                              {field as string}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-4">
                  <Badge variant={columns.filter(c => c.mappedTo).length > 0 ? 'default' : 'secondary'}>
                    {columns.filter(c => c.mappedTo).length} mapped
                  </Badge>
                  <Badge variant={columns.filter(c => c.required && !c.mappedTo).length > 0 ? 'destructive' : 'secondary'}>
                    {columns.filter(c => c.required && !c.mappedTo).length} required missing
                  </Badge>
                </div>
              </div>
            </ScrollArea>
          )}

          {currentStep === 'preview' && parseResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant={validationErrors.size > 0 ? 'destructive' : 'default'}>
                    {validationErrors.size} rows with errors
                  </Badge>
                  <Badge variant="secondary">
                    {parseResult.data.length - validationErrors.size} valid rows
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="show-errors"
                    checked={showOnlyErrors}
                    onCheckedChange={(checked) => setShowOnlyErrors(checked as boolean)}
                  />
                  <Label htmlFor="show-errors" className="text-sm">Show only errors</Label>
                </div>
              </div>

              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Row</TableHead>
                      <TableHead>Status</TableHead>
                      {columns.filter(c => c.mappedTo).slice(0, 4).map(col => (
                        <TableHead key={col.csvHeader}>{col.csvHeader}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parseResult.data
                      .filter((_, index) => !showOnlyErrors || validationErrors.has(index))
                      .slice(0, 50)
                      .map((row, index) => {
                        const errors = validationErrors.get(index);
                        return (
                          <TableRow key={index}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>
                              {errors ? (
                                <Badge variant="destructive" className="text-xs">
                                  {errors.length} error{errors.length > 1 ? 's' : ''}
                                </Badge>
                              ) : (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              )}
                            </TableCell>
                            {columns.filter(c => c.mappedTo).slice(0, 4).map(col => (
                              <TableCell key={col.csvHeader} className="max-w-[150px] truncate">
                                {row[col.csvHeader]}
                              </TableCell>
                            ))}
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </ScrollArea>

              {validationErrors.size > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="space-y-2">
                    <p>Found {validationErrors.size} rows with validation errors.</p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="skip-invalid"
                          checked={skipInvalidRows}
                          onCheckedChange={(checked) => setSkipInvalidRows(checked as boolean)}
                        />
                        <Label htmlFor="skip-invalid" className="text-sm">Skip invalid rows</Label>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadErrors}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Errors
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {currentStep === 'confirm' && importSummary && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Import Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Rows:</span>
                      <span className="font-medium">{importSummary.totalRows}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Valid Rows:</span>
                      <span className="font-medium text-green-600">{importSummary.validRows}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Invalid Rows:</span>
                      <span className="font-medium text-red-600">{importSummary.invalidRows}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>To Create:</span>
                      <span className="font-medium">{importSummary.toCreate}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>To Update:</span>
                      <span className="font-medium">{importSummary.toUpdate}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>To Skip:</span>
                      <span className="font-medium">{importSummary.toSkip}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Entity Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(importSummary.entities).map(([entity, counts]) => {
                      if (counts.create === 0 && counts.update === 0) return null;
                      return (
                        <div key={entity} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            {SCOPE_ICONS[entity as ImportScope]}
                            <span className="capitalize">{entity}:</span>
                          </div>
                          <div className="flex gap-3">
                            {counts.create > 0 && (
                              <Badge variant="default" className="text-xs">
                                +{counts.create}
                              </Badge>
                            )}
                            {counts.update > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                ↻{counts.update}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="lock-plan"
                    checked={lockPlanAfterImport}
                    onCheckedChange={(checked) => setLockPlanAfterImport(checked as boolean)}
                  />
                  <Label htmlFor="lock-plan">Lock plan after import</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="apply-actuals"
                    checked={applyToActuals}
                    onCheckedChange={(checked) => setApplyToActuals(checked as boolean)}
                  />
                  <Label htmlFor="apply-actuals">Apply weekly data to actuals</Label>
                </div>
              </div>

              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Ready to import {importSummary.validRows} rows. This action cannot be undone.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            {currentStep !== 'file' && (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={isProcessing}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {currentStep === 'mapping' && (
              <Button onClick={handleNext} disabled={columns.filter(c => c.required && !c.mappedTo).length > 0}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            {currentStep === 'preview' && (
              <Button
                onClick={handleNext}
                disabled={validationErrors.size > 0 && !skipInvalidRows}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
            {currentStep === 'confirm' && (
              <Button onClick={handleImport} disabled={isProcessing}>
                {isProcessing ? 'Importing...' : `Import ${importSummary?.validRows || 0} Rows`}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper functions for data transformation
function transformRowToKR(row: Record<string, any>, _columns: CSVColumn[], _state: any): KR {
  const id = row.id || `kr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Build KR object from mapped columns
  const kr: KR = {
    id,
    title: row.title || row.kr_title || '',
    description: row.description || row.kr_description || '',
    teamId: row.teamId || row.team || '',
    teamIds: row.teamIds ? parseMultiValue(row.teamIds) : undefined,
    owner: row.owner || '',
    quarterId: row.quarterId || row.quarter || '',
    target: row.target || '0',
    unit: row.unit || 'count',
    baseline: row.baseline || '0',
    current: row.current || '0',
    progress: 0,
    status: row.status || 'not-started',
    deadline: row.deadline || '',
    autoUpdateEnabled: row.autoUpdateEnabled === true || row.auto_update_enabled === 'true',
    lastUpdated: new Date().toISOString(),
    weeklyActuals: [],
    comments: [],
    linkedInitiativeIds: row.linkedInitiativeIds ? parseMultiValue(row.linkedInitiativeIds) : [],
  };

  // Parse comments if present
  if (row.comments) {
    const commentParts = parseMultiValue(row.comments);
    kr.comments = commentParts.map((comment, i) => {
      const [author, type, content] = comment.split('|');
      return {
        id: `comment-${i}`,
        krId: id,
        author: author || 'Import',
        type: (type as any) || 'general',
        content: content || comment,
        timestamp: new Date().toISOString(),
      };
    });
  }

  return kr;
}

function transformRowToInitiative(row: Record<string, any>, _columns: CSVColumn[], _state: any): Initiative {
  const id = row.id || `initiative-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    id,
    title: row.title || row.initiative_title || '',
    description: row.description || row.initiative_description || '',
    teamId: row.teamId || row.team || '',
    owner: row.owner || row.initiative_owner || '',
    contributors: row.contributors ? parseMultiValue(row.contributors) : [],
    priority: row.priority || 'medium',
    status: row.status || 'planned',
    deadline: row.deadline || '',
    progress: parseFloat(row.progress) || 0,
    tags: row.tags ? parseMultiValue(row.tags) : [],
    budget: row.budget || '',
    resources: row.resources || '',
    linkedKRIds: row.linkedKRIds || row.linked_krs ? parseMultiValue(row.linkedKRIds || row.linked_krs) : [],
    milestones: [],
  };
}

function extractWeeklyData(
  data: Record<string, any>[],
  columns: CSVColumn[],
  prefix: string
): Record<string, Record<string, number>> {
  const weeklyData: Record<string, Record<string, number>> = {};

  data.forEach(row => {
    const krId = row.id || row.kr_id;
    if (!krId) return;

    columns.forEach(col => {
      if (col.csvHeader.startsWith(prefix)) {
        const weekMatch = col.csvHeader.match(/(\d{4}-w\d{2})/i);
        if (weekMatch) {
          const week = weekMatch[1].toUpperCase();
          const value = sanitizeNumericValue(row[col.csvHeader]);

          if (!weeklyData[krId]) {
            weeklyData[krId] = {};
          }
          weeklyData[krId][week] = value;
        }
      }
    });
  });

  return weeklyData;
}

// Re-export Papa for use in transformation
import Papa from 'papaparse';