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

interface TimeSeriesChartProps {
  data: AlignedDataPoint[];
  showAdjusted: boolean;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const pt: AlignedDataPoint = payload[0].payload;
    const isOver = pt.error > 0;

    return (
      <div className="bg-desk-card border border-desk-border rounded-lg p-3 shadow-md text-xs text-desk-text max-w-xs">
        <div className="font-semibold text-desk-text border-b border-desk-borderLight pb-1.5 mb-1.5 flex items-center justify-between">
          <span>{pt.startTime.replace('T', ' ').replace('Z', ' UTC')}</span>
          <span className="font-mono text-desk-textMuted font-medium">
            {pt.forecastHorizonHours.toFixed(1)}h horizon
          </span>
        </div>

        <div className="space-y-1 font-mono text-[11px]">
          <div className="flex justify-between items-center text-desk-actual">
            <span className="font-sans text-desk-textMuted">Actual:</span>
            <span className="font-semibold">{pt.actualGeneration.toLocaleString()} MW</span>
          </div>

          <div className="flex justify-between items-center text-desk-forecast">
            <span className="font-sans text-desk-textMuted">Forecast:</span>
            <span className="font-semibold">{pt.forecastGeneration.toLocaleString()} MW</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="font-sans text-desk-textMuted">Error (Fc - Act):</span>
            <span className={`font-semibold ${isOver ? 'text-desk-amber' : 'text-desk-text'}`}>
              {isOver ? `+${pt.error.toLocaleString()}` : pt.error.toLocaleString()} MW
            </span>
          </div>

          {pt.adjustedForecastGeneration !== undefined && (
            <div className="flex justify-between items-center text-desk-adjusted pt-1 border-t border-desk-borderLight">
              <span className="font-sans text-desk-textMuted">Bias-Adjusted:</span>
              <span className="font-semibold">
                {pt.adjustedForecastGeneration !== null
                  ? `${pt.adjustedForecastGeneration.toLocaleString()} MW`
                  : 'N/A (< 7d history)'}
              </span>
            </div>
          )}

          <div className="pt-1.5 border-t border-desk-borderLight text-[10px] font-sans text-desk-textMuted">
            <div className="flex justify-between">
              <span>P50 Band:</span>
              <span className="font-mono text-desk-text">
                {pt.uncertaintyP50Lower.toLocaleString()}–{pt.uncertaintyP50Upper.toLocaleString()} MW
              </span>
            </div>
            <div className="flex justify-between mt-0.5">
              <span>P90 Band:</span>
              <span className="font-mono text-desk-text">
                {pt.uncertaintyP90Lower.toLocaleString()}–{pt.uncertaintyP90Upper.toLocaleString()} MW
              </span>
            </div>
          </div>

          <div className="pt-1 border-t border-desk-borderLight text-[10px] text-desk-textSubtle font-sans flex items-center justify-between">
            <span>Published:</span>
            <span className="font-mono">{pt.forecastPublishTime.replace('T', ' ').replace('Z', ' UTC')}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({ data, showAdjusted }) => {
  const formattedData = data.map((d) => ({
    ...d,
    timeLabel: d.startTime.slice(5, 16).replace('T', ' '),
    p90Range: [d.uncertaintyP90Lower, d.uncertaintyP90Upper],
    p50Range: [d.uncertaintyP50Lower, d.uncertaintyP50Upper],
  }));

  return (
    <div className="bg-desk-card border border-desk-border rounded-xl p-4 sm:p-5 mb-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <h2 className="text-xs sm:text-sm font-semibold text-desk-text">
          Wind Generation: Actual Outturn vs Day-Ahead Forecast
        </h2>
        <div className="text-[11px] text-desk-textMuted flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-[#2F6B45] inline-block rounded-xs"></span> Actual
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-[#C9962B] inline-block rounded-xs"></span> Forecast
          </span>
          {showAdjusted && (
            <span className="flex items-center gap-1.5 text-desk-adjusted">
              <span className="w-3 h-0.5 border-t border-dashed border-[#0D9488] inline-block"></span> Bias-Adjusted
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-2 bg-[#6FAF7A]/20 border border-[#6FAF7A]/40 inline-block rounded-xs"></span> P50/P90 Bands
          </span>
        </div>
      </div>

      <div className="w-full h-[400px] sm:h-[440px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={formattedData} margin={{ top: 10, right: 10, left: -5, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E3EADD" vertical={false} />
            <XAxis
              dataKey="timeLabel"
              stroke="#5E7366"
              tick={{ fontSize: 10, fill: '#5E7366' }}
              interval={Math.ceil(formattedData.length / 12)}
              tickMargin={8}
            />
            <YAxis
              stroke="#5E7366"
              tick={{ fontSize: 10, fill: '#5E7366' }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              unit=" MW"
            />
            <Tooltip content={<CustomTooltip />} />

            {/* P90 Range Area */}
            <Area
              dataKey="p90Range"
              stroke="#6FAF7A"
              strokeOpacity={0.25}
              fill="#6FAF7A"
              fillOpacity={0.07}
              name="P90 Band"
            />

            {/* P50 Range Area */}
            <Area
              dataKey="p50Range"
              stroke="#6FAF7A"
              strokeOpacity={0.4}
              fill="#6FAF7A"
              fillOpacity={0.16}
              name="P50 Band"
            />

            {/* Forecast */}
            <Line
              type="monotone"
              dataKey="forecastGeneration"
              stroke="#C9962B"
              strokeWidth={1.8}
              dot={false}
              name="Forecast"
            />

            {/* Optional Bias-Adjusted Forecast */}
            {showAdjusted && (
              <Line
                type="monotone"
                dataKey="adjustedForecastGeneration"
                stroke="#0D9488"
                strokeWidth={1.8}
                strokeDasharray="4 4"
                dot={false}
                name="Bias-Adjusted"
              />
            )}

            {/* Actual Outturn */}
            <Line
              type="monotone"
              dataKey="actualGeneration"
              stroke="#2F6B45"
              strokeWidth={2}
              dot={false}
              name="Actual"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
