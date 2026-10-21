import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'forest' | 'amber' | 'stone' | 'rose' | 'emerald';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'forest',
  size = 'md',
  icon,
  className = '',
}) => {
  const variantStyles = {
    forest: 'bg-forest-100 text-forest-900 border border-forest-200',
    amber: 'bg-amber-100 text-amber-900 border border-amber-200',
    stone: 'bg-stone-100 text-stone-700 border border-stone-200',
    rose: 'bg-rose-50 text-rose-800 border border-rose-200',
    emerald: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs sm:text-sm px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};
