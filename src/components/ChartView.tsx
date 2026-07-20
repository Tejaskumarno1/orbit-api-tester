import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

interface ChartViewProps {
  data: any;
}

export const ChartView: React.FC<ChartViewProps> = ({ data }) => {
  // Analyze data to find an array of objects to plot
  const chartData = useMemo(() => {
    if (!data) return null;
    
    // If data is an array, use it directly
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      return data;
    }
    
    // If data is an object containing an array, use that array
    if (typeof data === 'object' && !Array.isArray(data)) {
      for (const key in data) {
        if (Array.isArray(data[key]) && data[key].length > 0 && typeof data[key][0] === 'object') {
          return data[key];
        }
      }
    }
    
    return null;
  }, [data]);

  const keys = useMemo(() => {
    if (!chartData || chartData.length === 0) return { x: '', yKeys: [] as string[] };
    
    const sample = chartData[0];
    const allKeys = Object.keys(sample);
    
    // Try to find a good X-axis key (id, name, title, date, etc)
    const xCandidates = allKeys.filter(k => k.toLowerCase().includes('id') || k.toLowerCase().includes('name') || k.toLowerCase().includes('date') || k.toLowerCase().includes('title'));
    const xKey = xCandidates.length > 0 ? xCandidates[0] : allKeys[0];
    
    // Find numeric keys for Y-axis
    const yKeys = allKeys.filter(k => k !== xKey && typeof sample[k] === 'number');
    
    return { x: xKey, yKeys };
  }, [chartData]);

  if (!chartData) {
    return (
      <div className="flex items-center justify-center h-full text-xs" style={{ color: 'var(--text-tertiary)' }}>
        No chartable array data found in response.
      </div>
    );
  }

  if (keys.yKeys.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs" style={{ color: 'var(--text-tertiary)' }}>
        No numeric data found to plot on Y-axis.
      </div>
    );
  }

  return (
    <div className="w-full h-full p-4 flex flex-col gap-4">
      <div className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
        Auto-Generated Chart (X: {keys.x})
      </div>
      <div className="flex-1 w-full h-full min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-secondary)" vertical={false} />
            <XAxis dataKey={keys.x} tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={{ stroke: 'var(--border-secondary)' }} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={{ stroke: 'var(--border-secondary)' }} tickLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: '8px', fontSize: '11px', color: 'var(--text-primary)' }}
              itemStyle={{ color: 'var(--accent)' }}
            />
            {keys.yKeys.map((k, i) => (
              <Bar key={k} dataKey={k} fill={i === 0 ? 'var(--accent)' : 'var(--info)'} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
