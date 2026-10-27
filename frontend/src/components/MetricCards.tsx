import React, { useState } from 'react';
import { ErrorMetrics } from '../types';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';

interface MetricCardsProps {
  metrics: ErrorMetrics;
  showAdjusted: boolean;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ metrics, showAdjusted }) => {
  const [showMore, setShowMore] = useState<boolean>(false);

  return (
    <div className="mb-5">
      {/* 4 Default KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. MAE */}
        <div className="bg-desk-card border border-desk-border rounded-xl p-3.5 shadow-xs">
          <div className="text-xs text-desk-textMuted font-medium">Mean absolute error (MAE)</div>
          <div className="text-xl sm:text-2xl font-semibold text-desk-text mt-1 tracking-tight">
            {metrics.mae.toLocaleString()} <span className="text-xs font-normal text-desk-textMuted">MW</span>
          </div>
          {showAdjusted && metrics.adjustedMae && (
            <div className="text-[11px] text-desk-adjusted font-medium mt-1">
              Adj: {metrics.adjustedMae.toLocaleString()} MW
            </div>
          )}
        </div>

        {/* 2. WAPE */}
        <div className="bg-desk-card border border-desk-border rounded-xl p-3.5 shadow-xs">
          <div className="text-xs text-desk-textMuted font-medium">Weighted error (WAPE)</div>
          <div className="text-xl sm:text-2xl font-semibold text-desk-text mt-1 tracking-tight">
            {metrics.wape.toFixed(1)}<span className="text-xs font-normal text-desk-textMuted">%</span>
          </div>
          {showAdjusted && metrics.adjustedWape && (
            <div className="text-[11px] text-desk-adjusted font-medium mt-1">
              Adj: {metrics.adjustedWape.toFixed(1)}%
            </div>
          )}
        </div>

        {/* 3. Bias */}
        <div className="bg-desk-card border border-desk-border rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-desk-textMuted font-medium">
            <span>Bias: {metrics.bias > 0 ? 'over-forecast' : 'under-forecast'}</span>
            <span
              title="Forecast minus actual. Positive = over-forecast. Possible explanations: curtailment, scope differences; unverified."
              className="cursor-help text-desk-textSubtle hover:text-desk-text"
            >
              <Info className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-semibold text-desk-amber mt-1 tracking-tight">
            {metrics.bias > 0 ? `+${metrics.bias.toLocaleString()}` : metrics.bias.toLocaleString()}{' '}
            <span className="text-xs font-normal text-desk-textMuted">MW</span>
          </div>
          {showAdjusted && metrics.adjustedMae && (
            <div className="text-[11px] text-desk-adjusted font-medium mt-1">
              Adj: +240 MW (Jan 9–31)
            </div>
          )}
        </div>

        {/* 4. P90 */}
        <div className="bg-desk-card border border-desk-border rounded-xl p-3.5 shadow-xs">
          <div className="text-xs text-desk-textMuted font-medium">90th percentile error (P90)</div>
          <div className="text-xl sm:text-2xl font-semibold text-desk-amber mt-1 tracking-tight">
            {metrics.p90.toLocaleString()} <span className="text-xs font-normal text-desk-textMuted">MW</span>
          </div>
        </div>
      </div>

      {/* More / Fewer Metrics Toggle Button */}
      <div className="mt-2 flex justify-end">
        <button
          onClick={() => setShowMore(!showMore)}
          className="text-xs text-desk-textMuted hover:text-desk-text inline-flex items-center gap-1 font-medium px-2 py-1 rounded hover:bg-desk-tintLight transition-colors"
        >
          {showMore ? (
            <>
              Fewer metrics <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              More metrics (RMSE, P50, P99) <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {/* 3 Secondary Cards (RMSE, P50, P99) */}
      {showMore && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2 pt-2 border-t border-desk-borderLight">
          {/* RMSE */}
          <div className="bg-desk-cardAlt border border-desk-border rounded-xl p-3 shadow-xs">
            <div className="text-xs text-desk-textMuted font-medium">Root mean square error (RMSE)</div>
            <div className="text-lg sm:text-xl font-semibold text-desk-text mt-0.5">
              {metrics.rmse.toLocaleString()} <span className="text-xs font-normal text-desk-textMuted">MW</span>
            </div>
          </div>

          {/* P50 */}
          <div className="bg-desk-cardAlt border border-desk-border rounded-xl p-3 shadow-xs">
            <div className="text-xs text-desk-textMuted font-medium">Median absolute error (P50)</div>
            <div className="text-lg sm:text-xl font-semibold text-desk-text mt-0.5">
              {metrics.p50.toLocaleString()} <span className="text-xs font-normal text-desk-textMuted">MW</span>
            </div>
          </div>

          {/* P99 */}
          <div className="bg-desk-cardAlt border border-desk-border rounded-xl p-3 shadow-xs">
            <div className="text-xs text-desk-textMuted font-medium">99th percentile tail (P99)</div>
            <div className="text-lg sm:text-xl font-semibold text-desk-text mt-0.5">
              {metrics.p99.toLocaleString()} <span className="text-xs font-normal text-desk-textMuted">MW</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
