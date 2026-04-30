"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type Size = "sm" | "md" | "lg";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  trailingIcon?: ReactNode;
};

const variants: Record<Variant, string> = {
  primary:
    "bg-ink-900 text-white border border-ink-900 hover:bg-ink-800 hover:border-ink-800 active:bg-ink-950 disabled:bg-ink-300 disabled:border-ink-300 disabled:text-white",
  secondary:
    "bg-white text-ink-800 border border-ink-200 hover:bg-paper-100 hover:border-ink-300 active:bg-paper-200 disabled:opacity-50",
  ghost:
    "bg-transparent text-ink-700 border border-transparent hover:bg-ink-50 active:bg-ink-100 disabled:opacity-50",
  danger:
    "bg-red-600 text-white border border-red-600 hover:bg-red-700 hover:border-red-700 active:bg-red-800 disabled:opacity-50",
  accent:
    "bg-sage-600 text-white border border-sage-600 hover:bg-sage-700 hover:border-sage-700 active:bg-sage-800 disabled:opacity-50",
};

const sizes: Record<Size, string> = {
  sm: "h-7 px-2.5 text-xs gap-1.5",
  md: "h-9 px-3 text-sm gap-2",
  lg: "h-10 px-4 text-sm gap-2",
};

const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = "secondary",
    size = "md",
    icon,
    trailingIcon,
    className = "",
    children,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      {...rest}
      className={`inline-flex items-center justify-center rounded-md font-medium tracking-tight transition-colors focus-ring disabled:cursor-not-allowed shadow-soft ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children && <span className="truncate">{children}</span>}
      {trailingIcon && <span className="shrink-0">{trailingIcon}</span>}
    </button>
  );
});

export default Button;
