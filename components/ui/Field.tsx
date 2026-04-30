"use client";

type Props = {
  label: string;
  children: React.ReactNode;
  hint?: string;
};

export default function Field({ label, children, hint }: Props) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-ink-500">
        {label}
      </span>
      {children}
      {hint && <span className="text-xs text-ink-500">{hint}</span>}
    </label>
  );
}
