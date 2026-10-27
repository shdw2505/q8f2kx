import React from 'react';
import { Calendar, Sparkles, AlertCircle, SlidersHorizontal, Table } from 'lucide-react';

interface ControlsProps {
  cutoffHour: number;
  cutoffMinute: number;
  onCutoffChange: (hour: number, minute: number) => void;
  startDate: string;
  endDate: string;
  onDateRangeChange: (start: string, end: string) => void;
  showAdjustedForecast: boolean;
  onToggleAdjustedForecast: (val: boolean) => void;
  showComparisonTable: boolean;
  onToggleComparisonTable: (val: boolean) => void;
  isLoading: boolean;
}

export const Controls: React.FC<ControlsProps> = ({
  cutoffHour,
  cutoffMinute,
  onCutoffChange,
  startDate,
  endDate,
  onDateRangeChange,
  showAdjustedForecast,
  onToggleAdjustedForecast,
  showComparisonTable,
  onToggleComparisonTable,
  isLoading,
}) => {
  const cutoffPresets = [
    { hour: 9, minute: 20, label: '09:20 UTC', desc: 'EPEX SPOT GB 60-min Auction Gate' },
    { hour: 9, minute: 50, label: '09:50 UTC', desc: 'N2EX Day-Ahead Hourly Gate (Assumed Default)' },
    { hour: 11, minute: 0, label: '11:00 UTC', desc: 'Continental SDAC Close (for comparison only)' },
    { hour: 12, minute: 0, label: '12:00 UTC', desc: 'Later cutoff, comparison only (not a GB auction gate)' },
  ];

  const datePresets = [
    { label: 'Full Month (Jan 1-31)', start: '2026-01-01', end: '2026-01-31' },
    { label: 'Week 1 (Jan 1-7)', start: '2026-01-01', end: '2026-01-07' },
    { label: 'Week 2 (Jan 8-14)', start: '2026-01-08', end: '2026-01-14' },
    { label: 'Week 3 (Jan 15-21)', start: '2026-01-15', end: '2026-01-21' },
    { label: 'Week 4 (Jan 22-28)', start: '2026-01-22', end: '2026-01-28' },
    { label: 'Jan 29-31', start: '2026-01-29', end: '2026-01-31' },
  ];

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 mb-6 shadow-xl">
      {/* Top Banner: Explicit Assumption Note */}
      <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-200">
        <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
        <div>
          <strong className="font-semibold text-amber-300">Decision Gate Closure Assumption:</strong> 09:50 UTC on D-1 is the assumed default gate closure, based on published schedules for the N2EX GB Day-Ahead Hourly auction (Nord Pool &quot;About the N2EX day-ahead auction&quot; support page; Modo Energy GB wholesale markets explainer). These are published schedules from secondary industry sources rather than an official rulebook; this remains an explicit assumption. Select alternative cutoffs (09:20 EPEX SPOT GB 60-min, 11:00 SDAC, 12:00 later comparison) to evaluate lead time and accuracy impact.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Left Column: Decision Cutoff Selector */}
        <div className="lg:col-span-5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
            Day-Ahead Decision Cutoff on D-1
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {cutoffPresets.map((p) => {
              const isSelected = cutoffHour === p.hour && cutoffMinute === p.minute;
              return (
                <button
                  key={`${p.hour}-${p.minute}`}
                  onClick={() => onCutoffChange(p.hour, p.minute)}
                  disabled={isLoading}
                  className={`text-left p-2.5 rounded-xl border text-xs transition-all ${
                    isSelected
                      ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                      : 'bg-slate-800/60 border-slate-700/70 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>{p.label}</span>
                    {p.hour === 9 && p.minute === 50 && (
                      <span className="text-[10px] text-amber-400 font-normal">Default</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5" title={p.desc}>
                    {p.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Center Column: Date Range Filter */}
        <div className="lg:col-span-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            January 2026 Delivery Window
          </label>
          <div className="flex flex-wrap gap-1.5">
            {datePresets.map((dp) => {
              const isSelected = startDate === dp.start && endDate === dp.end;
              return (
                <button
                  key={dp.label}
                  onClick={() => onDateRangeChange(dp.start, dp.end)}
                  disabled={isLoading}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    isSelected
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {dp.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Feature Toggles */}
        <div className="lg:col-span-3 flex flex-col gap-2 justify-end">
          {/* Bias-adjusted forecast toggle */}
          <button
            onClick={() => onToggleAdjustedForecast(!showAdjustedForecast)}
            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
              showAdjustedForecast
                ? 'bg-cyan-500/15 border-cyan-400/80 text-cyan-200'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <div className="text-left">
                <div className="font-semibold text-slate-200">Bias-Adjusted Forecast</div>
                <div className="text-[10px] text-slate-400">Experimental 7-day rolling backward offset</div>
              </div>
            </div>
            <div
              className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                showAdjustedForecast ? 'bg-cyan-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  showAdjustedForecast ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </div>
          </button>

          {/* Cutoffs comparison toggle */}
          <button
            onClick={() => onToggleComparisonTable(!showComparisonTable)}
            className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
              showComparisonTable
                ? 'bg-indigo-500/15 border-indigo-400/80 text-indigo-200'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Table className="w-4 h-4 text-indigo-400" />
              <div className="text-left">
                <div className="font-semibold text-slate-200">Cutoff Comparison View</div>
                <div className="text-[10px] text-slate-400">Side-by-side auction gates table</div>
              </div>
            </div>
            <div
              className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                showComparisonTable ? 'bg-indigo-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  showComparisonTable ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
