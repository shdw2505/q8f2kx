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

interface HourlyErrorChartProps {
  hourlyData: HourlyMetrics[];
}

export const HourlyErrorChart: React.FC<HourlyErrorChartProps> = ({ hourlyData }) => {
  return (
    <div className="w-full">
      <div className="mb-2 text-xs text-desk-textMuted">
        Diurnal error pattern. Bars show MAE; line shows Mean Bias (Forecast − Actual) across the month.
      </div>

      <div className="w-full h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={hourlyData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E3EADD" vertical={false} />
            <XAxis
              dataKey="hour"
              stroke="#5E7366"
              tick={{ fontSize: 10, fill: '#5E7366' }}
              tickFormatter={(h) => `${h}:00`}
              tickMargin={6}
            />
            <YAxis
              stroke="#5E7366"
              tick={{ fontSize: 10, fill: '#5E7366' }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              unit=" MW"
            />
            <Tooltip
              formatter={(value: any, name: any) => [`${Math.round(value).toLocaleString()} MW`, name]}
              labelFormatter={(h) => `Delivery Hour: ${h}:00 UTC`}
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderColor: '#DCE5D5',
                borderRadius: '0.5rem',
                fontSize: '11px',
                color: '#1F3A2B',
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              iconType="circle"
            />
            <ReferenceLine y={0} stroke="#DCE5D5" />
            <Bar dataKey="mae" fill="#6FAF7A" fillOpacity={0.85} name="MAE (MW)" radius={[3, 3, 0, 0]} />
            <Line
              type="monotone"
              dataKey="bias"
              stroke="#B7791F"
              strokeWidth={1.8}
              dot={{ r: 2, fill: '#B7791F' }}
              name="Bias (MW)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
