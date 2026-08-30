"use client";

import { SelectAsFilter } from "@/components/SelectAsFilter";
import { VizPanelCard } from "@/components/VizPanelCard";
import { HM2_CLUSTERS, HM2_DA_NAME, HM2_DA_PILLAR, HM2_DA_PILLAR_NAME, HM2_L, HM2_PATHS, HM2_TIER_SHORT } from "@/lib/pathways";
import { TIER_COLORS } from "@/lib/tiers";
import { mixInk, withAlpha } from "@/lib/codes";
import type { VizFilter } from "@/lib/types";
import type { ReactNode } from "react";
import { useState } from "react";

const VIEW_W = 1040;
const VIEW_H = 480;

// Geometry rescaled from the colleague's original 430px-tall layout to this
// site's map height, matching the client mock's panels.
const HM2B_TX: Record<string, number> = { T0: 70, T1: 182, T2: 288, T3: 396, T4: 500, T5: 604, T6: 698, T7: 782 };
const HM2B_CLUS_X: [number, number][] = [
  [14, 126],
  [126, 342],
  [342, 656],
  [656, 838],
];
const HM2B_DAX = 848;
const HM2B_DAW = 182;
// Band geometry scaled ×1.2 from the original 400px-tall layout to fill the
// taller 480px canvas — otherwise the content stays pinned to the top and
// the extra height just becomes new dead space at the bottom.
const HM2B_BAND = [
  { top: 83, h: 163 },
  { top: 257, h: 112 },
  { top: 382, h: 94 },
];
const HM2B_NODE_W = 98;
const HM2B_TITLE_Y1 = 18;
const HM2B_TITLE_Y2 = 31;
const HM2B_CHIP_Y = 52;
const HM2B_VLINE_BOTTOM = 462;

const TITLE = "Through which pathways does the literature link AI to harm for democracy?";
const NOTE =
  "* the data collected does not include information on which tactics/threats are more effective or grave. Bands are recurring pathways; numbers count entries asserting that step within a single statement — recurring claims in the literature, not verified causation.";

const hm2Lbl = (c: string) => HM2_L[c] || HM2_TIER_SHORT[c] || c;
const hm2TierOfPath = (c: string) => {
  const m = /^T(\d+)/.exec(c);
  return m ? "T" + m[1] : null;
};

function wrapWords(text: string, max: number): string[] {
  const w = String(text).split(" ");
  const out: string[] = [];
  let c = "";
  for (const x of w) {
    if ((c + " " + x).trim().length <= max) c = (c + " " + x).trim();
    else {
      if (c) out.push(c);
      c = x;
    }
  }
  if (c) out.push(c);
  return out;
}

const formatCount = (n: number) => new Intl.NumberFormat("en").format(n);

export const PathwayBandsMap = ({
  onFilterTable,
}: {
  onFilterTable?: (target: VizFilter) => void;
}) => {
  const [active, setActive] = useState<ReactNode | null>(null);
  const [filterTarget, setFilterTarget] = useState<VizFilter | null>(null);
  // The clicked (filterable) code — highlighted in the diagram + legend.
  const selCode = filterTarget?.codes[0] ?? null;
  const selPillar = filterTarget?.key === "aspect" ? selCode?.[0] ?? null : null;

  const showDetail = (html: ReactNode) => {
    setActive(html);
  };

  const bandTitleX = (name: string) => 24 + name.length * 6.4;

  return (
    <VizPanelCard
      id="viz-pathway-bands-map"
      title={TITLE}
      highlights={["pathways", "harm for democracy"]}
      note={NOTE}
    >
      <div className="relative mt-2 overflow-x-auto" style={{ minHeight: VIEW_H }}>
        <svg
          width="100%"
          height={VIEW_H}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          style={{ display: "block", minWidth: VIEW_W }}
          role="img"
          aria-label="Which pathways does the literature link AI to harm for democracy? Band diagram; click a step, mechanism or aspect chip for detail."
        >
          <g>
            {HM2B_CLUS_X.map((cx, ci) => {
              const c = HM2_CLUSTERS[ci];
              const mid = (cx[0] + cx[1]) / 2;
              const nameLines = wrapWords(c.name, 20).slice(0, 2);
              return (
                <g key={ci}>
                  {ci > 0 && (
                    <line x1={cx[0] - 4} y1={6} x2={cx[0] - 4} y2={HM2B_VLINE_BOTTOM} stroke="#D6D6CA" strokeWidth={1} />
                  )}
                  {nameLines.length === 1 ? (
                    <text x={mid} y={HM2B_TITLE_Y2} textAnchor="middle" fontSize={11.5} fontWeight={800} fill="#1a1a17">
                      {nameLines[0]}
                    </text>
                  ) : (
                    <>
                      <text x={mid} y={HM2B_TITLE_Y1} textAnchor="middle" fontSize={11.5} fontWeight={800} fill="#1a1a17">
                        {nameLines[0]}
                      </text>
                      <text x={mid} y={HM2B_TITLE_Y2} textAnchor="middle" fontSize={11.5} fontWeight={800} fill="#1a1a17">
                        {nameLines[1]}
                      </text>
                    </>
                  )}
                  {/* Skip the per-tier chip label when a cluster has only one
                      tier — e.g. "Context" (T0 alone), whose tier short name
                      is also literally "Context". With one member the group
                      title above already says it; repeating it as a chip
                      right underneath just duplicates the same word twice. */}
                  {c.tiers.length > 1 && c.tiers.map((t) => {
                    // Tier columns are only 84–112px apart — long labels like
                    // "Individual downstream" render wider than that as one
                    // line and spill into neighboring columns. Wrap them the
                    // same way the cluster title above already is.
                    const lines = wrapWords(HM2_TIER_SHORT[t], 11).slice(0, 2);
                    return (
                      <text key={t} x={HM2B_TX[t]} y={HM2B_CHIP_Y} textAnchor="middle" fontSize={10} fontWeight={700} fill={TIER_COLORS[t]}>
                        {lines.map((line, li) => (
                          <tspan key={li} x={HM2B_TX[t]} dy={li === 0 ? (lines.length > 1 ? -5 : 0) : 11}>
                            {line}
                          </tspan>
                        ))}
                      </text>
                    );
                  })}
                </g>
              );
            })}

            <line x1={HM2B_DAX - 8} y1={6} x2={HM2B_DAX - 8} y2={HM2B_VLINE_BOTTOM} stroke="#D6D6CA" strokeWidth={1} />
            {/* Left-aligned to the pills' own left edge (HM2B_DAX + 9), not
                centered on the column — every pill below is left-anchored
                (code and name both start flush left), so a centered header
                reads as offset from the content it's labeling even though
                the two are mathematically centered on the same axis. */}
            <text x={HM2B_DAX + 9} y={HM2B_TITLE_Y1} fontSize={11.5} fontWeight={800} fill="#1a1a17">
              Democracy
            </text>
            <text x={HM2B_DAX + 9} y={HM2B_TITLE_Y2} fontSize={11.5} fontWeight={800} fill="#1a1a17">
              aspects affected
            </text>

            {HM2_PATHS.map((f, fi) => {
              const b = HM2B_BAND[fi];
              const lanes = Math.max(...f.nodes.map((n) => n.l)) + 1;
              const laneH = (b.h - 26) / lanes;
              const nx: Record<string, number> = {};
              const ny: Record<string, number> = {};
              f.nodes.forEach((n) => {
                nx[n.c] = HM2B_TX["T" + n.t];
                ny[n.c] = b.top + 2 + n.l * laneH + laneH / 2;
              });
              return (
                <g key={fi}>
                  <rect x={10} y={b.top - 16} width={1020} height={b.h} rx={14} fill={fi % 2 ? "#FBFBF3" : "#F7F7EE"} stroke="#E4E4D6" strokeWidth={1} />
                  <rect x={10} y={b.top - 16} width={5} height={b.h} rx={2.5} fill="#963735" opacity={0.75} />
                  <text x={24} y={b.top - 4} fontSize={11.5} fontWeight={800} fill="#1a1a17">
                    {f.name}
                  </text>
                  <text x={bandTitleX(f.name)} y={b.top - 4} fontSize={10} fontWeight={600} fill="#9A9A92">
                    · {formatCount(f.units)} entries
                  </text>

                  {f.segs.map((sg, si) => {
                    const x1 = nx[sg.a] + HM2B_NODE_W / 2;
                    const y1 = ny[sg.a];
                    const x2 = nx[sg.b] - HM2B_NODE_W / 2;
                    const y2 = ny[sg.b];
                    const mx = (x1 + x2) / 2;
                    const my = (y1 + y2) / 2;
                    const col = TIER_COLORS[hm2TierOfPath(sg.b) ?? "T0"];
                    const activateSeg = () => {
                      showDetail(
                        <>
                          <b>
                            {hm2Lbl(sg.a)} → {hm2Lbl(sg.b)}
                          </b>{" "}
                          — asserted together in <b>{formatCount(sg.n)} entries</b>. Pathway: {f.name}.
                        </>
                      );
                    };
                    return (
                      <g
                        key={si}
                        className="viz-node"
                        style={{ cursor: "pointer" }}
                        tabIndex={0}
                        role="button"
                        aria-label={`${hm2Lbl(sg.a)} to ${hm2Lbl(sg.b)}, ${formatCount(sg.n)} entries`}
                        onClick={(e) => {
                          e.stopPropagation();
                          activateSeg();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            activateSeg();
                          }
                        }}
                      >
                        <path
                          d={`M${x1} ${y1} C ${x1 + 24} ${y1}, ${x2 - 24} ${y2}, ${x2} ${y2}`}
                          fill="none"
                          stroke={col}
                          strokeWidth={(0.9 + sg.n * 0.42).toFixed(1)}
                          opacity={0.55}
                        />
                        <path d={`M${x2 - 6} ${y2 - 3.5} L${x2} ${y2} L${x2 - 6} ${y2 + 3.5}`} fill="none" stroke={col} strokeWidth={1.3} opacity={0.8} />
                        <text x={mx} y={my - 4} textAnchor="middle" fontSize={10} fontWeight={700} fill="#22201a" stroke="#ffffff" strokeWidth={2.5} paintOrder="stroke">
                          {formatCount(sg.n)}
                        </text>
                      </g>
                    );
                  })}

                  {f.nodes.map((n) => {
                    const x = nx[n.c];
                    const y = ny[n.c];
                    const col = TIER_COLORS["T" + n.t];
                    const h = Math.min(30, laneH - 5);
                    const all = wrapWords(hm2Lbl(n.c), 15);
                    const lines = all.slice(0, 2);
                    const trunc = all.length > 2;
                    const activateNode = () => {
                      const t = hm2TierOfPath(n.c);
                      const clusterName = HM2_CLUSTERS.find((k) => t && k.tiers.includes(t))?.name || "";
                      setFilterTarget({
                        key: "harm",
                        codes: [n.c],
                        label: `${hm2Lbl(n.c)} (${n.c})`,
                      });
                      showDetail(
                        <>
                          <b>
                            {hm2Lbl(n.c)} ({n.c})
                          </b>{" "}
                          — {t ? HM2_TIER_SHORT[t] : ""}
                          {clusterName ? `, in ${clusterName}.` : "."}
                        </>
                      );
                    };
                    return (
                      <g
                        key={n.c}
                        className="viz-node"
                        style={{ cursor: "pointer" }}
                        tabIndex={0}
                        role="button"
                        aria-label={`${hm2Lbl(n.c)} (${n.c})`}
                        onClick={(e) => {
                          e.stopPropagation();
                          activateNode();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            activateNode();
                          }
                        }}
                      >
                        <rect
                          x={x - HM2B_NODE_W / 2}
                          y={y - h / 2}
                          width={HM2B_NODE_W}
                          height={h}
                          rx={8}
                          fill={withAlpha(col, selCode === n.c ? 0.32 : 0.16)}
                          stroke={selCode === n.c ? mixInk(col, 0.25) : withAlpha(col, 0.55)}
                          strokeWidth={selCode === n.c ? 2.5 : 1.5}
                        />
                        {lines.length === 1 ? (
                          <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700} fill={mixInk(col, 0.25)}>
                            {lines[0]}
                          </text>
                        ) : (
                          <>
                            <text x={x} y={y - 5} textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700} fill={mixInk(col, 0.25)}>
                              {lines[0]}
                            </text>
                            <text x={x} y={y + 6} textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700} fill={mixInk(col, 0.25)}>
                              {lines[1]}
                              {trunc ? "…" : ""}
                            </text>
                          </>
                        )}
                      </g>
                    );
                  })}

                  {(() => {
                    // Each chip needs ~48px of vertical room: the three text
                    // rows (code+count, then a 2-line name) need ~38px to
                    // keep clear padding from the pill's own edges, plus a
                    // visible gap to the next chip. Show as many as actually
                    // fit cleanly rather than always forcing 4.
                    const maxByHeight = Math.max(1, Math.floor((b.h - 26) / 48));
                    return f.das.slice(0, Math.min(4, maxByHeight));
                  })().map((d, di, shownDAs) => {
                    const step = (b.h - 26) / shownDAs.length;
                    const y = b.top + 2 + di * step + step / 2;
                    // Three rows now (code+count, then the name wrapped over
                    // up to 2 lines) instead of hard-truncating the name to
                    // one line — with the old single-line truncation, every
                    // aspect name in this column cut off mid-word. Text-row
                    // offsets below are fixed regardless of hh, so extra
                    // room (when a band has fewer chips) becomes genuine
                    // padding rather than stretching the line spacing.
                    const hh = Math.min(50, step - 10);
                    const col = HM2_DA_PILLAR[d[0][0]];
                    const nameLines = wrapWords(HM2_DA_NAME[d[0]] || d[0], 24).slice(0, 2);
                    const nameTrunc = wrapWords(HM2_DA_NAME[d[0]] || d[0], 24).length > 2;
                    const activateDA = () => {
                      setFilterTarget({
                        key: "aspect",
                        codes: [d[0]],
                        label: `${d[0]} ${HM2_DA_NAME[d[0]] || d[0]}`,
                      });
                      showDetail(
                        <>
                          <b>
                            {d[0]} {HM2_DA_NAME[d[0]] || d[0]}
                          </b>{" "}
                          — mentioned in <b>{formatCount(d[1])} of {formatCount(f.units)} entries</b> in the pathway "{f.name}".
                        </>
                      );
                    };
                    return (
                      <g
                        key={`da-${di}`}
                        className="viz-node"
                        style={{ cursor: "pointer" }}
                        tabIndex={0}
                        role="button"
                        aria-label={`${d[0]} ${HM2_DA_NAME[d[0]] || d[0]}, ${formatCount(d[1])} entries`}
                        onClick={(e) => {
                          e.stopPropagation();
                          activateDA();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            activateDA();
                          }
                        }}
                      >
                        <rect
                          x={HM2B_DAX}
                          y={y - hh / 2}
                          width={HM2B_DAW}
                          height={hh}
                          rx={10}
                          fill={withAlpha(col, selCode === d[0] ? 0.32 : 0.16)}
                          stroke={selCode === d[0] ? mixInk(col, 0.25) : withAlpha(col, 0.55)}
                          strokeWidth={selCode === d[0] ? 2.5 : 1.2}
                        />
                        {/* Row offsets are fixed (not scaled to hh) so extra
                            pill height becomes real padding above/below the
                            text block instead of stretching the line gaps. */}
                        <text x={HM2B_DAX + 9} y={y - 10} dominantBaseline="central" fontSize={10} fontWeight={800} fill={mixInk(col, 0.25)}>
                          {d[0]}
                        </text>
                        <text x={HM2B_DAX + HM2B_DAW - 8} y={y - 10} textAnchor="end" dominantBaseline="central" fontSize={9.5} fontWeight={700} fill={mixInk(col, 0.25)}>
                          {formatCount(d[1])} entries
                        </text>
                        {nameLines.map((line, li) => (
                          <text
                            key={li}
                            x={HM2B_DAX + 9}
                            y={y + li * 10}
                            dominantBaseline="central"
                            fontSize={10}
                            fontWeight={600}
                            fill={mixInk(col, 0.25)}
                          >
                            {line}
                            {nameTrunc && li === nameLines.length - 1 ? "…" : ""}
                          </text>
                        ))}
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <div
        style={{
          marginTop: 14,
          padding: "12px 14px",
          background: "#EAEAE3",
          borderRadius: 14,
          fontSize: 12.5,
          color: "#5C5C52",
          lineHeight: 1.55,
        }}
      >
        {active ?? "Click a mechanism, a step, or a democracy-aspect chip for detail."}
      </div>

      {filterTarget && onFilterTable && (
        <SelectAsFilter
          target={filterTarget}
          onApply={onFilterTable}
        />
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "8px 18px",
          fontSize: 10.5,
          color: "#5C5C52",
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px solid #D6D6CA",
        }}
      >
        <span style={{ fontWeight: 800, color: "#1a1a17", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Democracy aspects
        </span>
        {["1", "2", "3", "4"].map((p) => {
          const isActive = selPillar === p;
          return (
            <span
              key={p}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                borderRadius: 8,
                padding: "3px 7px",
                margin: "-3px -7px",
                fontWeight: isActive ? 700 : undefined,
                color: isActive ? "#1a1a17" : undefined,
                background: isActive ? withAlpha(HM2_DA_PILLAR[p], 0.16) : "transparent",
                outline: isActive ? `1px solid ${withAlpha(HM2_DA_PILLAR[p], 0.5)}` : "none",
                outlineOffset: "-1px",
                transition: "background 140ms ease, outline-color 140ms ease",
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 999, background: HM2_DA_PILLAR[p], flexShrink: 0 }} />
              {HM2_DA_PILLAR_NAME[p]}
            </span>
          );
        })}
      </div>
    </VizPanelCard>
  );
};