import React from 'react';

export interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  id?: string;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required,
  error,
  hint,
  children,
  id,
  className = '',
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="block text-xs font-bold uppercase tracking-wider text-stone-700"
        >
          {label} {required && <span className="text-rose-500 font-bold">*</span>}
        </label>
        {hint && <span className="text-[11px] text-stone-500">{hint}</span>}
      </div>

      {children}

      {error && (
        <p className="text-xs text-rose-600 font-medium flex items-center gap-1 animate-in fade-in">
          <span>•</span> {error}
        </p>
      )}
    </div>
  );
};

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ hasError, className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white transition-colors focus:outline-none focus:ring-2 ${
          hasError
            ? 'border-rose-300 focus:ring-rose-500 text-rose-900'
            : 'border-stone-200 focus:ring-forest-700 focus:border-forest-700 text-stone-900'
        } ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ hasError, className = '', children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white transition-colors focus:outline-none focus:ring-2 ${
          hasError
            ? 'border-rose-300 focus:ring-rose-500 text-rose-900'
            : 'border-stone-200 focus:ring-forest-700 focus:border-forest-700 text-stone-900'
        } ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = 'Select';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ hasError, className = '', ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white transition-colors focus:outline-none focus:ring-2 ${
          hasError
            ? 'border-rose-300 focus:ring-rose-500 text-rose-900'
            : 'border-stone-200 focus:ring-forest-700 focus:border-forest-700 text-stone-900'
        } ${className}`}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';
