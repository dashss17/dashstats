import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

const MiniChart = ({ data = [], metric, color = '#5181B8' }) => {
  const chartData = data.map((item) => ({
    value: item[metric] || 0
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData}>
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke={color} 
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default MiniChart;