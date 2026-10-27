import React from 'react';
import { ErrorMetrics } from '../types';
import { Activity, AlertTriangle, Target, Percent, TrendingUp, ShieldCheck, Flame } from 'lucide-react';

interface MetricCardsProps {
  metrics: ErrorMetrics;
  showAdjusted: boolean;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ metrics, showAdjusted }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
      {/* 1. MAE */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">MAE</span>
          <Target className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {metrics.mae.toLocaleString()} <span className="text-xs font-normal text-slate-400">MW</span>
          </div>
          {showAdjusted && metrics.adjustedMae && (
            <div className="text-[11px] text-cyan-400 font-medium mt-1 flex items-center gap-1">
              <span>Adj: {metrics.adjustedMae.toLocaleString()} MW</span>
              <span className="text-emerald-400">(-{Math.round(metrics.mae - metrics.adjustedMae)} MW)</span>
            </div>
          )}
          <div className="text-[11px] text-slate-500 mt-1">Mean Absolute Error</div>
        </div>
      </div>

      {/* 2. WAPE */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">WAPE</span>
          <Percent className="w-4 h-4 text-sky-400" />
        </div>
        <div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {metrics.wape.toFixed(1)}<span className="text-xs font-normal text-slate-400">%</span>
          </div>
          {showAdjusted && metrics.adjustedWape && (
            <div className="text-[11px] text-cyan-400 font-medium mt-1 flex items-center gap-1">
              <span>Adj: {metrics.adjustedWape.toFixed(1)}%</span>
              <span className="text-emerald-400">(-{(metrics.wape - metrics.adjustedWape).toFixed(1)}%)</span>
            </div>
          )}
          <div className="text-[11px] text-slate-500 mt-1">Weighted Error / Actual</div>
        </div>
      </div>

      {/* 3. Bias */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Bias</span>
          <TrendingUp className={`w-4 h-4 ${metrics.bias > 0 ? 'text-amber-400' : 'text-purple-400'}`} />
        </div>
        <div>
          <div className={`text-2xl font-bold tracking-tight ${metrics.bias > 0 ? 'text-amber-400' : 'text-purple-400'}`}>
            {metrics.bias > 0 ? `+${metrics.bias.toLocaleString()}` : metrics.bias.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">MW</span>
          </div>
          <div className="text-[10px] text-amber-300/80 font-medium mt-1 leading-tight line-clamp-2" title="Possible explanations: curtailment, scope differences between WINDFOR and FUELHH; not verified.">
            Over-forecast (Hypothesis unverified)
          </div>
        </div>
      </div>

      {/* 4. RMSE */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">RMSE</span>
          <Activity className="w-4 h-4 text-rose-400" />
        </div>
        <div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {metrics.rmse.toLocaleString()} <span className="text-xs font-normal text-slate-400">MW</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Root Mean Square Error</div>
        </div>
      </div>

      {/* 5. P50 */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">P50 (Median)</span>
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {metrics.p50.toLocaleString()} <span className="text-xs font-normal text-slate-400">MW</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Median Absolute Error</div>
        </div>
      </div>

      {/* 6. P90 */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">P90 Margin</span>
          <AlertTriangle className="w-4 h-4 text-orange-400" />
        </div>
        <div>
          <div className="text-2xl font-bold text-orange-400 tracking-tight">
            {metrics.p90.toLocaleString()} <span className="text-xs font-normal text-slate-400">MW</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">90th Percentile Buffer</div>
        </div>
      </div>

      {/* 7. P99 */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">P99 Tail</span>
          <Flame className="w-4 h-4 text-red-400" />
        </div>
        <div>
          <div className="text-2xl font-bold text-red-400 tracking-tight">
            {metrics.p99.toLocaleString()} <span className="text-xs font-normal text-slate-400">MW</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Extreme Deviation Tail</div>
        </div>
      </div>
    </div>
  );
};
