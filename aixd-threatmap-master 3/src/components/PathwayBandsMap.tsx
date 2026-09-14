"use client";

import { SelectAsFilter } from "@/components/SelectAsFilter";
import { VizPanelCard } from "@/components/VizPanelCard";
import { useLegendTip } from "@/components/LegendTip";
import { HM2_CLUSTERS, HM2_DA_NAME, HM2_DA_PILLAR, HM2_DA_PILLAR_NAME, HM2_PATHS, HM2_TIER_SHORT } from "@/lib/pathways";
import { TIER_COLORS } from "@/lib/tiers";
import { PATHWAY_CLUSTER_DESC, tierKeyOf } from "@/lib/legendInfo";
import { accessibleLabelOf, mixInk, withAlpha } from "@/lib/codes";
import type { HarmTaxonomy } from "@/lib/types";
import type { VizFilter } from "@/lib/types";
import type { ReactNode } from "react";
import { useState } from "react";

// 1040 originally left only 10px between the DA-chip column's right edge
// (HM2B_DAX + HM2B_DAW = 848 + 182 = 1030) and the canvas boundary — the
// chips read as flush against the panel edge. Widening the canvas (rather
// than shrinking the chips or shifting them left) adds real right padding
// without touching anything else's position.
const VIEW_W = 1070;
// The canvas matches this panel's own content: the three bands plus their
// header fill the height with a small bottom margin — no forced height that
// would pad the bands out and read as empty space.
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
// 182 put the chip's own right edge (HM2B_DAX + HM2B_DAW = 1030) exactly on
// top of the band card's right edge (x=10, width=1020 → also 1030) — the
// chip sat flush against the card that contains it, with zero gap between
// them, even after widening the outer canvas. 170 pulls the chip in by 12px.
const HM2B_DAW = 170;
// Band geometry scaled ×1.2 from the original 400px-tall layout to fill the
// taller 480px canvas — otherwise the content stays pinned to the top and
// the extra height becomes dead space at the bottom. The third band (Lock-in
// & power concentration) is the shortest, so its two 2-lane node rows fence
// with 34px lanes and the first-row pills ("Rules for building AI" etc.) used
// to start exactly where the band title's descenders end. It gets extra height
// (and sits 6px higher) so that lane height grows to 43px and the pills sit
// ~4px clear of the title — real breathing room instead of a kiss.
const HM2B_BAND = [
  { top: 83, h: 163 },
  { top: 257, h: 112 },
  { top: 376, h: 112 },
];
const HM2B_NODE_W = 98;
// Header strip rows: every cluster title plus the democracy-affected column
// sits at the very top of the svg on one aligned baseline (HM2B_TITLE_Y2),
// each centred over its territory; the titles too long for their columns wrap
// onto a distinct second row (HM2B_TITLE_WRAP); the tier sub-title chips sit
// below with real padding between them (HM2B_CHIP_Y) so the headers read as
// their own block instead of sitting on top of the column labels.
const HM2B_TITLE_Y2 = 20;
const HM2B_TITLE_WRAP = 32;
const HM2B_CHIP_Y = 55;
const HM2B_VLINE_BOTTOM = 472;

const TITLE = "Through which pathways does the literature link AI to harm for democracy?";
const NOTE =
  "* as mentioned in the sources (the data collected does not include information on which threats and mitigations are more impactful). Bands are recurring pathways; numbers count entries asserting that step within a single statement — recurring claims in the literature, not verified causation.";

const hm2Lbl = (c: string, tax?: HarmTaxonomy) =>
  accessibleLabelOf(c, tax, undefined) ?? HM2_TIER_SHORT[c] ?? c;
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
  harmTaxonomy,
}: {
  onFilterTable?: (target: VizFilter) => void;
  harmTaxonomy?: HarmTaxonomy;
}) => {
  const [active, setActive] = useState<ReactNode | null>(null);
  const [filterTarget, setFilterTarget] = useState<VizFilter | null>(null);
  const { tipNode, open } = useLegendTip();
  const openClusterTip = (name: string, tiers: string[], rect: DOMRect) =>
    open(
      {
        title: name,
        description: PATHWAY_CLUSTER_DESC[name],
        lines: tiers
          .flatMap((t) =>
            (harmTaxonomy?.tiers[tierKeyOf(t)]?.codeIds ?? [])
              .filter((code) => harmTaxonomy?.codes[code])
              .map((code) => harmTaxonomy?.codes[code]?.label)
          )
          .filter((x): x is string => !!x),
      },
      rect
    );
  const lbl = (c: string) => hm2Lbl(c, harmTaxonomy);
  // The clicked (filterable) code — highlighted in the diagram + legend.
  const selCode = filterTarget?.codes[0] ?? null;
  const selPillar = filterTarget?.key === "aspect" ? selCode?.[0] ?? null : null;

  const showDetail = (html: ReactNode) => {
    setActive(html);
  };

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
              // Titles that would overflow their own territory wrap instead
              // ("Downstream social dynamics" is ~197px at this size against
              // a 182px column; "Properties and capabilities" at 174px fits
              // its wider 216px one) so only the genuinely-long names drop
              // onto the distinct second header row.
              const wrap = c.name.length > 18 && cx[1] - cx[0] < 200;
              const nameLines = wrap ? wrapWords(c.name, 17) : [c.name];
              return (
                <g key={ci}>
                  {ci > 0 && (
                    <line x1={cx[0] - 4} y1={6} x2={cx[0] - 4} y2={HM2B_VLINE_BOTTOM} stroke="#D6D6CA" strokeWidth={1} />
                  )}
                  {/* Invisible hover target for the cluster's "head category"
                      hover box (short description + sub-codes), matching the
                      hover boxes added to the other panels' legends. */}
                  <rect
                    x={cx[0] - 8}
                    y={4}
                    width={cx[1] - cx[0] + 16}
                    height={HM2B_CHIP_Y}
                    fill="#1a1a17"
                    fillOpacity={0}
                    style={{ cursor: "help" }}
                    onMouseEnter={(e) => openClusterTip(c.name, c.tiers, e.currentTarget.getBoundingClientRect())}
                  />
                  {/* Cluster titles read as a layered header, not one unbroken
                      line: Context, Properties and capabilities and AI model
                      use fit their columns and share a single baseline, while
                      Downstream social dynamics wraps onto a distinct second
                      row — same title weight, a real line break, still above
                      the tier sub-title chips. */}
                  <text
                    x={mid}
                    y={HM2B_TITLE_Y2}
                    textAnchor="middle"
                    fontSize={12.5}
                    fontWeight={800}
                    fill="#1a1a17"
                    style={{ pointerEvents: "none" }}
                  >
                    {nameLines.map((ln, li) => (
                      <tspan key={li} x={mid} dy={li === 0 ? 0 : HM2B_TITLE_WRAP - HM2B_TITLE_Y2}>
                        {ln}
                      </tspan>
                    ))}
                  </text>
                  {/* Skip the per-tier chip label when a cluster has only one
                      tier — e.g. "Context" (T0 alone), whose tier short name
                      is also literally "Context". With one member the group
                      title above already says it; repeating it as a chip
                      right underneath just duplicates the same word twice. */}
                  {c.tiers.length > 1 && c.tiers.map((t) => {
                    // Tier columns are only 84–112px apart — at the old 11-char
                    // budget nearly every name fractured into two lines ("AI" /
                    // "capabilities") at mixed baselines, so the sub-title row
                    // read as ragged fragments. 17 lets all but the longest
                    // names ("Individual downstream", "Societal downstream") sit
                    // on one whole-word line, keeping the row aligned and the
                    // labels clearly subordinate to the cluster titles above.
                    const lines = wrapWords(HM2_TIER_SHORT[t], 17).slice(0, 2);
                    return (
                      <text key={t} x={HM2B_TX[t]} y={HM2B_CHIP_Y} textAnchor="middle" fontSize={10.5} fontWeight={600} fill={TIER_COLORS[t]}>
                        {lines.map((line, li) => (
                          <tspan key={li} x={HM2B_TX[t]} dy={li === 0 ? (lines.length > 1 ? -2 : 0) : 9}>
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
            {/* Centred over the democracy-affected column like the cluster headings
                over theirs — the header row treats it as a fifth column even
                though its pills are left-anchored. Wraps like the Downstream
                social dynamics title because its full name is too wide for
                the column. */}
            <text x={HM2B_DAX + HM2B_DAW / 2} y={HM2B_TITLE_Y2} textAnchor="middle" fontSize={12.5} fontWeight={800} fill="#1a1a17">
              {wrapWords("Democracy aspects affected", 16).map((ln, li) => (
                <tspan key={li} x={HM2B_DAX + HM2B_DAW / 2} dy={li === 0 ? 0 : HM2B_TITLE_WRAP - HM2B_TITLE_Y2}>
                  {ln}
                </tspan>
              ))}
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
                  {/* Band title sits right under the rounded card's top edge
                      (rect starts at b.top-16) — nudged down from the previous
                      b.top-4 to b.top+2 for real breathing room above the text.
                      Title + count are one <text> with the count as a tspan
                      so the browser lays out real glyph widths — the old
                      two-<text> version positioned the count by estimating
                      the title's pixel width from its character count, which
                      undershot for longer titles and ran the count straight
                      into the title's last letters. */}
                  <text x={24} y={b.top + 2} fontSize={11.5} fontWeight={800} fill="#1a1a17">
                    {f.name}
                    <tspan fontSize={10} fontWeight={600} fill="#9A9A92">
                      {" "}
                      · {formatCount(f.units)} entries
                    </tspan>
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
                            {lbl(sg.a)} → {lbl(sg.b)}
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
                        aria-label={`${lbl(sg.a)} to ${lbl(sg.b)}, ${formatCount(sg.n)} entries`}
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
                    // 15 chars/line at 10px bold nearly spans the full 98px
                    // node width (~90-97px), leaving no side padding — labels
                    // read as pressed against the pill's edge. 12 leaves a
                    // real margin on both sides.
                    const all = wrapWords(lbl(n.c), 12);
                    const lines = all.slice(0, 2);
                    const trunc = all.length > 2;
                    const activateNode = () => {
                      const t = hm2TierOfPath(n.c);
                      const clusterName = HM2_CLUSTERS.find((k) => t && k.tiers.includes(t))?.name || "";
                      setFilterTarget({
                        key: "harm",
                        codes: [n.c],
                        label: lbl(n.c),
                      });
                      showDetail(
                        <>
                          <b>
                            {lbl(n.c)} ({n.c})
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
                        aria-label={`${lbl(n.c)} (${n.c})`}
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
                    const nameLines = wrapWords(HM2_DA_NAME[d[0]] || d[0], 22).slice(0, 2);
                    const nameTrunc = wrapWords(HM2_DA_NAME[d[0]] || d[0], 22).length > 2;
                    const activateDA = () => {
                      setFilterTarget({
                        key: "aspect",
                        codes: [d[0]],
                        label: HM2_DA_NAME[d[0]] || d[0],
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
                            text block instead of stretching the line gaps.
                            Left/right insets bumped 9/8 → 12/12 — at the old
                            insets the code and count text sat right against
                            the pill's rx=10 rounded corners with no visible
                            margin. */}
                        <text x={HM2B_DAX + 12} y={y - 10} dominantBaseline="central" fontSize={10} fontWeight={800} fill={mixInk(col, 0.25)}>
                          {d[0]}
                        </text>
                        <text x={HM2B_DAX + HM2B_DAW - 12} y={y - 10} textAnchor="end" dominantBaseline="central" fontSize={9.5} fontWeight={700} fill={mixInk(col, 0.25)}>
                          {formatCount(d[1])} entries
                        </text>
                        {nameLines.map((line, li) => (
                          <text
                            key={li}
                            x={HM2B_DAX + 12}
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
      {tipNode}
    </VizPanelCard>
  );
};