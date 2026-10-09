import type { Comp, Design, PortDef, Wire } from './types';
import { DEF_MAP } from './library';
import { lvPorts, newSim, step, unprotectedLoads } from './sim';
import { portHint } from './advice';

export interface Issue {
  id: string;
  sev: 'crit' | 'warn' | 'info';
  msg: string;
  fix?: string;
  comps: string[];
  wire?: string;
}

const SUPPLY_PORTS: Record<string, string[]> = {
  psu: ['L', 'N'], ups: ['L', 'N'], load_ac: ['L', 'N'], scada: ['L', 'N'], monitor: ['L', 'N'], pmeter: ['L', 'N'], tempctl: ['L', 'N'],
  sensor_a: ['P', 'M'], sensor_d: ['P', 'M'], sensor_485: ['P', 'M'], load_dc: ['P', 'M'],
  plc: ['VP', 'VM'], rio: ['VP', 'VM'], edge: ['VP', 'VM'], eswitch: ['VP', 'VM'], router: ['VP', 'VM'], gateway: ['VP', 'VM'],
  lora_gw: ['VP', 'VM'], hmi: ['VP', 'VM'], led: ['VP', 'VM'],
  relay: ['A1', 'A2'], contactor: ['A1', 'A2'], timer: ['A1', 'A2'],
  vfd: ['in'], motor3: ['U'], emeter: ['in'], tower: ['M'], tr: ['HV'], mdb: ['IN'], swg: ['IN'],
};

const AC_INPUT = new Set(['psu', 'ups', 'load_ac', 'scada', 'monitor', 'pmeter', 'tempctl']);
const LIVE = new Set(['L', 'P3']);

type End = { c: Comp; p: PortDef };

function ends(d: Design, w: Wire): [End, End] | null {
  const ca = d.comps.find((c) => c.id === w.a.c);
  const cb = d.comps.find((c) => c.id === w.b.c);
  const pa = ca && DEF_MAP[ca.type]?.ports.find((p) => p.id === w.a.p);
  const pb = cb && DEF_MAP[cb.type]?.ports.find((p) => p.id === w.b.p);
  return ca && cb && pa && pb ? [{ c: ca, p: pa }, { c: cb, p: pb }] : null;
}

const isLv = (e: End) => lvPorts(DEF_MAP[e.c.type]).some((p) => p.id === e.p.id);
const name = (e: End) => `${e.p.label} ของ ${e.c.label}`;

export function wireIssue(d: Design, w: Wire): Issue | null {
  const ee = ends(d, w);
  if (!ee) return null;
  const base = { comps: [ee[0].c.id, ee[1].c.id], wire: w.id };
  for (const [a, b] of [ee, [ee[1], ee[0]]] as [End, End][]) {
    const ka = a.p.kind;
    const kb = b.p.kind;
    if (LIVE.has(ka) && kb === 'N')
      return { id: `w:${w.id}`, sev: 'crit', msg: `ต่อสายไฟ (${name(a)}) เข้ากับนิวทรัล (${name(b)}) โดยตรง จะลัดวงจรทันทีที่มีไฟ`, fix: 'สาย L ต้องผ่านเบรกเกอร์หรือสวิตช์ไปที่ขั้ว L ของโหลด แล้ว N ของโหลดจึงกลับไปที่ N', ...base };
    if (LIVE.has(ka) && kb === 'PE')
      return { id: `w:${w.id}`, sev: 'crit', msg: `ต่อสายไฟ (${name(a)}) ลงดิน (${name(b)}) จะเกิดไฟรั่วลงดิน/ลัดวงจร`, fix: 'PE ใช้ต่อโครงโลหะของอุปกรณ์เท่านั้น ห้ามต่อกับสายที่มีไฟ', ...base };
    if (ka === 'DC+' && kb === 'DC-')
      return { id: `w:${w.id}`, sev: 'crit', msg: `ต่อ +24V (${name(a)}) เข้ากับ 0V (${name(b)}) โดยตรง จะลัดวงจร`, fix: 'ขั้ว + ต่อกับ + และขั้ว − ต่อกับ − ผ่านโหลดเสมอ', ...base };
    if (LIVE.has(ka) && isLv(b)) {
      if (AC_INPUT.has(DEF_MAP[a.c.type].beh))
        return { id: `w:${w.id}`, sev: 'warn', msg: `${name(b)} (24VDC) ต่อเข้าขั้ว ${a.p.label} ของ ${a.c.label} ซึ่งต้องการไฟ 230VAC — ${a.c.label} จะไม่ทำงาน`, fix: `${a.c.label} ต้องรับไฟจาก L/N ของแหล่งจ่าย AC หรือเบรกเกอร์`, ...base };
      return { id: `w:${w.id}`, sev: 'warn', msg: `${name(a)} เป็นสายไฟ AC แต่ต่อเข้าขั้ว ${b.p.label} ของ ${b.c.label} ซึ่งรับได้แค่ 24VDC — ถ้ามีไฟ ${b.c.label} จะพัง`, fix: 'ไฟเลี้ยงอุปกรณ์ 24V ต้องมาจาก PSU 24VDC (+V / 0V)', ...base };
    }
    if (ka === 'N' && (kb === 'DC+' || kb === 'DC-'))
      return { id: `w:${w.id}`, sev: 'warn', msg: `ต่อนิวทรัล (${name(a)}) เข้ากับวงจร 24VDC (${name(b)})`, fix: 'แยกวงจร AC และ DC ออกจากกัน ใช้ 0V ของ PSU เป็นขั้วกลับของวงจร 24V', ...base };
  }
  return null;
}

export function checkWiring(d: Design): Issue[] {
  const out: Issue[] = [];
  const wired = new Map<string, Set<string>>();
  for (const w of d.wires)
    for (const e of [w.a, w.b]) {
      if (!wired.has(e.c)) wired.set(e.c, new Set());
      wired.get(e.c)!.add(e.p);
    }

  const clone: Design = JSON.parse(JSON.stringify(d));
  const s = newSim();
  for (let i = 0; i < 15; i++) step(clone, s, 0.2);
  const damaged = new Set<string>();
  for (const c of d.comps) {
    const r = s.rt[c.id];
    if (!r) continue;
    if (r.damaged) {
      damaged.add(c.id);
      out.push({ id: `dmg:${c.id}`, sev: 'crit', msg: `${c.label} จะพังทันทีที่จ่ายไฟ — ${r.damaged}`, fix: 'ย้ายสายไฟ AC ออกจากขั้ว 24V แล้วเลี้ยงอุปกรณ์ด้วย PSU 24VDC', comps: [c.id] });
    }
    if (r.tripped && r.tripReason)
      out.push({ id: `trip:${c.id}`, sev: 'crit', msg: `${c.label} จะทริปทันทีที่จ่ายไฟ — ${r.tripReason}`, fix: 'หาจุดที่สาย L ชนกับ N/PE หรือ +24V ชนกับ 0V ในวงจรหลังอุปกรณ์ตัวนี้', comps: [c.id] });
    if (r.fault)
      out.push({ id: `flt:${c.id}`, sev: 'crit', msg: `${c.label} ลัดวงจรที่แหล่งจ่าย และไม่มีเบรกเกอร์ตัดวงจร`, fix: 'แก้จุดลัดวงจร และใส่เบรกเกอร์/ฟิวส์หลังแหล่งจ่าย', comps: [c.id] });
  }
  for (const a of Object.values(s.activeAlarms))
    if (a.id.startsWith('earth:')) out.push({ id: a.id, sev: 'crit', msg: a.msg, fix: 'ใส่ RCBO ในวงจรนั้น และแก้จุดที่สายไฟแตะดิน', comps: [a.id.slice(6).split('|')[0].split('~')[0]] });
  for (const id of unprotectedLoads(clone, s)) {
    const c = d.comps.find((x) => x.id === id)!;
    out.push({ id: `prot:${id}`, sev: 'warn', msg: `${c.label} รับไฟจากแหล่งจ่ายโดยไม่มีเบรกเกอร์หรือฟิวส์ป้องกัน`, fix: 'ใส่ MCB/MCCB ระหว่างแหล่งจ่ายกับอุปกรณ์ ขนาดตามกระแสโหลด', comps: [id] });
  }

  for (const w of d.wires) {
    const iss = wireIssue(d, w);
    if (iss && !(iss.sev === 'warn' && iss.comps.some((c) => damaged.has(c)))) out.push(iss);
  }

  for (const c of d.comps) {
    const df = DEF_MAP[c.type];
    if (!df || !df.ports.length) continue;
    const mine = wired.get(c.id);
    if (!mine) {
      out.push({ id: `free:${c.id}`, sev: 'info', msg: `${c.label} ยังไม่ได้ต่อสายเลย`, comps: [c.id] });
      continue;
    }
    const need = (SUPPLY_PORTS[df.beh] ?? []).filter((p) => df.ports.some((x) => x.id === p) && !mine.has(p));
    if (need.length) {
      const hint = portHint(c.type, need[0]);
      const labels = need.map((p) => df.ports.find((x) => x.id === p)!.label).join(', ');
      out.push({ id: `sup:${c.id}`, sev: 'warn', msg: `${c.label} ยังไม่ได้ต่อขั้วไฟเลี้ยง ${labels}`, fix: hint ? `ต่อกับ ${hint.to}` : undefined, comps: [c.id] });
    }
    if ((df.beh === 'motor3' || df.ports.some((p) => p.id === 'PE' && df.beh === 'load_ac')) && df.ports.some((p) => p.id === 'PE') && !mine.has('PE'))
      out.push({ id: `pe:${c.id}`, sev: 'warn', msg: `${c.label} ไม่มีสายดิน (PE) ถ้าไฟรั่วลงโครงจะเป็นอันตรายต่อคน`, fix: 'ต่อ PE ของอุปกรณ์กับ PE ของแหล่งจ่ายหรือบาร์กราวด์ในตู้', comps: [c.id] });
  }

  const rank = { crit: 0, warn: 1, info: 2 };
  return out.sort((a, b) => rank[a.sev] - rank[b.sev]);
}
