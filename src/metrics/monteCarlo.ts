import { KR, Initiative, AggregationType } from '../types';
import { PlanBaseline, ActualData, KrWeekMetrics } from '../state/store';

export interface MonteCarloForecast {
  krId: string;
  scenarios: {
    p10: number;   // Pessimistic (10th percentile)
    p50: number;   // Median (50th percentile) 
    p90: number;   // Optimistic (90th percentile)
  };
  confidenceAdjusted: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  driverAnalysis: {
    initiativeCount: number;
    averageConfidence: number;
    totalImpact: number;
  };
}

export interface MonteCarloConfig {
  simulations: number;
  confidenceWeight: number; // How much confidence affects variance
  baseVariance: number;     // Baseline forecast uncertainty
}

const DEFAULT_CONFIG: MonteCarloConfig = {
  simulations: 1000,
  confidenceWeight: 0.3,
  baseVariance: 0.15
};

/**
 * Run Monte Carlo simulation for a KR's end-of-period forecast
 * Uses initiative confidence to adjust forecast uncertainty
 */
export function runMonteCarloForecast(
  kr: KR,
  initiatives: Initiative[],
  baseline: PlanBaseline,
  actuals: ActualData,
  weeks: string[],
  config: MonteCarloConfig = DEFAULT_CONFIG
): MonteCarloForecast {
  
  // Get related initiatives for this KR
  const krInitiatives = initiatives.filter(init => 
    init.linkedKRIds.includes(kr.id)
  );

  // Calculate baseline forecast using existing logic
  const baselineForecast = calculateBaselineForecast(kr, baseline, actuals, weeks);
  
  // Calculate confidence-adjusted parameters
  const confidenceMetrics = calculateConfidenceMetrics(krInitiatives);
  const adjustedVariance = calculateAdjustedVariance(
    confidenceMetrics.averageConfidence,
    config
  );

  // Run Monte Carlo simulations
  const simResults = runSimulations(
    baselineForecast,
    adjustedVariance,
    config.simulations
  );

  // Calculate percentiles
  const sortedResults = simResults.sort((a, b) => a - b);
  const p10Index = Math.floor(config.simulations * 0.1);
  const p50Index = Math.floor(config.simulations * 0.5);
  const p90Index = Math.floor(config.simulations * 0.9);

  const scenarios = {
    p10: sortedResults[p10Index],
    p50: sortedResults[p50Index],
    p90: sortedResults[p90Index]
  };

  // Determine risk level based on confidence and variance
  const riskLevel = determineRiskLevel(
    confidenceMetrics.averageConfidence,
    adjustedVariance
  );

  return {
    krId: kr.id,
    scenarios,
    confidenceAdjusted: krInitiatives.length > 0,
    riskLevel,
    driverAnalysis: {
      initiativeCount: krInitiatives.length,
      averageConfidence: confidenceMetrics.averageConfidence,
      totalImpact: confidenceMetrics.totalImpact
    }
  };
}

/**
 * Calculate baseline forecast using deterministic approach
 */
function calculateBaselineForecast(
  kr: KR,
  baseline: PlanBaseline,
  actuals: ActualData,
  weeks: string[]
): number {
  const currentWeekIndex = getCurrentWeekIndex(weeks);
  if (currentWeekIndex === -1) return parseFloat(kr.target) || 0;

  const aggregation: AggregationType = (kr as any).aggregationType || 'cumulative';
  
  // Calculate rolling 3-week average for trend
  const rolling3 = calculateRolling3Average(kr.id, currentWeekIndex, weeks, actuals);
  const remainingWeeks = weeks.length - currentWeekIndex - 1;

  switch (aggregation) {
    case 'cumulative': {
      let currentTotal = 0;
      weeks.slice(0, currentWeekIndex + 1).forEach(week => {
        currentTotal += actuals[kr.id]?.[week] || 0;
      });
      return currentTotal + (rolling3 * remainingWeeks);
    }
    
    case 'snapshot':
    case 'average':
      return rolling3 > 0 ? rolling3 : parseFloat(kr.current) || 0;
    
    default:
      return parseFloat(kr.target) || 0;
  }
}

/**
 * Calculate confidence metrics from initiatives
 */
function calculateConfidenceMetrics(initiatives: Initiative[]): {
  averageConfidence: number;
  totalImpact: number;
} {
  if (initiatives.length === 0) {
    return { averageConfidence: 0.5, totalImpact: 0 };
  }

  const totalImpact = initiatives.reduce((sum, init) => sum + (init as any).impact || 0, 0);
  const weightedConfidence = initiatives.reduce((sum, init) => {
    const impact = (init as any).impact || 0;
    const confidence = (init as any).confidence || 0.5;
    return sum + (impact * confidence);
  }, 0);

  const averageConfidence = totalImpact > 0 ? weightedConfidence / totalImpact : 0.5;
  
  return { averageConfidence, totalImpact };
}

/**
 * Calculate variance adjusted by confidence levels
 */
function calculateAdjustedVariance(
  averageConfidence: number,
  config: MonteCarloConfig
): number {
  // Lower confidence = higher variance
  // Confidence ranges from 0 to 1, we want to invert this relationship
  const confidenceFactor = 1 - averageConfidence;
  const adjustedVariance = config.baseVariance * (1 + confidenceFactor * config.confidenceWeight);
  
  return Math.max(0.05, Math.min(0.5, adjustedVariance)); // Clamp between 5% and 50%
}

/**
 * Run Monte Carlo simulations with normal distribution
 */
function runSimulations(
  baselineForecast: number,
  variance: number,
  simulations: number
): number[] {
  const results: number[] = [];
  const stdDev = baselineForecast * variance;

  for (let i = 0; i < simulations; i++) {
    // Box-Muller transformation for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    
    const simulatedValue = baselineForecast + (z0 * stdDev);
    results.push(Math.max(0, simulatedValue)); // Ensure non-negative results
  }

  return results;
}

/**
 * Determine risk level based on confidence and variance
 */
function determineRiskLevel(
  averageConfidence: number,
  variance: number
): 'low' | 'medium' | 'high' {
  if (averageConfidence >= 0.8 && variance <= 0.2) return 'low';
  if (averageConfidence >= 0.6 && variance <= 0.3) return 'medium';
  return 'high';
}

/**
 * Helper functions
 */
function getCurrentWeekIndex(weeks: string[]): number {
  const today = new Date();
  const currentWeek = getISOWeek(today);
  return weeks.indexOf(currentWeek);
}

function getISOWeek(date: Date): string {
  const year = date.getFullYear();
  const start = new Date(year, 0, 1);
  const diff = date.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  const week = Math.ceil(diff / oneWeek);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

function calculateRolling3Average(
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

/**
 * Batch process multiple KRs for analysis dashboard
 */
export function runBatchMonteCarloForecasts(
  krs: KR[],
  initiatives: Initiative[],
  baseline: PlanBaseline,
  actuals: ActualData,
  weeks: string[],
  config?: MonteCarloConfig
): MonteCarloForecast[] {
  return krs.map(kr => 
    runMonteCarloForecast(kr, initiatives, baseline, actuals, weeks, config)
  );
}