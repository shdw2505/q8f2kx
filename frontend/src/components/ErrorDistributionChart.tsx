import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts';
import { HistogramBin } from '../types';
import { BarChart3 } from 'lucide-react';

interface ErrorDistributionChartProps {
  distribution: HistogramBin[];
}

export const ErrorDistributionChart: React.FC<ErrorDistributionChartProps> = ({ distribution }) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-5 h-5 text-sky-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">
            Forecast Error Distribution (Histogram)
          </h2>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Frequency of forecast errors (Forecast − Actual in MW). Right-shifted mass indicates over-forecast frequency.
        </p>
      </div>

      <div className="w-full h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distribution} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="binStart"
              stroke="#64748b"
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
              tickMargin={6}
            />
            <YAxis stroke="#64748b" tick={{ fontSize: 10 }} unit=" hrs" />
            <Tooltip
              formatter={(value: any, _name: any, item: any) => [
                `${value} hours`,
                `Range: ${item.payload.binLabel}`,
              ]}
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '0.75rem',
                fontSize: '11px',
              }}
            />
            <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="3 3" />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {distribution.map((entry, index) => {
                const isOver = entry.binStart >= 0;
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={isOver ? '#f59e0b' : '#a855f7'}
                    fillOpacity={0.8}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
