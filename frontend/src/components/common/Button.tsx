import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] select-none';

  const variantStyles = {
    primary: 'bg-forest-800 text-white hover:bg-forest-700 active:bg-forest-900 focus-visible:outline-forest-700 shadow-soft',
    secondary: 'bg-cream-100 text-stone-800 border border-stone-200/90 hover:bg-cream-200 active:bg-cream-300 focus-visible:outline-stone-400',
    accent: 'bg-amberGold-600 text-white hover:bg-amberGold-700 active:bg-amberGold-800 focus-visible:outline-amberGold-600 shadow-soft',
    outline: 'border border-forest-800/80 text-forest-800 hover:bg-forest-50 active:bg-forest-100 focus-visible:outline-forest-700',
    ghost: 'text-stone-700 hover:bg-stone-200/50 active:bg-stone-200 focus-visible:outline-stone-400',
  };

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-6 py-3 gap-2.5 font-semibold',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled}
      {...props}
    >
      {leftIcon && <span className="shrink-0">{leftIcon}</span>}
      <span>{children}</span>
      {rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
