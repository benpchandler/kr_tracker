import React, { useMemo } from 'react';
import { useAppState } from '../../state/store';
import { runBatchMonteCarloForecasts } from '../../metrics/monteCarlo';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, Target, BarChart3 } from 'lucide-react';
import { MonteCarloChart } from './MonteCarloChart';

export function AnalysisPanel() {
  const { state } = useAppState();
  const { krs, initiatives, planBaselines, currentBaselineId, actuals, currentPeriod } = state;

  // Get current baseline
  const currentBaseline = useMemo(() => {
    if (!currentBaselineId) return null;
    return planBaselines.find(b => b.id === currentBaselineId);
  }, [planBaselines, currentBaselineId]);

  // Generate weeks for the current period
  const weeks = useMemo(() => {
    if (!currentPeriod) return [];
    
    // Simple week generation - in real implementation, use your weeks utility
    const start = new Date(currentPeriod.startISO);
    const end = new Date(currentPeriod.endISO);
    const weeks: string[] = [];
    
    const current = new Date(start);
    let weekNum = 1;
    
    while (current <= end) {
      const year = current.getFullYear();
      const weekStr = `${year}-W${weekNum.toString().padStart(2, '0')}`;
      weeks.push(weekStr);
      current.setDate(current.getDate() + 7);
      weekNum++;
    }
    
    return weeks;
  }, [currentPeriod]);

  // Run Monte Carlo forecasts
  const forecasts = useMemo(() => {
    if (!currentBaseline || weeks.length === 0) return [];
    
    return runBatchMonteCarloForecasts(
      krs,
      initiatives,
      currentBaseline,
      actuals,
      weeks
    );
  }, [krs, initiatives, currentBaseline, actuals, weeks]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    if (forecasts.length === 0) {
      return {
        totalKRs: 0,
        highRisk: 0,
        mediumRisk: 0,
        lowRisk: 0,
        averageConfidence: 0
      };
    }

    const riskCounts = forecasts.reduce(
      (acc, forecast) => {
        acc[forecast.riskLevel]++;
        return acc;
      },
      { high: 0, medium: 0, low: 0 }
    );

    const averageConfidence = forecasts.reduce(
      (sum, forecast) => sum + forecast.driverAnalysis.averageConfidence,
      0
    ) / forecasts.length;

    return {
      totalKRs: forecasts.length,
      highRisk: riskCounts.high,
      mediumRisk: riskCounts.medium,
      lowRisk: riskCounts.low,
      averageConfidence
    };
  }, [forecasts]);

  if (!currentBaseline) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Analysis Mode</h2>
          <p className="text-muted-foreground mb-4">
            Lock a plan baseline to enable Monte Carlo forecasting and risk analysis.
          </p>
          <p className="text-sm text-muted-foreground">
            Analysis mode provides probabilistic forecasts using initiative confidence data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analysis Dashboard</h1>
          <p className="text-muted-foreground">
            Monte Carlo forecasting and risk analysis powered by initiative confidence
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Target className="h-3 w-3" />
          {forecasts.length} KRs Analyzed
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Risk</p>
                <p className="text-2xl font-bold text-red-600">{summary.highRisk}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Medium Risk</p>
                <p className="text-2xl font-bold text-yellow-600">{summary.mediumRisk}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Low Risk</p>
                <p className="text-2xl font-bold text-green-600">{summary.lowRisk}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Confidence</p>
                <p className="text-2xl font-bold">
                  {(summary.averageConfidence * 100).toFixed(0)}%
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monte Carlo Forecasts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Monte Carlo Forecasts
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Probabilistic end-of-period forecasts adjusted by initiative confidence levels
          </p>
        </CardHeader>
        <CardContent>
          {forecasts.length > 0 ? (
            <div className="space-y-4">
              {forecasts.slice(0, 6).map((forecast) => {
                const kr = krs.find(k => k.id === forecast.krId);
                if (!kr) return null;

                return (
                  <div key={forecast.krId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{kr.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Target: {kr.target} • {forecast.driverAnalysis.initiativeCount} initiatives
                        </p>
                      </div>
                      <Badge 
                        variant={
                          forecast.riskLevel === 'high' ? 'destructive' :
                          forecast.riskLevel === 'medium' ? 'secondary' : 'default'
                        }
                      >
                        {forecast.riskLevel} risk
                      </Badge>
                    </div>
                    
                    <MonteCarloChart forecast={forecast} kr={kr} />
                    
                    <div className="flex justify-between text-sm text-muted-foreground mt-2">
                      <span>P10: {forecast.scenarios.p10.toFixed(1)}</span>
                      <span>P50: {forecast.scenarios.p50.toFixed(1)}</span>
                      <span>P90: {forecast.scenarios.p90.toFixed(1)}</span>
                    </div>
                  </div>
                );
              })}
              
              {forecasts.length > 6 && (
                <div className="text-center py-4 text-muted-foreground">
                  + {forecasts.length - 6} more KRs with Monte Carlo forecasts
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No KRs available for Monte Carlo analysis</p>
              <p className="text-sm">Add KRs and initiatives to see forecasts</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}