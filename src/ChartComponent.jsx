import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ChartComponent = ({ data = [], metric, color = '#5181B8', label = '' }) => {
  const chartData = data.map((item, index) => ({
    name: index + 1,
    value: item[metric] || 0
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 10, right: 15, left: 0, bottom: 15 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E1E3E6" />
        <XAxis 
          dataKey="name" 
          stroke="#818C99" 
          tick={{ fontSize: 'clamp(7px, 1.2vw, 9px)' }}
          label={{ 
            value: 'Номер поста', 
            position: 'bottom', 
            offset: 5, 
            fill: '#818C99', 
            fontSize: 'clamp(7px, 1.2vw, 9px)',
            fontWeight: 400
          }}
        />
        <YAxis 
          stroke="#818C99"
          tick={{ fontSize: 'clamp(7px, 1.2vw, 9px)' }}
          label={{ 
            value: label, 
            angle: -90, 
            position: 'left', 
            fill: '#818C99', 
            fontSize: 'clamp(7px, 1.2vw, 9px)',
            fontWeight: 400,
            offset: 10
          }}
        />
        <Tooltip 
          contentStyle={{ 
            background: 'white', 
            border: '1px solid #E1E3E6', 
            fontSize: 'clamp(9px, 1.5vw, 12px)' 
          }}
          labelStyle={{ color: '#818C99', fontSize: 'clamp(9px, 1.5vw, 12px)' }}
          formatter={(value) => [`${value}`, label]}
        />
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke={color} 
          name={label}
          strokeWidth="clamp(2, 0.4vw, 2.5)"
          dot={false}
          activeDot={{ r: 'clamp(3, 0.5vw, 4)' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default ChartComponent;