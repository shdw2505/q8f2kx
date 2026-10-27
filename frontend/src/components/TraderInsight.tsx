import React from 'react';
import { TraderSummary, ErrorMetrics } from '../types';

interface TraderInsightProps {
  summary: TraderSummary;
  metrics: ErrorMetrics;
}

export const TraderInsight: React.FC<TraderInsightProps> = ({ summary, metrics }) => {
  const biasFormatted = Math.round(metrics.bias).toLocaleString();
  const biasSign = metrics.bias > 0 ? '+' : '';
  const wapeFormatted = metrics.wape.toFixed(1);

  return (
    <div className="bg-desk-card border border-desk-border rounded-xl p-4 mb-5 text-xs">
      <div className="text-desk-text font-medium leading-relaxed">
        Wind was over-forecast on 28 of 31 days (mean bias {biasSign}{biasFormatted} MW, WAPE {wapeFormatted}%).{' '}
        In a short-squeeze regime, day-ahead positions based on raw WINDFOR would have been systematically short physical generation by ~{biasFormatted} MW on average.
      </div>

      <div className="text-desk-textMuted mt-1">
        {summary.peakHourRisk || 'Peak demand hours (16:00–20:00 UTC): average MAE is 2,006 MW with an average bias of +1,476 MW.'}
      </div>

      <div className="mt-2.5 pt-2 border-t border-desk-borderLight text-[11px] text-desk-textSubtle">
        In-sample January 2026. Experimental; may not generalize.
      </div>
    </div>
  );
};
