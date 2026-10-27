import React from 'react';
import { CutoffComparisonItem } from '../types';
import { Check } from 'lucide-react';

interface CutoffComparisonTableProps {
  comparisons: CutoffComparisonItem[];
  selectedHour: number;
  selectedMinute: number;
  onSelectCutoff: (hour: number, minute: number) => void;
}

function getShortLabel(item: CutoffComparisonItem): string {
  if (item.cutoffHour === 9 && item.cutoffMinute === 20) return '09:20 UTC (EPEX 60m)';
  if (item.cutoffHour === 9 && item.cutoffMinute === 50) return '09:50 UTC (N2EX Default)';
  if (item.cutoffHour === 11 && item.cutoffMinute === 0) return '11:00 UTC (SDAC)';
  if (item.cutoffHour === 12 && item.cutoffMinute === 0) return '12:00 UTC (Later cutoff)';
  return item.cutoffLabel;
}

export const CutoffComparisonTable: React.FC<CutoffComparisonTableProps> = ({
  comparisons,
  selectedHour,
  selectedMinute,
  onSelectCutoff,
}) => {
  return (
    <div className="bg-desk-card border border-desk-border rounded-xl p-4 mb-5 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-desk-text">
          Alternative Cutoffs (Side-by-Side Comparison)
        </h2>
        <span className="text-[11px] text-desk-textMuted">
          Evaluated across all 744 hours of January 2026
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-desk-border text-desk-textMuted font-medium text-[11px]">
              <th className="py-2 px-2.5">Cutoff Gate</th>
              <th className="py-2 px-2 text-right">Avg Horizon</th>
              <th className="py-2 px-2 text-right">MAE (MW)</th>
              <th className="py-2 px-2 text-right">RMSE (MW)</th>
              <th className="py-2 px-2 text-right">Bias (MW)</th>
              <th className="py-2 px-2 text-right">WAPE (%)</th>
              <th className="py-2 px-2 text-right">P50 (MW)</th>
              <th className="py-2 px-2 text-right">P90 (MW)</th>
              <th className="py-2 px-2.5 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-desk-borderLight">
            {comparisons.map((c) => {
              const isSelected = selectedHour === c.cutoffHour && selectedMinute === c.cutoffMinute;
              return (
                <tr
                  key={c.cutoffLabel}
                  className={`transition-colors ${
                    isSelected ? 'bg-desk-tint/70 font-medium' : 'hover:bg-desk-tintLight'
                  }`}
                >
                  <td className="py-2.5 px-2.5 text-desk-text font-medium" title={c.cutoffLabel}>
                    <div className="flex items-center gap-1.5">
                      <span>{getShortLabel(c)}</span>
                      {c.isAssumedDefault && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-desk-tintSelected text-desk-text border border-desk-border">
                          Default
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-desk-textMuted">
                    {c.avgHorizonHours.toFixed(1)}h
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono font-semibold text-desk-text">
                    {c.mae.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-desk-textMuted">
                    {c.rmse.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-desk-amber font-medium">
                    +{c.bias.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono font-semibold text-desk-text">
                    {c.wape.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-desk-textMuted">
                    {c.p50.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-desk-amber font-medium">
                    {c.p90.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-2.5 text-center">
                    {isSelected ? (
                      <span className="inline-flex items-center gap-0.5 text-[11px] text-desk-actual font-semibold">
                        <Check className="w-3.5 h-3.5" /> Active
                      </span>
                    ) : (
                      <button
                        onClick={() => onSelectCutoff(c.cutoffHour, c.cutoffMinute)}
                        className="text-[11px] text-desk-text hover:text-desk-actual px-2 py-0.5 rounded border border-desk-border bg-desk-card hover:bg-desk-tint transition-colors"
                      >
                        Apply
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
