import React from "react";

interface BarChartProps {
  title?: string;
}

export const BarChart: React.FC<BarChartProps> = ({ title }) => {
  return (
    <div className="w-full h-64 bg-zinc-50 dark:bg-zinc-900 rounded-lg flex flex-col items-center justify-center border border-zinc-200 dark:border-zinc-800 p-4">
      {title && <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2">{title}</h3>}
      <span className="text-sm font-medium text-zinc-500">
        Chart Placeholder
        <br/>
        <span className="text-xs opacity-75">(Ready for Recharts or Chart.js integration)</span>
      </span>
    </div>
  );
};
