import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    label: string;
    children: ReactNode;
  }
>(function IconButton({ children, label, ...rest }, ref) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className="flex h-8 items-center gap-1.5 rounded-md border border-[var(--border)] bg-transparent px-2.5 text-xs text-[var(--text)] hover:bg-[var(--card)] disabled:opacity-40"
      {...rest}
    >
      {children}
    </button>
  );
});

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg)]">
      {options.map((o) => (
        <button
          key={o.value}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 text-xs ${o.value === value ? "bg-[var(--accent)] text-white" : "text-[var(--muted)] hover:text-[var(--text)]"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
