import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  icon, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-[#0F1115]";
  
  const variants = {
    primary: "bg-gradient-to-r from-accent-blue to-[#2DD4BF] dark:from-accent-teal dark:to-[#2DD4BF] text-white dark:text-slate-900 hover:shadow-lg hover:scale-[1.02]",
    secondary: "bg-white dark:bg-[#1E293B] text-accent-tan dark:text-accent-violet hover:bg-gray-50 dark:hover:bg-[#28354D] border border-gray-200 dark:border-accent-violet/20",
    ghost: "bg-transparent text-text-muted dark:text-[#94A3B8] hover:text-text-primary dark:hover:text-[#E2E8F0] hover:bg-black/5 dark:hover:bg-white/5",
    danger: "bg-red-500/10 text-red-500 dark:text-red-400 border border-red-500/20 hover:bg-red-500/20",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      {children}
    </button>
  );
};