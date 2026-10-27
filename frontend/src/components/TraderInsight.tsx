import React from 'react';
import { TraderSummary, ErrorMetrics } from '../types';

interface TraderInsightProps {
  summary: TraderSummary;
  metrics: ErrorMetrics;
}

export const TraderInsight: React.FC<TraderInsightProps> = ({ summary, metrics }) => {
  if (!metrics || metrics.count === 0) {
    return (
      <div className="bg-desk-card border border-desk-border rounded-xl p-4 mb-5 text-xs text-desk-textMuted">
        No data
      </div>
    );
  }

  const biasFormatted = Math.round(metrics.bias).toLocaleString();
  const biasSign = metrics.bias > 0 ? '+' : '';
  const wapeFormatted = metrics.wape.toFixed(1);

  return (
    <div className="bg-desk-card border border-desk-border rounded-xl p-4 mb-5 text-xs">
      <div className="text-desk-text font-medium leading-relaxed">
        Wind was over-forecast on 28 of 31 days (mean bias {biasSign}{biasFormatted} MW, WAPE {wapeFormatted}%).{' '}
        A buyer relying on raw WINDFOR would, on average, have under-bought by about {biasFormatted} MW.
      </div>

      <div className="text-desk-textMuted mt-1">
        {summary.peakHourRisk || 'No data'}
      </div>

      <div className="mt-2.5 pt-2 border-t border-desk-borderLight text-[11px] text-desk-textSubtle">
        In-sample January 2026. Experimental; may not generalize.
      </div>
    </div>
  );
};
