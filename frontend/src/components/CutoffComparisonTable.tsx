import React from 'react';
import { CutoffComparisonItem } from '../types';
import { Check, Table, ChevronRight } from 'lucide-react';

interface CutoffComparisonTableProps {
  comparisons: CutoffComparisonItem[];
  selectedHour: number;
  selectedMinute: number;
  onSelectCutoff: (hour: number, minute: number) => void;
}

export const CutoffComparisonTable: React.FC<CutoffComparisonTableProps> = ({
  comparisons,
  selectedHour,
  selectedMinute,
  onSelectCutoff,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 mb-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Table className="w-5 h-5 text-indigo-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">
            Alternative Day-Ahead Decision Cutoffs (Side-by-Side Comparison)
          </h2>
        </div>
        <span className="text-xs text-slate-400">
          Evaluated across all 744 hours of January 2026
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300 border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-3">Cutoff Gate (D-1)</th>
              <th className="py-2.5 px-3 text-right">Avg Horizon</th>
              <th className="py-2.5 px-3 text-right">MAE (MW)</th>
              <th className="py-2.5 px-3 text-right">RMSE (MW)</th>
              <th className="py-2.5 px-3 text-right">Bias (MW)</th>
              <th className="py-2.5 px-3 text-right">WAPE (%)</th>
              <th className="py-2.5 px-3 text-right">P50 (MW)</th>
              <th className="py-2.5 px-3 text-right">P90 (MW)</th>
              <th className="py-2.5 px-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {comparisons.map((c) => {
              const isSelected = selectedHour === c.cutoffHour && selectedMinute === c.cutoffMinute;
              return (
                <tr
                  key={c.cutoffLabel}
                  className={`transition-colors ${
                    isSelected ? 'bg-indigo-500/10 font-medium' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{c.cutoffLabel}</span>
                      {c.isAssumedDefault && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Assumed Default
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-300">
                    {c.avgHorizonHours.toFixed(1)} h
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-emerald-400 font-bold">
                    {c.mae.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-rose-300">
                    {c.rmse.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-amber-300 font-semibold">
                    +{c.bias.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-sky-400 font-bold">
                    {c.wape.toFixed(2)}%
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-300">
                    {c.p50.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-orange-400 font-semibold">
                    {c.p90.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                        <Check className="w-3.5 h-3.5" /> Selected
                      </span>
                    ) : (
                      <button
                        onClick={() => onSelectCutoff(c.cutoffHour, c.cutoffMinute)}
                        className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
                      >
                        Apply <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
