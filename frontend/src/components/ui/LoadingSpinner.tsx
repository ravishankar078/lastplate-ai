import React from 'react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'forest' | 'white' | 'amber' | 'stone';
  className?: string;
  label?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'forest',
  className = '',
  label,
}) => {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  };

  const variantMap = {
    forest: 'border-forest-200 border-t-forest-800',
    white: 'border-white/30 border-t-white',
    amber: 'border-amber-200 border-t-amber-600',
    stone: 'border-stone-200 border-t-stone-600',
  };

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        className={`rounded-full animate-spin ${sizeMap[size]} ${variantMap[variant]}`}
        role="status"
        aria-label={label || 'Loading'}
      />
      {label && <span className="text-xs font-medium text-stone-600">{label}</span>}
    </div>
  );
};
