import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { AlignedDataPoint } from '../types';
import { LineChart, Info } from 'lucide-react';

interface TimeSeriesChartProps {
  data: AlignedDataPoint[];
  showAdjusted: boolean;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const pt: AlignedDataPoint = payload[0].payload;
    const isOver = pt.error > 0;

    return (
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-3.5 shadow-2xl text-xs text-slate-200 max-w-sm backdrop-blur">
        <div className="font-bold text-white border-b border-slate-800 pb-2 mb-2 flex items-center justify-between">
          <span>{pt.startTime.replace('T', ' ').replace('Z', ' UTC')}</span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-sky-400 font-mono font-medium">
            {pt.forecastHorizonHours.toFixed(1)}h Horizon
          </span>
        </div>

        <div className="space-y-1.5 font-mono">
          <div className="flex justify-between items-center text-emerald-400">
            <span className="font-sans text-slate-400">Actual Generation:</span>
            <span className="font-bold">{pt.actualGeneration.toLocaleString()} MW</span>
          </div>

          <div className="flex justify-between items-center text-amber-400">
            <span className="font-sans text-slate-400">Selected Forecast:</span>
            <span className="font-bold">{pt.forecastGeneration.toLocaleString()} MW</span>
          </div>

          <div className="flex justify-between items-center text-slate-300">
            <span className="font-sans text-slate-400">Error (Fc - Act):</span>
            <span className={`font-bold ${isOver ? 'text-amber-400' : 'text-purple-400'}`}>
              {isOver ? `+${pt.error.toLocaleString()}` : pt.error.toLocaleString()} MW
            </span>
          </div>

          {pt.adjustedForecastGeneration !== undefined && (
            <div className="flex justify-between items-center text-cyan-400 pt-1 border-t border-slate-800">
              <span className="font-sans text-slate-400">Bias-Adjusted Forecast:</span>
              <span className="font-bold">
                {pt.adjustedForecastGeneration !== null
                  ? `${pt.adjustedForecastGeneration.toLocaleString()} MW`
                  : 'N/A (< 7d history)'}
              </span>
            </div>
          )}

          {/* Uncertainty Range */}
          <div className="pt-2 border-t border-slate-800/80 text-[11px] font-sans text-slate-400">
            <div className="flex justify-between text-slate-300">
              <span>P50 Range (in-sample):</span>
              <span className="font-mono text-emerald-300">
                {pt.uncertaintyP50Lower.toLocaleString()} - {pt.uncertaintyP50Upper.toLocaleString()} MW
              </span>
            </div>
            <div className="flex justify-between text-slate-300 mt-0.5">
              <span>P90 Range (in-sample):</span>
              <span className="font-mono text-orange-300">
                {pt.uncertaintyP90Lower.toLocaleString()} - {pt.uncertaintyP90Upper.toLocaleString()} MW
              </span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1 italic">
              Note: P50/P90 bands are whole-month in-sample retrospective figures; not available in real time.
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 font-sans flex items-center justify-between">
            <span>Forecast Publish Time:</span>
            <span className="font-mono text-slate-300">{pt.forecastPublishTime.replace('T', ' ').replace('Z', ' UTC')}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({ data, showAdjusted }) => {
  // Format data for Recharts area rendering
  const formattedData = data.map((d) => ({
    ...d,
    timeLabel: d.startTime.slice(5, 16).replace('T', ' '),
    // Upper and lower bounds for stacked / range area
    p90Range: [d.uncertaintyP90Lower, d.uncertaintyP90Upper],
    p50Range: [d.uncertaintyP50Lower, d.uncertaintyP50Upper],
  }));

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 mb-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <LineChart className="w-5 h-5 text-emerald-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">
            Wind Generation: Actual Outturn vs Day-Ahead Forecast with P50 / P90 Uncertainty Bands
          </h2>
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-400 inline-block"></span> Actual (MW)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-amber-400 inline-block"></span> Forecast (MW)
          </span>
          {showAdjusted && (
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-3 h-0.5 bg-cyan-400 border-dashed inline-block"></span> Bias-Adjusted (MW)
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 bg-emerald-500/10 border border-emerald-500/30 inline-block rounded-sm"></span> P50/P90 Bands
          </span>
        </div>
      </div>

      <div className="w-full h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={formattedData} margin={{ top: 10, right: 15, left: 10, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="timeLabel"
              stroke="#64748b"
              tick={{ fontSize: 11 }}
              interval={Math.ceil(formattedData.length / 14)}
              tickMargin={10}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              unit=" MW"
            />
            <Tooltip content={<CustomTooltip />} />

            {/* P90 Range Area (outer uncertainty band) */}
            <Area
              dataKey="p90Range"
              stroke="#f97316"
              strokeOpacity={0.2}
              fill="#f97316"
              fillOpacity={0.06}
              name="P90 Uncertainty Band"
            />

            {/* P50 Range Area (inner uncertainty band) */}
            <Area
              dataKey="p50Range"
              stroke="#10b981"
              strokeOpacity={0.3}
              fill="#10b981"
              fillOpacity={0.12}
              name="P50 Uncertainty Band"
            />

            {/* Selected WINDFOR Forecast */}
            <Line
              type="monotone"
              dataKey="forecastGeneration"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              name="WINDFOR Forecast"
            />

            {/* Experimental Bias-Adjusted Forecast */}
            {showAdjusted && (
              <Line
                type="monotone"
                dataKey="adjustedForecastGeneration"
                stroke="#06b6d4"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                name="Bias-Adjusted Forecast"
              />
            )}

            {/* Actual Outturn Generation */}
            <Line
              type="monotone"
              dataKey="actualGeneration"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={false}
              name="FUELHH Actual (Mean MW)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 text-[11px] text-slate-500 flex flex-col sm:flex-row items-start sm:items-center justify-between border-t border-slate-800/80 pt-2.5 gap-1.5">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span>Tooltip displays lead time horizon (hours). P50/P90 bands are in-sample, whole-month retrospective figures; not available in real time.</span>
        </div>
        <span>Hover over points for local errors</span>
      </div>
    </div>
  );
};
