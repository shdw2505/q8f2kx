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

interface HorizonErrorChartProps {
  horizonData: HorizonMetrics[];
}

export const HorizonErrorChart: React.FC<HorizonErrorChartProps> = ({ horizonData }) => {
  return (
    <div className="w-full">
      <div className="mb-2 text-xs text-desk-textMuted">
        Error vs lead time horizon (hours between forecast publish time and delivery start).
      </div>

      <div className="w-full h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={horizonData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E3EADD" vertical={false} />
            <XAxis
              dataKey="horizonBin"
              stroke="#5E7366"
              tick={{ fontSize: 10, fill: '#5E7366' }}
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
            <Bar dataKey="mae" fill="#6FAF7A" fillOpacity={0.85} name="MAE (MW)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="rmse" fill="#B7791F" fillOpacity={0.7} name="RMSE (MW)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
