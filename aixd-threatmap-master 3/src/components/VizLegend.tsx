"use client";

import { withAlpha } from "@/lib/codes";

type LegendItem = { color: string; label: string; codes: string[] };

// Bottom-of-panel legend, clustered by tier / pillar / cluster: one swatch per
// group with its label and the codes it contains. Matches the mock layout.
// When `activeCode` is set (a node is hovered/selected on the map), the group
// that contains that code gets a tinted background so the reader can place the
// node within the legend.
export const VizLegend = ({
  groups,
  topGap = 14,
  activeCode,
  showCodes = true,
}: {
  groups: LegendItem[];
  // Space between the panel body and the legend rule. Raise it per-panel when
  // the map above needs more breathing room below its labels.
  topGap?: number;
  activeCode?: string | null;
  // Prints the code IDs (e.g. "1.1, 2.3") alongside each group label. Client
  // wants these numbers gone from the legenda, so panels opt out via false.
  showCodes?: boolean;
}) => (
  <div
    style={{
      display: "flex",
      flexWrap: "wrap",
      gap: "14px 20px",
      marginTop: topGap,
      paddingTop: 12,
      borderTop: "1px solid #D6D6CA",
    }}
  >
    {groups.map((g, i) => {
      const isActive = activeCode != null && g.codes.includes(activeCode);
      return (
        <div
          key={i}
          style={{
            fontSize: 10.5,
            color: "#5C5C52",
            maxWidth: 190,
            lineHeight: 1.5,
            borderRadius: 8,
            padding: "4px 8px",
            margin: "-4px -8px",
            background: isActive ? withAlpha(g.color, 0.16) : "transparent",
            boxShadow: isActive ? `inset 0 0 0 1px ${withAlpha(g.color, 0.45)}` : "none",
            transition: "background 140ms ease, box-shadow 140ms ease",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 5,
              fontWeight: 700,
              color: "#1a1a17",
              marginBottom: 2,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: g.color,
                flexShrink: 0,
                marginTop: 3,
                boxShadow: isActive ? `0 0 0 2px ${withAlpha(g.color, 0.3)}` : "none",
              }}
            />
            <span>{g.label}</span>
          </div>
          {showCodes && <div>{g.codes.join(", ")}</div>}
        </div>
      );
    })}
  </div>
);
