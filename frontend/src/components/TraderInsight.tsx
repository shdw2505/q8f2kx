import React from 'react';
import { TraderSummary } from '../types';
import { Compass, ShieldAlert, CheckCircle2, Info } from 'lucide-react';

interface TraderInsightProps {
  summary: TraderSummary;
}

export const TraderInsight: React.FC<TraderInsightProps> = ({ summary }) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 mb-6 shadow-xl">
      <div className="flex items-center gap-2 mb-3">
        <Compass className="w-5 h-5 text-emerald-400" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-white">
          Quantitative Trading Desk Guidance
        </h2>
        <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
          Gate: {summary.decisionCutoffUsed}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Main Recommendation */}
        <div className="md:col-span-2 bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Actionable Day-Ahead Procurement Recommendation
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-normal">
              {summary.tradingRecommendation}
            </p>
          </div>

          {/* Unverified hypothesis alert */}
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-start gap-2 text-xs text-amber-300/90">
            <Info className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Observed Bias ({summary.biasValueMW > 0 ? `+${summary.biasValueMW.toLocaleString()}` : summary.biasValueMW.toLocaleString()} MW):</strong>{' '}
              {summary.biasHypothesisNote}
            </span>
          </div>

          {/* In-sample evaluation and generalization limitations */}
          <div className="mt-2 text-[11px] text-slate-400 space-y-1">
            <div>
              <strong className="text-slate-300">Methodology Note:</strong> {summary.inSampleEvaluationNote}
            </div>
            <div>
              <strong className="text-slate-300">Limitation:</strong> {summary.generalizationLimitationNote}
            </div>
          </div>
        </div>

        {/* Peak Risk & Key Figures */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" />
              Peak Hour (16-20 UTC) Risk
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {summary.peakHourRisk}
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">P90 Safety Margin</div>
              <div className="text-sm font-bold text-orange-400 mt-0.5">
                +{summary.recommendedSafetyBufferMW.toLocaleString()} MW
              </div>
            </div>
            <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
              <div className="text-[10px] text-slate-400">P99 Worst Case Tail</div>
              <div className="text-sm font-bold text-red-400 mt-0.5">
                +{summary.worstCaseScenarioMW.toLocaleString()} MW
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
