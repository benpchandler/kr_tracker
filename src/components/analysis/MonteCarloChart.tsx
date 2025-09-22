import React from 'react';
import { KR } from '../../types';
import { MonteCarloForecast } from '../../metrics/monteCarlo';

interface MonteCarloChartProps {
  forecast: MonteCarloForecast;
  kr: KR;
}

export function MonteCarloChart({ forecast, kr }: MonteCarloChartProps) {
  const target = parseFloat(kr.target) || 0;
  const { p10, p50, p90 } = forecast.scenarios;
  
  // Calculate the range for visualization
  const min = Math.min(p10, target * 0.8);
  const max = Math.max(p90, target * 1.2);
  const range = max - min;

  // Calculate positions as percentages
  const getPosition = (value: number) => ((value - min) / range) * 100;

  const p10Pos = getPosition(p10);
  const p50Pos = getPosition(p50);
  const p90Pos = getPosition(p90);
  const targetPos = getPosition(target);

  return (
    <div className="relative h-12 bg-gray-100 rounded-lg overflow-hidden">
      {/* Probability distribution visualization as colored bands */}
      <div 
        className="absolute h-full bg-red-200"
        style={{
          left: `${Math.min(p10Pos, targetPos)}%`,
          width: `${Math.abs(targetPos - p10Pos)}%`
        }}
        title="Risk zone (below target)"
      />
      <div 
        className="absolute h-full bg-yellow-200"
        style={{
          left: `${p10Pos}%`,
          width: `${p50Pos - p10Pos}%`
        }}
        title="P10-P50 range"
      />
      <div 
        className="absolute h-full bg-green-200"
        style={{
          left: `${p50Pos}%`,
          width: `${p90Pos - p50Pos}%`
        }}
        title="P50-P90 range"
      />
      
      {/* Target line */}
      <div 
        className="absolute top-0 bottom-0 w-0.5 bg-black z-10"
        style={{ left: `${targetPos}%` }}
        title={`Target: ${target}`}
      >
        <div className="absolute -top-2 -left-2 w-4 h-4 bg-black rotate-45 transform origin-center" />
      </div>

      {/* Percentile markers */}
      <div 
        className="absolute top-1 bottom-1 w-0.5 bg-red-600"
        style={{ left: `${p10Pos}%` }}
        title={`P10: ${p10.toFixed(1)}`}
      />
      <div 
        className="absolute top-1 bottom-1 w-0.5 bg-blue-600"
        style={{ left: `${p50Pos}%` }}
        title={`P50: ${p50.toFixed(1)}`}
      />
      <div 
        className="absolute top-1 bottom-1 w-0.5 bg-green-600"
        style={{ left: `${p90Pos}%` }}
        title={`P90: ${p90.toFixed(1)}`}
      />

      {/* Value labels */}
      <div className="absolute -bottom-6 text-xs text-muted-foreground flex justify-between w-full">
        <span>{min.toFixed(0)}</span>
        <span>{max.toFixed(0)}</span>
      </div>
    </div>
  );
}