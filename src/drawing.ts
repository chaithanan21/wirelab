import type { Comp, Design, PortDef } from './types';
import { COMM_KINDS, DEF_MAP } from './library';
import { portAbs, route } from './Canvas';
import { iecSymbol, letterCode, NAMES, symbolKey, WIRE_STYLES, type WireStyle } from './iec';

export interface DrawingOptions {
  title: string;
  number: string;
  revision: string;
  layout: 'plan' | 'grid';
  colors: boolean;
  date: string;
}

export interface WireRow {
  name: string;
  fromRef: string;
  fromTerm: string;
  toRef: string;
  toTerm: string;
  type: string;
}

export interface DeviceRow {
  ref: string;
  tag: string;
  brand: string;
  model: string;
  terminals: string;
}

export interface DrawingDoc {
  svg: string;
  wires: WireRow[];
  devices: DeviceRow[];
}

const INK = '#1b2c3b';

function xml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!));
}

function specLine(c: Comp) {
  const df = DEF_MAP[c.type];
  if (!df) return '';
  if (df.beh === 'psu') return `${c.props.voltage ?? 24} V DC`;
  if (df.beh === 'grid1') return '230 V 50 Hz';
  if (df.beh === 'grid3') return '400 V 3~ 50 Hz';
  if (df.beh === 'gridmv') return `${c.props.kv ?? 22} kV`;
  if (df.beh === 'swg') return `${c.props.kv ?? 22} kV  ${c.props.rating ?? ''} A`;
  if (df.beh === 'tr') return `${c.props.pri ?? 22}/${c.props.sec ?? 400}V  ${c.props.kva ?? ''} kVA`;
  if (df.beh === 'mdb') return `${c.props.rating ?? ''} A`;
  if (df.beh === 'sensor_a') return `${c.props.min}–${c.props.max} ${c.props.unit ?? ''}`;
  if (df.beh === 'motor3') return `${c.props.kw ?? ''} kW`;
  if (df.beh === 'timer') return `TON ${c.props.delay ?? 0} s`;
  if (df.beh === 'vfd') return `${c.props.freq ?? 50} Hz`;
  if (df.beh === 'breaker' || df.beh === 'rcbo' || df.beh === 'fuse') return `In ${c.props.rating ?? ''} A`;
  if (df.beh === 'overload') return `Ir ${c.props.setting ?? c.props.rating ?? ''} A`;
  return '';
}

function portOf(design: Design, a: { c: string; p: string }): PortDef | undefined {
  const comp = design.comps.find((c) => c.id === a.c);
  return comp ? DEF_MAP[comp.type]?.ports.find((p) => p.id === a.p) : undefined;
}

const RANK = ['PE', 'N', 'MV', 'P3', 'L', 'DC+', 'DC-', 'AI', 'X'];

function wireStyle(pa?: PortDef, pb?: PortDef): WireStyle {
  if ((pa && COMM_KINDS.includes(pa.kind)) || (pb && COMM_KINDS.includes(pb.kind))) return WIRE_STYLES.NET;
  const ports = [pa, pb].filter(Boolean) as PortDef[];
  ports.sort((x, y) => RANK.indexOf(x.kind) - RANK.indexOf(y.kind));
  const p = ports[0];
  if (!p) return WIRE_STYLES.DC;
  if (p.kind === 'PE' || p.kind === 'N' || p.kind === 'MV' || p.kind === 'P3') return WIRE_STYLES[p.kind];
  if (p.kind === 'L') {
    const lbl = ports.map((q) => q.label).join(' ');
    return /L2\b/.test(lbl) ? WIRE_STYLES.L2 : /L3\b/.test(lbl) ? WIRE_STYLES.L3 : WIRE_STYLES.L;
  }
  if (p.kind === 'AI') return WIRE_STYLES.SIG;
  return WIRE_STYLES.DC;
}

function arrange(design: Design, layout: DrawingOptions['layout']): Comp[] {
  if (layout === 'plan') return design.comps;
  return design.comps.map((c, i) => {
    const df = DEF_MAP[c.type];
    const col = i % 4;
    const row = Math.floor(i / 4);
    return { ...c, x: 30 + col * 420, y: 50 + row * ((df?.h ?? 120) + 120) };
  });
}

function busRoute(
  a: { x: number; y: number; side: 'l' | 'r' | 't' | 'b' },
  b: { x: number; y: number; side: 'l' | 'r' | 't' | 'b' },
  aBox: { l: number; r: number; t: number; b: number },
  bBox: { l: number; r: number; t: number; b: number },
  lane: number,
): [number, number][] {
  const stub = 18;
  const step = (p: typeof a) => ({ x: p.x + (p.side === 'l' ? -stub : p.side === 'r' ? stub : 0), y: p.y + (p.side === 't' ? -stub : p.side === 'b' ? stub : 0) });
  const A = step(a);
  const B = step(b);
  const bus = Math.max(aBox.b, bBox.b) + 30 + lane * 16;
  const clear = (p: typeof a, s: typeof A, box: typeof aBox) => (p.side !== 't' ? s.x : s.x < (box.l + box.r) / 2 ? box.l - 18 : box.r + 18);
  const ax = clear(a, A, aBox);
  const bx = clear(b, B, bBox);
  return [
    [a.x, a.y],
    [A.x, A.y],
    [ax, A.y],
    [ax, bus],
    [bx, bus],
    [bx, B.y],
    [B.x, B.y],
    [b.x, b.y],
  ];
}

function poly(pts: [number, number][]) {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');
}

function longestSegment(pts: [number, number][]) {
  let best = 0;
  let len = -1;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.abs(pts[i][0] - pts[i - 1][0]) + Math.abs(pts[i][1] - pts[i - 1][1]);
    if (l > len) {
      len = l;
      best = i;
    }
  }
  const [x0, y0] = pts[best - 1] ?? pts[0];
  const [x1, y1] = pts[best] ?? pts[0];
  return { x0, y0, x1, y1, horiz: Math.abs(x1 - x0) >= Math.abs(y1 - y0), len };
}

function ticks(x: number, y: number, horiz: boolean, n: number) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const o = (i - (n - 1) / 2) * 5;
    d += horiz ? `M${x + o - 3} ${y + 5}l6 -10` : `M${x - 5} ${y + o + 3}l10 -6`;
  }
  return d;
}

export function buildDrawing(design: Design, opt: DrawingOptions): DrawingDoc {
  const comps = arrange(design, opt.layout);
  const byId = new Map(comps.map((c) => [c.id, c]));
  const order = [...comps].sort((a, b) => a.x - b.x || a.y - b.y);
  const refs = new Map<string, string>();
  const names = new Map<string, string>();
  const taken = new Set<string>();
  for (const c of order) {
    const m = c.label.match(/^([A-Z]{1,3}\d{1,3})\b\s*[·:]?\s*(.*)$/);
    if (m && !taken.has(m[1])) {
      taken.add(m[1]);
      refs.set(c.id, `-${m[1]}`);
      names.set(c.id, m[2]);
    }
  }
  const counters = new Map<string, number>();
  for (const c of order) {
    if (refs.has(c.id)) continue;
    const letter = letterCode(DEF_MAP[c.type]);
    let n = counters.get(letter) ?? 0;
    do n++;
    while (taken.has(`${letter}${n}`));
    counters.set(letter, n);
    taken.add(`${letter}${n}`);
    refs.set(c.id, `-${letter}${n}`);
    names.set(c.id, c.label);
  }

  const devices: DeviceRow[] = order.map((c) => {
    const df = DEF_MAP[c.type];
    return {
      ref: refs.get(c.id)!,
      tag: c.label,
      brand: c.brand,
      model: c.model,
      terminals: df ? df.ports.map((p) => p.label).join(' / ') : '',
    };
  });

  const seen = new Map<string, number>();
  const usedStyles = new Map<string, WireStyle>();
  const drawn: { d: string; style: WireStyle; name: string; mx: number; my: number; tx: number; ty: number; horiz: boolean }[] = [];
  const wires: WireRow[] = [];
  design.wires.forEach((w, i) => {
    const ca = byId.get(w.a.c);
    const cb = byId.get(w.b.c);
    const pa = portOf(design, w.a);
    const pb = portOf(design, w.b);
    const style = wireStyle(pa, pb);
    const net = style.key === 'NET';
    const name = `${net ? 'N' : 'W'}${String(i + 1).padStart(3, '0')}`;
    wires.push({
      name,
      fromRef: refs.get(w.a.c) ?? '?',
      fromTerm: pa?.label ?? w.a.p,
      toRef: refs.get(w.b.c) ?? '?',
      toTerm: pb?.label ?? w.b.p,
      type: net ? 'Network' : style.label.split(' — ')[0],
    });
    if (!ca || !cb || !pa || !pb) return;
    usedStyles.set(style.key, style);
    const key = `${w.a.c}.${w.a.p}`;
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    const paAbs = portAbs(ca, pa);
    const pbAbs = portAbs(cb, pb);
    const da = DEF_MAP[ca.type];
    const db = DEF_MAP[cb.type];
    const lane = drawn.filter((x) => x.style.key !== 'NET').length % 7;
    const pts = net
      ? route(paAbs, pbAbs, (n % 4) * 8)
      : busRoute(paAbs, pbAbs, { l: ca.x, r: ca.x + da.w, t: ca.y, b: ca.y + da.h }, { l: cb.x, r: cb.x + db.w, t: cb.y, b: cb.y + db.h }, lane);
    const seg = longestSegment(pts);
    const mx = (seg.x0 + seg.x1) / 2;
    const my = (seg.y0 + seg.y1) / 2;
    const off = Math.min(26, seg.len / 3);
    const tx = seg.horiz ? mx + Math.sign(seg.x1 - seg.x0 || 1) * off : mx;
    const ty = seg.horiz ? my : my + Math.sign(seg.y1 - seg.y0 || 1) * off;
    drawn.push({ d: poly(pts), style, name, mx, my, tx, ty, horiz: seg.horiz });
  });

  let x0 = 0;
  let y0 = 0;
  let x1 = 400;
  let y1 = 240;
  if (comps.length) {
    x0 = Infinity;
    y0 = Infinity;
    x1 = -Infinity;
    y1 = -Infinity;
    for (const c of comps) {
      const df = DEF_MAP[c.type];
      x0 = Math.min(x0, c.x - 16);
      y0 = Math.min(y0, c.y - 46);
      x1 = Math.max(x1, c.x + (df?.w ?? 140) + 24);
      y1 = Math.max(y1, c.y + (df?.h ?? 80) + 150);
    }
  }
  const areaX = 48;
  const areaW = 1250;
  const areaH = 880;
  const scale = Math.min(areaW / (x1 - x0), areaH / (y1 - y0), 1.6);
  const ox = areaX + (areaW - (x1 - x0) * scale) / 2 - x0 * scale;
  const oy = 104 + (areaH - (y1 - y0) * scale) / 2 - y0 * scale;

  let body = '';
  for (const w of drawn) {
    const col = opt.colors ? w.style.color : INK;
    const dash = w.style.key === 'NET' ? ' stroke-dasharray="7 4"' : '';
    body += `<path d="${w.d}" fill="none" stroke="${col}" stroke-width="1.8" stroke-linejoin="round"${dash}/>`;
    if (opt.colors && w.style.stripe) body += `<path d="${w.d}" fill="none" stroke="${w.style.stripe}" stroke-width="1.8" stroke-dasharray="6 6"/>`;
    if (w.style.ticks) body += `<path d="${ticks(w.tx, w.ty, w.horiz, w.style.ticks)}" stroke="${col}" stroke-width="1.4" fill="none"/>`;
    body += `<rect x="${w.mx - 16}" y="${w.my - 15}" width="32" height="12" fill="#fff"/>`;
    body += `<text x="${w.mx}" y="${w.my - 5}" text-anchor="middle" font-size="9" font-family="Consolas,monospace" fill="${INK}">${w.name}</text>`;
  }

  const usedSymbols = new Map<string, Comp>();
  for (const c of comps) {
    const df = DEF_MAP[c.type];
    if (!df) continue;
    const k = symbolKey(c, df);
    if (k && !usedSymbols.has(k)) usedSymbols.set(k, c);
    const ref = refs.get(c.id)!;
    const title = `${ref}  ${names.get(c.id) ?? ''}`.trim();
    const sub = `${c.brand} ${c.model}`;
    const fit = (s: string, size: number) => (s.length * size * 0.56 > df.w ? ` textLength="${df.w}" lengthAdjust="spacingAndGlyphs"` : '');
    const t1 = title.slice(0, 48);
    const t2 = sub.slice(0, 52);
    body += `<g><rect x="${c.x}" y="${c.y}" width="${df.w}" height="${df.h}" fill="#fff" stroke="#8796a3" stroke-width="1" stroke-dasharray="10 3 2 3"/>`;
    body += `<text x="${c.x}" y="${c.y - 22}" font-size="12" font-weight="700" fill="#142535"${fit(t1, 12)}>${xml(t1)}</text>`;
    body += `<text x="${c.x}" y="${c.y - 8}" font-size="10" fill="#3d5366"${fit(t2, 10)}>${xml(t2)}</text>`;
    const spec = specLine(c);
    const s = Math.max(34, Math.min(66, df.w - 96, df.h - (spec ? 30 : 16)));
    const sy = c.y + (df.h - s) / 2 - (spec ? 7 : 0);
    body += `<g transform="translate(${c.x + df.w / 2 - s / 2} ${sy}) scale(${(s / 80).toFixed(4)})" fill="none" stroke="currentColor" color="${INK}" stroke-width="${(1.7 * 80 / s).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round">${iecSymbol(c, df)}</g>`;
    if (spec) body += `<text x="${c.x + df.w / 2}" y="${sy + s + 13}" text-anchor="middle" font-size="10.5" fill="${INK}">${xml(spec)}</text>`;
    for (const p of df.ports) {
      const inward = p.side === 'l' ? 8 : p.side === 'r' ? -8 : 0;
      const vward = p.side === 't' ? 13 : p.side === 'b' ? -6 : 3.5;
      const anchor = p.side === 'l' ? 'start' : p.side === 'r' ? 'end' : 'middle';
      body += `<circle cx="${c.x + p.x}" cy="${c.y + p.y}" r="3" fill="#fff" stroke="${INK}" stroke-width="1.3"/>`;
      body += `<text x="${c.x + p.x + inward}" y="${c.y + p.y + vward}" text-anchor="${anchor}" font-size="9" font-family="Consolas,monospace" fill="${INK}">${xml(p.label)}</text>`;
    }
    body += '</g>';
  }

  const legendX = 1322;
  const rows = usedSymbols.size + usedStyles.size + 2;
  const step = Math.min(30, (990 - 112) / Math.max(rows, 1));
  const ic = Math.min(26, step * 0.86);
  let legend = `<text x="${legendX + 14}" y="108" font-size="13" font-weight="700" fill="#142535">LEGEND · IEC 60617</text>`;
  let ly = 118;
  for (const [k, c] of usedSymbols) {
    const df = DEF_MAP[c.type];
    legend += `<g transform="translate(${legendX + 14} ${ly}) scale(${(ic / 80).toFixed(4)})" fill="none" stroke="currentColor" color="${INK}" stroke-width="${(1.4 * 80 / ic).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round">${iecSymbol(c, df)}</g>`;
    legend += `<text x="${legendX + 22 + ic}" y="${ly + ic / 2 + 4}" font-size="10.5" fill="#142535">${xml(NAMES[k] ?? df.name)}</text>`;
    ly += step;
  }
  if (usedStyles.size) {
    ly += step * 0.3;
    legend += `<text x="${legendX + 14}" y="${ly + 10}" font-size="11" font-weight="700" fill="#142535">${opt.colors ? 'CONDUCTORS · IEC 60445 / 60204-1' : 'CONDUCTORS'}</text>`;
    ly += step * 0.9;
    for (const st of usedStyles.values()) {
      const col = opt.colors ? st.color : INK;
      const yy = ly + ic / 2;
      legend += `<path d="M${legendX + 14} ${yy}h${ic + 4}" stroke="${col}" stroke-width="2.2"${st.key === 'NET' ? ' stroke-dasharray="6 3"' : ''}/>`;
      if (opt.colors && st.stripe) legend += `<path d="M${legendX + 14} ${yy}h${ic + 4}" stroke="${st.stripe}" stroke-width="2.2" stroke-dasharray="5 5"/>`;
      if (st.ticks) legend += `<path d="${ticks(legendX + 16 + ic / 2, yy, true, st.ticks)}" stroke="${col}" stroke-width="1.3" fill="none"/>`;
      legend += `<text x="${legendX + 26 + ic}" y="${yy + 4}" font-size="10.5" fill="#142535">${xml(opt.colors ? st.label : st.label.split(' — ')[0])}</text>`;
      ly += step;
    }
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1680" height="1188" viewBox="0 0 1680 1188">
<rect width="1680" height="1188" fill="#fff"/>
<rect x="28" y="28" width="1624" height="1132" fill="none" stroke="#203647" stroke-width="2"/>
<text x="52" y="68" font-family="Arial,Tahoma,sans-serif" font-size="22" font-weight="700" fill="#142535">${xml(opt.title)}</text>
<text x="1628" y="66" text-anchor="end" font-family="Arial,Tahoma,sans-serif" font-size="13" fill="#142535">ELECTRICAL SCHEMATIC · ${xml(opt.number)}</text>
<path d="M28 84h1624M${legendX} 84V1004" stroke="#203647" fill="none"/>
<g transform="translate(${ox.toFixed(1)} ${oy.toFixed(1)}) scale(${scale.toFixed(4)})" font-family="Arial,Tahoma,sans-serif">${body}</g>
<g font-family="Arial,Tahoma,sans-serif">${legend}</g>
<path d="M28 1004h1624M28 1072h1624M1088 1004v156M1408 1004v156" stroke="#203647" fill="none"/>
<text x="48" y="1028" font-family="Arial,Tahoma,sans-serif" font-size="11.5" fill="#142535" textLength="1020" lengthAdjust="spacingAndGlyphs">Symbols IEC 60617 · Instruments ISA 5.1 · Designation IEC 81346-2: -Q switching, -F protection, -K control, -S manual, -B sensor, -M motor, -P indicator, -T converter, -X terminal</text>
<text x="48" y="1052" font-family="Arial,Tahoma,sans-serif" font-size="11.5" fill="#142535">Dash-dot frame = device boundary · Terminal circles = connection points · Crossing lines without a dot are not connected · /// = three-phase conductors</text>
<text x="1104" y="1028" font-family="Arial,sans-serif" font-size="11" fill="#142535">DOCUMENT</text>
<text x="1104" y="1054" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#142535">${xml(opt.number)}</text>
<text x="1424" y="1028" font-family="Arial,sans-serif" font-size="11" fill="#142535">REVISION / DATE</text>
<text x="1424" y="1054" font-family="Arial,sans-serif" font-size="16" fill="#142535">${xml(opt.revision)} / ${xml(opt.date)}</text>
<text x="48" y="1102" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#142535">WireLab</text>
<text x="48" y="1126" font-family="Arial,sans-serif" font-size="12" fill="#142535">Generic device models · Verify manufacturer terminals and local code (วสท./EIT) before installation.</text>
<text x="1104" y="1102" font-family="Arial,sans-serif" font-size="12" fill="#142535">${comps.length} devices / ${design.wires.length} connections</text>
<text x="1424" y="1102" font-family="Arial,sans-serif" font-size="12" fill="#142535">A3 LANDSCAPE · SHEET 1</text>
<text x="1424" y="1126" font-family="Arial,sans-serif" font-size="12" fill="#142535">Not to scale</text>
</svg>`;

  return { svg, wires, devices };
}
