"use client";

import { mixInk, withAlpha } from "@/lib/codes";

type CodeChipsProps = {
  codes: string[];
  colorOf: (code: string) => string | undefined;
  labelOf: (code: string) => string;
  max?: number;
  maxWidth?: number;
  emptyLabel?: string;
};

export const CodeChips = ({
  codes,
  colorOf,
  labelOf,
  max = 3,
  maxWidth = 150,
  emptyLabel = "—",
}: CodeChipsProps) => {
  if (!codes || codes.length === 0) {
    return (
      <span className="text-[11.5px] italic text-muted-foreground">
        {emptyLabel}
      </span>
    );
  }
  const shown = codes.slice(0, max);
  const extra = codes.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((code) => {
        const c = colorOf(code) ?? "#5C5C52";
        const name = labelOf(code);
        return (
          <span
            key={code}
            title={name && name !== code ? `${code} — ${name}` : code}
            // Wraps onto a second line instead of truncating with an
            // ellipsis — maxWidth now bounds the wrap, not a hard cut.
            className="inline-block whitespace-normal break-words rounded-[10px] px-[7px] py-[3px] text-[10.5px] font-semibold leading-snug"
            style={{
              maxWidth,
              background: withAlpha(c, 0.14),
              color: mixInk(c, 0.25),
              border: `1px solid ${withAlpha(c, 0.35)}`,
            }}
          >
            {name || code}
          </span>
        );
      })}
      {extra > 0 && (
        <span className="self-center text-[10.5px] text-muted-foreground">
          +{extra}
        </span>
      )}
    </div>
  );
};