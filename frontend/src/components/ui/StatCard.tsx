import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtext?: string;
  badge?: {
    label: string;
    variant?: 'forest' | 'amber' | 'stone' | 'rose' | 'emerald';
  };
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    label: string;
  };
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  subtext,
  badge,
  trend,
  className = '',
}) => {
  return (
    <div className={`p-5 sm:p-6 rounded-2xl bg-white border border-stone-200/90 shadow-soft flex flex-col justify-between space-y-3 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
          {title}
        </span>
        <div className="w-10 h-10 rounded-xl bg-forest-50 border border-forest-100 flex items-center justify-center text-forest-800 shrink-0">
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold font-serif text-forest-950">
            {value}
          </span>
          {badge && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-forest-100 text-forest-800 border border-forest-200">
              {badge.label}
            </span>
          )}
        </div>
        
        {subtext && (
          <p className="text-xs text-stone-500">
            {subtext}
          </p>
        )}

        {trend && (
          <p className={`text-[11px] font-medium pt-1 ${
            trend.direction === 'up' ? 'text-emerald-700' : trend.direction === 'down' ? 'text-rose-700' : 'text-stone-500'
          }`}>
            {trend.direction === 'up' ? '▲' : trend.direction === 'down' ? '▼' : '•'} {trend.label}
          </p>
        )}
      </div>
    </div>
  );
};
