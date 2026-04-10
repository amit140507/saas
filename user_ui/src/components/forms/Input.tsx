import React, { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs uppercase font-bold text-zinc-500 dark:text-zinc-400 mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full bg-zinc-50 border dark:bg-zinc-950 dark:border-zinc-800 
            rounded-lg px-3 py-2.5 text-sm text-zinc-900 dark:text-white 
            outline-none transition-colors
            ${error ? "border-red-500 focus:border-red-500" : "border-zinc-200 focus:border-indigo-500"}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-red-500 font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
