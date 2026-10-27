import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { HourlyMetrics } from '../types';
import { Clock } from 'lucide-react';

interface HourlyErrorChartProps {
  hourlyData: HourlyMetrics[];
}

export const HourlyErrorChart: React.FC<HourlyErrorChartProps> = ({ hourlyData }) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-5 h-5 text-amber-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">
            Forecast Error by Hour of Day (0–23 UTC)
          </h2>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Diurnal error patterns. Bars show MAE; line shows Mean Bias (Forecast − Actual) across the month.
        </p>
      </div>

      <div className="w-full h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={hourlyData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="hour"
              stroke="#64748b"
              tick={{ fontSize: 10 }}
              tickFormatter={(h) => `${h}:00`}
              tickMargin={6}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              unit=" MW"
            />
            <Tooltip
              formatter={(value: any, name: any) => [`${Math.round(value).toLocaleString()} MW`, name]}
              labelFormatter={(h) => `Delivery Hour: ${h}:00 UTC`}
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '0.75rem',
                fontSize: '11px',
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              iconType="circle"
            />
            <ReferenceLine y={0} stroke="#475569" />
            <Bar dataKey="mae" fill="#10b981" fillOpacity={0.7} name="MAE (MW)" radius={[3, 3, 0, 0]} />
            <Line
              type="monotone"
              dataKey="bias"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 2 }}
              name="Bias (MW)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
