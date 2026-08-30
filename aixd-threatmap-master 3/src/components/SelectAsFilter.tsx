"use client";

import type { VizFilter } from "@/lib/types";

type SelectAsFilterProps = {
  target: VizFilter;
  /** Applies the filter to the table (union with any existing selection). */
  onApply: (target: VizFilter) => void;
  /** Optional: clear the panel's own suggestion without filtering. */
  onDismiss?: () => void;
};

export const SelectAsFilter = ({ target, onApply, onDismiss }: SelectAsFilterProps) => (
  <div className="mt-3 inline-flex items-center gap-1.5">
    <button
      type="button"
      onClick={() => onApply(target)}
      className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-primary/15"
    >
      Apply filter: {target.label}
    </button>
    {onDismiss && (
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss suggestion"
        className="flex size-5 items-center justify-center rounded-full text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ×
      </button>
    )}
  </div>
);
