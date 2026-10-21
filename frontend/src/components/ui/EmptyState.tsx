import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { Button } from '../common/Button';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`p-8 sm:p-12 text-center rounded-3xl bg-white border border-stone-200/90 shadow-soft max-w-xl mx-auto space-y-4 ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-500 mx-auto">
        <Icon className="w-7 h-7" />
      </div>
      <div className="space-y-1.5">
        <h4 className="text-base sm:text-lg font-bold text-forest-950 font-serif">
          {title}
        </h4>
        <p className="text-xs sm:text-sm text-stone-600 max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      </div>
      {actionLabel && onAction && (
        <div className="pt-2">
          <Button variant="primary" size="md" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
