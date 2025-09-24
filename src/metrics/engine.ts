import { KR, AggregationType, HealthThresholds } from '../types';
import { PlanBaseline, ActualData, KrWeekMetrics } from '../state/store';

export type Aggregation = AggregationType;

// Default health thresholds
export const DEFAULT_HEALTH_THRESHOLDS: HealthThresholds = {
  green: 99,  // >= 99% of plan
  yellow: 95, // >= 95% but < 99%
  // red: < 95%
};

interface MetricsInput {
  krs: KR[];
  baseline: PlanBaseline;
  actuals: ActualData;
  weeks: string[];
  currentWeekIndex: number;
  healthThresholds?: HealthThresholds;
}

// Main metrics computation function
export function computeMetrics({
  krs,
  baseline,
  actuals,
  weeks,
  currentWeekIndex,
  healthThresholds = DEFAULT_HEALTH_THRESHOLDS
}: MetricsInput): KrWeekMetrics[] {
  const metrics: KrWeekMetrics[] = [];

  krs.forEach(kr => {
    weeks.forEach((weekISO, weekIndex) => {
      const metric = computeKrWeekMetrics(
        kr,
        weekISO,
        weekIndex,
        weeks,
        baseline,
        actuals,
        healthThresholds
      );
      metrics.push(metric);
    });
  });

  return metrics;
}

export interface MetricsSummary {
  byKr: Record<string, KrWeekMetrics>;
  healthCounts: Record<'green' | 'yellow' | 'red', number>;
  averagePaceToDatePct: number;
  averageForecastEOP: number;
}

export function summarizeMetrics(
  metrics: KrWeekMetrics[],
  weeks: string[]
): MetricsSummary {
  const weekOrder = new Map<string, number>();
  weeks.forEach((week, index) => weekOrder.set(week, index));

  const latestByKr: Record<string, KrWeekMetrics> = {};

  metrics.forEach(metric => {
    const existing = latestByKr[metric.krId];
    if (!existing) {
      latestByKr[metric.krId] = metric;
      return;
    }

    const currentIndex = weekOrder.get(metric.weekISO) ?? -Infinity;
    const existingIndex = weekOrder.get(existing.weekISO) ?? -Infinity;

    if (currentIndex > existingIndex) {
      latestByKr[metric.krId] = metric;
    } else if (currentIndex === existingIndex) {
      const currentActual = Number.isFinite(metric.actual) ? metric.actual : 0;
      const existingActual = Number.isFinite(existing.actual) ? existing.actual : 0;
      if (currentActual >= existingActual) {
        latestByKr[metric.krId] = metric;
      }
    }
  });

  const healthCounts: Record<'green' | 'yellow' | 'red', number> = {
    green: 0,
    yellow: 0,
    red: 0
  };

  let paceSum = 0;
  let paceCount = 0;
  let forecastSum = 0;
  let forecastCount = 0;

  Object.values(latestByKr).forEach(metric => {
    healthCounts[metric.health] += 1;

    if (Number.isFinite(metric.paceToDatePct)) {
      paceSum += metric.paceToDatePct;
      paceCount += 1;
    }

    if (Number.isFinite(metric.forecastEOP)) {
      forecastSum += metric.forecastEOP;
      forecastCount += 1;
    }
  });

  return {
    byKr: latestByKr,
    healthCounts,
    averagePaceToDatePct: paceCount > 0 ? paceSum / paceCount : 0,
    averageForecastEOP: forecastCount > 0 ? forecastSum / forecastCount : 0
  };
}

// Compute metrics for a single KR and week
function computeKrWeekMetrics(
  kr: KR,
  weekISO: string,
  weekIndex: number,
  weeks: string[],
  baseline: PlanBaseline,
  actuals: ActualData,
  healthThresholds: HealthThresholds
): KrWeekMetrics {
  const plan = baseline.data[kr.id]?.[weekISO] || 0;
  const actual = actuals[kr.id]?.[weekISO] || 0;

  // Get aggregation type (default to cumulative)
  const aggregation: AggregationType = (kr as any).aggregationType || 'cumulative';

  // Calculate week-over-week change
  const { deltaWoW, deltaWoWPct } = calculateWoWChange(
    kr.id,
    weekISO,
    weekIndex,
    weeks,
    actuals
  );

  // Calculate 3-week rolling average
  const rolling3 = calculateRolling3(
    kr.id,
    weekIndex,
    weeks,
    actuals
  );

  // Calculate pace to date percentage
  const paceToDatePct = calculatePaceToDate(
    kr,
    weekIndex,
    weeks,
    baseline,
    actuals,
    aggregation
  );

  // Calculate end-of-period forecast
  const forecastEOP = calculateForecast(
    kr,
    weekIndex,
    weeks,
    actuals,
    rolling3,
    aggregation
  );

  // Calculate weekly variance
  const varianceWeekly = actual - plan;

  // Determine health status
  const health = determineHealth(
    paceToDatePct,
    healthThresholds
  );

  return {
    krId: kr.id,
    weekISO,
    plan,
    actual,
    deltaWoW,
    deltaWoWPct,
    rolling3,
    paceToDatePct,
    forecastEOP,
    health,
    varianceWeekly
  };
}

// Calculate week-over-week change
export function calculateWoWChange(
  krId: string,
  currentWeek: string,
  weekIndex: number,
  weeks: string[],
  actuals: ActualData
): { deltaWoW: number; deltaWoWPct: number } {
  if (weekIndex === 0) {
    return { deltaWoW: 0, deltaWoWPct: 0 };
  }

  const currentValue = actuals[krId]?.[currentWeek] || 0;
  const previousWeek = weeks[weekIndex - 1];
  const previousValue = actuals[krId]?.[previousWeek] || 0;

  const deltaWoW = currentValue - previousValue;
  const deltaWoWPct = previousValue !== 0
    ? (deltaWoW / previousValue) * 100
    : 0;

  return { deltaWoW, deltaWoWPct };
}

// Calculate 3-week rolling average
export function calculateRolling3(
  krId: string,
  weekIndex: number,
  weeks: string[],
  actuals: ActualData
): number {
  const startIndex = Math.max(0, weekIndex - 2);
  const endIndex = weekIndex + 1;
  const relevantWeeks = weeks.slice(startIndex, endIndex);

  const values = relevantWeeks
    .map(week => actuals[krId]?.[week])
    .filter(v => v !== undefined && v !== null) as number[];

  if (values.length === 0) return 0;

  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

// Calculate pace to date percentage based on aggregation type
export function calculatePaceToDate(
  kr: KR,
  weekIndex: number,
  weeks: string[],
  baseline: PlanBaseline,
  actuals: ActualData,
  aggregation: AggregationType
): number {
  const weeksToDate = weeks.slice(0, weekIndex + 1);

  switch (aggregation) {
    case 'cumulative': {
      // Sum of actuals vs sum of plan
      let planSum = 0;
      let actualSum = 0;

      weeksToDate.forEach(week => {
        planSum += baseline.data[kr.id]?.[week] || 0;
        actualSum += actuals[kr.id]?.[week] || 0;
      });

      return planSum !== 0 ? (actualSum / planSum) * 100 : 0;
    }

    case 'snapshot': {
      // Latest actual vs latest plan
      const currentWeek = weeks[weekIndex];
      const plan = baseline.data[kr.id]?.[currentWeek] || 0;
      const actual = actuals[kr.id]?.[currentWeek] || 0;

      return plan !== 0 ? (actual / plan) * 100 : 0;
    }

    case 'average': {
      // Average of actuals vs average of plan
      const planValues: number[] = [];
      const actualValues: number[] = [];

      weeksToDate.forEach(week => {
        const planVal = baseline.data[kr.id]?.[week];
        const actualVal = actuals[kr.id]?.[week];

        if (planVal !== undefined) planValues.push(planVal);
        if (actualVal !== undefined) actualValues.push(actualVal);
      });

      const planAvg = planValues.length > 0
        ? planValues.reduce((a, b) => a + b, 0) / planValues.length
        : 0;

      const actualAvg = actualValues.length > 0
        ? actualValues.reduce((a, b) => a + b, 0) / actualValues.length
        : 0;

      return planAvg !== 0 ? (actualAvg / planAvg) * 100 : 0;
    }

    default:
      return 0;
  }
}

// Calculate end-of-period forecast based on aggregation type
export function calculateForecast(
  kr: KR,
  weekIndex: number,
  weeks: string[],
  actuals: ActualData,
  rolling3: number,
  aggregation: AggregationType
): number {
  const remainingWeeks = weeks.length - weekIndex - 1;
  const target = parseFloat(kr.target) || 0;

  switch (aggregation) {
    case 'cumulative': {
      // Current total + (rolling3 × remaining weeks)
      let currentTotal = 0;
      weeks.slice(0, weekIndex + 1).forEach(week => {
        currentTotal += actuals[kr.id]?.[week] || 0;
      });

      return currentTotal + (rolling3 * remainingWeeks);
    }

    case 'snapshot': {
      // Use rolling3 or latest actual
      const currentWeek = weeks[weekIndex];
      const latestActual = actuals[kr.id]?.[currentWeek] || 0;

      return rolling3 > 0 ? rolling3 : latestActual;
    }

    case 'average': {
      // Rolling3 average projected forward
      return rolling3;
    }

    default:
      return target;
  }
}

// Determine health status based on pace percentage
export function determineHealth(
  paceToDatePct: number,
  thresholds: HealthThresholds
): 'green' | 'yellow' | 'red' {
  if (paceToDatePct >= thresholds.green) return 'green';
  if (paceToDatePct >= thresholds.yellow) return 'yellow';
  return 'red';
}

// Calculate metrics for display without needing all weeks
export function calculateQuickMetrics(
  kr: KR,
  baseline: PlanBaseline,
  actuals: ActualData,
  currentWeek: string
): Partial<KrWeekMetrics> {
  const plan = baseline.data[kr.id]?.[currentWeek] || 0;
  const actual = actuals[kr.id]?.[currentWeek] || 0;
  const varianceWeekly = actual - plan;

  const paceToDatePct = plan !== 0 ? (actual / plan) * 100 : 0;
  const health = determineHealth(paceToDatePct, DEFAULT_HEALTH_THRESHOLDS);

  return {
    krId: kr.id,
    weekISO: currentWeek,
    plan,
    actual,
    varianceWeekly,
    paceToDatePct,
    health
  };
}

export { generateWeeks } from '../utils/weeks';
