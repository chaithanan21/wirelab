import type { Comp, CompDef, Design, PortDef } from './types';
import { COMM_KINDS, DEF_MAP } from './library';

export interface Signal {
  value: number;
  min: number;
  max: number;
  unit: string;
  name: string;
  src: string;
  hi?: number;
  lo?: number;
}

export interface Tag {
  id: string;
  devId: string;
  dev: string;
  name: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  hi?: number;
  lo?: number;
  bool?: boolean;
}

export interface RT {
  powered: boolean;
  src?: string;
  supply?: 'ac' | 'dc' | '3p';
  fault?: string;
  tripped?: boolean;
  tripReason?: string;
  heat?: number;
  coil?: boolean;
  out?: boolean;
  timer?: number;
  pressed?: boolean;
  inOk?: boolean;
  on?: boolean;
  dos?: boolean[];
  di?: boolean[];
  ai?: (Signal | null)[];
  value?: number;
  value2?: number;
  pv?: number;
  unit?: string;
  detect?: boolean;
  freq?: number;
  target?: number;
  run?: boolean;
  current?: number;
  powerW?: number;
  kwh?: number;
  battery?: number;
  sel?: number;
  genT?: number;
  ready?: boolean;
  lamps?: boolean[];
  speed?: number;
  dcLoad?: number;
  damaged?: string;
}

export interface Plant {
  temp: number;
  pressure: number;
  flow: number;
  level: number;
  vib: number;
  totalA: number;
  totalKW: number;
  heatKW: number;
  coolKW: number;
  pumpFrac: number;
}

export interface DisplayState {
  status: 'off' | 'nocomm' | 'ok';
  tags: Tag[];
  via: string[];
  mirrorOf?: string;
}

export interface Alarm {
  id: string;
  t: number;
  sev: 'crit' | 'warn' | 'info';
  msg: string;
  active: boolean;
  cleared?: number;
}

export type WireState = 'off' | 'ac' | 'dc' | 'p3' | 'mv' | 'pe' | 'sig' | 'data' | 'fault';

export interface SimState {
  t: number;
  rt: Record<string, RT>;
  plant: Plant;
  wire: Record<string, WireState>;
  displays: Record<string, DisplayState>;
  tags: Record<string, Tag>;
  alarms: Alarm[];
  activeAlarms: Record<string, Alarm>;
  netSignal: Record<string, Signal>;
}

const key = (c: string, p: string) => c + '.' + p;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (Math.abs(h) % 1000) / 1000;
}

export function newSim(): SimState {
  return {
    t: 0,
    rt: {},
    plant: { temp: 30, pressure: 0.3, flow: 0, level: 2, vib: 0.4, totalA: 0, totalKW: 0, heatKW: 0, coolKW: 0, pumpFrac: 0 },
    wire: {},
    displays: {},
    tags: {},
    alarms: [],
    activeAlarms: {},
    netSignal: {},
  };
}

function R(s: SimState, id: string): RT {
  return (s.rt[id] ??= { powered: false });
}

// ───────────────────────── Nets ─────────────────────────

interface Nets {
  root: (c: string, p: string) => number;
  tokens: Map<number, Set<string>>;
  signals: Map<number, Signal>;
}

function activeLinks(c: Comp, df: CompDef, r: RT): [string, string][] {
  const L = df.links;
  const on = c.props.on !== false;
  switch (df.beh) {
    case 'breaker':
    case 'rcbo':
    case 'fuse':
    case 'switch':
      return on && !r.tripped ? L.main ?? [] : [];
    case 'swg':
      return on && !r.tripped ? [['IN', 'OUT']] : [];
    case 'mdb': {
      if (!on || r.tripped) return [];
      const feeders: [string, string][] = [];
      for (const i of [1, 2, 3, 4]) if (c.props[`f${i}`] !== false) feeders.push(['IN', `F${i}`]);
      feeders.push(['Lin', 'L']);
      return feeders;
    }
    case 'pb':
      return !!r.pressed !== !!c.props.nc ? L.main ?? [] : [];
    case 'estop':
      return c.props.pressed ? [] : L.main ?? [];
    case 'selector':
      return c.props.pos === 'A' ? L.A : c.props.pos === 'B' ? L.B : [];
    case 'relay':
    case 'timer':
      return r.out ? L.no : L.nc;
    case 'contactor':
      return r.out ? L.main : L.nc;
    case 'overload':
      return r.tripped ? L.trip : L.main;
    case 'tempctl':
      return r.out ? L.main : [];
    case 'tb':
    case 'emeter':
      return L.main ?? [];
    case 'sensor_d':
      return r.detect && r.powered ? L.det : [];
    case 'contact_sw':
      return r.detect ? L.act : [];
    case 'ats':
      return r.sel === 1 ? [['I1', 'O']] : r.sel === 2 ? [['I2', 'O']] : [];
    case 'plc':
      return (r.dos ?? []).flatMap((v, i) => (v ? ([['VP', `DO${i + 1}`]] as [string, string][]) : []));
    case 'load_ac':
      return c.props.leak && df.ports.some((p) => p.id === 'PE') ? [['L', 'PE']] : [];
    default:
      return [];
  }
}

function injections(c: Comp, df: CompDef, r: RT): [string, string][] {
  const id = c.id;
  if (r.damaged) return [];
  switch (df.beh) {
    case 'grid1':
      return c.props.on !== false && !r.fault ? [['L', id + '|L'], ['N', id + '|N'], ['PE', id + '|E']] : [['PE', id + '|E']];
    case 'grid3':
    case 'gen': {
      const live = df.beh === 'grid3' ? c.props.on !== false : !!r.ready;
      return live && !r.fault
        ? [['P3', id + '|3'], ['L1', id + '|L'], ['N', id + '|N'], ['PE', id + '|E']]
        : [['PE', id + '|E']];
    }
    case 'gridmv':
      return c.props.on !== false && !r.fault ? [['MV', id + '|MV'], ['PE', id + '|E']] : [['PE', id + '|E']];
    case 'battery':
      return r.fault ? [] : [['P', id + '|+'], ['M', id + '|-']];
    case 'psu':
      return r.on && !r.fault ? [['P', id + '|+'], ['M', id + '|-']] : [];
    case 'ups':
      return r.on && !r.fault ? [['OL', id + '|L'], ['ON', id + '|N']] : [];
    case 'vfd': {
      const out: [string, string][] = [];
      if (r.powered && !r.fault) out.push(['V24', id + '~24|+'], ['V0', id + '~24|-']);
      if ((r.freq ?? 0) > 0.5 && r.powered) out.push(['out', id + '|3']);
      return out;
    }
    default:
      return [];
  }
}

function buildNets(d: Design, s: SimState, forceOpen?: string): Nets {
  const idx = new Map<string, number>();
  for (const c of d.comps) {
    const df = DEF_MAP[c.type];
    if (!df) continue;
    for (const p of df.ports) if (!COMM_KINDS.includes(p.kind)) idx.set(key(c.id, p.id), idx.size);
  }
  const parent = new Int32Array(idx.size);
  for (let i = 0; i < parent.length; i++) parent[i] = i;
  const find = (x: number) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (a?: number, b?: number) => {
    if (a === undefined || b === undefined) return;
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  for (const w of d.wires) union(idx.get(key(w.a.c, w.a.p)), idx.get(key(w.b.c, w.b.p)));
  for (const c of d.comps) {
    if (c.id === forceOpen) continue;
    const df = DEF_MAP[c.type];
    if (!df) continue;
    for (const [a, b] of activeLinks(c, df, R(s, c.id))) union(idx.get(key(c.id, a)), idx.get(key(c.id, b)));
  }
  const root = (c: string, p: string) => {
    const i = idx.get(key(c, p));
    return i === undefined ? -1 : find(i);
  };
  const tokens = new Map<number, Set<string>>();
  const signals = new Map<number, Signal>();
  for (const c of d.comps) {
    const df = DEF_MAP[c.type];
    if (!df) continue;
    const r = R(s, c.id);
    for (const [p, t] of injections(c, df, r)) {
      const rt = root(c.id, p);
      if (rt < 0) continue;
      let set = tokens.get(rt);
      if (!set) tokens.set(rt, (set = new Set()));
      set.add(t);
    }
    if (df.beh === 'sensor_a' && r.powered) {
      const rt = root(c.id, 'OUT');
      if (rt >= 0 && !signals.has(rt))
        signals.set(rt, {
          value: r.value ?? 0,
          min: +c.props.min,
          max: +c.props.max,
          unit: c.props.unit,
          name: c.label,
          src: c.id,
          hi: c.props.hi === '' ? undefined : +c.props.hi,
          lo: c.props.lo === '' ? undefined : +c.props.lo,
        });
    }
  }
  for (const c of d.comps) {
    const df = DEF_MAP[c.type];
    if (df?.beh !== 'tr' || R(s, c.id).fault) continue;
    const hv = root(c.id, 'HV');
    const upstream = hv >= 0 ? tokens.get(hv) : undefined;
    if (!upstream || ![...upstream].some((t) => t.endsWith('|MV'))) continue;
    for (const [p, t] of [
      ['LV', c.id + '|3'],
      ['L', c.id + '|L'],
      ['N', c.id + '|N'],
      ['PE', c.id + '|E'],
    ] as [string, string][]) {
      const rt = root(c.id, p);
      if (rt < 0) continue;
      let bag = tokens.get(rt);
      if (!bag) tokens.set(rt, (bag = new Set()));
      bag.add(t);
    }
  }
  return { root, tokens, signals };
}

const toks = (n: Nets, c: string, p: string) => n.tokens.get(n.root(c, p));

function circuit(n: Nets, c: string, pa: string, pb: string): { src: string; type: 'ac' | 'dc' } | null {
  const A = toks(n, c, pa);
  const B = toks(n, c, pb);
  if (!A || !B) return null;
  for (const t of A) {
    const i = t.lastIndexOf('|');
    const s = t.slice(0, i);
    const role = t.slice(i + 1);
    if ((role === 'L' || role === '3') && B.has(s + '|N')) return { src: s, type: 'ac' };
    if (role === 'N' && (B.has(s + '|L') || B.has(s + '|3'))) return { src: s, type: 'ac' };
    if (role === '+' && B.has(s + '|-')) return { src: s, type: 'dc' };
    if (role === '-' && B.has(s + '|+')) return { src: s, type: 'dc' };
  }
  return null;
}

function hasRole(n: Nets, c: string, p: string, role: string) {
  const A = toks(n, c, p);
  if (!A) return false;
  for (const t of A) if (t.endsWith('|' + role)) return true;
  return false;
}

function has3(n: Nets, c: string, p: string): string | null {
  const A = toks(n, c, p);
  if (!A) return null;
  for (const t of A) if (t.endsWith('|3')) return t.slice(0, -2);
  return null;
}

function hasPlus(n: Nets, c: string, p: string) {
  const A = toks(n, c, p);
  if (!A) return false;
  for (const t of A) if (t.endsWith('|+')) return true;
  return false;
}

function anyLive(n: Nets, c: string, df: CompDef) {
  for (const p of df.ports) {
    const A = toks(n, c, p.id);
    if (A) for (const t of A) if (!t.endsWith('|E')) return true;
  }
  return false;
}

const signalAt = (n: Nets, c: string, p: string) => n.signals.get(n.root(c, p)) ?? null;

// ──────────────────── Supply checks ────────────────────

type Supply = { src: string; type: 'ac' | 'dc' | '3p' } | null;

function supplyOf(c: Comp, df: CompDef, n: Nets): Supply {
  const id = c.id;
  switch (df.beh) {
    case 'psu':
    case 'ups':
    case 'load_ac':
    case 'scada':
    case 'monitor':
    case 'pmeter':
    case 'tempctl':
      return circuit(n, id, 'L', 'N');
    case 'relay':
    case 'contactor':
    case 'timer':
      return circuit(n, id, 'A1', 'A2');
    case 'vfd': {
      const s = has3(n, id, 'in');
      return s ? { src: s, type: '3p' } : null;
    }
    case 'motor3': {
      const s = has3(n, id, 'U');
      return s ? { src: s, type: '3p' } : null;
    }
    case 'emeter': {
      const s = has3(n, id, 'in');
      return s ? { src: s, type: '3p' } : null;
    }
    case 'sensor_a':
    case 'sensor_d':
    case 'sensor_485':
      return circuit(n, id, 'P', 'M');
    case 'load_dc':
      return circuit(n, id, 'P', 'M');
    case 'plc':
    case 'rio':
    case 'edge':
    case 'eswitch':
    case 'router':
    case 'gateway':
    case 'lora_gw':
    case 'hmi':
    case 'led':
      return circuit(n, id, 'VP', 'VM');
    case 'tower': {
      for (const p of ['R', 'Y', 'G']) {
        const cc = circuit(n, id, p, 'M');
        if (cc) return cc;
      }
      return null;
    }
    default:
      return null;
  }
}

function basePower(c: Comp, df: CompDef, r: RT): number {
  switch (df.beh) {
    case 'load_ac':
      return +c.props.power || 0;
    case 'motor3':
      return (+c.props.kw || 0) * 1000 * Math.max(0.08, Math.pow(r.speed ?? 1, 3));
    case 'load_dc':
      return +c.props.power || 0;
    case 'tower':
      return (r.lamps ?? []).filter(Boolean).length * 3;
    case 'relay':
      return 0.6;
    case 'timer':
      return 1.5;
    case 'contactor':
      return r.supply === 'ac' ? 9 : 4;
    case 'plc':
      return 12;
    case 'rio':
      return 6;
    case 'edge':
      return 6;
    case 'eswitch':
      return 4;
    case 'router':
      return 7;
    case 'gateway':
      return 3;
    case 'lora_gw':
      return 6;
    case 'hmi':
      return 12;
    case 'led':
      return 35;
    case 'scada':
      return 180;
    case 'monitor':
      return 140;
    case 'pmeter':
      return 3;
    case 'tempctl':
      return 4;
    case 'sensor_a':
    case 'sensor_d':
    case 'sensor_485':
      return 0.5;
    case 'psu':
      return 4;
    case 'ups':
      return 15 + ((r.battery ?? 100) < 99 && r.inOk ? 60 : 0);
    case 'vfd':
      return 25;
    default:
      return 0;
  }
}

const EFF: Record<string, number> = { psu: 0.91, ups: 0.93, vfd: 0.97, tr: 0.98 };

function supplyCurrent(type: string, w: number) {
  if (type === '3p') return w / (1.732 * 400 * 0.88);
  if (type === 'dc') return w / 24;
  return w / 230;
}

// ──────────────────── State update ────────────────────

function plcLogic(c: Comp, r: RT, t: number): boolean[] {
  const prev = r.dos ?? [false, false, false, false];
  const di = r.di ?? [];
  const ai = r.ai ?? [];
  return [1, 2, 3, 4].map((i) => {
    const mode: string = c.props[`do${i}_mode`] ?? 'OFF';
    const sp = Number(c.props[`do${i}_sp`] ?? 0);
    const p = prev[i - 1];
    let m: RegExpMatchArray | null;
    if (mode === 'OFF') return false;
    if (mode === 'ON') return true;
    if ((m = mode.match(/^DI(\d)$/))) return !!di[+m[1] - 1];
    if ((m = mode.match(/^NOT DI(\d)$/))) return !di[+m[1] - 1];
    if ((m = mode.match(/^AI(\d)([<>])SP$/))) {
      const s = ai[+m[1] - 1];
      if (!s) return false;
      const h = Math.abs(s.max - s.min) * 0.01;
      if (m[2] === '>') return p ? s.value > sp - h : s.value > sp + h;
      return p ? s.value < sp + h : s.value < sp - h;
    }
    if (mode.startsWith('START')) return (p || !!di[0]) && !!di[1];
    if (mode === 'BLINK') return Math.floor(t * 2) % 2 === 0;
    if (mode === 'HMI CMD') return !!c.props.hmiCmd;
    if (mode === 'ANY ALARM')
      return ai.some((s) => !!s && ((s.hi != null && s.value > s.hi) || (s.lo != null && s.value < s.lo)));
    return false;
  });
}

function stateSig(s: SimState) {
  let out = '';
  for (const id in s.rt) {
    const r = s.rt[id];
    out += `${id}:${r.powered ? 1 : 0}${r.on ? 1 : 0}${r.out ? 1 : 0}${r.sel ?? 0}${(r.dos ?? []).map((v) => (v ? 1 : 0)).join('')};`;
  }
  return out;
}

function updateStates(d: Design, s: SimState, n: Nets) {
  for (const c of d.comps) {
    const df = DEF_MAP[c.type];
    if (!df) continue;
    const r = R(s, c.id);
    const id = c.id;
    if (r.damaged) {
      Object.assign(r, { powered: false, on: false, out: false, coil: false, run: false, freq: 0, src: undefined, supply: undefined, inOk: false });
      if (r.dos) r.dos = r.dos.map(() => false);
      if (r.lamps) r.lamps = r.lamps.map(() => false);
      r.ai = r.ai?.map(() => null);
      r.di = r.di?.map(() => false);
      continue;
    }
    const sup = supplyOf(c, df, n);
    r.src = sup?.src;
    r.supply = sup?.type;
    switch (df.beh) {
      case 'grid1':
      case 'grid3':
      case 'gridmv':
        r.powered = c.props.on !== false && !r.fault;
        break;
      case 'tr':
        r.inOk = hasRole(n, id, 'HV', 'MV');
        r.powered = !!r.inOk && !r.fault;
        break;
      case 'gen':
        r.powered = !!r.ready && !r.fault;
        break;
      case 'battery':
        r.powered = !r.fault;
        break;
      case 'psu':
        r.inOk = sup?.type === 'ac';
        r.on = r.inOk && !r.fault;
        r.powered = !!r.on;
        break;
      case 'ups':
        r.inOk = sup?.type === 'ac';
        r.on = (r.inOk || (r.battery ?? 100) > 0) && !r.fault;
        r.powered = !!r.on;
        break;
      case 'ats':
        r.sel = has3(n, id, 'I1') ? 1 : has3(n, id, 'I2') ? 2 : 0;
        r.powered = r.sel > 0;
        break;
      case 'relay':
      case 'contactor':
        r.coil = !!sup;
        r.out = r.coil;
        r.powered = r.coil;
        break;
      case 'timer':
        r.coil = !!sup;
        r.out = r.coil && (r.timer ?? 0) >= (+c.props.delay || 0);
        r.powered = r.coil;
        break;
      case 'tempctl': {
        r.powered = !!sup;
        const sig = signalAt(n, id, 'IN');
        r.pv = sig?.value;
        const sv = +c.props.sv;
        const h = +c.props.hyst || 0.5;
        if (!r.powered || !sig) r.out = false;
        else if (sig.value < sv - h) r.out = true;
        else if (sig.value > sv + h) r.out = false;
        break;
      }
      case 'vfd': {
        r.powered = !!sup && !r.fault;
        r.run = r.powered && hasPlus(n, id, 'RUN');
        const ref = signalAt(n, id, 'REF');
        r.target = ref ? clamp((ref.value - ref.min) / (ref.max - ref.min || 1), 0, 1) * 50 : clamp(+c.props.freq || 0, 0, 60);
        break;
      }
      case 'motor3': {
        r.powered = !!sup;
        if (sup) {
          const srcComp = d.comps.find((x) => x.id === sup.src);
          r.speed = srcComp && DEF_MAP[srcComp.type]?.beh === 'vfd' ? clamp((R(s, srcComp.id).freq ?? 0) / 50, 0, 1.2) : 1;
        } else r.speed = 0;
        break;
      }
      case 'plc':
      case 'rio':
      case 'edge': {
        r.powered = !!sup && sup.type === 'dc';
        const nAI = df.ports.filter((p) => p.id.startsWith('AI')).length;
        const nDI = df.ports.filter((p) => p.id.startsWith('DI')).length;
        r.ai = Array.from({ length: nAI }, (_, i) => (r.powered ? signalAt(n, id, `AI${i + 1}`) : null));
        r.di = Array.from({ length: nDI }, (_, i) => r.powered && hasPlus(n, id, `DI${i + 1}`));
        if (df.beh === 'plc') r.dos = r.powered ? plcLogic(c, r, s.t) : [false, false, false, false];
        break;
      }
      case 'pmeter': {
        r.powered = !!sup;
        const sig = signalAt(n, id, 'IN');
        r.pv = r.powered && sig ? sig.value : undefined;
        r.unit = sig?.unit;
        break;
      }
      case 'tower':
        r.lamps = ['R', 'Y', 'G'].map((p) => !!circuit(n, id, p, 'M'));
        r.powered = r.lamps.some(Boolean);
        break;
      case 'sensor_lora':
      case 'cloud':
        r.powered = true;
        break;
      case 'breaker':
      case 'rcbo':
      case 'fuse':
      case 'switch':
      case 'pb':
      case 'estop':
      case 'selector':
      case 'contact_sw':
      case 'tb':
      case 'passive':
      case 'overload':
      case 'swg':
      case 'mdb':
        r.powered = anyLive(n, id, df);
        break;
      default:
        r.powered = !!sup;
    }
  }
}

function solve(d: Design, s: SimState): Nets {
  let n = buildNets(d, s);
  for (let i = 0; i < 12; i++) {
    const before = stateSig(s);
    updateStates(d, s, n);
    n = buildNets(d, s);
    if (stateSig(s) === before) break;
  }
  return n;
}

// ──────────────────── Overvoltage damage ────────────────────

const LV_X_PORTS: Record<string, RegExp> = {
  sensor_d: /^OUT$/,
  load_dc: /^P$/,
  tower: /^[RYG]$/,
  plc: /^D[IO]\d$/,
  rio: /^DI\d$/,
  edge: /^DI\d$/,
  relay: /^A[12]$/,
  timer: /^A[12]$/,
  vfd: /^RUN$/,
};

export function lvPorts(df: CompDef): PortDef[] {
  const x = LV_X_PORTS[df.beh];
  return df.ports.filter((p) => p.kind === 'DC+' || p.kind === 'DC-' || (!!x && x.test(p.id)));
}

const AC_LIVE: Record<string, string> = { MV: '22kV', '3': '400VAC 3φ', L: '230VAC' };

function checkDamage(d: Design, s: SimState, n: Nets): boolean {
  let hit = false;
  for (const c of d.comps) {
    const df = DEF_MAP[c.type];
    const r = R(s, c.id);
    if (!df || r.damaged) continue;
    for (const p of lvPorts(df)) {
      const set = toks(n, c.id, p.id);
      if (!set) continue;
      let live: string | undefined;
      let from = '';
      for (const t of set) {
        const i = t.lastIndexOf('|');
        const v = AC_LIVE[t.slice(i + 1)];
        if (v && (!live || v === '400VAC 3φ' || v === '22kV')) {
          live = v;
          from = d.comps.find((x) => x.id === srcCompId(t.slice(0, i)))?.label ?? '';
        }
      }
      if (live) {
        r.damaged = `ได้รับไฟ ${live}${from ? ` จาก ${from}` : ''} ที่ขั้ว ${p.label} (พิกัด 24VDC)`;
        hit = true;
        break;
      }
    }
  }
  return hit;
}

export function repair(s: SimState, id: string) {
  const r = s.rt[id];
  if (r) r.damaged = undefined;
}

export function unprotectedLoads(d: Design, s: SimState): string[] {
  const loads = d.comps.filter((c) => {
    const df = DEF_MAP[c.type];
    const r = R(s, c.id);
    const src = r.src ? DEF_MAP[d.comps.find((x) => x.id === srcCompId(r.src!))?.type ?? '']?.beh : undefined;
    return (
      df && r.powered && !!src && ['grid1', 'grid3', 'gen', 'tr'].includes(src) &&
      ['load_ac', 'motor3', 'psu', 'ups', 'vfd', 'scada', 'monitor', 'pmeter', 'tempctl'].includes(df.beh)
    );
  });
  const safe = new Set<string>();
  for (const c of d.comps) {
    const df = DEF_MAP[c.type];
    if (!df || !['breaker', 'rcbo', 'fuse', 'swg', 'mdb'].includes(df.beh) || c.props.on === false || R(s, c.id).tripped) continue;
    const n2 = buildNets(d, s, c.id);
    for (const x of loads) if (!supplyOf(x, DEF_MAP[x.type], n2)) safe.add(x.id);
  }
  return loads.filter((x) => !safe.has(x.id)).map((x) => x.id);
}

// ──────────────────── Faults ────────────────────

interface Short {
  src: string;
  root: number;
  earth: boolean;
}

function findShorts(n: Nets): Short[] {
  const out: Short[] = [];
  for (const [root, set] of n.tokens) {
    const bySrc = new Map<string, Set<string>>();
    let hasAC: string | null = null;
    let hasDC: string | null = null;
    for (const t of set) {
      const i = t.lastIndexOf('|');
      const s = t.slice(0, i);
      const role = t.slice(i + 1);
      if (!bySrc.has(s)) bySrc.set(s, new Set());
      bySrc.get(s)!.add(role);
      if (role === 'L' || role === '3') hasAC = s;
      if (role === '+' || role === '-') hasDC = s;
    }
    for (const [src, roles] of bySrc) {
      const acCount = ['L', 'N', '3'].filter((x) => roles.has(x)).length;
      if (acCount >= 2 || (roles.has('+') && roles.has('-'))) out.push({ src, root, earth: false });
      else if ((roles.has('L') || roles.has('3')) && roles.has('E')) out.push({ src, root, earth: true });
    }
    if (hasAC && hasDC) out.push({ src: hasDC, root, earth: false });
  }
  return out;
}

const srcCompId = (src: string) => src.split('~')[0];

function handleShorts(d: Design, s: SimState, n: Nets): boolean {
  const shorts = findShorts(n);
  if (!shorts.length) return false;
  let acted = false;
  const handled = new Set<string>();
  for (const sh of shorts) {
    const k = sh.src + (sh.earth ? 'E' : 'S');
    if (handled.has(k)) continue;
    handled.add(k);
    const cands = d.comps.filter((c) => {
      const df = DEF_MAP[c.type];
      if (!df) return false;
      const ok = sh.earth ? df.beh === 'rcbo' : ['breaker', 'rcbo', 'fuse', 'swg', 'mdb'].includes(df.beh);
      return ok && c.props.on !== false && !R(s, c.id).tripped;
    });
    const fixes = cands.filter((c) => {
      const n2 = buildNets(d, s, c.id);
      return !findShorts(n2).some((x) => x.src === sh.src && x.earth === sh.earth);
    });
    if (fixes.length) {
      fixes.sort((a, b) => (+a.props.rating || 0) - (+b.props.rating || 0));
      const r = R(s, fixes[0].id);
      r.tripped = true;
      r.tripReason = sh.earth ? 'ไฟรั่วลงดิน' : 'ลัดวงจร';
      acted = true;
    } else if (!sh.earth) {
      const r = R(s, srcCompId(sh.src));
      if (!r.fault) {
        r.fault = 'SHORT CIRCUIT';
        acted = true;
      }
    }
  }
  return acted;
}

// ──────────────────── Currents ────────────────────

const PROTECT = ['breaker', 'rcbo', 'fuse', 'overload', 'emeter', 'swg', 'mdb'];

function computePower(d: Design, s: SimState) {
  const memo = new Map<string, number>();
  const bySrc = new Map<string, Comp[]>();
  for (const c of d.comps) {
    const r = R(s, c.id);
    if (r.powered && r.src) {
      const k = srcCompId(r.src);
      if (!bySrc.has(k)) bySrc.set(k, []);
      bySrc.get(k)!.push(c);
    }
  }
  const power = (c: Comp, depth = 0): number => {
    if (memo.has(c.id)) return memo.get(c.id)!;
    const df = DEF_MAP[c.type];
    const r = R(s, c.id);
    memo.set(c.id, 0);
    let p = 0;
    if (EFF[df.beh]) {
      const down = depth < 8 ? (bySrc.get(c.id) ?? []).reduce((a, x) => a + power(x, depth + 1), 0) : 0;
      r.dcLoad = down;
      const fed = df.beh === 'vfd' ? r.powered : r.inOk;
      p = fed ? basePower(c, df, r) + down / EFF[df.beh] : 0;
    } else p = r.powered ? basePower(c, df, r) : 0;
    memo.set(c.id, p);
    r.powerW = p;
    return p;
  };
  for (const c of d.comps) power(c);
  return bySrc;
}

function computeCurrents(d: Design, s: SimState, dt: number): boolean {
  const bySrc = computePower(d, s);
  const consumers = d.comps.filter((c) => {
    const r = R(s, c.id);
    return r.powered && r.supply && (r.powerW ?? 0) > 0;
  });
  for (const c of d.comps) {
    const df = DEF_MAP[c.type];
    if (!df) continue;
    const r = R(s, c.id);
    if (df.beh === 'psu' || df.beh === 'ups' || df.beh === 'vfd') {
      r.current = r.supply ? supplyCurrent(r.supply, r.powerW ?? 0) : 0;
    } else if (r.supply) r.current = supplyCurrent(r.supply, r.powerW ?? 0);
  }

  let tripped = false;
  for (const c of d.comps) {
    const df = DEF_MAP[c.type];
    if (!df || !PROTECT.includes(df.beh)) continue;
    const r = R(s, c.id);
    const closed = df.beh === 'emeter' || df.beh === 'overload' ? !r.tripped : c.props.on !== false && !r.tripped;
    if (!closed || !r.powered) {
      r.current = 0;
      r.powerW = 0;
      r.heat = Math.max(0, (r.heat ?? 0) - dt);
      continue;
    }
    const n2 = buildNets(d, s, c.id);
    let I = 0;
    let W = 0;
    for (const x of consumers) {
      const dx = DEF_MAP[x.type];
      if (!supplyOf(x, dx, n2)) {
        const rx = R(s, x.id);
        I += rx.current ?? 0;
        W += rx.powerW ?? 0;
      }
    }
    if (df.beh === 'swg') I *= 400 / ((+c.props.kv || 22) * 1000);
    r.current = I;
    r.powerW = W;
    if (df.beh === 'emeter') {
      r.kwh = (r.kwh ?? 0) + (W / 1000) * (dt / 3600);
      continue;
    }
    const rating = df.beh === 'overload' ? +c.props.setting || 1 : +c.props.rating || 1;
    const ratio = I / rating;
    if (ratio > 8 && df.beh !== 'overload') {
      r.tripped = true;
      r.tripReason = 'Magnetic trip (กระแสสูงมาก)';
      tripped = true;
    } else if (ratio > 1.13) {
      r.heat = (r.heat ?? 0) + dt * (ratio * ratio - 1);
      if (r.heat > (df.beh === 'overload' ? 20 : 30)) {
        r.tripped = true;
        r.tripReason = 'Overload (กระแสเกินพิกัด)';
        tripped = true;
      }
    } else r.heat = Math.max(0, (r.heat ?? 0) - dt * 2);
  }

  let total = 0;
  let totalW = 0;
  for (const c of d.comps) {
    const df = DEF_MAP[c.type];
    if (!df || !['grid1', 'grid3', 'gridmv', 'gen', 'battery', 'tr'].includes(df.beh)) continue;
    const r = R(s, c.id);
    const w = (bySrc.get(c.id) ?? []).reduce((a, x) => a + (R(s, x.id).powerW ?? 0), 0);
    r.powerW = w;
    r.current = (bySrc.get(c.id) ?? []).reduce((a, x) => a + (R(s, x.id).current ?? 0), 0);
    if (df.beh !== 'battery') {
      total += r.current;
      totalW += w;
    }
  }
  s.plant.totalA = total;
  s.plant.totalKW = totalW / 1000;
  return tripped;
}

// ──────────────────── Process & time ────────────────────

function updatePlant(d: Design, s: SimState, dt: number) {
  let heat = 0;
  let cool = 0;
  let pump = 0;
  let motor = 0;
  for (const c of d.comps) {
    const df = DEF_MAP[c.type];
    const r = s.rt[c.id];
    if (!df || !r?.powered) continue;
    if (df.beh === 'load_ac') {
      if (c.props.process === 'heat') heat += (+c.props.power || 0) / 1000;
      if (c.props.process === 'cool') cool += (+c.props.power || 0) / 1000;
    }
    if (df.beh === 'motor3') {
      motor = Math.max(motor, r.speed ?? 0);
      if (c.props.process === 'pump') pump = Math.max(pump, r.speed ?? 0);
    }
  }
  const p = s.plant;
  p.heatKW = heat;
  p.coolKW = cool;
  p.pumpFrac = pump;
  const targetT = Math.max(16, 28 + heat * 24 - cool * 7);
  p.temp += (targetT - p.temp) * Math.min(1, dt / 18);
  p.pressure += (0.3 + 6.6 * pump * pump - p.pressure) * Math.min(1, dt / 2);
  p.flow += (95 * pump - p.flow) * Math.min(1, dt / 1.5);
  p.level = clamp(p.level + (pump * 0.11 - 0.035) * dt, 0, 5);
  p.vib += (0.4 + 3.4 * motor - p.vib) * Math.min(1, dt / 1.5);
}

function sensorValue(c: Comp, s: SimState): number {
  const pr = c.props;
  const min = +pr.min;
  const max = +pr.max;
  const span = Math.abs(max - min) || 1;
  const ph = hash(c.id) * Math.PI * 2;
  const t = s.t;
  const noise = (Math.random() - 0.5) * span;
  let v: number;
  if (pr.mode === 'manual') v = +pr.manual;
  else if (pr.mode === 'wave') {
    const per = Math.max(2, +pr.period || 30);
    v = (min + max) / 2 + 0.33 * span * Math.sin((2 * Math.PI * t) / per + ph) + noise * 0.01;
  } else {
    const p = s.plant;
    switch (pr.quantity) {
      case 'temp': v = p.temp; break;
      case 'pressure': v = p.pressure; break;
      case 'flow': v = p.flow; break;
      case 'level': v = p.level; break;
      case 'vibration': v = p.vib; break;
      case 'current': v = p.totalA; break;
      case 'humidity': v = 62 + 12 * Math.sin(t / 40 + ph); break;
      case 'co2': v = 620 + 320 * Math.sin(t / 35 + ph); break;
      case 'ph': v = 7.1 + 0.7 * Math.sin(t / 25 + ph); break;
      default: v = (min + max) / 2;
    }
    v += noise * 0.004;
  }
  return clamp(v, Math.min(min, max), Math.max(min, max));
}

function timeStep(d: Design, s: SimState, dt: number) {
  const t = s.t;
  for (const c of d.comps) {
    const df = DEF_MAP[c.type];
    if (!df) continue;
    const r = R(s, c.id);
    if (['grid1', 'grid3', 'gridmv', 'gen', 'battery', 'psu', 'ups', 'vfd', 'tr'].includes(df.beh)) r.fault = undefined;
    switch (df.beh) {
      case 'sensor_a': {
        const v = sensorValue(c, s);
        r.value = r.value === undefined || c.props.mode === 'manual' ? v : r.value * 0.5 + v * 0.5;
        break;
      }
      case 'sensor_485':
      case 'sensor_lora': {
        const ph = hash(c.id) * 6.28;
        r.value = 26.5 + 3.2 * Math.sin(t / 50 + ph) + (Math.random() - 0.5) * 0.1 + s.plant.heatKW * 0.8;
        r.value2 = 58 + 9 * Math.sin(t / 37 + ph) + (Math.random() - 0.5) * 0.4;
        if (df.beh === 'sensor_lora') r.battery = Math.max(5, 100 - t / 900);
        break;
      }
      case 'sensor_d': {
        const per = Math.max(1, +c.props.period || 4);
        const off = hash(c.id) * per;
        r.detect =
          c.props.mode === 'manual' ? !!c.props.detect
          : c.props.mode === 'process' ? s.plant.level >= +c.props.sp
          : ((t + off) % per) < per * 0.3;
        break;
      }
      case 'contact_sw': {
        const per = Math.max(1, +c.props.period || 6);
        r.detect =
          c.props.mode === 'process' ? s.plant.level >= +c.props.sp
          : c.props.mode === 'auto' ? ((t + hash(c.id) * per) % per) < per * 0.25
          : !!c.props.actuated;
        break;
      }
      case 'timer':
        r.timer = r.coil ? (r.timer ?? 0) + dt : 0;
        break;
      case 'vfd': {
        const target = r.run ? r.target ?? 0 : 0;
        const rate = 50 / Math.max(0.5, +c.props.accel || 5);
        const f = r.freq ?? 0;
        r.freq = f < target ? Math.min(target, f + rate * dt) : Math.max(target, f - rate * dt);
        if (!r.powered) r.freq = 0;
        break;
      }
      case 'gen':
        if (c.props.on || (c.props.auto && d.comps.some((x) => DEF_MAP[x.type]?.beh === 'ats' && (s.rt[x.id]?.sel ?? 1) !== 1))) {
          r.genT = (r.genT ?? 0) + dt;
          r.ready = r.genT >= (+c.props.startDelay || 0);
        } else {
          r.genT = 0;
          r.ready = false;
        }
        break;
      case 'ups': {
        const b = r.battery ?? 100;
        const loadFrac = clamp((r.dcLoad ?? 0) / (+c.props.va * 0.9 || 900), 0.15, 1.5);
        if (r.inOk) r.battery = Math.min(100, b + dt * 0.5);
        else if (r.on) r.battery = Math.max(0, b - (dt * 100 * loadFrac) / ((+c.props.backupMin || 10) * 60));
        break;
      }
    }
  }
}

// ──────────────────── Communication ────────────────────

function pubTags(c: Comp, df: CompDef, r: RT): Tag[] {
  const base = { devId: c.id, dev: c.label };
  const out: Tag[] = [];
  switch (df.beh) {
    case 'plc':
    case 'rio':
    case 'edge':
      (r.ai ?? []).forEach((sg, i) => {
        if (sg) out.push({ ...base, id: `${c.id}:AI${i + 1}`, name: sg.name, value: sg.value, unit: sg.unit, min: sg.min, max: sg.max, hi: sg.hi, lo: sg.lo });
      });
      (r.di ?? []).forEach((v, i) => out.push({ ...base, id: `${c.id}:DI${i + 1}`, name: `${c.label}.DI${i + 1}`, value: v ? 1 : 0, unit: '', min: 0, max: 1, bool: true }));
      (r.dos ?? []).forEach((v, i) => out.push({ ...base, id: `${c.id}:DO${i + 1}`, name: `${c.label}.DO${i + 1}`, value: v ? 1 : 0, unit: '', min: 0, max: 1, bool: true }));
      break;
    case 'vfd':
      out.push(
        { ...base, id: `${c.id}:F`, name: `${c.label} Freq`, value: r.freq ?? 0, unit: 'Hz', min: 0, max: 60 },
        { ...base, id: `${c.id}:I`, name: `${c.label} Current`, value: r.current ?? 0, unit: 'A', min: 0, max: 30 },
        { ...base, id: `${c.id}:RUN`, name: `${c.label} Run`, value: (r.freq ?? 0) > 0.5 ? 1 : 0, unit: '', min: 0, max: 1, bool: true },
      );
      break;
    case 'emeter':
      out.push(
        { ...base, id: `${c.id}:V`, name: `${c.label} Voltage`, value: r.powered ? 400 + Math.sin(Date.now() / 3000) * 2 : 0, unit: 'V', min: 0, max: 500 },
        { ...base, id: `${c.id}:I`, name: `${c.label} Current`, value: r.current ?? 0, unit: 'A', min: 0, max: 100 },
        { ...base, id: `${c.id}:P`, name: `${c.label} Power`, value: (r.powerW ?? 0) / 1000, unit: 'kW', min: 0, max: 50 },
        { ...base, id: `${c.id}:E`, name: `${c.label} Energy`, value: r.kwh ?? 0, unit: 'kWh', min: 0, max: 1000 },
      );
      break;
    case 'sensor_485':
    case 'sensor_lora':
      out.push(
        { ...base, id: `${c.id}:T`, name: `${c.label} Temp`, value: r.value ?? 0, unit: '°C', min: 0, max: 50, hi: 35 },
        { ...base, id: `${c.id}:H`, name: `${c.label} Humidity`, value: r.value2 ?? 0, unit: '%RH', min: 0, max: 100, hi: 80 },
      );
      if (df.beh === 'sensor_lora')
        out.push({ ...base, id: `${c.id}:B`, name: `${c.label} Battery`, value: r.battery ?? 100, unit: '%', min: 0, max: 100, lo: 20 });
      break;
  }
  return out;
}

const PUB_PORTS: Record<string, string[]> = {
  plc: ['ETH', '485'],
  rio: ['ETH'],
  edge: ['ETH'],
  vfd: ['ETH', '485'],
  emeter: ['ETH', '485'],
  sensor_485: ['485'],
};
const SUB_PORTS: Record<string, string[]> = {
  hmi: ['ETH', '485'],
  scada: ['ETH'],
  led: ['ETH'],
};

function updateComm(d: Design, s: SimState) {
  const idx = new Map<string, number>();
  idx.set('AIR', 0);
  idx.set('CLOUD', 1);
  for (const c of d.comps) {
    const df = DEF_MAP[c.type];
    if (!df) continue;
    for (const p of df.ports) if (COMM_KINDS.includes(p.kind)) idx.set(key(c.id, p.id), idx.size);
  }
  const parent = Array.from({ length: idx.size }, (_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const union = (a?: number, b?: number) => {
    if (a === undefined || b === undefined) return;
    parent[find(a)] = find(b);
  };
  const I = (c: string, p: string) => idx.get(key(c, p));
  for (const w of d.wires) union(I(w.a.c, w.a.p), I(w.b.c, w.b.p));
  for (const c of d.comps) {
    const df = DEF_MAP[c.type];
    const r = s.rt[c.id];
    if (!df || !r?.powered) continue;
    const eth = df.ports.filter((p) => p.kind === 'ETH').map((p) => I(c.id, p.id));
    if (df.beh === 'eswitch' || df.beh === 'router') for (let i = 1; i < eth.length; i++) union(eth[0], eth[i]);
    if (df.beh === 'router') union(eth[0], 1);
    if (df.beh === 'gateway') union(I(c.id, '485'), I(c.id, 'ETH'));
    if (df.beh === 'lora_gw') union(I(c.id, 'ETH'), 0);
  }
  const root = (c: string, p: string) => {
    const i = I(c, p);
    return i === undefined ? -1 : find(i);
  };

  const pubs = new Map<number, string[]>();
  const addPub = (rt: number, id: string) => {
    if (rt < 0) return;
    if (!pubs.has(rt)) pubs.set(rt, []);
    if (!pubs.get(rt)!.includes(id)) pubs.get(rt)!.push(id);
  };
  const tagsBy: Record<string, Tag[]> = {};
  s.tags = {};
  for (const c of d.comps) {
    const df = DEF_MAP[c.type];
    const r = s.rt[c.id];
    if (!df || !r?.powered) continue;
    if (PUB_PORTS[df.beh] || df.beh === 'sensor_lora') {
      tagsBy[c.id] = pubTags(c, df, r);
      for (const t of tagsBy[c.id]) s.tags[t.id] = t;
      if (df.beh === 'sensor_lora') addPub(find(0), c.id);
      else for (const p of PUB_PORTS[df.beh]) addPub(root(c.id, p), c.id);
    }
  }

  s.displays = {};
  const collect = (roots: number[]): DisplayState => {
    const ids = new Set<string>();
    for (const rt of roots) for (const id of pubs.get(rt) ?? []) ids.add(id);
    const prio = (id: string) => {
      const b = DEF_MAP[d.comps.find((c) => c.id === id)?.type ?? '']?.beh ?? '';
      return ['plc', 'rio', 'edge', 'sensor_485', 'sensor_lora', 'vfd', 'emeter'].indexOf(b);
    };
    const tags = [...ids].sort((a, b) => prio(a) - prio(b)).flatMap((id) => tagsBy[id] ?? []);
    const via = [...ids].map((id) => d.comps.find((c) => c.id === id)?.label ?? id);
    return { status: tags.length ? 'ok' : 'nocomm', tags, via };
  };
  for (const c of d.comps) {
    const df = DEF_MAP[c.type];
    if (!df) continue;
    const r = R(s, c.id);
    if (SUB_PORTS[df.beh]) {
      s.displays[c.id] = r.powered ? collect(SUB_PORTS[df.beh].map((p) => root(c.id, p))) : { status: 'off', tags: [], via: [] };
    } else if (df.beh === 'cloud') {
      s.displays[c.id] = collect([find(1)]);
    } else if (df.beh === 'pmeter') {
      s.displays[c.id] = { status: r.powered ? 'ok' : 'off', tags: [], via: [] };
    }
  }
  for (const c of d.comps) {
    const df = DEF_MAP[c.type];
    if (df?.beh !== 'monitor') continue;
    const r = R(s, c.id);
    const hr = root(c.id, 'HDMI');
    const pc = d.comps.find((x) => DEF_MAP[x.type]?.beh === 'scada' && root(x.id, 'HDMI') === hr && s.rt[x.id]?.powered);
    if (!r.powered) s.displays[c.id] = { status: 'off', tags: [], via: [] };
    else if (!pc) s.displays[c.id] = { status: 'nocomm', tags: [], via: [] };
    else s.displays[c.id] = { ...s.displays[pc.id], mirrorOf: pc.id };
  }

  for (const w of d.wires) {
    const ra = root(w.a.c, w.a.p);
    if (ra < 0) continue;
    const pa = DEF_MAP[d.comps.find((c) => c.id === w.a.c)?.type ?? '']?.ports.find((p) => p.id === w.a.p);
    if (pa?.kind === 'HDMI') {
      const pc = d.comps.find((x) => DEF_MAP[x.type]?.beh === 'scada' && root(x.id, 'HDMI') === ra && s.rt[x.id]?.powered);
      s.wire[w.id] = pc ? 'data' : 'off';
    } else s.wire[w.id] = pubs.has(ra) ? 'data' : 'off';
  }
}

// ──────────────────── Wires & alarms ────────────────────

function updateWires(d: Design, s: SimState, n: Nets) {
  const shortRoots = new Set(findShorts(n).map((x) => x.root));
  s.netSignal = {};
  for (const w of d.wires) {
    const ra = n.root(w.a.c, w.a.p);
    if (ra < 0) continue;
    const set = n.tokens.get(ra);
    const sig = n.signals.get(ra);
    let st: WireState = 'off';
    if (shortRoots.has(ra)) st = 'fault';
    else if (set && set.size) {
      const roles = [...set].map((t) => t.slice(t.lastIndexOf('|') + 1));
      if (roles.includes('MV')) st = 'mv';
      else if (roles.includes('3')) st = 'p3';
      else if (roles.includes('L') || roles.includes('N')) st = 'ac';
      else if (roles.includes('+') || roles.includes('-')) st = 'dc';
      else st = 'pe';
    } else if (sig) st = 'sig';
    if (sig) s.netSignal[w.id] = sig;
    s.wire[w.id] = st;
  }
}

function updateAlarms(d: Design, s: SimState) {
  const act: { id: string; sev: Alarm['sev']; msg: string }[] = [];
  const earth = findEarthUnprotected;
  for (const c of d.comps) {
    const df = DEF_MAP[c.type];
    if (!df) continue;
    const r = R(s, c.id);
    if (r.tripped) act.push({ id: c.id + ':trip', sev: 'crit', msg: `${c.label} ทริป — ${r.tripReason ?? ''}` });
    if (r.fault) act.push({ id: c.id + ':fault', sev: 'crit', msg: `${c.label} ${r.fault} — ตรวจสอบการเดินสาย` });
    if (r.damaged) act.push({ id: c.id + ':dmg', sev: 'crit', msg: `${c.label} เสียหาย — ${r.damaged}` });
    if ((df.beh === 'grid1' || df.beh === 'grid3' || df.beh === 'gridmv') && c.props.on === false) act.push({ id: c.id + ':off', sev: 'warn', msg: `${c.label} ไฟดับ (Power outage)` });
    if (df.beh === 'tr' && r.powered && (r.powerW ?? 0) > (+c.props.kva || 1000) * 1000)
      act.push({ id: c.id + ':kva', sev: 'warn', msg: `${c.label} โหลดเกินพิกัด ${((r.powerW ?? 0) / 1000).toFixed(0)} kW / ${c.props.kva} kVA` });
    if (df.beh === 'sensor_a' && r.powered && r.value !== undefined) {
      if (c.props.hi !== '' && c.props.hi != null && r.value > +c.props.hi) act.push({ id: c.id + ':hi', sev: 'warn', msg: `${c.label} สูงเกิน (HIGH) ${r.value.toFixed(1)} ${c.props.unit}` });
      if (c.props.lo !== '' && c.props.lo != null && r.value < +c.props.lo) act.push({ id: c.id + ':lo', sev: 'warn', msg: `${c.label} ต่ำเกิน (LOW) ${r.value.toFixed(1)} ${c.props.unit}` });
    }
    if (df.beh === 'psu' && (r.dcLoad ?? 0) > (+c.props.ratedW || 240)) act.push({ id: c.id + ':ovl', sev: 'warn', msg: `${c.label} โหลดเกินพิกัด ${(r.dcLoad ?? 0).toFixed(0)}W` });
    if (df.beh === 'ups' && r.on && !r.inOk) act.push({ id: c.id + ':batt', sev: 'warn', msg: `${c.label} ทำงานด้วยแบตเตอรี่ ${(r.battery ?? 0).toFixed(0)}%` });
    if (df.beh === 'ups' && !r.on && !r.inOk) act.push({ id: c.id + ':empty', sev: 'crit', msg: `${c.label} แบตเตอรี่หมด` });
    const ds = s.displays[c.id];
    if (ds?.status === 'nocomm' && df.beh !== 'monitor') act.push({ id: c.id + ':comm', sev: 'warn', msg: `${c.label} ไม่มีการสื่อสาร (COMM FAIL)` });
  }
  for (const e of earth(d, s)) act.push(e);

  const now = new Set(act.map((a) => a.id));
  for (const a of act) {
    if (!s.activeAlarms[a.id]) {
      const al: Alarm = { ...a, t: s.t, active: true };
      s.activeAlarms[a.id] = al;
      s.alarms.unshift(al);
    } else s.activeAlarms[a.id].msg = a.msg;
  }
  for (const id in s.activeAlarms) {
    if (!now.has(id)) {
      s.activeAlarms[id].active = false;
      s.activeAlarms[id].cleared = s.t;
      delete s.activeAlarms[id];
    }
  }
  if (s.alarms.length > 200) s.alarms.length = 200;
}

let lastNets: Nets | null = null;

function findEarthUnprotected(d: Design, s: SimState) {
  if (!lastNets) return [];
  return findShorts(lastNets)
    .filter((x) => x.earth)
    .map((x) => ({ id: 'earth:' + x.src, sev: 'crit' as const, msg: `อันตราย! ไฟรั่วลงดินจาก ${d.comps.find((c) => c.id === srcCompId(x.src))?.label ?? x.src} — ไม่มี RCBO ป้องกัน` }));
}

// ──────────────────── Public API ────────────────────

export function step(d: Design, s: SimState, dt: number) {
  for (const id of Object.keys(s.rt)) if (!d.comps.some((c) => c.id === id)) delete s.rt[id];
  s.t += dt;
  updatePlant(d, s, dt);
  timeStep(d, s, dt);
  let n = solve(d, s);
  for (let k = 0; k < 4 && checkDamage(d, s, n); k++) n = solve(d, s);
  for (let k = 0; k < 4 && handleShorts(d, s, n); k++) n = solve(d, s);
  if (computeCurrents(d, s, dt)) {
    n = solve(d, s);
    for (let k = 0; k < 4 && handleShorts(d, s, n); k++) n = solve(d, s);
    computeCurrents(d, s, 0);
  }
  lastNets = n;
  updateWires(d, s, n);
  updateComm(d, s);
  updateAlarms(d, s);
}

export function resetTrip(s: SimState, id: string) {
  const r = s.rt[id];
  if (r) {
    r.tripped = false;
    r.tripReason = undefined;
    r.heat = 0;
    r.fault = undefined;
  }
}

export function forceTrip(s: SimState, id: string, reason: string) {
  const r = R(s, id);
  r.tripped = true;
  r.tripReason = reason;
}

export function setPressed(s: SimState, id: string, v: boolean) {
  R(s, id).pressed = v;
}
