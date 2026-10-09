import type { Comp, Design } from './types';
import { COMM_KINDS, DEF_MAP } from './library';
import { portAbs, route } from './Canvas';

export interface DrawingOptions {
  title: string;
  number: string;
  revision: string;
  layout: 'plan' | 'grid';
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

const PREFIX: Record<string, string> = {
  grid1: 'G', grid3: 'G', gridmv: 'MV', gen: 'GEN', battery: 'BAT', psu: 'PS', ups: 'UPS', ats: 'ATS',
  swg: 'SWG', tr: 'TR', mdb: 'MDB',
  breaker: 'Q', rcbo: 'Q', fuse: 'FU', passive: 'SPD',
  switch: 'S', pb: 'S', estop: 'S', selector: 'S',
  relay: 'K', contactor: 'K', overload: 'F', timer: 'KT', tempctl: 'TC', vfd: 'U',
  sensor_a: 'BT', sensor_d: 'B', contact_sw: 'B', sensor_485: 'BT', sensor_lora: 'BT', emeter: 'EM',
  plc: 'PLC', rio: 'IO', edge: 'EC',
  eswitch: 'SW', router: 'RT', gateway: 'GW', lora_gw: 'LG',
  load_ac: 'H', motor3: 'M', load_dc: 'H', tower: 'TL',
  hmi: 'HMI', scada: 'PC', monitor: 'MON', pmeter: 'PI', led: 'AN', cloud: 'CL', tb: 'TB',
};

const SYMBOL: Record<string, string> = {
  psu: '<rect x="10" y="10" width="44" height="44"/><path d="M20 24h8m-4-4v8m10 10h12M10 32h44"/>',
  grid1: '<circle cx="32" cy="32" r="18"/><path d="M18 32c3-6 5-6 8 0s5 6 8 0"/>',
  grid3: '<circle cx="32" cy="32" r="18"/><path d="M18 36c3-6 5-6 8 0s5 6 8 0"/><text x="32" y="28" text-anchor="middle" font-size="12" stroke="none" fill="#243f54">3</text>',
  gridmv: '<circle cx="32" cy="32" r="18"/><text x="32" y="36" text-anchor="middle" font-size="11" stroke="none" fill="#243f54">22</text>',
  swg: '<rect x="14" y="8" width="36" height="48"/><path d="M22 40h6m12 0h6M28 38l10-12"/>',
  tr: '<circle cx="24" cy="32" r="12"/><circle cx="40" cy="32" r="12"/>',
  mdb: '<rect x="10" y="14" width="44" height="36"/><path d="M16 22h32M22 22v20M32 22v20M42 22v20"/>',
  sensor_a: '<circle cx="32" cy="30" r="18"/><path d="M16 32q8-14 16 0t16 0"/>',
  sensor_d: '<rect x="14" y="16" width="28" height="30" rx="3"/><path d="M18 26h16M18 34h10"/>',
  plc: '<rect x="12" y="12" width="40" height="40" rx="2"/><path d="M20 22h8v18h-8M36 22h8M36 30h8M36 38h8"/>',
  eswitch: '<rect x="10" y="22" width="44" height="20" rx="2"/><path d="M18 28v8m10-8v8m10-8v8"/>',
  hmi: '<rect x="8" y="12" width="48" height="32" rx="2"/><path d="M16 34l8-10 8 7 12-12M22 44v8m20-8v8"/>',
  load_dc: '<circle cx="32" cy="32" r="16"/><path d="M22 22l20 20M22 42l20-20"/>',
  load_ac: '<circle cx="32" cy="30" r="16"/><path d="M22 20l20 20M22 40l20-20"/>',
  motor3: '<circle cx="32" cy="32" r="18"/><path d="M24 42V22l8 12 8-12v20"/>',
  relay: '<rect x="20" y="12" width="24" height="36"/><path d="M32 6v6m0 36v8M20 48l24-32"/>',
  contactor: '<rect x="18" y="14" width="28" height="36"/><path d="M32 8v6M18 46l28-28"/>',
  breaker: '<path d="M10 42h12m20 0h12M24 40l16-16"/><circle cx="22" cy="42" r="2.5"/><circle cx="44" cy="42" r="2.5"/>',
  switch: '<path d="M8 42h12m22 0h14M22 40l20-16"/><circle cx="20" cy="42" r="2.5"/><circle cx="42" cy="42" r="2.5"/>',
  timer: '<circle cx="32" cy="34" r="16"/><path d="M32 24v10l8 5M22 10h20"/>',
  vfd: '<rect x="10" y="10" width="44" height="44"/><path d="M10 54L54 10M16 24c3-5 5-5 8 0s5 5 8 0"/>',
};

function xml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]!));
}

function refFor(c: Comp, index: number) {
  const beh = DEF_MAP[c.type]?.beh ?? '';
  const prefix = PREFIX[beh] ?? 'D';
  return `${prefix}${String(index + 1).padStart(2, '0')}`;
}

function specLine(c: Comp) {
  const df = DEF_MAP[c.type];
  if (!df) return '';
  if (df.beh === 'psu') return `${c.props.voltage ?? 24} V DC`;
  if (df.beh === 'grid1') return '230 V 50 Hz';
  if (df.beh === 'grid3') return '400 V 3~';
  if (df.beh === 'gridmv') return `${c.props.kv ?? 22} kV`;
  if (df.beh === 'swg') return `${c.props.kv ?? 22} kV  ${c.props.rating ?? ''} A`;
  if (df.beh === 'tr') return `${c.props.pri ?? 22}/${c.props.sec ?? 400}V  ${c.props.kva ?? ''} kVA`;
  if (df.beh === 'mdb') return `${c.props.rating ?? ''} A`;
  if (df.beh === 'sensor_a') return `${c.props.min}–${c.props.max} ${c.props.unit ?? ''}`;
  if (df.beh === 'plc') return 'PLC';
  if (df.beh === 'eswitch' || df.beh === 'router' || df.beh === 'gateway') return 'NET';
  if (df.beh === 'hmi' || df.beh === 'scada' || df.beh === 'monitor') return 'HMI';
  if (df.beh === 'load_dc' || (df.beh === 'load_ac' && df.icon === 'lamp')) return 'LAMP';
  if (df.beh === 'motor3') return `${c.props.kw ?? ''} kW`;
  if (df.beh === 'timer') return `TON ${c.props.delay ?? 0} s`;
  if (df.beh === 'breaker' || df.beh === 'rcbo' || df.beh === 'fuse') return `${c.props.rating ?? ''} A`;
  return df.short;
}

function isNet(design: Design, a: { c: string; p: string }) {
  const comp = design.comps.find((c) => c.id === a.c);
  const kind = comp ? DEF_MAP[comp.type]?.ports.find((p) => p.id === a.p)?.kind : undefined;
  return !!kind && COMM_KINDS.includes(kind);
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

export function buildDrawing(design: Design, opt: DrawingOptions): DrawingDoc {
  const comps = arrange(design, opt.layout);
  const byId = new Map(comps.map((c) => [c.id, c]));
  const order = [...comps].sort((a, b) => a.x - b.x || a.y - b.y);
  const refs = new Map(order.map((c, i) => [c.id, refFor(c, i)]));

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
  const drawn: { d: string; net: boolean; name: string; mx: number; my: number }[] = [];
  const wires: WireRow[] = [];
  design.wires.forEach((w, i) => {
    const ca = byId.get(w.a.c);
    const cb = byId.get(w.b.c);
    const pa = ca && DEF_MAP[ca.type]?.ports.find((p) => p.id === w.a.p);
    const pb = cb && DEF_MAP[cb.type]?.ports.find((p) => p.id === w.b.p);
    const net = isNet(design, w.a) || isNet(design, w.b);
    const name = `${net ? 'N' : 'W'}${String(i + 1).padStart(3, '0')}`;
    wires.push({
      name,
      fromRef: refs.get(w.a.c) ?? '?',
      fromTerm: pa?.label ?? w.a.p,
      toRef: refs.get(w.b.c) ?? '?',
      toTerm: pb?.label ?? w.b.p,
      type: net ? 'Network' : 'Electrical',
    });
    if (!ca || !cb || !pa || !pb) return;
    const key = `${w.a.c}.${w.a.p}`;
    const n = seen.get(key) ?? 0;
    seen.set(key, n + 1);
    const paAbs = portAbs(ca, pa);
    const pbAbs = portAbs(cb, pb);
    const da = DEF_MAP[ca.type];
    const db = DEF_MAP[cb.type];
    const lane = drawn.filter((x) => !x.net).length % 7;
    const pts = net
      ? route(paAbs, pbAbs, (n % 4) * 8)
      : busRoute(paAbs, pbAbs, { l: ca.x, r: ca.x + da.w, t: ca.y, b: ca.y + da.h }, { l: cb.x, r: cb.x + db.w, t: cb.y, b: cb.y + db.h }, lane);
    const mid = pts[Math.floor(pts.length / 2)];
    const prev = pts[Math.max(0, Math.floor(pts.length / 2) - 1)];
    drawn.push({ d: poly(pts), net, name, mx: (mid[0] + prev[0]) / 2, my: (mid[1] + prev[1]) / 2 - 3 });
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
  const areaW = 1520;
  const areaH = 860;
  const scale = Math.min(areaW / (x1 - x0), areaH / (y1 - y0));
  const ox = 80 + (areaW - (x1 - x0) * scale) / 2 - x0 * scale;
  const oy = 112 + (areaH - (y1 - y0) * scale) / 2 - y0 * scale;

  let body = '';
  for (const w of drawn) {
    body += `<path d="${w.d}" fill="none" stroke="#2b3c4a" stroke-width="1.6" stroke-linejoin="round" ${w.net ? 'stroke-dasharray="7 4"' : ''}/>`;
    body += `<rect x="${w.mx - 16}" y="${w.my - 12}" width="32" height="13" fill="#fff"/>`;
    body += `<text x="${w.mx}" y="${w.my - 2}" text-anchor="middle" font-size="9" font-family="Consolas,monospace" fill="#243f54">${w.name}</text>`;
  }
  for (const c of comps) {
    const df = DEF_MAP[c.type];
    if (!df) continue;
    const ref = refs.get(c.id)!;
    const title = `${ref} · ${c.label}`;
    const sub = `${c.brand} ${c.model}`;
    body += `<g><rect x="${c.x}" y="${c.y}" width="${df.w}" height="${df.h}" fill="#fff" stroke="#233b4d" stroke-width="1.6"/>`;
    const fit = (s: string, size: number) => (s.length * size * 0.56 > df.w ? ` textLength="${df.w}" lengthAdjust="spacingAndGlyphs"` : '');
    const t1 = title.slice(0, 48);
    const t2 = sub.slice(0, 52);
    body += `<text x="${c.x}" y="${c.y - 22}" font-size="12" font-weight="700" fill="#142535"${fit(t1, 12)}>${xml(t1)}</text>`;
    body += `<text x="${c.x}" y="${c.y - 8}" font-size="10" fill="#3d5366"${fit(t2, 10)}>${xml(t2)}</text>`;
    const ic = Math.min(52, df.w * 0.34, df.h * 0.4);
    body += `<g transform="translate(${c.x + df.w / 2 - ic / 2} ${c.y + df.h / 2 - ic / 2 - 6}) scale(${ic / 64})" fill="none" stroke="#243f54" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${SYMBOL[df.beh] ?? SYMBOL[df.icon] ?? '<rect x="16" y="16" width="32" height="32"/>'}</g>`;
    body += `<text x="${c.x + df.w / 2}" y="${c.y + df.h / 2 + ic / 2 + 8}" text-anchor="middle" font-size="11" fill="#243f54">${xml(specLine(c))}</text>`;
    for (const p of df.ports) {
      const inward = p.side === 'l' ? 10 : p.side === 'r' ? -10 : 0;
      const vward = p.side === 't' ? 12 : p.side === 'b' ? -8 : -12;
      const anchor = p.side === 'l' ? 'start' : p.side === 'r' ? 'end' : 'middle';
      body += `<circle cx="${c.x + p.x}" cy="${c.y + p.y}" r="3.2" fill="#fff" stroke="#233b4d" stroke-width="1.4"/>`;
      body += `<text x="${c.x + p.x + inward}" y="${c.y + p.y + vward}" text-anchor="${anchor}" font-size="9" font-family="Consolas,monospace" fill="#243f54">${xml(p.label)}</text>`;
    }
    body += '</g>';
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1680" height="1188" viewBox="0 0 1680 1188">
<rect width="1680" height="1188" fill="#fff"/>
<rect x="28" y="28" width="1624" height="1132" fill="none" stroke="#203647" stroke-width="2"/>
<text x="52" y="68" font-family="Arial,Tahoma,sans-serif" font-size="22" font-weight="700" fill="#142535">${xml(opt.title)}</text>
<text x="1628" y="66" text-anchor="end" font-family="Arial,Tahoma,sans-serif" font-size="13" fill="#142535">ELECTRICAL WIRING · ${xml(opt.number)}</text>
<path d="M28 84h1624" stroke="#203647" fill="none"/>
<g transform="translate(${ox.toFixed(1)} ${oy.toFixed(1)}) scale(${scale.toFixed(4)})" font-family="Arial,Tahoma,sans-serif">${body}</g>
<path d="M28 1004h1624M28 1072h1624M1088 1004v156M1408 1004v156" stroke="#203647" fill="none"/>
<text x="48" y="1028" font-family="Arial,sans-serif" font-size="13" fill="#142535">Solid line = electrical wire · Dashed line = network link · Terminal circles = connections</text>
<text x="48" y="1052" font-family="Arial,sans-serif" font-size="12" fill="#142535">Crossing lines without terminal circles are not connected. Reference labels match the connection schedule.</text>
<text x="1104" y="1028" font-family="Arial,sans-serif" font-size="11" fill="#142535">DOCUMENT</text>
<text x="1104" y="1054" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#142535">${xml(opt.number)}</text>
<text x="1424" y="1028" font-family="Arial,sans-serif" font-size="11" fill="#142535">REVISION / DATE</text>
<text x="1424" y="1054" font-family="Arial,sans-serif" font-size="16" fill="#142535">${xml(opt.revision)} / ${xml(opt.date)}</text>
<text x="48" y="1102" font-family="Arial,sans-serif" font-size="18" font-weight="700" fill="#142535">WireLab</text>
<text x="48" y="1126" font-family="Arial,sans-serif" font-size="12" fill="#142535">Generic device models · Verify manufacturer terminals before installation.</text>
<text x="1104" y="1102" font-family="Arial,sans-serif" font-size="12" fill="#142535">${comps.length} devices / ${design.wires.length} connections</text>
<text x="1424" y="1102" font-family="Arial,sans-serif" font-size="12" fill="#142535">A3 LANDSCAPE · SHEET 1</text>
<text x="1424" y="1126" font-family="Arial,sans-serif" font-size="12" fill="#142535">Not to scale</text>
</svg>`;

  return { svg, wires, devices };
}
