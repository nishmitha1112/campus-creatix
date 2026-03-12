import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'outline' }> = ({ children, className = '', variant = 'primary', ...props }) => {
  const base = "px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-[var(--accent-primary)] text-white hover:opacity-90 shadow-sm",
    secondary: "bg-[var(--accent-secondary)] text-[var(--accent-primary)] hover:bg-opacity-80",
    danger: "bg-[var(--danger)] text-white hover:opacity-90",
    outline: "border border-[var(--border-default)] text-[var(--text-body)] hover:bg-[var(--bg-main)]"
  };
  
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = '', ...props }) => {
  return (
    <input
      className={`w-full px-4 py-2 bg-[var(--input-bg)] border border-[var(--border-default)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] text-[var(--text-body)] placeholder-[var(--text-muted)] ${className}`}
      {...props}
    />
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string; action?: React.ReactNode }> = ({ children, className = '', title, action }) => {
  return (
    <div className={`card-snist p-6 rounded-md ${className}`}>
      {(title || action) && (
        <div className="flex justify-between items-center mb-4">
          {title && <h3 className="text-lg font-bold text-[var(--text-heading)]">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className = '', children, ...props }) => {
  return (
    <select
      className={`w-full px-4 py-2 bg-[var(--input-bg)] border border-[var(--border-default)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] text-[var(--text-body)] ${className}`}
      {...props}
    >
      {children}
    </select>
  );
};

export const Spinner = () => <Loader2 className="animate-spin text-[var(--accent-primary)] h-6 w-6" />;

export const PageHeader: React.FC<{ title: string; subtitle?: string; children?: React.ReactNode }> = ({ title, subtitle, children }) => (
  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
    <div>
      <h1 className="text-2xl font-bold text-[var(--text-heading)]">{title}</h1>
      {subtitle && <p className="text-[var(--text-muted)] mt-1">{subtitle}</p>}
    </div>
    <div className="flex gap-3">
      {children}
    </div>
  </div>
);

export const Badge: React.FC<{ children: React.ReactNode; variant?: 'success' | 'warning' | 'default' }> = ({ children, variant = 'default' }) => {
    const colors = {
        success: "bg-green-100 text-green-800",
        warning: "bg-yellow-100 text-yellow-800",
        default: "bg-[var(--accent-secondary)] text-[var(--accent-primary)]"
    }
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colors[variant]}`}>
            {children}
        </span>
    )
}
