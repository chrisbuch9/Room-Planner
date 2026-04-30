"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement>;

const TextInput = forwardRef<HTMLInputElement, Props>(function TextInput(
  { className = "", ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      {...rest}
      className={`h-9 px-2.5 rounded-md border border-ink-200 bg-white text-sm text-ink-900 placeholder:text-ink-400 outline-none transition-colors hover:border-ink-300 focus:border-ink-500 focus:ring-2 focus:ring-ink-500/30 disabled:bg-paper-100 disabled:text-ink-400 ${className}`}
    />
  );
});

export default TextInput;
