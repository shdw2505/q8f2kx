import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { HorizonMetrics } from '../types';
import { Hourglass } from 'lucide-react';

interface HorizonErrorChartProps {
  horizonData: HorizonMetrics[];
}

export const HorizonErrorChart: React.FC<HorizonErrorChartProps> = ({ horizonData }) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Hourglass className="w-5 h-5 text-indigo-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">
            Forecast Error vs Lead Time Horizon
          </h2>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Accuracy progression across lead time horizons (Hours between publishTime and delivery startTime).
        </p>
      </div>

      <div className="w-full h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={horizonData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="horizonBin"
              stroke="#64748b"
              tick={{ fontSize: 10 }}
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
            <Bar dataKey="mae" fill="#38bdf8" fillOpacity={0.8} name="MAE (MW)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="rmse" fill="#f43f5e" fillOpacity={0.7} name="RMSE (MW)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
