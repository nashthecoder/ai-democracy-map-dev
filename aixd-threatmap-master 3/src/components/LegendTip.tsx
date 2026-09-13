"use client";

import { useEffect, useRef, useState } from "react";

export type LegendTipData = {
  title: string;
  description?: string;
  lines?: string[];
};

// Shared "hover box" for the carousel legends: on hovering a head category
// (pillar / tier / benefit cluster) a tip shows the codebook's short
// description plus the full list of the sub-code NAMES it groups (no IDs).
// Rendered position:fixed so card `overflow:hidden` never clips it.
//
// The tip is interactive (pointer-events:auto) so a long sub-code list can be
// wheel-scrolled. It stays open only while the cursor is inside the hovered
// legend box (anchor) OR the tip itself — a global pointer-follower closes it
// the moment the cursor leaves both, so it never feels sticky but always
// reachable/scrollable.
export const useLegendTip = () => {
  const [tip, setTip] = useState<LegendTipData | null>(null);
  const [pos, setPos] = useState({ left: 0, top: 0, above: true });

  // The legend box the tip was opened from (viewport coords), so the pointer
  // follower can treat it as part of the open hot-zone.
  const anchorRef = useRef<DOMRect | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);

  const open = (data: LegendTipData, rect: DOMRect) => {
    const above = rect.top > 240;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - 316));
    anchorRef.current = rect;
    setTip(data);
    setPos({ left, top: above ? rect.top - 10 : rect.bottom + 10, above });
  };

  const close = () => {
    setTip(null);
    setPos({ left: 0, top: 0, above: true });
    anchorRef.current = null;
  };

  // Keep the tip open while the pointer is over the tooltip or the legend box
  // it was opened from (both slightly padded so the tiny 10px gap between them
  // doesn't blink). Leaving both closes it immediately.
  useEffect(() => {
    if (!tip) return;
    const onMove = (e: PointerEvent) => {
      const el = tipRef.current;
      const anchor = anchorRef.current;
      if (!el || !anchor) return;
      const t = el.getBoundingClientRect();
      const pad = 16;
      const inside = (r: DOMRect) =>
        e.clientX >= r.left - pad &&
        e.clientX <= r.right + pad &&
        e.clientY >= r.top - pad &&
        e.clientY <= r.bottom + pad;
      if (!inside(t) && !inside(anchor)) close();
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tip]);

  const tipNode = tip ? (
    <div
      ref={tipRef}
      role="tooltip"
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        transform: pos.above ? "translateY(-100%)" : undefined,
        width: 300,
        pointerEvents: "auto",
        zIndex: 60,
        background: "#F4F4EA",
        color: "#1a1a17",
        border: "0.5px solid rgba(26, 26, 23, 0.6)",
        borderRadius: 10,
        boxShadow: "0 14px 34px rgba(26, 26, 23, 0.18)",
        padding: "10px 14px",
        textAlign: "left",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "rgba(26,26,23,0.55)",
          marginBottom: 4,
        }}
      >
        {tip.title}
      </div>
      {tip.description && (
        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: "rgba(26,26,23,0.9)" }}>{tip.description}</div>
      )}
      {tip.lines && tip.lines.length > 0 && (
        <div style={{ marginTop: 8, borderTop: "0.5px solid rgba(26,26,23,0.2)", paddingTop: 7 }}>
          <div
            style={{
              fontSize: 10.5,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(26,26,23,0.55)",
              marginBottom: 5,
            }}
          >
            Sub-codes
          </div>
          <ul
            style={{
              margin: 0,
              padding: 0,
              paddingRight: 4,
              listStyle: "none",
              maxHeight: 220,
              overflowY: "auto",
              overscrollBehavior: "contain",
              display: "grid",
              gridTemplateColumns: "repeat(1, 1fr)",
              gap: 3,
            }}
          >
            {tip.lines.map((l) => (
              <li key={l} style={{ fontSize: 12, lineHeight: 1.35, color: "rgba(26,26,23,0.85)", display: "flex", gap: 7 }}>
                <span style={{ color: "rgba(26,26,23,0.4)", flexShrink: 0 }}>•</span>
                <span>{l}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  ) : null;

  return { tipNode, open, close };
};