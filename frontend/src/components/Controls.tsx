import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

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
  const [showAssumptionDetails, setShowAssumptionDetails] = useState<boolean>(false);

  const cutoffPresets = [
    { hour: 9, minute: 20, label: '09:20', desc: '09:20 UTC: EPEX SPOT GB 60-min Auction Gate' },
    { hour: 9, minute: 50, label: '09:50 (Default)', desc: '09:50 UTC: N2EX Day-Ahead Hourly Gate (Assumed Default)' },
    { hour: 11, minute: 0, label: '11:00', desc: '11:00 UTC: Continental SDAC Close (for comparison only)' },
    { hour: 12, minute: 0, label: '12:00', desc: '12:00 UTC: Later cutoff, comparison only (not a GB auction gate)' },
  ];

  const datePresets = [
    { label: 'Full month (Jan 1–31)', start: '2026-01-01', end: '2026-01-31' },
    { label: 'Week 1 (Jan 1–7)', start: '2026-01-01', end: '2026-01-07' },
    { label: 'Week 2 (Jan 8–14)', start: '2026-01-08', end: '2026-01-14' },
    { label: 'Week 3 (Jan 15–21)', start: '2026-01-15', end: '2026-01-21' },
    { label: 'Week 4 (Jan 22–28)', start: '2026-01-22', end: '2026-01-28' },
    { label: 'Jan 29–31', start: '2026-01-29', end: '2026-01-31' },
  ];

  const currentRangeValue = `${startDate}|${endDate}`;

  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [s, end] = e.target.value.split('|');
    onDateRangeChange(s, end);
  };

  return (
    <div className="mb-5 space-y-2.5">
      {/* 1. Assumption banner - single collapsed line */}
      <div id="assumptions" className="bg-desk-card border border-desk-border rounded-lg px-3.5 py-2 text-xs text-desk-textMuted">
        <div className="flex items-center justify-between gap-2">
          <span>
            Cutoff 09:50 UTC on D-1 is an assumption (N2EX gate closure);{' '}
            <button
              onClick={() => setShowAssumptionDetails(!showAssumptionDetails)}
              className="text-desk-text underline hover:text-desk-primary font-medium inline-flex items-center gap-0.5"
            >
              see details
              {showAssumptionDetails ? (
                <ChevronUp className="w-3 h-3 inline" />
              ) : (
                <ChevronDown className="w-3 h-3 inline" />
              )}
            </button>
          </span>
        </div>

        {showAssumptionDetails && (
          <div className="mt-2 pt-2 border-t border-desk-borderLight text-desk-text leading-relaxed">
            Based on published schedules for the N2EX GB Day-Ahead Hourly auction (Nord Pool &quot;About the N2EX day-ahead auction&quot; support page; Modo Energy GB wholesale markets explainer). These are published schedules from secondary industry sources rather than an official rulebook; users can select alternative cutoffs (09:20 EPEX SPOT GB 60-min, 11:00 SDAC, 12:00 later comparison) to evaluate lead time and accuracy impact.
          </div>
        )}
      </div>

      {/* 2. Controls: One compact row */}
      <div className="bg-desk-card border border-desk-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Cutoff Segmented Control */}
        <div className="flex items-center gap-2">
          <span className="text-desk-textMuted font-medium">Cutoff:</span>
          <div className="inline-flex rounded-lg border border-desk-border p-0.5 bg-desk-cardAlt">
            {cutoffPresets.map((p) => {
              const isSelected = cutoffHour === p.hour && cutoffMinute === p.minute;
              return (
                <button
                  key={`${p.hour}-${p.minute}`}
                  onClick={() => onCutoffChange(p.hour, p.minute)}
                  disabled={isLoading}
                  title={p.desc}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    isSelected
                      ? 'bg-desk-tint text-desk-text font-semibold shadow-xs'
                      : 'text-desk-textMuted hover:text-desk-text hover:bg-desk-tintLight'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date-range dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-desk-textMuted font-medium">Delivery:</span>
          <select
            value={currentRangeValue}
            onChange={handleDropdownChange}
            disabled={isLoading}
            className="border border-desk-border rounded-lg px-2.5 py-1 bg-desk-cardAlt text-desk-text font-medium text-xs focus:outline-none focus:ring-1 focus:ring-desk-primary"
          >
            {datePresets.map((dp) => (
              <option key={dp.label} value={`${dp.start}|${dp.end}`}>
                {dp.label}
              </option>
            ))}
          </select>
        </div>

        {/* Inline Toggles */}
        <div className="flex items-center gap-4">
          {/* Bias-adjusted toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showAdjustedForecast}
              onChange={(e) => onToggleAdjustedForecast(e.target.checked)}
              disabled={isLoading}
              className="sr-only"
            />
            <div
              className={`w-7 h-4 rounded-full transition-colors relative ${
                showAdjustedForecast ? 'bg-desk-primary' : 'bg-desk-border'
              }`}
            >
              <div
                className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform ${
                  showAdjustedForecast ? 'left-3.5' : 'left-0.5'
                }`}
              />
            </div>
            <span className="text-desk-text font-medium">Bias-adjusted</span>
          </label>

          {/* Cutoff comparison toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showComparisonTable}
              onChange={(e) => onToggleComparisonTable(e.target.checked)}
              disabled={isLoading}
              className="sr-only"
            />
            <div
              className={`w-7 h-4 rounded-full transition-colors relative ${
                showComparisonTable ? 'bg-desk-primary' : 'bg-desk-border'
              }`}
            >
              <div
                className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform ${
                  showComparisonTable ? 'left-3.5' : 'left-0.5'
                }`}
              />
            </div>
            <span className="text-desk-text font-medium">Cutoff comparison</span>
          </label>
        </div>
      </div>
    </div>
  );
};
