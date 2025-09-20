import { KR, AggregationType } from '../types';
import { KrWeekMetrics } from '../state/store';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Gauge,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

interface MetricsDisplayProps {
  krs: KR[];
  metrics: KrWeekMetrics[];
  currentWeek: string;
}

export function MetricsDisplay({ krs, metrics, currentWeek }: MetricsDisplayProps) {
  // Group metrics by KR
  const metricsByKr = metrics.reduce((acc, metric) => {
    if (!acc[metric.krId]) {
      acc[metric.krId] = [];
    }
    acc[metric.krId].push(metric);
    return acc;
  }, {} as Record<string, KrWeekMetrics[]>);

  // Get current week metrics for a KR
  const getCurrentMetrics = (krId: string): KrWeekMetrics | null => {
    const krMetrics = metricsByKr[krId] || [];
    return krMetrics.find(m => m.weekISO === currentWeek) || null;
  };

  // Calculate overall health
  const getOverallHealth = () => {
    const currentMetrics = krs.map(kr => getCurrentMetrics(kr.id)).filter(Boolean) as KrWeekMetrics[];
    if (currentMetrics.length === 0) return 'gray';

    const healthCounts = currentMetrics.reduce((acc, m) => {
      acc[m.health] = (acc[m.health] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    if (healthCounts.red > currentMetrics.length * 0.3) return 'red';
    if (healthCounts.yellow > currentMetrics.length * 0.4) return 'yellow';
    return 'green';
  };

  // Format percentage
  const formatPct = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Format number
  const formatNum = (value: number, unit: string): string => {
    if (unit === '%') return `${value.toFixed(1)}%`;
    if (unit === '$') return `$${value.toLocaleString()}`;
    return value.toLocaleString();
  };

  // Get health icon
  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'green':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'yellow':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'red':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  // Get health badge color
  const getHealthBadgeClass = (health: string) => {
    switch (health) {
      case 'green':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'red':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const overallHealth = getOverallHealth();
  const totalKRs = krs.length;
  const krsWithActuals = krs.filter(kr => getCurrentMetrics(kr.id)).length;

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              Metrics Overview
            </span>
            <Badge className={cn("gap-1", getHealthBadgeClass(overallHealth))}>
              {getHealthIcon(overallHealth)}
              Overall Health
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">KRs Tracked</div>
              <div className="text-2xl font-bold">{krsWithActuals} / {totalKRs}</div>
              <Progress value={(krsWithActuals / totalKRs) * 100} className="h-2" />
            </div>

            {overallHealth !== 'gray' && (
              <>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">On Track</div>
                  <div className="text-2xl font-bold text-green-600">
                    {metrics.filter(m => m.weekISO === currentWeek && m.health === 'green').length}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">At Risk</div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {metrics.filter(m => m.weekISO === currentWeek && m.health === 'yellow').length}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Off Track</div>
                  <div className="text-2xl font-bold text-red-600">
                    {metrics.filter(m => m.weekISO === currentWeek && m.health === 'red').length}
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KR Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {krs.map(kr => {
          const currentMetric = getCurrentMetrics(kr.id);

          if (!currentMetric) {
            return (
              <Card key={kr.id} className="opacity-60">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="truncate">{kr.title}</span>
                    <Badge variant="outline" className="text-xs">No Data</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Enter actuals to see metrics
                  </p>
                </CardContent>
              </Card>
            );
          }

          const isPositiveVariance = currentMetric.varianceWeekly >= 0;
          const isPositiveDelta = currentMetric.deltaWoW >= 0;

          return (
            <Card key={kr.id}>
              <CardHeader>
                <div className="space-y-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="truncate">{kr.title}</span>
                    <Badge className={cn("gap-1", getHealthBadgeClass(currentMetric.health))}>
                      {getHealthIcon(currentMetric.health)}
                      {currentMetric.health.charAt(0).toUpperCase() + currentMetric.health.slice(1)}
                    </Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Target: {kr.target} {kr.unit}</span>
                    <span>•</span>
                    <span>Week {currentWeek.split('-W')[1]}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {/* Plan vs Actual */}
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground uppercase">Plan vs Actual</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-semibold">
                        {formatNum(currentMetric.actual, kr.unit)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        / {formatNum(currentMetric.plan, kr.unit)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {isPositiveVariance ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      <span className={cn(
                        "text-xs",
                        isPositiveVariance ? "text-green-600" : "text-red-600"
                      )}>
                        {formatNum(Math.abs(currentMetric.varianceWeekly), kr.unit)}
                      </span>
                    </div>
                  </div>

                  {/* Week over Week */}
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground uppercase">Week/Week</div>
                    <div className="flex items-baseline gap-2">
                      <span className={cn(
                        "text-lg font-semibold",
                        isPositiveDelta ? "text-green-600" : "text-red-600"
                      )}>
                        {formatPct(currentMetric.deltaWoWPct)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {isPositiveDelta ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatNum(Math.abs(currentMetric.deltaWoW), kr.unit)}
                      </span>
                    </div>
                  </div>

                  {/* Pace to Date */}
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground uppercase">Pace to Date</div>
                    <div className="flex items-baseline gap-2">
                      <span className={cn(
                        "text-lg font-semibold",
                        currentMetric.paceToDatePct >= 100 ? "text-green-600" :
                        currentMetric.paceToDatePct >= 95 ? "text-yellow-600" : "text-red-600"
                      )}>
                        {currentMetric.paceToDatePct.toFixed(1)}%
                      </span>
                    </div>
                    <Progress
                      value={Math.min(100, currentMetric.paceToDatePct)}
                      className="h-1.5"
                    />
                  </div>

                  {/* End of Period Forecast */}
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground uppercase">EOP Forecast</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-semibold">
                        {formatNum(currentMetric.forecastEOP, kr.unit)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        / {kr.target}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {((currentMetric.forecastEOP / parseFloat(kr.target)) * 100).toFixed(1)}% of target
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rolling 3-Week Average */}
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">3-Week Rolling Avg</span>
                    </div>
                    <span className="text-sm font-medium">
                      {formatNum(currentMetric.rolling3, kr.unit)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}