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

interface ErrorDistributionChartProps {
  distribution: HistogramBin[];
}

export const ErrorDistributionChart: React.FC<ErrorDistributionChartProps> = ({ distribution }) => {
  return (
    <div className="w-full">
      <div className="mb-2 text-xs text-desk-textMuted">
        Error distribution histogram (Forecast − Actual). Positive values indicate over-forecasts.
      </div>

      <div className="w-full h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distribution} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E3EADD" vertical={false} />
            <XAxis
              dataKey="binStart"
              stroke="#5E7366"
              tick={{ fontSize: 10, fill: '#5E7366' }}
              tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
              tickMargin={6}
            />
            <YAxis stroke="#5E7366" tick={{ fontSize: 10, fill: '#5E7366' }} unit=" hrs" />
            <Tooltip
              formatter={(value: any, _name: any, item: any) => [
                `${value} hours`,
                `Range: ${item.payload.binLabel}`,
              ]}
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderColor: '#DCE5D5',
                borderRadius: '0.5rem',
                fontSize: '11px',
                color: '#1F3A2B',
              }}
            />
            <ReferenceLine x={0} stroke="#5E7366" strokeDasharray="3 3" />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {distribution.map((entry, index) => {
                const isOver = entry.binStart >= 0;
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={isOver ? '#B7791F' : '#6FAF7A'}
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
