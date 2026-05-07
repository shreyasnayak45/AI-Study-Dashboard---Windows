import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-white/60">
            {label}
          </label>
        )}

        <div className="relative">
          {icon && (
            <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-white/30">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full rounded-xl border bg-white/[0.04] px-4 py-2.5 text-sm text-white",
              "placeholder:text-white/20 transition-all duration-200",
              "focus:outline-none focus:ring-2",
              error
                ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20"
                : "border-white/[0.08] focus:border-brand-500/40 focus:ring-brand-500/20",
              icon && "pl-10",
              className
            )}
            {...props}
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
