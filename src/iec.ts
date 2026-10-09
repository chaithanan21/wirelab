import type { Comp, CompDef } from './types';

// IEC 60617 graphical symbols, drawn in an 80×80 box, current flowing top → bottom.

const T = (x: number, y: number, s: string, size = 12, weight = 700) =>
  `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" text-anchor="middle" stroke="none" fill="currentColor" font-family="Arial,sans-serif">${s}</text>`;

const leads = (x: number, top = 28, bot = 54) => `<path d="M${x} 4V${top}M${x} 76V${bot}"/>`;
const blade = (x: number, dx = -13) => `<path d="M${x} ${54}L${x + dx} 29"/>`;
const mid = (x: number, dx = -13) => [x + dx / 2, 41.5] as const;

const no = (x = 40, dx = -13) => leads(x) + blade(x, dx);
const nc = (x = 40) => leads(x) + `<path d="M${x} 28h11M${x} 54L${x + 12} 27"/>`;
const cross = (x: number, y = 28) => `<path d="M${x - 4} ${y - 4}l8 8M${x + 4} ${y - 4}l-8 8"/>`;
const arc = (x: number) => `<path d="M${x - 4} 28a4 4 0 0 0 8 0"/>`;
const link = (x0: number, x1: number, y = 41.5) => `<path d="M${x0} ${y}H${x1}" stroke-dasharray="3 2.5"/>`;

const tilde = (x: number, y: number, w = 12) => `<path d="M${x - w / 2} ${y}c${w / 6}-${w / 3} ${w / 3}-${w / 3} ${w / 2} 0s${w / 3} ${w / 3} ${w / 2} 0"/>`;
const coil = (x: number, y = 28, w = 20, h = 24) => `<rect x="${x - w / 2}" y="${y}" width="${w}" height="${h}"/><path d="M${x} 4V${y}M${x} 76V${y + h}"/>`;
const converter = (a: string, b: string) => `<rect x="10" y="10" width="60" height="60"/><path d="M10 70L70 10"/>${a}${b}`;
const lampX = (cx: number, cy: number, r: number) => {
  const d = r * 0.707;
  return `<circle cx="${cx}" cy="${cy}" r="${r}"/><path d="M${cx - d} ${cy - d}l${2 * d} ${2 * d}M${cx + d} ${cy - d}l-${2 * d} ${2 * d}"/>`;
};

const COLOR_CODE: Record<string, string> = { red: 'RD', green: 'GN', yellow: 'YE', blue: 'BU', white: 'WH', black: 'BK' };

type Fn = (c: Comp | undefined, df: CompDef) => string;

const SYM: Record<string, Fn> = {
  src_ac: () => `<circle cx="40" cy="40" r="24"/>${tilde(40, 42, 20)}`,
  src_ac3: () => `<circle cx="40" cy="40" r="24"/>${T(40, 37, '3', 13)}${tilde(40, 50, 18)}`,
  src_mv: (c) => `<circle cx="40" cy="40" r="24"/>${tilde(40, 36, 18)}${T(40, 56, `${c?.props.kv ?? 22}kV`, 10)}`,
  src_gen: () => `<circle cx="40" cy="40" r="24"/>${T(40, 41, 'G', 16)}${tilde(40, 52, 14)}`,
  src_dc: () => `<path d="M40 4V30M24 30h32M40 58V76M24 46h32"/><path d="M32 38h16M32 54h16" stroke-width="4"/>${T(64, 30, '+', 14)}`,
  psu: () => converter(tilde(25, 26), '<path d="M48 54h14M48 60h14"/>'),
  ups: () => converter(tilde(25, 26), tilde(55, 58)) + T(56, 32, 'UPS', 9),
  vfd: () => converter(T(25, 30, 'f1', 13), T(55, 62, 'f2', 13)),
  ats: () =>
    `<path d="M28 4V28M52 4V28M40 76V54M40 54L29 30M52 28h-8"/>${link(10, 34)}<rect x="0" y="34" width="14" height="15"/>${T(7, 46, 'M', 11)}`,
  swg: () =>
    `${leads(40, 28, 54)}${blade(40)}${cross(40)}<path d="M34 12l6-5 6 5M34 16l6-5 6 5M34 64l6 5 6-5M34 68l6 5 6-5"/>`,
  tr: () => `<circle cx="40" cy="28" r="16"/><circle cx="40" cy="52" r="16"/><path d="M40 4V12M40 68V76"/>${T(40, 25, 'Δ', 11)}${T(40, 60, 'Y', 11)}`,
  mdb: () =>
    `<path d="M40 4V22"/><path d="M8 22H72" stroke-width="4"/><path d="M16 22V76M40 22V76M64 22V76"/>${cross(16, 46)}${cross(40, 46)}${cross(64, 46)}`,
  breaker: () => no() + cross(40),
  breaker3: () => [22, 40, 58].map((x) => leads(x) + blade(x, -10) + cross(x)).join('') + link(12, 54),
  rcbo: () => no() + cross(40) + `<ellipse cx="40" cy="64" rx="11" ry="4"/>${link(51, 58, 64)}${T(66, 68, 'IΔ', 11)}`,
  fuse: () => `<rect x="30" y="18" width="20" height="44"/><path d="M40 4V76"/>`,
  spd: () =>
    `<rect x="28" y="16" width="24" height="38"/><path d="M40 4V16M40 54V64M24 60L52 14h-6M26 64h28M31 70h18M36 76h8"/>`,
  sw_no: () => no() + link(14, mid(40)[0]) + '<path d="M14 35v13"/>',
  pb: (c) =>
    (c?.props.nc ? nc() + link(14, 46) : no() + link(14, mid(40)[0])) + '<path d="M19 34h-6v15h6"/>',
  estop: () => nc() + link(18, 46) + '<path d="M18 32v19a9.5 9.5 0 0 1 0-19z"/>',
  selector: () => no() + link(18, mid(40)[0]) + '<path d="M22 34h-4v15h-4"/>',
  limit: () => no() + link(18, mid(40)[0]) + '<path d="M18 35l-8 6.5 8 6.5z"/>',
  float: () => no() + link(20, mid(40)[0]) + '<circle cx="13" cy="41.5" r="7"/><path d="M2 52h22" stroke-dasharray="4 2"/>',
  relay: () => coil(20) + no(58, -12) + link(30, 52),
  contactor: () => coil(14, 28, 18, 24) + [38, 54, 70].map((x) => no(x, -9) + arc(x)).join('') + link(23, 65.5),
  timer: () =>
    coil(20) + '<rect x="4" y="28" width="6" height="24"/><path d="M4 28l6 24M10 28l-6 24"/>' + no(58, -12) + link(30, 52) + '<path d="M47 36a5 5 0 0 1 9 4"/>',
  overload: () => `<path d="M40 4V30H52V50H40V76"/><rect x="26" y="20" width="36" height="40" stroke-dasharray="3 2.5"/>`,
  tempctl: () => `<rect x="12" y="14" width="56" height="52"/>${T(40, 48, 'θ', 24, 400)}`,
  plc: (_c, df) => `<rect x="10" y="12" width="60" height="56"/>${T(40, 38, df.beh === 'rio' ? 'I/O' : df.beh === 'edge' ? 'EDGE' : 'PLC', 13)}<path d="M10 50h60" />${T(25, 63, 'I', 10, 400)}${T(55, 63, 'Q', 10, 400)}<path d="M40 50v18"/>`,
  net: (_c, df) => {
    const lbl = df.beh === 'router' ? 'RTR' : df.beh === 'gateway' ? 'GW' : df.beh === 'lora_gw' ? 'LoRa' : 'SW';
    return `<rect x="8" y="18" width="64" height="44"/><path d="M18 30h44l-6-5M62 50H18l6 5"/>${T(40, 45, lbl, 11)}`;
  },
  isa: (c, df) => {
    const num = (c?.label.match(/\d+/) ?? [''])[0];
    return `<circle cx="40" cy="40" r="24"/>${T(40, 38, df.tag ?? 'XT', 13)}${T(40, 54, num, 11, 400)}`;
  },
  wireless: (c, df) => SYM.isa(c, df) + '<path d="M62 18a8 8 0 0 1 8 8M62 10a16 16 0 0 1 16 16"/>',
  prox: () => `<rect x="16" y="16" width="48" height="48"/><path d="M40 22L58 40L40 58L22 40Z"/><rect x="34" y="34" width="12" height="12" fill="currentColor"/>`,
  meter: () => `<rect x="12" y="14" width="56" height="52"/><path d="M12 28h56"/>${T(40, 54, 'kWh', 14)}`,
  pmeter: (c) => `<circle cx="40" cy="40" r="24"/>${T(40, 45, String(c?.props.unit ?? 'V').slice(0, 4) || 'V', 13)}`,
  lamp: (c, df) => lampX(40, 40, 18) + (df.beh === 'load_dc' && c ? T(68, 72, COLOR_CODE[c.props.color] ?? '', 10) : ''),
  motor1: (_c, df) => `<circle cx="40" cy="40" r="24"/>${T(40, 41, 'M', 17)}${df.beh === 'load_dc' ? '<path d="M32 50h16M32 55h16" stroke-dasharray="4 2"/>' : tilde(40, 53, 14)}`,
  motor3: () => `<circle cx="40" cy="40" r="24"/>${T(40, 41, 'M', 17)}${T(40, 57, '3~', 11)}`,
  pump: () => `<circle cx="40" cy="40" r="24"/>${T(40, 41, 'M', 17)}${T(40, 57, '3~', 11)}`,
  heater: () => `<rect x="14" y="28" width="52" height="24"/><path d="M24 50l8-20M36 50l8-20M48 50l8-20M40 4V28M40 52V76"/>`,
  socket: () => `<path d="M20 34a20 20 0 0 0 40 0M20 26h40M40 54V76"/>`,
  buzzer: () => `<path d="M22 44a18 18 0 0 1 36 0z"/><path d="M32 44V76M48 44V76"/>`,
  valve: () => `<rect x="6" y="30" width="18" height="20"/><path d="M6 50L24 30M24 40h10M34 28v24l36-24v24z"/>`,
  tower: () => ['RD', 'YE', 'GN'].map((k, i) => lampX(34, 16 + i * 24, 9) + T(58, 20 + i * 24, k, 9)).join(''),
  display: () => `<rect x="10" y="14" width="60" height="40"/><rect x="16" y="20" width="48" height="28"/><path d="M40 54v10M26 66h28"/>`,
  cloud: () => `<path d="M22 58h38a12 12 0 0 0 0-24 16 16 0 0 0-30-4 12 12 0 0 0-8 28z"/>`,
  tb: (_c, df) => {
    const n = Math.min(5, Math.max(2, df.ports.filter((p) => p.side === 'r' || p.side === 'b').length));
    const step = 60 / (n - 1);
    return Array.from({ length: n }, (_, i) => `<circle cx="${10 + i * step}" cy="40" r="5"/><path d="M${10 + i * step} 20v15M${10 + i * step} 45v15"/>`).join('');
  },
};

export const NAMES: Record<string, string> = {
  src_ac: 'AC source 1~ / แหล่งจ่ายไฟ 1 เฟส',
  src_ac3: 'AC source 3~ / แหล่งจ่ายไฟ 3 เฟส',
  src_mv: 'MV supply / ไฟแรงสูง',
  src_gen: 'Generator / เครื่องกำเนิดไฟฟ้า',
  src_dc: 'Battery / แบตเตอรี่',
  psu: 'AC/DC converter / พาวเวอร์ซัพพลาย',
  ups: 'UPS / เครื่องสำรองไฟ',
  vfd: 'Frequency converter / อินเวอร์เตอร์',
  ats: 'Change-over switch / ATS',
  swg: 'MV circuit breaker, withdrawable',
  tr: 'Transformer Δ/Y / หม้อแปลง',
  mdb: 'Distribution board / ตู้ MDB',
  breaker: 'Circuit breaker / เบรกเกอร์',
  breaker3: 'Circuit breaker 3P / เบรกเกอร์ 3 โพล',
  rcbo: 'RCBO, residual current / กันดูด',
  fuse: 'Fuse / ฟิวส์',
  spd: 'Surge arrester / กันฟ้าผ่า',
  sw_no: 'Switch, manual / สวิตช์',
  pb: 'Push-button NO/NC / ปุ่มกด',
  estop: 'Emergency stop / ปุ่มหยุดฉุกเฉิน',
  selector: 'Selector, turn / สวิตช์เลือก',
  limit: 'Position switch / ลิมิตสวิตช์',
  float: 'Float switch / ลูกลอย',
  relay: 'Relay coil + contact / รีเลย์',
  contactor: 'Contactor 3P / แมกเนติก',
  timer: 'On-delay relay / ไทม์เมอร์',
  overload: 'Thermal overload / โอเวอร์โหลด',
  tempctl: 'Temperature controller',
  plc: 'Programmable controller / PLC',
  net: 'Network device / อุปกรณ์เครือข่าย',
  isa: 'Instrument (ISA 5.1) / เครื่องวัด',
  wireless: 'Wireless instrument',
  prox: 'Proximity sensor / พร็อกซิมิตี้',
  meter: 'Energy meter / มิเตอร์ไฟ',
  pmeter: 'Indicating instrument / มิเตอร์แสดงค่า',
  lamp: 'Lamp / หลอดไฟ',
  motor1: 'Motor 1~ / มอเตอร์',
  motor3: 'Motor 3~ / มอเตอร์ 3 เฟส',
  pump: 'Pump motor 3~ / ปั๊ม',
  heater: 'Heating element / ฮีตเตอร์',
  socket: 'Socket outlet + PE / เต้ารับ',
  buzzer: 'Buzzer / ออด',
  valve: 'Solenoid valve / โซลินอยด์วาล์ว',
  tower: 'Signal tower / ไฟสัญญาณ',
  display: 'Display, HMI / จอแสดงผล',
  cloud: 'Cloud service',
  tb: 'Terminals / เทอร์มินัล',
};

export function symbolKey(c: Comp | undefined, df: CompDef): string {
  if (df.beh === 'pb') return 'pb';
  if (df.symbol in SYM) return df.symbol;
  return '';
}

export function iecSymbol(c: Comp | undefined, df: CompDef): string {
  const k = symbolKey(c, df);
  return k ? SYM[k](c, df) : `<rect x="12" y="20" width="56" height="40"/>${T(40, 45, df.short.slice(0, 8), 10)}`;
}

// IEC 81346-2 letter codes
const LETTER_BY_BEH: Partial<Record<CompDef['beh'], string>> = {
  grid1: 'G', grid3: 'G', gridmv: 'G', gen: 'G', battery: 'G',
  psu: 'T', ups: 'T', tr: 'T', vfd: 'T',
  ats: 'Q', swg: 'Q', breaker: 'Q', rcbo: 'Q', contactor: 'Q',
  fuse: 'F', passive: 'F', overload: 'F',
  switch: 'S', pb: 'S', estop: 'S', selector: 'S',
  relay: 'K', timer: 'K', tempctl: 'K', plc: 'K', rio: 'K', edge: 'K',
  eswitch: 'K', router: 'K', gateway: 'K', lora_gw: 'K',
  sensor_a: 'B', sensor_d: 'B', contact_sw: 'B', sensor_485: 'B', sensor_lora: 'B', emeter: 'P',
  motor3: 'M', load_dc: 'P', tower: 'P', load_ac: 'E',
  hmi: 'P', scada: 'P', monitor: 'P', pmeter: 'P', led: 'P', cloud: 'A',
  mdb: 'A', tb: 'X',
};
const LETTER_BY_TYPE: Record<string, string> = { fan1: 'M', aircon: 'E', socket: 'X', dcfan: 'M', valve: 'M', buzzer: 'P' };

export function letterCode(df: CompDef | undefined): string {
  if (!df) return 'A';
  return LETTER_BY_TYPE[df.type] ?? LETTER_BY_BEH[df.beh] ?? 'A';
}

// IEC 60445 (power) and IEC 60204-1 (control) conductor colours
export interface WireStyle {
  key: string;
  label: string;
  color: string;
  stripe?: string;
  ticks?: number;
}

export const WIRE_STYLES: Record<string, WireStyle> = {
  L: { key: 'L', label: 'L — brown / น้ำตาล', color: '#8b4513' },
  L2: { key: 'L2', label: 'L2 — black / ดำ', color: '#1a1a1a' },
  L3: { key: 'L3', label: 'L3 — grey / เทา', color: '#8a8a8a' },
  N: { key: 'N', label: 'N — blue / ฟ้า', color: '#1f6fd1' },
  PE: { key: 'PE', label: 'PE — green-yellow / เขียวเหลือง', color: '#2e9b3a', stripe: '#e8c400' },
  P3: { key: 'P3', label: '3~ L1-L2-L3 (///) — power', color: '#1a1a1a', ticks: 3 },
  MV: { key: 'MV', label: 'MV 22 kV — power', color: '#7a1f1f', ticks: 3 },
  DC: { key: 'DC', label: 'DC control — dark blue / น้ำเงิน', color: '#1e3a8a' },
  SIG: { key: 'SIG', label: 'Analog 4-20 mA — white / ขาว (shielded)', color: '#6b7280' },
  NET: { key: 'NET', label: 'Network / สื่อสาร (dashed)', color: '#2b3c4a' },
};
