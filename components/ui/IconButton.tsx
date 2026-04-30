"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "ghost" | "soft" | "primary";
  size?: "sm" | "md";
  label: string; // for aria-label
  children: ReactNode;
};

const variants = {
  ghost:
    "bg-transparent text-ink-600 hover:bg-ink-50 hover:text-ink-900 active:bg-ink-100",
  soft:
    "bg-paper-100 text-ink-700 hover:bg-paper-200 active:bg-paper-300 border border-ink-100",
  primary:
    "bg-ink-900 text-white hover:bg-ink-800 active:bg-ink-950 shadow-soft",
} as const;

const sizes = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
} as const;

const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
  { variant = "ghost", size = "md", label, className = "", children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      {...rest}
      className={`inline-flex items-center justify-center rounded-md transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
});

export default IconButton;
