import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Comp, Design, Endpoint, PortDef, Side, View, Wire } from './types';
import type { SimState } from './sim';
import { DEF_MAP, KIND_COLOR } from './library';
import { CompView, CtlAction, fmt } from './CompView';
import { planMatches, portHint, wiredEnds } from './advice';

export interface Sel {
  comps: string[];
  wire: string | null;
}

interface Props {
  design: Design;
  sim: SimState | null;
  view: View;
  setView: (v: View) => void;
  symbol: boolean;
  sel: Sel;
  setSel: (s: Sel) => void;
  hist: Record<string, number[]>;
  tick: number;
  onMove: (pos: Record<string, { x: number; y: number }>, commit: boolean) => void;
  onAddWire: (a: Endpoint, b: Endpoint) => void;
  onDropType: (type: string, x: number, y: number) => void;
  onCtl: (id: string, a: CtlAction) => void;
}

const DIR: Record<Side, [number, number]> = { l: [-1, 0], r: [1, 0], t: [0, -1], b: [0, 1] };

export function portAbs(c: Comp, p: PortDef) {
  return { x: c.x + p.x, y: c.y + p.y, side: p.side };
}

export function route(a: { x: number; y: number; side: Side }, b: { x: number; y: number; side: Side }, off = 0) {
  const d = 14 + off;
  const a1 = { x: a.x + DIR[a.side][0] * d, y: a.y + DIR[a.side][1] * d };
  const b1 = { x: b.x + DIR[b.side][0] * d, y: b.y + DIR[b.side][1] * d };
  const ha = a.side === 'l' || a.side === 'r';
  const hb = b.side === 'l' || b.side === 'r';
  const pts: [number, number][] = [[a.x, a.y], [a1.x, a1.y]];
  if (ha && hb) {
    const mx = Math.round((a1.x + b1.x) / 2 / 5) * 5 + off;
    pts.push([mx, a1.y], [mx, b1.y]);
  } else if (!ha && !hb) {
    const my = Math.round((a1.y + b1.y) / 2 / 5) * 5 + off;
    pts.push([a1.x, my], [b1.x, my]);
  } else if (ha) pts.push([b1.x, a1.y]);
  else pts.push([a1.x, b1.y]);
  pts.push([b1.x, b1.y], [b.x, b.y]);
  return pts;
}

function pathD(pts: [number, number][]) {
  const r = 6;
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const l1 = Math.hypot(x1 - x0, y1 - y0);
    const l2 = Math.hypot(x2 - x1, y2 - y1);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    if (rr < 0.5) {
      d += ` L${x1},${y1}`;
      continue;
    }
    const ax = x1 - ((x1 - x0) / l1) * rr;
    const ay = y1 - ((y1 - y0) / l1) * rr;
    const bx = x1 + ((x2 - x1) / l2) * rr;
    const by = y1 + ((y2 - y1) / l2) * rr;
    d += ` L${ax.toFixed(1)},${ay.toFixed(1)} Q${x1},${y1} ${bx.toFixed(1)},${by.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  return d + ` L${last[0]},${last[1]}`;
}

export function wireColor(design: Design, w: Wire) {
  if (w.color) return w.color;
  const ka = DEF_MAP[design.comps.find((c) => c.id === w.a.c)?.type ?? '']?.ports.find((p) => p.id === w.a.p)?.kind;
  const kb = DEF_MAP[design.comps.find((c) => c.id === w.b.c)?.type ?? '']?.ports.find((p) => p.id === w.b.p)?.kind;
  const k = ka && ka !== 'X' ? ka : kb && kb !== 'X' ? kb : 'X';
  return KIND_COLOR[k];
}

const STATE_COLOR: Record<string, string> = {
  ac: '#fbbf24',
  p3: '#f97316',
  mv: '#fb7185',
  dc: '#f87171',
  sig: '#fbbf24',
  data: '#2dd4bf',
  fault: '#ef4444',
};

export function Canvas(p: Props) {
  const { design, sim, view, setView, symbol, sel, setSel } = p;
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<any>(null);
  const [draft, setDraft] = useState<{ from: { x: number; y: number; side: Side }; to: { x: number; y: number }; ok?: boolean } | null>(null);
  const [box, setBox] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [hoverWire, setHoverWire] = useState<string | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number; comp: string; port: string; to: string; why: string; extra: string } | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  const compMap = useMemo(() => new Map(design.comps.map((c) => [c.id, c])), [design.comps]);

  const toWorld = (cx: number, cy: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    const v = viewRef.current;
    return { x: (cx - r.left - v.x) / v.k, y: (cy - r.top - v.y) / v.k };
  };

  useEffect(() => {
    const el = svgRef.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = viewRef.current;
      const r = el.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      if (e.ctrlKey || !e.shiftKey) {
        const k = Math.min(3, Math.max(0.15, v.k * Math.exp(-e.deltaY * 0.0015)));
        setView({ k, x: mx - ((mx - v.x) * k) / v.k, y: my - ((my - v.y) * k) / v.k });
      } else setView({ ...v, x: v.x - e.deltaY });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [setView]);

  const portAt = (cx: number, cy: number): Endpoint | null => {
    const el = document.elementFromPoint(cx, cy) as Element | null;
    const port = el?.closest?.('.port') as SVGElement | null;
    if (!port) return null;
    return { c: port.dataset.c!, p: port.dataset.p! };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button === 2) return;
    const target = e.target as Element;
    const w = toWorld(e.clientX, e.clientY);
    try {
      svgRef.current!.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic events have no active pointer */
    }
    const port = target.closest('.port') as SVGElement | null;
    if (port && e.button === 0) {
      const c = compMap.get(port.dataset.c!)!;
      const pd = DEF_MAP[c.type].ports.find((x) => x.id === port.dataset.p)!;
      drag.current = { mode: 'wire', from: { c: c.id, p: pd.id } };
      setDraft({ from: portAbs(c, pd), to: w });
      return;
    }
    const compEl = target.closest('.comp') as SVGElement | null;
    if (compEl && e.button === 0) {
      const id = compEl.dataset.id!;
      let ids = sel.comps;
      if (e.shiftKey) ids = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
      else if (!ids.includes(id)) ids = [id];
      setSel({ comps: ids, wire: null });
      const orig: Record<string, { x: number; y: number }> = {};
      for (const cid of ids) {
        const c = compMap.get(cid);
        if (c) orig[cid] = { x: c.x, y: c.y };
      }
      drag.current = { mode: 'move', start: w, orig, moved: false };
      return;
    }
    const wireEl = target.closest('.wire-hit') as SVGElement | null;
    if (wireEl && e.button === 0) {
      setSel({ comps: [], wire: wireEl.dataset.id! });
      drag.current = null;
      return;
    }
    if (e.shiftKey && e.button === 0) {
      drag.current = { mode: 'box', start: w };
      setBox({ x0: w.x, y0: w.y, x1: w.x, y1: w.y });
      return;
    }
    drag.current = { mode: 'pan', sx: e.clientX, sy: e.clientY, v: { ...view }, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) {
      const hit = portAt(e.clientX, e.clientY);
      const c = hit && compMap.get(hit.c);
      const port = c && DEF_MAP[c.type]?.ports.find((x) => x.id === hit.p);
      const hint = c && port && portHint(c.type, port.id);
      if (c && port && hint) {
        const now = wiredEnds(design, c.id, port.id);
        const plan = now.length ? [] : planMatches(design, c.id, port, hint);
        const extra = now.length ? `ตอนนี้ต่อกับ ${now.join(', ')}` : plan.length ? `บนแปลนนี้: ${plan.map((m) => `${m.label} · ${m.portLabel}`).join(' · ')}` : '';
        setTip({ x: e.clientX + 14, y: e.clientY + 16, comp: c.label, port: port.label, to: hint.to, why: hint.why, extra });
      } else if (tip) setTip(null);
      return;
    }
    if (tip) setTip(null);
    if (d.mode === 'pan') {
      const dx = e.clientX - d.sx;
      const dy = e.clientY - d.sy;
      if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true;
      setView({ ...d.v, x: d.v.x + dx, y: d.v.y + dy });
    } else if (d.mode === 'move') {
      const w = toWorld(e.clientX, e.clientY);
      const dx = Math.round((w.x - d.start.x) / 10) * 10;
      const dy = Math.round((w.y - d.start.y) / 10) * 10;
      if (dx || dy) d.moved = true;
      if (!d.moved) return;
      const pos: Record<string, { x: number; y: number }> = {};
      for (const id in d.orig) pos[id] = { x: d.orig[id].x + dx, y: d.orig[id].y + dy };
      d.last = pos;
      p.onMove(pos, false);
    } else if (d.mode === 'wire') {
      const w = toWorld(e.clientX, e.clientY);
      const tgt = portAt(e.clientX, e.clientY);
      setDraft((dr) => (dr ? { ...dr, to: w, ok: !!tgt && !(tgt.c === d.from.c && tgt.p === d.from.p) } : dr));
    } else if (d.mode === 'box') {
      const w = toWorld(e.clientX, e.clientY);
      setBox({ x0: d.start.x, y0: d.start.y, x1: w.x, y1: w.y });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.mode === 'pan' && !d.moved) setSel({ comps: [], wire: null });
    if (d.mode === 'move' && d.moved && d.last) p.onMove(d.last, true);
    if (d.mode === 'wire') {
      const tgt = portAt(e.clientX, e.clientY);
      if (tgt && !(tgt.c === d.from.c && tgt.p === d.from.p)) p.onAddWire(d.from, tgt);
      setDraft(null);
    }
    if (d.mode === 'box' && box) {
      const x0 = Math.min(box.x0, box.x1);
      const x1 = Math.max(box.x0, box.x1);
      const y0 = Math.min(box.y0, box.y1);
      const y1 = Math.max(box.y0, box.y1);
      const ids = design.comps
        .filter((c) => {
          const df = DEF_MAP[c.type];
          return c.x < x1 && c.x + df.w > x0 && c.y < y1 && c.y + df.h > y0;
        })
        .map((c) => c.id);
      setSel({ comps: ids, wire: null });
      setBox(null);
    }
  };

  const wires = useMemo(() => {
    const seen = new Map<string, number>();
    return design.wires
      .map((w) => {
        const ca = compMap.get(w.a.c);
        const cb = compMap.get(w.b.c);
        if (!ca || !cb) return null;
        const pa = DEF_MAP[ca.type]?.ports.find((x) => x.id === w.a.p);
        const pb = DEF_MAP[cb.type]?.ports.find((x) => x.id === w.b.p);
        if (!pa || !pb) return null;
        const k = `${w.a.c}.${w.a.p}`;
        const n = seen.get(k) ?? 0;
        seen.set(k, n + 1);
        const pts = route(portAbs(ca, pa), portAbs(cb, pb), (n % 4) * 4);
        return { w, pts, d: pathD(pts), color: wireColor(design, w), kind: pa.kind === 'X' ? pb.kind : pa.kind };
      })
      .filter(Boolean) as { w: Wire; pts: [number, number][]; d: string; color: string; kind: string }[];
  }, [design, compMap]);

  return (
    <>
    <svg
      ref={svgRef}
      className={`canvas ${symbol ? 'symbol' : ''} ${drag.current?.mode === 'pan' ? 'panning' : ''}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => setTip(null)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('application/wirelab');
        if (!type) return;
        const w = toWorld(e.clientX, e.clientY);
        p.onDropType(type, w.x, w.y);
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <defs>
        <pattern id="grid-s" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="0.5" cy="0.5" r="0.7" fill={symbol ? '#cbd5e1' : '#354153'} />
        </pattern>
        <pattern id="grid-l" width="100" height="100" patternUnits="userSpaceOnUse">
          <rect width="100" height="100" fill="url(#grid-s)" />
          <path d="M100 0H0V100" fill="none" stroke={symbol ? '#e2e8f0' : '#1c2836'} strokeWidth="1" />
        </pattern>
        <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id="wglow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
        <radialGradient id="glow">
          <stop offset="0" stopColor="#fde047" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fde047" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
        <rect x={-5000} y={-5000} width={12000} height={12000} fill="url(#grid-l)" />
        {!symbol &&
          [0, 1, 2, 3, 4, 5].map((i) => (
            <g key={i} className="noevents">
              <text x={8} y={108 + i * 220} fontSize={10} fill="#5e758c">
                DIN {String(i + 1).padStart(2, '0')}
              </text>
              <rect x={8} y={114 + i * 220} width={2200} height={12} fill="#1b2735" stroke="#344457" />
            </g>
          ))}
        <g className="wires">
          {wires.map(({ w, d, color, pts, kind }) => {
            const st = sim?.wire[w.id] ?? 'off';
            const live = !!sim && st !== 'off' && st !== 'pe';
            const selected = sel.wire === w.id;
            const sig = sim?.netSignal[w.id];
            const mid = pts[Math.floor(pts.length / 2)];
            const mid0 = pts[Math.floor(pts.length / 2) - 1];
            return (
              <g key={w.id} className={`wire ${selected ? 'sel' : ''}`}>
                {live && <path d={d} stroke={STATE_COLOR[st] ?? color} strokeWidth={6} fill="none" opacity={0.35} filter="url(#wglow)" />}
                <path
                  d={d}
                  stroke={color}
                  strokeWidth={selected ? 3.2 : kind === 'P3' ? 3 : 2}
                  fill="none"
                  opacity={sim && !live && st !== 'pe' ? 0.45 : 1}
                  strokeDasharray={kind === 'PE' ? '6 3' : kind === 'ETH' || kind === '485' ? '' : undefined}
                />
                {live && (
                  <path
                    d={d}
                    stroke={st === 'fault' ? '#fff' : STATE_COLOR[st] ?? '#fff'}
                    strokeWidth={st === 'data' || st === 'sig' ? 2.2 : 1.6}
                    fill="none"
                    strokeDasharray={st === 'data' ? '2 10' : st === 'sig' ? '3 9' : '6 10'}
                    strokeLinecap="round"
                    className={`flow ${st === 'fault' ? 'fault' : ''} ${st === 'data' ? 'fast' : ''}`}
                  />
                )}
                {(selected || hoverWire === w.id) && <path d={d} stroke="#38bdf8" strokeWidth={6} fill="none" opacity={0.35} />}
                <path
                  d={d}
                  className="wire-hit"
                  data-id={w.id}
                  stroke="transparent"
                  strokeWidth={10}
                  fill="none"
                  onPointerEnter={() => setHoverWire(w.id)}
                  onPointerLeave={() => setHoverWire(null)}
                />
                {sig && live && mid && mid0 && (
                  <g transform={`translate(${(mid[0] + mid0[0]) / 2},${(mid[1] + mid0[1]) / 2})`} className="noevents">
                    <rect x={-24} y={-8} width={48} height={14} rx={7} fill="#1c1917" stroke="#f59e0b" strokeWidth={0.8} />
                    <text x={0} y={2.5} textAnchor="middle" fontSize={7.5} fill="#fbbf24" className="mono">
                      {fmt(4 + (16 * (sig.value - sig.min)) / (sig.max - sig.min || 1), 2)} mA
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
        <g className="comps">
          {design.comps.map((c) => {
            const df = DEF_MAP[c.type];
            if (!df) return null;
            return <CompView key={c.id} c={c} df={df} sim={sim} symbol={symbol} selected={sel.comps.includes(c.id)} hist={p.hist} tick={p.tick} onCtl={p.onCtl} />;
          })}
        </g>
        {draft && (
          <path
            d={`M${draft.from.x},${draft.from.y} L${draft.to.x},${draft.to.y}`}
            stroke={draft.ok ? '#22c55e' : '#38bdf8'}
            strokeWidth={2}
            strokeDasharray="5 4"
            fill="none"
            className="noevents"
          />
        )}
        {box && (
          <rect
            x={Math.min(box.x0, box.x1)}
            y={Math.min(box.y0, box.y1)}
            width={Math.abs(box.x1 - box.x0)}
            height={Math.abs(box.y1 - box.y0)}
            fill="#38bdf8"
            fillOpacity={0.08}
            stroke="#38bdf8"
            strokeDasharray="4 3"
            className="noevents"
          />
        )}
      </g>
    </svg>
    {tip && (
      <div className="port-tip" style={{ left: Math.min(tip.x, window.innerWidth - 260), top: Math.min(tip.y, window.innerHeight - 120) }}>
        <div className="port-tip-h">{tip.comp} · <b>{tip.port}</b></div>
        <div className="hint-to">{tip.to}</div>
        <div className="muted small">{tip.why}</div>
        {tip.extra && <div className={tip.extra.startsWith('ตอนนี้') ? 'hint-now' : 'hint-plan'}>{tip.extra}</div>}
      </div>
    )}
    </>
  );
}
