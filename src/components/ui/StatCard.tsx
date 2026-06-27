import React from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: {
    text: string;
    positive: boolean;
  };
  color?: 'blue' | 'emerald' | 'rose' | 'amber' | 'purple' | 'slate';
}

export default function StatCard({ icon, label, value, trend, color = 'blue' }: StatCardProps) {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50 text-blue-600 border-blue-100',
    },
    emerald: {
      bg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    },
    rose: {
      bg: 'bg-rose-50 text-rose-600 border-rose-100',
    },
    amber: {
      bg: 'bg-amber-50 text-amber-600 border-amber-100',
    },
    purple: {
      bg: 'bg-purple-50 text-purple-600 border-purple-100',
    },
    slate: {
      bg: 'bg-slate-50 text-slate-600 border-slate-100',
    },
  };

  const selectedColor = colorClasses[color] || colorClasses.blue;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 flex items-start justify-between hover:shadow-md transition-all duration-200">
      <div className="space-y-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest block">
          {label}
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-display">
            {value}
          </span>
          {trend && (
            <span
              className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full ${
                trend.positive
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-700'
              }`}
            >
              {trend.positive ? '↑' : '↓'} {trend.text}
            </span>
          )}
        </div>
      </div>
      <div className={`p-3 rounded-xl border ${selectedColor.bg} flex-shrink-0`}>
        {icon}
      </div>
    </div>
  );
}
