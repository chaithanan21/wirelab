import type { Behavior, CompDef, PortDef, PortKind, PropDef } from './types';

type P = [string, string, PortKind];

interface DefIn {
  type: string;
  cat: string;
  name: string;
  short: string;
  icon: string;
  symbol: string;
  beh: Behavior;
  brands: [string, string][];
  l?: P[];
  r?: P[];
  t?: P[];
  b?: P[];
  w?: number;
  h?: number;
  props?: Record<string, any>;
  pd?: PropDef[];
  links?: Record<string, [string, string][]>;
  desc: string;
  tag?: string;
}

const up20 = (v: number) => Math.ceil(v / 20) * 20;

function def(o: DefIn): CompDef {
  const nl = o.l?.length ?? 0;
  const nr = o.r?.length ?? 0;
  const nt = o.t?.length ?? 0;
  const nb = o.b?.length ?? 0;
  const w = up20(Math.max(o.w ?? 140, 40 + Math.max(nt, nb) * 30));
  const h = up20(Math.max(o.h ?? 80, 40 + Math.max(nl, nr) * 20));
  const ports: PortDef[] = [];
  o.l?.forEach((p, i) => ports.push({ id: p[0], label: p[1], kind: p[2], side: 'l', x: 0, y: 40 + i * 20 }));
  o.r?.forEach((p, i) => ports.push({ id: p[0], label: p[1], kind: p[2], side: 'r', x: w, y: 40 + i * 20 }));
  const hx = (n: number) => Math.round((w - (n - 1) * 30) / 2 / 10) * 10;
  o.t?.forEach((p, i) => ports.push({ id: p[0], label: p[1], kind: p[2], side: 't', x: hx(nt) + i * 30, y: 0 }));
  o.b?.forEach((p, i) => ports.push({ id: p[0], label: p[1], kind: p[2], side: 'b', x: hx(nb) + i * 30, y: h }));
  return {
    type: o.type,
    category: o.cat,
    name: o.name,
    short: o.short,
    icon: o.icon,
    symbol: o.symbol,
    beh: o.beh,
    w,
    h,
    ports,
    brands: o.brands.map(([brand, model]) => ({ brand, model })),
    props: o.props ?? {},
    propDefs: o.pd ?? [],
    links: o.links ?? {},
    desc: o.desc,
    tag: o.tag,
  };
}

export const CATEGORIES = [
  { id: 'power', name: 'แหล่งจ่ายไฟ', en: 'Power Sources' },
  { id: 'mv', name: 'ระบบไฟฟ้าโรงงาน', en: 'Switchgear & MDB' },
  { id: 'protect', name: 'อุปกรณ์ป้องกัน', en: 'Protection' },
  { id: 'control', name: 'สวิตช์ & ควบคุม', en: 'Switching & Control' },
  { id: 'sensor', name: 'เซนเซอร์ภาคสนาม', en: 'Field Sensors' },
  { id: 'ctrl', name: 'คอนโทรลเลอร์ / PLC', en: 'Controllers' },
  { id: 'net', name: 'เครือข่ายสื่อสาร', en: 'Network & Comm' },
  { id: 'load', name: 'โหลด & แอคชูเอเตอร์', en: 'Loads & Actuators' },
  { id: 'display', name: 'จอแสดงผล & HMI', en: 'Display & Monitoring' },
  { id: 'wiring', name: 'อุปกรณ์เดินสาย', en: 'Wiring Accessories' },
];

export const BRAND_COLORS: Record<string, string> = {
  'Schneider Electric': '#3dcd58',
  Siemens: '#009999',
  ABB: '#ff000f',
  Omron: '#005eb8',
  'Mitsubishi Electric': '#e60012',
  'Allen-Bradley': '#c8102e',
  'Phoenix Contact': '#0097d6',
  'Weidmüller': '#f39200',
  WAGO: '#6ec800',
  Eaton: '#0050a0',
  Hager: '#2c4f9e',
  'LS Electric': '#00a0e9',
  Chint: '#003f8a',
  'Mean Well': '#1d4f91',
  PULS: '#76b82a',
  Delta: '#0066b3',
  Autonics: '#e4002b',
  IDEC: '#1f3d7a',
  Fuji: '#c8102e',
  'Fuji Electric': '#c8102e',
  Finder: '#008bd2',
  'Endress+Hauser': '#007ab3',
  Rosemount: '#004b8d',
  Emerson: '#004b8d',
  Yokogawa: '#003a8c',
  WIKA: '#00508f',
  Krohne: '#00539f',
  VEGA: '#1a7dc4',
  Vaisala: '#0072ce',
  Honeywell: '#e2231a',
  'Dräger': '#004b8d',
  Hach: '#0070c0',
  'Mettler Toledo': '#0055a5',
  IFM: '#f28c00',
  Sick: '#007cc1',
  Keyence: '#e60012',
  Banner: '#ffcc00',
  'Pepperl+Fuchs': '#0060a8',
  Balluff: '#e2001a',
  Turck: '#f6a800',
  Panasonic: '#0041c0',
  Moxa: '#00a3a1',
  Cisco: '#049fd9',
  Hirschmann: '#ec6608',
  Advantech: '#004ea2',
  Teltonika: '#0054a6',
  MikroTik: '#293239',
  Milesight: '#00a0e9',
  Dragino: '#2f9e44',
  Weintek: '#e60012',
  'Pro-face': '#003e7e',
  Samsung: '#1428a0',
  LG: '#a50034',
  Dell: '#007db8',
  Philips: '#0b5ed7',
  Daikin: '#00a0e4',
  Grundfos: '#003a70',
  KSB: '#003a70',
  WEG: '#00579d',
  Danfoss: '#e2000f',
  Yaskawa: '#003e7e',
  Festo: '#0091dc',
  SMC: '#004b93',
  Patlite: '#d7000f',
  Werma: '#e30613',
  APC: '#000000',
  Cummins: '#c8102e',
  Caterpillar: '#ffcd11',
  Socomec: '#e30613',
  Raspberry: '#c51a4a',
  Espressif: '#e7352c',
  Arduino: '#00979d',
  'AWS IoT': '#ff9900',
  'Microsoft Azure': '#0078d4',
  ThingsBoard: '#305680',
  'Node-RED': '#8f0000',
  Grafana: '#f46800',
  PEA: '#6a1b9a',
  MEA: '#f57c00',
};

const sensorProps: PropDef[] = [
  { key: 'mode', label: 'โหมดข้อมูล', type: 'select', options: ['process', 'wave', 'manual'] },
  { key: 'manual', label: 'ค่าตั้งเอง (manual)', type: 'number' },
  { key: 'min', label: 'Range Min', type: 'number' },
  { key: 'max', label: 'Range Max', type: 'number' },
  { key: 'unit', label: 'หน่วย', type: 'text' },
  { key: 'hi', label: 'Alarm High', type: 'number' },
  { key: 'lo', label: 'Alarm Low', type: 'number' },
  { key: 'period', label: 'คาบคลื่น (s)', type: 'number', min: 2 },
];

const SENSOR_PORTS = {
  l: [['P', '+24V', 'DC+'], ['M', '0V', 'DC-']] as P[],
  r: [['OUT', '4-20mA', 'AI']] as P[],
};

const sensorA = (
  type: string,
  name: string,
  short: string,
  tag: string,
  quantity: string,
  min: number,
  max: number,
  unit: string,
  hi: number,
  lo: number,
  mode: string,
  brands: [string, string][],
  desc: string,
) =>
  def({
    type,
    cat: 'sensor',
    name,
    short,
    icon: 'sensor',
    symbol: 'isa',
    beh: 'sensor_a',
    tag,
    brands,
    ...SENSOR_PORTS,
    w: 160,
    props: { quantity, min, max, unit, hi, lo, mode, manual: (min + max) / 2, period: 30 },
    pd: sensorProps,
    desc,
  });

const digitalSensorProps: PropDef[] = [
  { key: 'mode', label: 'โหมดตรวจจับ', type: 'select', options: ['auto', 'manual', 'process'] },
  { key: 'detect', label: 'ตรวจจับ (manual)', type: 'bool' },
  { key: 'period', label: 'คาบ auto (s)', type: 'number', min: 1 },
  { key: 'sp', label: 'Level setpoint (process)', type: 'number' },
];

const sensorD = (type: string, name: string, short: string, tag: string, brands: [string, string][], desc: string, mode = 'auto') =>
  def({
    type,
    cat: 'sensor',
    name,
    short,
    icon: 'eye',
    symbol: 'prox',
    beh: 'sensor_d',
    tag,
    brands,
    l: [['P', '+24V', 'DC+'], ['M', '0V', 'DC-']],
    r: [['OUT', 'PNP', 'X']],
    links: { det: [['P', 'OUT']] },
    props: { mode, detect: false, period: 4, sp: 4 },
    pd: digitalSensorProps,
    desc,
  });

const PLC_MODES = [
  'OFF', 'ON', 'DI1', 'DI2', 'DI3', 'DI4', 'NOT DI1', 'NOT DI2',
  'AI1>SP', 'AI1<SP', 'AI2>SP', 'AI2<SP', 'AI3>SP', 'AI3<SP', 'AI4>SP', 'AI4<SP',
  'START DI1 / STOP DI2', 'BLINK', 'HMI CMD', 'ANY ALARM',
];
export { PLC_MODES };

const plcPd: PropDef[] = [1, 2, 3, 4].flatMap((i) => [
  { key: `do${i}_mode`, label: `DO${i} ลอจิก`, type: 'select' as const, options: PLC_MODES },
  { key: `do${i}_sp`, label: `DO${i} Setpoint`, type: 'number' as const },
]);

const loadAcPd: PropDef[] = [
  { key: 'power', label: 'กำลังไฟ', type: 'number', unit: 'W', min: 0 },
  { key: 'process', label: 'ผลต่อกระบวนการ', type: 'select', options: ['none', 'heat', 'cool'] },
];

export const DEFS: CompDef[] = [
  // ───────────── POWER ─────────────
  def({
    type: 'grid1', cat: 'power', name: 'Utility Grid 1φ 230V', short: 'GRID 1φ', icon: 'grid', symbol: 'src_ac', beh: 'grid1',
    brands: [['PEA', 'การไฟฟ้าส่วนภูมิภาค 1φ 230V 50Hz'], ['MEA', 'การไฟฟ้านครหลวง 1φ 230V 50Hz']],
    r: [['L', 'L', 'L'], ['N', 'N', 'N'], ['PE', 'PE', 'PE']],
    props: { on: true, voltage: 230 },
    pd: [{ key: 'on', label: 'มีไฟจ่าย (ไม่มีไฟดับ)', type: 'bool' }],
    desc: 'แหล่งจ่ายไฟการไฟฟ้า 1 เฟส 230V — คลิกปุ่มเพื่อจำลองไฟดับ',
  }),
  def({
    type: 'grid3', cat: 'power', name: 'Utility Grid 3φ 400V', short: 'GRID 3φ', icon: 'grid', symbol: 'src_ac3', beh: 'grid3',
    brands: [['PEA', 'การไฟฟ้าส่วนภูมิภาค 3φ 400/230V'], ['MEA', 'การไฟฟ้านครหลวง 3φ 400/230V']],
    r: [['P3', 'L1-L3', 'P3'], ['L1', 'L1', 'L'], ['N', 'N', 'N'], ['PE', 'PE', 'PE']],
    props: { on: true, voltage: 400 },
    pd: [{ key: 'on', label: 'มีไฟจ่าย (ไม่มีไฟดับ)', type: 'bool' }],
    desc: 'แหล่งจ่าย 3 เฟส 400V พร้อมจุดต่อ L1-N สำหรับวงจร 230V',
  }),
  def({
    type: 'gen', cat: 'power', name: 'Diesel Generator 3φ', short: 'GENSET', icon: 'gen', symbol: 'src_gen', beh: 'gen',
    brands: [['Cummins', 'C110D5 110kVA'], ['Caterpillar', 'DE110E2 110kVA'], ['Kohler', 'KD110'], ['Denyo', 'DCA-100ESK'], ['Perkins', '1104A-44TG2']],
    r: [['P3', 'L1-L3', 'P3'], ['L1', 'L1', 'L'], ['N', 'N', 'N'], ['PE', 'PE', 'PE']],
    props: { on: false, auto: true, kva: 110, startDelay: 4 },
    pd: [
      { key: 'on', label: 'สั่งสตาร์ท (Manual)', type: 'bool' },
      { key: 'auto', label: 'Auto start เมื่อ ATS ขาดไฟหลัก', type: 'bool' },
      { key: 'kva', label: 'พิกัด', type: 'number', unit: 'kVA' },
      { key: 'startDelay', label: 'เวลาสตาร์ท', type: 'number', unit: 's' },
    ],
    desc: 'เครื่องกำเนิดไฟฟ้าสำรอง ใช้ร่วมกับ ATS',
  }),
  def({
    type: 'battery', cat: 'power', name: 'Battery 24VDC', short: 'BATT 24V', icon: 'battery', symbol: 'src_dc', beh: 'battery',
    brands: [['Yuasa', 'NP7-12 x2'], ['Panasonic', 'LC-R127R2 x2'], ['CSB', 'GP1272 x2'], ['Leoch', 'LP12-7 x2']],
    r: [['P', '+', 'DC+'], ['M', '−', 'DC-']],
    props: { voltage: 24, ah: 7 },
    pd: [{ key: 'ah', label: 'ความจุ', type: 'number', unit: 'Ah' }],
    desc: 'แบตเตอรี่ตะกั่วกรด 24VDC',
  }),
  def({
    type: 'psu24', cat: 'power', name: 'Power Supply 24VDC', short: 'PSU 24V', icon: 'psu', symbol: 'psu', beh: 'psu',
    brands: [
      ['Mean Well', 'NDR-240-24 (10A)'], ['Phoenix Contact', 'QUINT4-PS/1AC/24DC/10'], ['Siemens', 'SITOP PSU6200 10A'],
      ['Omron', 'S8VK-G24024'], ['Weidmüller', 'PRO ECO 240W 24V'], ['PULS', 'CP10.241'], ['Schneider Electric', 'ABL8RPS24100'], ['Delta', 'DRP024V240W1AA'],
    ],
    l: [['L', 'L', 'L'], ['N', 'N', 'N']],
    r: [['P', '+V', 'DC+'], ['M', '−V', 'DC-']],
    props: { voltage: 24, ratedW: 240 },
    pd: [{ key: 'ratedW', label: 'พิกัดกำลัง', type: 'number', unit: 'W' }],
    desc: 'แปลงไฟ AC 230V เป็น 24VDC สำหรับวงจรควบคุม เซนเซอร์ และ PLC',
  }),
  def({
    type: 'ups', cat: 'power', name: 'UPS 1φ Online', short: 'UPS', icon: 'battery', symbol: 'ups', beh: 'ups',
    brands: [['APC', 'Smart-UPS SRT1000XLI'], ['Eaton', '9SX 1000i'], ['Delta', 'Amplon RT-1K'], ['CyberPower', 'OLS1000EA'], ['Vertiv', 'Liebert GXT5-1000']],
    l: [['L', 'L in', 'L'], ['N', 'N in', 'N']],
    r: [['OL', 'L out', 'L'], ['ON', 'N out', 'N']],
    w: 150,
    props: { va: 1000, backupMin: 10 },
    pd: [
      { key: 'va', label: 'พิกัด', type: 'number', unit: 'VA' },
      { key: 'backupMin', label: 'สำรองไฟ (เวลาจำลอง)', type: 'number', unit: 'นาที' },
    ],
    desc: 'จ่ายไฟต่อเนื่องเมื่อไฟดับ ด้วยแบตเตอรี่ภายใน',
  }),
  def({
    type: 'ats', cat: 'power', name: 'Automatic Transfer Switch', short: 'ATS', icon: 'ats', symbol: 'ats', beh: 'ats',
    brands: [['Socomec', 'ATyS p M 125A'], ['Schneider Electric', 'TransferPacT TA'], ['ABB', 'TruONE OXB'], ['Eaton', 'ATC-300+'], ['Chint', 'NXZ-125']],
    l: [['I1', 'Normal', 'P3'], ['I2', 'Emerg.', 'P3']],
    r: [['O', 'Load', 'P3']],
    w: 150,
    desc: 'สลับแหล่งจ่ายอัตโนมัติ Grid ↔ Generator',
  }),

  // ───────────── FACTORY MV / MDB ─────────────
  def({
    type: 'grid22', cat: 'mv', name: 'การไฟฟ้า 22kV', short: 'PEA 22kV', icon: 'grid', symbol: 'src_mv', beh: 'gridmv',
    brands: [['PEA', 'สายป้อน 22kV 50Hz'], ['MEA', 'สายป้อน 24kV 50Hz']],
    r: [['MV', '22kV', 'MV'], ['PE', 'PE', 'PE']],
    props: { on: true, kv: 22 },
    pd: [{ key: 'on', label: 'มีไฟจ่ายจากการไฟฟ้า', type: 'bool' }],
    desc: 'แหล่งจ่ายแรงกลางจากการไฟฟ้า ก่อนเข้าสวิตช์เกียร์ของโรงงาน',
  }),
  def({
    type: 'swg', cat: 'mv', name: 'MV Switchgear 22kV', short: 'SWITCHGEAR', icon: 'swg', symbol: 'swg', beh: 'swg',
    brands: [
      ['ABB', 'UniGear ZS1 22kV'], ['Schneider Electric', 'SM6 24kV'], ['Siemens', '8DJH 24kV'],
      ['Eaton', 'Power Xpert UX'], ['LS Electric', 'Susol MV'],
    ],
    l: [['IN', 'IN', 'MV']],
    r: [['OUT', 'OUT', 'MV']],
    w: 160, h: 110,
    props: { on: true, rating: 630, kv: 22 },
    pd: [
      { key: 'on', label: 'VCB ON', type: 'bool' },
      { key: 'rating', label: 'พิกัด VCB', type: 'number', unit: 'A' },
      { key: 'kv', label: 'แรงดัน', type: 'number', unit: 'kV' },
    ],
    desc: 'ตู้สวิตช์เกียร์แรงกลาง มีเบรกเกอร์สุญญากาศคั่นระหว่างการไฟฟ้ากับหม้อแปลง คลิกเพื่อเปิด-ปิดหรือรีเซ็ตเมื่อทริป',
  }),
  def({
    type: 'tr', cat: 'mv', name: 'Transformer 22kV/400V', short: 'TR', icon: 'tr', symbol: 'tr', beh: 'tr',
    brands: [
      ['หม้อแปลงไทย', 'Oil 1000kVA 22/0.4kV'], ['เจริญชัย', 'Oil 1600kVA Dyn11'], ['เอกรัฐ', 'Oil 800kVA'],
      ['ABB', 'Resibloc 1000kVA'], ['Siemens', 'GEAFOL 1000kVA'], ['Schneider Electric', 'Trihal 1000kVA'],
    ],
    l: [['HV', 'HV', 'MV']],
    r: [['LV', 'LV', 'P3'], ['L', 'L', 'L'], ['N', 'N', 'N'], ['PE', 'PE', 'PE']],
    w: 170,
    props: { kva: 1000, pri: 22, sec: 400 },
    pd: [
      { key: 'kva', label: 'พิกัด', type: 'number', unit: 'kVA' },
      { key: 'pri', label: 'แรงดันด้าน HV', type: 'number', unit: 'kV' },
      { key: 'sec', label: 'แรงดันด้าน LV', type: 'number', unit: 'V' },
    ],
    desc: 'หม้อแปลงจำหน่าย แปลง 22kV เป็น 400/230V แยกวงจรแรงกลางออกจากแรงต่ำ',
  }),
  def({
    type: 'mdb', cat: 'mv', name: 'Main Distribution Board', short: 'MDB', icon: 'mdb', symbol: 'mdb', beh: 'mdb',
    brands: [
      ['Schneider Electric', 'PrismaSeT P 1600A'], ['ABB', 'System pro E power'], ['Siemens', 'ALPHA 3200'],
      ['LS Electric', 'Susol MDB'], ['Eaton', 'xEnergy'],
    ],
    l: [['IN', 'MAIN', 'P3'], ['Lin', 'L in', 'L'], ['N', 'N', 'N'], ['PE', 'PE', 'PE']],
    r: [['F1', 'F1', 'P3'], ['F2', 'F2', 'P3'], ['F3', 'F3', 'P3'], ['F4', 'F4', 'P3'], ['L', 'L', 'L']],
    w: 200,
    props: { on: true, rating: 1600, f1: true, f2: true, f3: true, f4: true },
    pd: [
      { key: 'on', label: 'เมนเบรกเกอร์', type: 'bool' },
      { key: 'rating', label: 'พิกัดเมน', type: 'number', unit: 'A' },
      { key: 'f1', label: 'ฟีดเดอร์ F1', type: 'bool' },
      { key: 'f2', label: 'ฟีดเดอร์ F2', type: 'bool' },
      { key: 'f3', label: 'ฟีดเดอร์ F3', type: 'bool' },
      { key: 'f4', label: 'ฟีดเดอร์ F4', type: 'bool' },
    ],
    desc: 'ตู้เมนแรงต่ำ รับไฟจากหม้อแปลง แล้วแยก 3 เฟสออก 4 ฟีดเดอร์ พร้อมแท็ป 230V สำหรับวงจรควบคุม',
  }),

  // ───────────── PROTECTION ─────────────
  def({
    type: 'mcb1', cat: 'protect', name: 'MCB 1P', short: 'MCB 1P', icon: 'breaker', symbol: 'breaker', beh: 'breaker',
    brands: [
      ['Schneider Electric', 'Acti9 iC60N 1P C16'], ['ABB', 'S201-C16'], ['Siemens', '5SL6116-7'], ['Eaton', 'FAZ-C16/1'],
      ['Hager', 'MCN116'], ['LS Electric', 'BKN 1P C16'], ['Mitsubishi Electric', 'BH-D6 1P C16'], ['Chint', 'NXB-63 1P C16'],
    ],
    l: [['in', 'IN', 'X']], r: [['out', 'OUT', 'X']],
    links: { main: [['in', 'out']] },
    props: { on: true, rating: 16 },
    pd: [
      { key: 'on', label: 'ON', type: 'bool' },
      { key: 'rating', label: 'พิกัดกระแส', type: 'number', unit: 'A' },
    ],
    desc: 'เซอร์กิตเบรกเกอร์ลูกย่อย ตัดวงจรเมื่อกระแสเกินหรือลัดวงจร',
  }),
  def({
    type: 'mcb2', cat: 'protect', name: 'MCB 2P (L+N)', short: 'MCB 2P', icon: 'breaker', symbol: 'breaker', beh: 'breaker',
    brands: [
      ['Schneider Electric', 'Acti9 iC60N 2P C32'], ['ABB', 'S202-C32'], ['Siemens', '5SL6232-7'], ['Eaton', 'FAZ-C32/2'],
      ['Hager', 'MCN232'], ['LS Electric', 'BKN 2P C32'], ['Mitsubishi Electric', 'BH-D10 2P'], ['Chint', 'NXB-63 2P C32'],
    ],
    l: [['L1', 'L in', 'L'], ['N1', 'N in', 'N']], r: [['L2', 'L out', 'L'], ['N2', 'N out', 'N']],
    links: { main: [['L1', 'L2'], ['N1', 'N2']] },
    props: { on: true, rating: 32 },
    pd: [
      { key: 'on', label: 'ON', type: 'bool' },
      { key: 'rating', label: 'พิกัดกระแส', type: 'number', unit: 'A' },
    ],
    desc: 'เบรกเกอร์ 2 ขั้ว ตัดทั้ง L และ N — ใช้เป็นเมนในตู้ไฟบ้าน',
  }),
  def({
    type: 'mccb3', cat: 'protect', name: 'MCCB 3P', short: 'MCCB 3P', icon: 'breaker', symbol: 'breaker3', beh: 'breaker',
    brands: [
      ['Schneider Electric', 'ComPacT NSX100F'], ['ABB', 'Tmax XT1 160'], ['Siemens', '3VA1 100A'], ['LS Electric', 'Metasol ABN103c'],
      ['Mitsubishi Electric', 'NF125-SGV'], ['Eaton', 'NZMN1-A100'], ['Fuji Electric', 'BW125JAG'],
    ],
    l: [['in', 'L1-L3', 'P3']], r: [['out', 'T1-T3', 'P3']],
    links: { main: [['in', 'out']] },
    props: { on: true, rating: 63 },
    pd: [
      { key: 'on', label: 'ON', type: 'bool' },
      { key: 'rating', label: 'พิกัดกระแส', type: 'number', unit: 'A' },
    ],
    desc: 'โมลเคสเซอร์กิตเบรกเกอร์ 3 เฟส',
  }),
  def({
    type: 'rcbo', cat: 'protect', name: 'RCBO 2P 30mA', short: 'RCBO', icon: 'breaker', symbol: 'rcbo', beh: 'rcbo',
    brands: [['Schneider Electric', 'Acti9 iDPN N Vigi 30mA'], ['ABB', 'DS201 C16 A30'], ['Siemens', '5SU1356'], ['Hager', 'ADA916G'], ['Eaton', 'PKNM-16/1N'], ['LS Electric', 'RKP 30mA']],
    l: [['L1', 'L in', 'L'], ['N1', 'N in', 'N']], r: [['L2', 'L out', 'L'], ['N2', 'N out', 'N']],
    links: { main: [['L1', 'L2'], ['N1', 'N2']] },
    props: { on: true, rating: 16, sens: 30 },
    pd: [
      { key: 'on', label: 'ON', type: 'bool' },
      { key: 'rating', label: 'พิกัดกระแส', type: 'number', unit: 'A' },
      { key: 'sens', label: 'ความไวไฟรั่ว', type: 'number', unit: 'mA' },
    ],
    desc: 'เบรกเกอร์กันดูด ตัดเมื่อไฟรั่วลงดิน (L ชน PE) — มีปุ่ม TEST',
  }),
  def({
    type: 'fuse', cat: 'protect', name: 'Fuse Terminal', short: 'FUSE', icon: 'fuse', symbol: 'fuse', beh: 'fuse',
    brands: [['Phoenix Contact', 'UT 4-HESILED 24'], ['Weidmüller', 'WSI 6/LD 10-36V'], ['Littelfuse', '0218 Series'], ['Bussmann', 'S505'], ['Siemens', '5SG Neozed']],
    l: [['in', 'IN', 'X']], r: [['out', 'OUT', 'X']],
    links: { main: [['in', 'out']] },
    props: { on: true, rating: 4 },
    pd: [{ key: 'rating', label: 'พิกัดฟิวส์', type: 'number', unit: 'A' }],
    desc: 'ฟิวส์ป้องกันวงจรควบคุม ขาดเมื่อกระแสเกิน',
  }),
  def({
    type: 'spd', cat: 'protect', name: 'Surge Protection Device', short: 'SPD', icon: 'surge', symbol: 'spd', beh: 'passive',
    brands: [['Phoenix Contact', 'VAL-MS 230/1+1'], ['DEHN', 'DEHNguard M TNS'], ['OBO Bettermann', 'V20-C 1+NPE'], ['Schneider Electric', 'Acti9 iPRD40r'], ['ABB', 'OVR T2']],
    l: [['L', 'L', 'L'], ['N', 'N', 'N'], ['PE', 'PE', 'PE']],
    desc: 'อุปกรณ์ป้องกันไฟกระชาก ต่อคร่อม L-N-PE',
  }),

  // ───────────── CONTROL ─────────────
  def({
    type: 'switch1', cat: 'control', name: 'Wall / Toggle Switch', short: 'SWITCH', icon: 'switch', symbol: 'sw_no', beh: 'switch',
    brands: [['Panasonic', 'WEG5001K Full-Color'], ['Schneider Electric', 'AvatarOn A'], ['Legrand', 'Mallia Senses'], ['Chang', 'CH-901'], ['Bticino', 'Living Now']],
    l: [['in', 'IN', 'X']], r: [['out', 'OUT', 'X']],
    links: { main: [['in', 'out']] },
    props: { on: false },
    pd: [{ key: 'on', label: 'ON', type: 'bool' }],
    desc: 'สวิตช์เปิด-ปิดไฟ คลิกเพื่อสลับ',
  }),
  def({
    type: 'pb_no', cat: 'control', name: 'Push Button NO (Start)', short: 'PB START', icon: 'pb', symbol: 'pb_no', beh: 'pb',
    brands: [
      ['Schneider Electric', 'Harmony XB5AA31'], ['Siemens', 'SIRIUS ACT 3SU1'], ['IDEC', 'YW1B-M1E10G'], ['Omron', 'A22NN-BNM-UGA'],
      ['Fuji Electric', 'AR22F0R-10G'], ['Autonics', 'S2PR-P1G'], ['Eaton', 'M22-D-G-X1'],
    ],
    l: [['in', '13', 'X']], r: [['out', '14', 'X']],
    links: { main: [['in', 'out']] },
    props: { nc: false, color: 'green' },
    pd: [
      { key: 'nc', label: 'หน้าสัมผัส NC', type: 'bool' },
      { key: 'color', label: 'สีปุ่ม', type: 'select', options: ['green', 'red', 'yellow', 'blue', 'black'] },
    ],
    desc: 'ปุ่มกดชนิดกดติดปล่อยดับ (Momentary) กดค้างที่ปุ่มเพื่อทำงาน',
  }),
  def({
    type: 'pb_nc', cat: 'control', name: 'Push Button NC (Stop)', short: 'PB STOP', icon: 'pb', symbol: 'pb_nc', beh: 'pb',
    brands: [
      ['Schneider Electric', 'Harmony XB5AA42'], ['Siemens', 'SIRIUS ACT 3SU1'], ['IDEC', 'YW1B-M1E01R'], ['Omron', 'A22NN-BNM-URA'],
      ['Fuji Electric', 'AR22F0R-01R'], ['Autonics', 'S2PR-P1R'], ['Eaton', 'M22-D-R-X0'],
    ],
    l: [['in', '11', 'X']], r: [['out', '12', 'X']],
    links: { main: [['in', 'out']] },
    props: { nc: true, color: 'red' },
    pd: [
      { key: 'nc', label: 'หน้าสัมผัส NC', type: 'bool' },
      { key: 'color', label: 'สีปุ่ม', type: 'select', options: ['green', 'red', 'yellow', 'blue', 'black'] },
    ],
    desc: 'ปุ่มหยุด หน้าสัมผัสปกติปิด',
  }),
  def({
    type: 'estop', cat: 'control', name: 'Emergency Stop', short: 'E-STOP', icon: 'estop', symbol: 'estop', beh: 'estop',
    brands: [['Schneider Electric', 'Harmony XB5AS8442'], ['Siemens', '3SU1100-1HB20'], ['IDEC', 'XW1E-BV402MFRH'], ['Omron', 'A22E-M-01'], ['Pizzato', 'E2 1PERZ4531'], ['Eaton', 'M22-PVT']],
    l: [['in', '11', 'X']], r: [['out', '12', 'X']],
    links: { main: [['in', 'out']] },
    props: { pressed: false },
    pd: [{ key: 'pressed', label: 'ถูกกด (ล็อก)', type: 'bool' }],
    desc: 'ปุ่มหยุดฉุกเฉินแบบล็อก — คลิกเพื่อกด/ปลด',
  }),
  def({
    type: 'selector', cat: 'control', name: 'Selector Switch H-O-A', short: 'SELECTOR', icon: 'selector', symbol: 'selector', beh: 'selector',
    brands: [['Schneider Electric', 'Harmony XB5AD33'], ['Siemens', '3SU1100-2BC60'], ['IDEC', 'YW1S-3E20'], ['Fuji Electric', 'AR22PR-320B'], ['Omron', 'A22NS-3RL']],
    l: [['COM', 'COM', 'X']], r: [['A', 'HAND', 'X'], ['B', 'AUTO', 'X']],
    links: { A: [['COM', 'A']], B: [['COM', 'B']] },
    props: { pos: 'B' },
    pd: [{ key: 'pos', label: 'ตำแหน่ง (A=Hand, O=Off, B=Auto)', type: 'select', options: ['A', 'O', 'B'] }],
    desc: 'สวิตช์เลือก Hand / Off / Auto',
  }),
  def({
    type: 'relay', cat: 'control', name: 'Control Relay 24VDC', short: 'RELAY', icon: 'relay', symbol: 'relay', beh: 'relay',
    brands: [
      ['Omron', 'MY2N-GS 24VDC'], ['Finder', '40.52.9.024'], ['Phoenix Contact', 'PLC-RSC-24DC/21'], ['Schneider Electric', 'RXM2AB2BD'],
      ['IDEC', 'RJ2S-CL-D24'], ['Weidmüller', 'TRS 24VDC 1CO'], ['Panasonic', 'HC2-H-DC24V'],
    ],
    l: [['A1', 'A1', 'X'], ['A2', 'A2', 'X']], r: [['COM', 'COM', 'X'], ['NO', 'NO', 'X'], ['NC', 'NC', 'X']],
    links: { no: [['COM', 'NO']], nc: [['COM', 'NC']] },
    desc: 'รีเลย์ควบคุม คอยล์ A1-A2 สั่งหน้าสัมผัส COM/NO/NC',
  }),
  def({
    type: 'contactor', cat: 'control', name: 'Magnetic Contactor 3P', short: 'CONTACTOR', icon: 'relay', symbol: 'contactor', beh: 'contactor',
    brands: [
      ['Schneider Electric', 'TeSys Deca LC1D18'], ['Siemens', 'SIRIUS 3RT2026'], ['ABB', 'AF16-30-10'], ['Mitsubishi Electric', 'S-T21'],
      ['LS Electric', 'Metasol MC-18b'], ['Eaton', 'DILM17-10'], ['Fuji Electric', 'SC-E1'], ['Chint', 'NXC-18'],
    ],
    l: [['A1', 'A1', 'X'], ['A2', 'A2', 'X'], ['in', '1/3/5', 'P3'], ['a13', '13', 'X'], ['a21', '21', 'X']],
    r: [['out', '2/4/6', 'P3'], ['a14', '14', 'X'], ['a22', '22', 'X']],
    w: 150,
    links: { main: [['in', 'out'], ['a13', 'a14']], nc: [['a21', 'a22']] },
    desc: 'คอนแทคเตอร์ 3 เฟส มีหน้าสัมผัสช่วย 13-14 (NO) และ 21-22 (NC)',
  }),
  def({
    type: 'overload', cat: 'control', name: 'Thermal Overload Relay', short: 'OLR', icon: 'thermal', symbol: 'overload', beh: 'overload',
    brands: [['Schneider Electric', 'TeSys LRD16'], ['Siemens', '3RU2126-4AB0'], ['ABB', 'TF42-13'], ['LS Electric', 'MT-32'], ['Mitsubishi Electric', 'TH-T25'], ['Eaton', 'ZB32-16']],
    l: [['in', '1/3/5', 'P3'], ['a95', '95', 'X'], ['a97', '97', 'X']],
    r: [['out', '2/4/6', 'P3'], ['a96', '96', 'X'], ['a98', '98', 'X']],
    w: 150,
    links: { main: [['in', 'out'], ['a95', 'a96']], trip: [['a97', 'a98']] },
    props: { setting: 12 },
    pd: [{ key: 'setting', label: 'ตั้งกระแส', type: 'number', unit: 'A' }],
    desc: 'โอเวอร์โหลดรีเลย์ ป้องกันมอเตอร์กระแสเกิน — 95-96 เปิดเมื่อทริป',
  }),
  def({
    type: 'timer', cat: 'control', name: 'Timer Relay (On-delay)', short: 'TIMER', icon: 'timer', symbol: 'timer', beh: 'timer',
    brands: [['Omron', 'H3CR-A8 24VDC'], ['Autonics', 'ATE8-46'], ['Finder', '80.01.0.240'], ['Schneider Electric', 'Zelio RE22R1AMR'], ['Panasonic', 'PM4HA-H-DC24V']],
    l: [['A1', 'A1', 'X'], ['A2', 'A2', 'X']], r: [['COM', '15', 'X'], ['NO', '18', 'X'], ['NC', '16', 'X']],
    links: { no: [['COM', 'NO']], nc: [['COM', 'NC']] },
    props: { delay: 5 },
    pd: [{ key: 'delay', label: 'หน่วงเวลา', type: 'number', unit: 's', min: 0 }],
    desc: 'ไทม์เมอร์หน่วงเวลาเมื่อคอยล์ได้รับไฟ',
  }),
  def({
    type: 'tempctl', cat: 'control', name: 'Temperature Controller', short: 'TEMP CTRL', icon: 'thermo', symbol: 'tempctl', beh: 'tempctl',
    brands: [['Omron', 'E5CC-RX2ASM'], ['Autonics', 'TK4S-14RN'], ['RKC', 'RB100'], ['Yokogawa', 'UTAdvanced UT35A'], ['Shinko', 'ACS-13A'], ['Hanyoung', 'NX4']],
    l: [['L', 'L', 'L'], ['N', 'N', 'N'], ['IN', 'PV in', 'AI']], r: [['C', 'C', 'X'], ['NO', 'NO', 'X']],
    w: 160,
    links: { main: [['C', 'NO']] },
    props: { sv: 60, hyst: 1 },
    pd: [
      { key: 'sv', label: 'Set Value (SV)', type: 'number' },
      { key: 'hyst', label: 'Hysteresis', type: 'number' },
    ],
    desc: 'ควบคุมอุณหภูมิ ON/OFF — รับสัญญาณจากทรานสมิตเตอร์ สั่งหน้าสัมผัสคุมฮีตเตอร์',
  }),
  def({
    type: 'vfd', cat: 'control', name: 'Variable Frequency Drive', short: 'VFD / INVERTER', icon: 'vfd', symbol: 'vfd', beh: 'vfd',
    brands: [
      ['ABB', 'ACS580-01 7.5kW'], ['Siemens', 'SINAMICS G120X'], ['Danfoss', 'VLT FC 302'], ['Schneider Electric', 'Altivar ATV320'],
      ['Delta', 'VFD-MS300'], ['Mitsubishi Electric', 'FR-E800'], ['Yaskawa', 'GA500'], ['Fuji Electric', 'FRENIC-Ace'],
    ],
    l: [['in', 'L1-L3', 'P3'], ['V24', '+24V', 'DC+'], ['V0', '0V', 'DC-'], ['RUN', 'RUN DI', 'X'], ['REF', 'AI REF', 'AI']],
    r: [['out', 'U/V/W', 'P3']],
    b: [['ETH', 'ETH', 'ETH'], ['485', '485', '485']],
    w: 170,
    props: { freq: 50, accel: 5 },
    pd: [
      { key: 'freq', label: 'ความถี่ตั้ง (ไม่มี AI REF)', type: 'number', unit: 'Hz', min: 0, max: 60 },
      { key: 'accel', label: 'เวลาเร่ง 0→50Hz', type: 'number', unit: 's' },
    ],
    desc: 'อินเวอร์เตอร์ปรับความเร็วมอเตอร์ — ต่อ +24V เข้า RUN เพื่อเดิน, รับ AI REF ปรับความเร็ว',
  }),

  // ───────────── SENSORS ─────────────
  sensorA('temp_tx', 'Temperature Transmitter PT100', 'TEMP TX', 'TT', 'temp', -50, 150, '°C', 80, 5, 'process',
    [['Endress+Hauser', 'iTEMP TMT82'], ['Rosemount', '644 Temperature'], ['Yokogawa', 'YTA610'], ['Siemens', 'SITRANS TH320'], ['WIKA', 'T32.1S'], ['ABB', 'TTH300']],
    'วัดอุณหภูมิด้วย PT100 แปลงเป็น 4-20mA — โหมด process อุณหภูมิตามฮีตเตอร์/แอร์จริง'),
  sensorA('pressure_tx', 'Pressure Transmitter', 'PRESS TX', 'PT', 'pressure', 0, 10, 'bar', 8, 0.5, 'process',
    [['Rosemount', '3051TG'], ['Endress+Hauser', 'Cerabar PMP71'], ['Yokogawa', 'EJA530E'], ['Siemens', 'SITRANS P320'], ['WIKA', 'S-20'], ['Danfoss', 'MBS 3000'], ['Honeywell', 'SmartLine STG700']],
    'วัดความดันในท่อ — โหมด process แปรผันตามปั๊มที่ทำงาน'),
  sensorA('flow_tx', 'Electromagnetic Flowmeter', 'FLOW TX', 'FT', 'flow', 0, 100, 'm³/h', 90, 0, 'process',
    [['Endress+Hauser', 'Proline Promag 10W'], ['Krohne', 'OPTIFLUX 2000'], ['Siemens', 'SITRANS FM MAG 5000'], ['Yokogawa', 'ADMAG AXG'], ['ABB', 'ProcessMaster FEP630'], ['Rosemount', '8705']],
    'วัดอัตราการไหล — โหมด process แปรผันตามความเร็วปั๊ม'),
  sensorA('level_tx', 'Radar Level Transmitter', 'LEVEL TX', 'LT', 'level', 0, 5, 'm', 4.5, 0.5, 'process',
    [['VEGA', 'VEGAPULS 21'], ['Endress+Hauser', 'Micropilot FMR20'], ['Siemens', 'SITRANS LR100'], ['Rosemount', '1408H'], ['Krohne', 'OPTIWAVE 1540']],
    'วัดระดับน้ำในถัง — โหมด process ระดับขึ้นเมื่อปั๊มเดิน ลดลงเมื่อหยุด'),
  sensorA('humidity_tx', 'Humidity Transmitter', 'HUMID TX', 'MT', 'humidity', 0, 100, '%RH', 85, 20, 'wave',
    [['Vaisala', 'HMT120'], ['E+E Elektronik', 'EE160'], ['Honeywell', 'H7080B'], ['Testo', '6631'], ['Senseca', 'HD48']],
    'วัดความชื้นสัมพัทธ์'),
  sensorA('gas_tx', 'CO₂ / Gas Detector', 'GAS TX', 'AT', 'co2', 0, 2000, 'ppm', 1200, 0, 'wave',
    [['Honeywell', 'Sensepoint XCD'], ['Dräger', 'Polytron 8700'], ['Vaisala', 'GMW90'], ['MSA', 'Ultima X5000'], ['Senseair', 'aSENSE']],
    'ตรวจวัดก๊าซ CO₂ / ก๊าซพิษ'),
  sensorA('ph_tx', 'pH Analyzer', 'pH TX', 'AT', 'ph', 0, 14, 'pH', 9, 5, 'wave',
    [['Hach', 'SC200 + pHD'], ['Endress+Hauser', 'Liquiline CM42'], ['Mettler Toledo', 'M300'], ['Yokogawa', 'FLXA21'], ['ABB', 'AWT420']],
    'วิเคราะห์ค่า pH ในระบบบำบัดน้ำ'),
  sensorA('vib_tx', 'Vibration Transmitter', 'VIB TX', 'VT', 'vibration', 0, 25, 'mm/s', 7.1, 0, 'process',
    [['IFM', 'VKV021'], ['SKF', 'CMSS 500'], ['Banner', 'QM30VT2'], ['Hansford', 'HS-420'], ['Wilcoxon', 'PC420']],
    'วัดการสั่นสะเทือนมอเตอร์ — สูงขึ้นเมื่อมอเตอร์ทำงาน'),
  sensorA('ct_tx', 'Current Transducer', 'CT TX', 'IT', 'current', 0, 200, 'A', 150, 0, 'process',
    [['LEM', 'AT 100 B10'], ['Phoenix Contact', 'MCR-SL-CUC'], ['Carlo Gavazzi', 'CTD'], ['Siemens', 'SIRIUS 3RR'], ['Hioki', 'CT6845']],
    'วัดกระแสรวมของโรงงาน แปลงเป็น 4-20mA'),
  sensorD('prox', 'Inductive Proximity PNP', 'PROX', 'ZS',
    [['Omron', 'E2E-X5E1'], ['Sick', 'IME18-08BPSZC0S'], ['IFM', 'IFS204'], ['Pepperl+Fuchs', 'NBB5-18GM50-E2'], ['Autonics', 'PRD18-14DP'], ['Balluff', 'BES M18'], ['Turck', 'BI8-M18-AP6X'], ['Keyence', 'EV-118U']],
    'ตรวจจับโลหะ เอาต์พุต PNP 24V'),
  sensorD('photo', 'Photoelectric Sensor', 'PHOTO', 'ZS',
    [['Sick', 'W12-3'], ['Keyence', 'PZ-G51P'], ['Banner', 'Q4X'], ['Omron', 'E3Z-D82'], ['Autonics', 'BJ300-DDT'], ['Panasonic', 'CX-421']],
    'ตรวจจับวัตถุด้วยแสง เอาต์พุต PNP'),
  sensorD('pir', 'Motion PIR Sensor', 'PIR', 'MS',
    [['Panasonic', 'PaPIRs EKMB'], ['Honeywell', 'IS3016'], ['Bosch', 'ISC-BPR2'], ['Steinel', 'IS 3360']],
    'ตรวจจับการเคลื่อนไหวของคน'),
  sensorD('smoke', 'Smoke Detector 24V', 'SMOKE', 'FS',
    [['Hochiki', 'SOC-24VN'], ['Notifier', 'FST-851'], ['Bosch', 'FAP-425'], ['System Sensor', '2151']],
    'ตรวจจับควันไฟ ระบบแจ้งเหตุเพลิงไหม้', 'manual'),
  def({
    type: 'limit_sw', cat: 'sensor', name: 'Limit Switch', short: 'LIMIT SW', icon: 'limit', symbol: 'limit', beh: 'contact_sw', tag: 'ZS',
    brands: [['Omron', 'D4N-4120'], ['Telemecanique', 'XCKS131'], ['Honeywell', 'SZL-WL'], ['Schmersal', 'PS116'], ['Euchner', 'NZ1']],
    l: [['COM', 'COM', 'X']], r: [['NO', 'NO', 'X']],
    links: { act: [['COM', 'NO']] },
    props: { mode: 'manual', actuated: false, sp: 4, period: 6 },
    pd: [
      { key: 'mode', label: 'โหมด', type: 'select', options: ['manual', 'auto'] },
      { key: 'actuated', label: 'ถูกกด', type: 'bool' },
      { key: 'period', label: 'คาบ auto (s)', type: 'number' },
    ],
    desc: 'ลิมิตสวิตช์ หน้าสัมผัสแห้ง — คลิกเพื่อจำลองการกด',
  }),
  def({
    type: 'float_sw', cat: 'sensor', name: 'Float Level Switch', short: 'FLOAT SW', icon: 'float', symbol: 'float', beh: 'contact_sw', tag: 'LS',
    brands: [['Gems Sensors', 'LS-800'], ['Kobold', 'NKP'], ['Endress+Hauser', 'Liquiphant FTL31'], ['Nivelco', 'NK-100'], ['SJE Rhombus', 'SignalMaster']],
    l: [['COM', 'COM', 'X']], r: [['NO', 'NO', 'X']],
    links: { act: [['COM', 'NO']] },
    props: { mode: 'process', actuated: false, sp: 4, period: 6 },
    pd: [
      { key: 'mode', label: 'โหมด', type: 'select', options: ['process', 'manual', 'auto'] },
      { key: 'sp', label: 'ระดับที่ทำงาน', type: 'number', unit: 'm' },
      { key: 'actuated', label: 'ทำงาน (manual)', type: 'bool' },
    ],
    desc: 'ลูกลอยวัดระดับ — โหมด process หน้าสัมผัสต่อเมื่อระดับน้ำ ≥ setpoint',
  }),
  def({
    type: 'modbus_th', cat: 'sensor', name: 'Modbus RTU Temp/Humidity', short: 'RS485 T/H', icon: 'sensor', symbol: 'isa', beh: 'sensor_485', tag: 'TH',
    brands: [['Autonics', 'THD-R-T'], ['Vaisala', 'HMP110 + Modbus'], ['E+E Elektronik', 'EE210'], ['Dwyer', 'RHP-2W'], ['Senseca', 'HD50']],
    l: [['P', '+24V', 'DC+'], ['M', '0V', 'DC-']], r: [['485', 'RS485', '485']],
    w: 160,
    props: { id: 1 },
    pd: [{ key: 'id', label: 'Modbus Slave ID', type: 'number' }],
    desc: 'เซนเซอร์อัจฉริยะ ส่งค่าผ่าน Modbus RTU (RS485)',
  }),
  def({
    type: 'lora_th', cat: 'sensor', name: 'Wireless LoRaWAN Sensor', short: 'LoRa T/H', icon: 'wifi', symbol: 'wireless', beh: 'sensor_lora', tag: 'TH',
    brands: [['Milesight', 'EM300-TH'], ['Dragino', 'LHT65N'], ['Advantech', 'WISE-2410'], ['Elsys', 'ERS'], ['RAK', 'RAK7204']],
    w: 140, h: 80,
    props: { interval: 5 },
    pd: [{ key: 'interval', label: 'ส่งข้อมูลทุก', type: 'number', unit: 's' }],
    desc: 'เซนเซอร์ไร้สายใช้แบตเตอรี่ ส่งข้อมูลถึง LoRaWAN Gateway อัตโนมัติ (ไม่ต้องเดินสาย)',
  }),
  def({
    type: 'emeter', cat: 'sensor', name: 'Power / Energy Meter', short: 'POWER METER', icon: 'meter', symbol: 'meter', beh: 'emeter', tag: 'EM',
    brands: [['Schneider Electric', 'PowerLogic PM5560'], ['Siemens', 'SENTRON PAC3200'], ['Janitza', 'UMG 96-PA'], ['Carlo Gavazzi', 'EM24'], ['Eastron', 'SDM630 Modbus'], ['ABB', 'M4M 30']],
    l: [['in', 'IN', 'P3']], r: [['out', 'OUT', 'P3']],
    b: [['ETH', 'ETH', 'ETH'], ['485', '485', '485']],
    w: 160,
    links: { main: [['in', 'out']] },
    desc: 'มิเตอร์วัดพลังงาน แสดง V, A, kW, kWh ส่งข้อมูลผ่าน Modbus',
  }),

  // ───────────── CONTROLLERS ─────────────
  def({
    type: 'plc', cat: 'ctrl', name: 'PLC Compact CPU', short: 'PLC', icon: 'plc', symbol: 'plc', beh: 'plc',
    brands: [
      ['Siemens', 'SIMATIC S7-1200 CPU 1214C'], ['Allen-Bradley', 'Micro850 2080-LC50'], ['Mitsubishi Electric', 'MELSEC iQ-F FX5U'],
      ['Omron', 'NX1P2-9024DT'], ['Schneider Electric', 'Modicon M221'], ['Delta', 'DVP-SE2'], ['Keyence', 'KV-8000'],
      ['LS Electric', 'XGB XBC-DN32U'], ['Beckhoff', 'CX7000'], ['WAGO', 'PFC200'], ['Panasonic', 'FP0H'],
    ],
    l: [['VP', 'L+ 24V', 'DC+'], ['VM', 'M 0V', 'DC-'], ['AI1', 'AI1', 'AI'], ['AI2', 'AI2', 'AI'], ['AI3', 'AI3', 'AI'], ['AI4', 'AI4', 'AI']],
    r: [['DI1', 'DI1', 'X'], ['DI2', 'DI2', 'X'], ['DI3', 'DI3', 'X'], ['DI4', 'DI4', 'X'], ['DO1', 'DO1', 'X'], ['DO2', 'DO2', 'X'], ['DO3', 'DO3', 'X'], ['DO4', 'DO4', 'X']],
    b: [['ETH', 'ETH', 'ETH'], ['485', '485', '485']],
    w: 200,
    props: {
      do1_mode: 'OFF', do1_sp: 50, do2_mode: 'OFF', do2_sp: 50, do3_mode: 'OFF', do3_sp: 50, do4_mode: 'OFF', do4_sp: 50, hmiCmd: false,
    },
    pd: plcPd,
    desc: 'PLC รับ AI 4-20mA / DI 24V, สั่ง DO ตามลอจิก และส่งแท็กผ่าน Ethernet/RS485 ไปยัง HMI/SCADA',
  }),
  def({
    type: 'rio', cat: 'ctrl', name: 'Remote I/O (Ethernet)', short: 'REMOTE I/O', icon: 'plc', symbol: 'plc', beh: 'rio',
    brands: [['Phoenix Contact', 'Axioline F AXC'], ['WAGO', '750-352 + 750-455'], ['Siemens', 'ET 200SP IM155-6PN'], ['Moxa', 'ioLogik E1242'], ['Advantech', 'ADAM-6224'], ['Beckhoff', 'EK9000']],
    l: [['VP', 'L+ 24V', 'DC+'], ['VM', 'M 0V', 'DC-'], ['AI1', 'AI1', 'AI'], ['AI2', 'AI2', 'AI'], ['AI3', 'AI3', 'AI'], ['AI4', 'AI4', 'AI']],
    r: [['DI1', 'DI1', 'X'], ['DI2', 'DI2', 'X']],
    b: [['ETH', 'ETH', 'ETH']],
    w: 170,
    desc: 'โมดูล I/O ระยะไกล อ่านสัญญาณภาคสนามส่งผ่าน Modbus TCP',
  }),
  def({
    type: 'edge', cat: 'ctrl', name: 'IoT Edge Controller', short: 'IoT EDGE', icon: 'chip', symbol: 'plc', beh: 'edge',
    brands: [['Raspberry', 'Pi 5 + 4-20mA HAT'], ['Espressif', 'ESP32-S3 Industrial'], ['Arduino', 'Opta Plus'], ['Siemens', 'SIMATIC IOT2050'], ['Advantech', 'UNO-2271G'], ['Kunbus', 'Revolution Pi Connect']],
    l: [['VP', '+24V', 'DC+'], ['VM', '0V', 'DC-'], ['AI1', 'AI1', 'AI'], ['AI2', 'AI2', 'AI']],
    r: [['DI1', 'DI1', 'X']],
    b: [['ETH', 'ETH', 'ETH']],
    w: 160,
    desc: 'อุปกรณ์ Edge/IoT เก็บข้อมูลเซนเซอร์ ส่งขึ้น MQTT/Cloud',
  }),

  // ───────────── NETWORK ─────────────
  def({
    type: 'eswitch', cat: 'net', name: 'Industrial Ethernet Switch', short: 'ETH SWITCH', icon: 'network', symbol: 'net', beh: 'eswitch',
    brands: [['Moxa', 'EDS-205A'], ['Cisco', 'IE-1000-6T'], ['Hirschmann', 'SPIDER III'], ['Phoenix Contact', 'FL SWITCH 1005N'], ['Siemens', 'SCALANCE XB005'], ['Advantech', 'EKI-2525'], ['Weidmüller', 'IE-SW-BL05']],
    l: [['VP', '+24V', 'DC+'], ['VM', '0V', 'DC-']],
    b: [['E1', 'P1', 'ETH'], ['E2', 'P2', 'ETH'], ['E3', 'P3', 'ETH'], ['E4', 'P4', 'ETH'], ['E5', 'P5', 'ETH']],
    w: 160,
    desc: 'สวิตช์ Ethernet อุตสาหกรรม 5 พอร์ต — ต้องมีไฟ 24V จึงส่งข้อมูลได้',
  }),
  def({
    type: 'router', cat: 'net', name: '4G/5G Industrial Router', short: 'ROUTER 4G', icon: 'router', symbol: 'net', beh: 'router',
    brands: [['Teltonika', 'RUT956'], ['Siemens', 'SCALANCE M876-4'], ['Cisco', 'IR1101'], ['MikroTik', 'LtAP LTE6'], ['Moxa', 'OnCell G4302'], ['Advantech', 'ICR-3241']],
    l: [['VP', '+24V', 'DC+'], ['VM', '0V', 'DC-']],
    b: [['E1', 'LAN1', 'ETH'], ['E2', 'LAN2', 'ETH'], ['E3', 'LAN3', 'ETH']],
    w: 160,
    desc: 'เราเตอร์ส่งข้อมูลขึ้น Cloud ผ่าน 4G/5G',
  }),
  def({
    type: 'gateway', cat: 'net', name: 'Modbus RTU ↔ TCP Gateway', short: 'MODBUS GW', icon: 'gateway', symbol: 'net', beh: 'gateway',
    brands: [['Moxa', 'MGate MB3170'], ['Advantech', 'EKI-1221'], ['HMS', 'Anybus Communicator'], ['Phoenix Contact', 'GW MODBUS TCP/RTU'], ['Weidmüller', 'u-link']],
    l: [['VP', '+24V', 'DC+'], ['VM', '0V', 'DC-']],
    b: [['485', '485', '485'], ['ETH', 'ETH', 'ETH']],
    w: 150,
    desc: 'แปลงโปรโตคอล Modbus RTU (RS485) เป็น Modbus TCP (Ethernet)',
  }),
  def({
    type: 'lora_gw', cat: 'net', name: 'LoRaWAN Gateway', short: 'LoRa GW', icon: 'wifi', symbol: 'net', beh: 'lora_gw',
    brands: [['Milesight', 'UG65'], ['Kerlink', 'iFemtoCell'], ['MikroTik', 'wAP LR8 kit'], ['Dragino', 'LPS8N'], ['RAK', 'WisGate Edge RAK7268']],
    l: [['VP', '+24V', 'DC+'], ['VM', '0V', 'DC-']],
    b: [['ETH', 'ETH', 'ETH']],
    w: 150,
    desc: 'รับข้อมูลจากเซนเซอร์ LoRaWAN ไร้สายทั้งหมดในพื้นที่',
  }),

  // ───────────── LOADS ─────────────
  def({
    type: 'lamp', cat: 'load', name: 'LED Lamp 230V', short: 'LAMP', icon: 'lamp', symbol: 'lamp', beh: 'load_ac',
    brands: [['Philips', 'LED Bulb 18W'], ['Osram', 'LED Value 18W'], ['Panasonic', 'NEO LED 18W'], ['Lamptan', 'LED Bulb Smart Save'], ['Signify', 'High-bay 100W']],
    l: [['L', 'L', 'L'], ['N', 'N', 'N']],
    w: 120,
    props: { power: 18, process: 'none' },
    pd: loadAcPd,
    desc: 'หลอดไฟ LED 230V',
  }),
  def({
    type: 'fan1', cat: 'load', name: 'Ventilation Fan 1φ', short: 'FAN', icon: 'fan', symbol: 'motor1', beh: 'load_ac',
    brands: [['Panasonic', 'FV-25AUM'], ['KDK', '25AUH'], ['Mitsubishi Electric', 'EX-25SC5T'], ['Hatari', 'IW25R1'], ['Systemair', 'K 125']],
    l: [['L', 'L', 'L'], ['N', 'N', 'N']],
    w: 120,
    props: { power: 75, process: 'none' },
    pd: loadAcPd,
    desc: 'พัดลมระบายอากาศ / มอเตอร์ 1 เฟส',
  }),
  def({
    type: 'heater', cat: 'load', name: 'Electric Heater', short: 'HEATER', icon: 'heater', symbol: 'heater', beh: 'load_ac',
    brands: [['Watlow', 'FIREROD 2kW'], ['Chromalox', 'TLC 2kW'], ['Tempco', 'Band Heater'], ['Hotset', 'hotflex'], ['Backer', 'Tubular']],
    l: [['L', 'L', 'L'], ['N', 'N', 'N']],
    w: 120,
    props: { power: 2000, process: 'heat' },
    pd: loadAcPd,
    desc: 'ฮีตเตอร์ไฟฟ้า — ทำให้อุณหภูมิในกระบวนการสูงขึ้น',
  }),
  def({
    type: 'aircon', cat: 'load', name: 'Air Conditioner', short: 'AIRCON', icon: 'snow', symbol: 'motor1', beh: 'load_ac',
    brands: [['Daikin', 'FTKF Inverter 18000BTU'], ['Mitsubishi Electric', 'MSY-GT18VF'], ['Carrier', 'X-Inverter'], ['LG', 'DUALCOOL'], ['Samsung', 'WindFree']],
    l: [['L', 'L', 'L'], ['N', 'N', 'N']],
    w: 120,
    props: { power: 1500, process: 'cool' },
    pd: loadAcPd,
    desc: 'เครื่องปรับอากาศ — ทำให้อุณหภูมิลดลง',
  }),
  def({
    type: 'socket', cat: 'load', name: 'Power Outlet + Appliance', short: 'SOCKET', icon: 'socket', symbol: 'socket', beh: 'load_ac',
    brands: [['Panasonic', 'WEG15929 Duplex'], ['Schneider Electric', 'AvatarOn A'], ['Legrand', 'Mallia'], ['Chang', 'PCH-904'], ['Haco', 'Quattro']],
    l: [['L', 'L', 'L'], ['N', 'N', 'N'], ['PE', 'PE', 'PE']],
    w: 120,
    props: { power: 500, process: 'none', leak: false },
    pd: [...loadAcPd, { key: 'leak', label: 'จำลองไฟรั่วลงดิน', type: 'bool' }],
    desc: 'เต้ารับพร้อมเครื่องใช้ไฟฟ้า — เปิด "ไฟรั่ว" เพื่อทดสอบ RCBO',
  }),
  def({
    type: 'motor3', cat: 'load', name: '3φ Induction Motor', short: 'MOTOR 3φ', icon: 'motor', symbol: 'motor3', beh: 'motor3',
    brands: [['Siemens', 'SIMOTICS GP 1LE1'], ['ABB', 'M3BP 132'], ['WEG', 'W22 IE3'], ['Mitsubishi Electric', 'SF-PRV'], ['TECO', 'AEHH'], ['Toshiba', 'TIKK Premium']],
    l: [['U', 'U/V/W', 'P3'], ['PE', 'PE', 'PE']],
    w: 130,
    props: { kw: 5.5, rpm: 1450, process: 'none' },
    pd: [
      { key: 'kw', label: 'กำลังมอเตอร์', type: 'number', unit: 'kW' },
      { key: 'rpm', label: 'ความเร็วพิกัด', type: 'number', unit: 'rpm' },
      { key: 'process', label: 'ผลต่อกระบวนการ', type: 'select', options: ['none', 'pump'] },
    ],
    desc: 'มอเตอร์เหนี่ยวนำ 3 เฟส',
  }),
  def({
    type: 'pump3', cat: 'load', name: 'Centrifugal Pump 3φ', short: 'PUMP', icon: 'pump', symbol: 'pump', beh: 'motor3',
    brands: [['Grundfos', 'CR 15-3'], ['KSB', 'Etanorm 50-200'], ['Ebara', '3M 40-200'], ['Wilo', 'Helix V'], ['Lowara', 'e-SV']],
    l: [['U', 'U/V/W', 'P3'], ['PE', 'PE', 'PE']],
    w: 130,
    props: { kw: 7.5, rpm: 2900, process: 'pump' },
    pd: [
      { key: 'kw', label: 'กำลังมอเตอร์', type: 'number', unit: 'kW' },
      { key: 'rpm', label: 'ความเร็วพิกัด', type: 'number', unit: 'rpm' },
      { key: 'process', label: 'ผลต่อกระบวนการ', type: 'select', options: ['pump', 'none'] },
    ],
    desc: 'ปั๊มน้ำ — สร้างแรงดัน อัตราการไหล และเติมระดับถัง',
  }),
  def({
    type: 'pilot', cat: 'load', name: 'Pilot Lamp 24VDC', short: 'PILOT', icon: 'lamp', symbol: 'lamp', beh: 'load_dc',
    brands: [['Schneider Electric', 'Harmony XB7EV'], ['IDEC', 'YW1P-1EQ4'], ['Siemens', '3SU1106-6AA'], ['Omron', 'M22N-BC'], ['Autonics', 'L2RR-L2'], ['Fuji Electric', 'DR22D0L']],
    l: [['P', 'X1', 'X'], ['M', 'X2', 'DC-']],
    w: 120,
    props: { power: 1, color: 'green' },
    pd: [
      { key: 'color', label: 'สี', type: 'select', options: ['green', 'red', 'yellow', 'blue', 'white'] },
      { key: 'power', label: 'กำลังไฟ', type: 'number', unit: 'W' },
    ],
    desc: 'ไพลอตแลมป์แสดงสถานะบนหน้าตู้',
  }),
  def({
    type: 'buzzer', cat: 'load', name: 'Alarm Buzzer 24VDC', short: 'BUZZER', icon: 'buzzer', symbol: 'buzzer', beh: 'load_dc',
    brands: [['Patlite', 'BD-24A'], ['Autonics', 'BZ-24'], ['IDEC', 'UPA-2'], ['Werma', '107'], ['Qlight', 'SDN']],
    l: [['P', '+', 'X'], ['M', '−', 'DC-']],
    w: 120,
    props: { power: 2 },
    pd: [{ key: 'power', label: 'กำลังไฟ', type: 'number', unit: 'W' }],
    desc: 'ออดเตือนภัย',
  }),
  def({
    type: 'valve', cat: 'load', name: 'Solenoid Valve 24VDC', short: 'SOL VALVE', icon: 'valve', symbol: 'valve', beh: 'load_dc',
    brands: [['Festo', 'VUVG-L14'], ['SMC', 'SY5120-5DZ'], ['ASCO', '8210G'], ['Bürkert', '6013'], ['Parker', 'Skinner 71']],
    l: [['P', '+', 'X'], ['M', '−', 'DC-']],
    w: 120,
    props: { power: 4 },
    pd: [{ key: 'power', label: 'กำลังไฟ', type: 'number', unit: 'W' }],
    desc: 'โซลินอยด์วาล์ว เปิด-ปิดลม/น้ำ',
  }),
  def({
    type: 'dcfan', cat: 'load', name: 'Cabinet Fan 24VDC', short: 'DC FAN', icon: 'fan', symbol: 'motor1', beh: 'load_dc',
    brands: [['Rittal', 'SK 3238'], ['Pfannenberg', 'PF 11000'], ['ebm-papst', '4114 N'], ['Stego', 'FPI 018']],
    l: [['P', '+', 'X'], ['M', '−', 'DC-']],
    w: 120,
    props: { power: 8 },
    pd: [{ key: 'power', label: 'กำลังไฟ', type: 'number', unit: 'W' }],
    desc: 'พัดลมระบายความร้อนตู้ไฟ',
  }),
  def({
    type: 'tower', cat: 'load', name: 'Signal Tower 3 Colors', short: 'SIGNAL TOWER', icon: 'tower', symbol: 'tower', beh: 'tower',
    brands: [['Patlite', 'LR6-302WJBW-RYG'], ['Werma', 'KombiSIGN 71'], ['Schneider Electric', 'Harmony XVB'], ['Autonics', 'PTE-WS'], ['Banner', 'TL50'], ['Qlight', 'ST56EL']],
    l: [['R', 'RED', 'X'], ['Y', 'YEL', 'X'], ['G', 'GRN', 'X'], ['M', '0V', 'DC-']],
    w: 120,
    desc: 'ทาวเวอร์ไลท์แสดงสถานะเครื่องจักร แดง/เหลือง/เขียว',
  }),

  // ───────────── DISPLAY ─────────────
  def({
    type: 'hmi', cat: 'display', name: 'HMI Touch Panel 7"', short: 'HMI', icon: 'screen', symbol: 'display', beh: 'hmi',
    brands: [
      ['Weintek', 'cMT3072XH'], ['Siemens', 'SIMATIC KTP700 Basic'], ['Pro-face', 'GP4501TW'], ['Mitsubishi Electric', 'GOT2000 GT2107'],
      ['Omron', 'NB7W-TW01B'], ['Delta', 'DOP-107EV'], ['Schneider Electric', 'Harmony GTU'], ['Allen-Bradley', 'PanelView 800'],
    ],
    l: [['VP', '+24V', 'DC+'], ['VM', '0V', 'DC-']],
    b: [['ETH', 'ETH', 'ETH'], ['485', 'COM', '485']],
    w: 220, h: 160,
    desc: 'จอสัมผัส HMI แสดงค่าแท็กจาก PLC/อุปกรณ์ที่เชื่อมต่อเครือข่ายเดียวกัน',
  }),
  def({
    type: 'scada', cat: 'display', name: 'SCADA Workstation', short: 'SCADA PC', icon: 'pc', symbol: 'display', beh: 'scada',
    brands: [
      ['Siemens', 'WinCC Unified on IPC 547J'], ['AVEVA', 'InTouch HMI'], ['Inductive Automation', 'Ignition'], ['Advantech', 'WebAccess/SCADA'],
      ['Rockwell', 'FactoryTalk View SE'], ['Dell', 'Precision + Node-RED'], ['Schneider Electric', 'EcoStruxure Geo SCADA'],
    ],
    l: [['L', 'L', 'L'], ['N', 'N', 'N']],
    b: [['ETH', 'ETH', 'ETH'], ['HDMI', 'HDMI', 'HDMI']],
    w: 260, h: 180,
    desc: 'คอมพิวเตอร์ SCADA แสดงข้อมูลทั้งระบบพร้อมกราฟแนวโน้ม ต่อจอใหญ่ผ่าน HDMI',
  }),
  def({
    type: 'monitor', cat: 'display', name: 'Monitor / Video Wall 55"', short: 'MONITOR', icon: 'screen', symbol: 'display', beh: 'monitor',
    brands: [['Samsung', 'Smart Signage QM55'], ['LG', '55UH5J'], ['Dell', 'P5524Q'], ['ViewSonic', 'CDE5520'], ['Philips', '55BDL']],
    l: [['L', 'L', 'L'], ['N', 'N', 'N']],
    b: [['HDMI', 'HDMI IN', 'HDMI']],
    w: 280, h: 180,
    desc: 'จอมอนิเตอร์ขนาดใหญ่ แสดงภาพจาก SCADA PC ผ่าน HDMI',
  }),
  def({
    type: 'pmeter', cat: 'display', name: 'Digital Panel Meter', short: 'PANEL METER', icon: 'meter', symbol: 'pmeter', beh: 'pmeter',
    brands: [['Autonics', 'MT4W-DA-4N'], ['Omron', 'K3HB-X'], ['Red Lion', 'PAX2A'], ['Hanyoung', 'MP5W'], ['Shinko', 'DCL-33A']],
    l: [['L', 'L', 'L'], ['N', 'N', 'N'], ['IN', '4-20mA', 'AI']],
    w: 160,
    props: { decimals: 1 },
    pd: [{ key: 'decimals', label: 'ทศนิยม', type: 'number', min: 0, max: 3 }],
    desc: 'มิเตอร์แสดงค่าสัญญาณ 4-20mA ต่อตรงจากทรานสมิตเตอร์',
  }),
  def({
    type: 'led', cat: 'display', name: 'LED Andon Display', short: 'ANDON LED', icon: 'led', symbol: 'display', beh: 'led',
    brands: [['Patlite', 'LA6 Andon'], ['Advantech', 'Andon Board'], ['Weintek', 'cMT Viewer LED'], ['Siemens', 'SIMATIC Andon'], ['Generic', 'P10 RGB Matrix']],
    l: [['VP', '+24V', 'DC+'], ['VM', '0V', 'DC-']],
    b: [['ETH', 'ETH', 'ETH']],
    w: 260, h: 100,
    desc: 'ป้ายไฟ LED แสดงค่าแบบวิ่ง และแจ้งเตือนสัญญาณ Alarm',
  }),
  def({
    type: 'cloud', cat: 'display', name: 'Cloud IoT Dashboard', short: 'CLOUD', icon: 'cloud', symbol: 'cloud', beh: 'cloud',
    brands: [['AWS IoT', 'SiteWise Monitor'], ['Microsoft Azure', 'IoT Central'], ['ThingsBoard', 'ThingsBoard PE'], ['Node-RED', 'Dashboard 2.0'], ['Grafana', 'Grafana Cloud'], ['Siemens', 'Insights Hub']],
    w: 240, h: 160,
    desc: 'แดชบอร์ดบนคลาวด์ รับข้อมูลจากเราเตอร์ 4G (ไม่ต้องเดินสาย)',
  }),

  // ───────────── WIRING ─────────────
  def({
    type: 'tb4', cat: 'wiring', name: 'Terminal Block 4-Way', short: 'TERMINAL', icon: 'tb', symbol: 'tb', beh: 'tb',
    brands: [['Phoenix Contact', 'UT 4-QUATTRO'], ['Weidmüller', 'A4C 4'], ['WAGO', '2002-1401'], ['Dinkle', 'DK4N'], ['ABB', 'Entrelec SNK']],
    l: [['A', '1', 'X'], ['B', '2', 'X']], r: [['C', '3', 'X'], ['D', '4', 'X']],
    w: 80, h: 80,
    links: { main: [['A', 'B'], ['A', 'C'], ['A', 'D']] },
    desc: 'เทอร์มินอลเชื่อมสาย 4 จุดที่ต่อถึงกัน (ใช้ทำจุดพ่วง/บัส)',
  }),
  def({
    type: 'dist', cat: 'wiring', name: 'Distribution Block 1→5', short: 'DIST BLOCK', icon: 'tb', symbol: 'tb', beh: 'tb',
    brands: [['Phoenix Contact', 'PTFIX 6X2,5'], ['WAGO', '2002-1301 bridge'], ['Weidmüller', 'WPD 102'], ['Schneider Electric', 'Linergy DX']],
    l: [['in', 'IN', 'X']], r: [['o1', '1', 'X'], ['o2', '2', 'X'], ['o3', '3', 'X'], ['o4', '4', 'X'], ['o5', '5', 'X']],
    w: 80,
    links: { main: [['in', 'o1'], ['in', 'o2'], ['in', 'o3'], ['in', 'o4'], ['in', 'o5']] },
    desc: 'บล็อกกระจายไฟ 1 เข้า 5 ออก',
  }),
  def({
    type: 'bus3', cat: 'wiring', name: '3φ Busbar Splitter', short: '3φ BUSBAR', icon: 'tb', symbol: 'tb', beh: 'tb',
    brands: [['Schneider Electric', 'Linergy BS'], ['ABB', 'PS1-3'], ['Siemens', '5ST3'], ['Eaton', 'EVG-3PHAS']],
    l: [['in', 'IN', 'P3']], r: [['o1', '1', 'P3'], ['o2', '2', 'P3'], ['o3', '3', 'P3']],
    w: 80,
    links: { main: [['in', 'o1'], ['in', 'o2'], ['in', 'o3']] },
    desc: 'บัสบาร์แยกไฟ 3 เฟสไปหลายวงจร',
  }),
];

export const DEF_MAP: Record<string, CompDef> = Object.fromEntries(DEFS.map((d) => [d.type, d]));

export const ALL_BRANDS = Array.from(new Set(DEFS.flatMap((d) => d.brands.map((b) => b.brand)))).sort((a, b) => a.localeCompare(b));

export const KIND_GROUP: Record<PortKind, string> = {
  L: 'pow', N: 'pow', PE: 'pow', P3: 'pow', MV: 'mv', 'DC+': 'pow', 'DC-': 'pow', X: 'pow', AI: 'ana', '485': '485', ETH: 'eth', HDMI: 'hdmi',
};

export function compatible(a: PortKind, b: PortKind): boolean {
  const ga = KIND_GROUP[a];
  const gb = KIND_GROUP[b];
  if (ga === gb) return true;
  if ((a === 'X' && gb === 'ana') || (b === 'X' && ga === 'ana')) return true;
  return false;
}

export const KIND_COLOR: Record<PortKind, string> = {
  L: '#c2703d',
  N: '#4f8ff7',
  PE: '#4ade80',
  P3: '#a1a1aa',
  MV: '#fb7185',
  'DC+': '#ef4444',
  'DC-': '#6366f1',
  X: '#cbd5e1',
  AI: '#f59e0b',
  '485': '#facc15',
  ETH: '#14b8a6',
  HDMI: '#c084fc',
};

export const KIND_NAME: Record<PortKind, string> = {
  L: 'Line (L) 230VAC',
  N: 'Neutral (N)',
  PE: 'Protective Earth (PE)',
  P3: '3-Phase L1/L2/L3 400VAC',
  MV: 'Medium voltage 22kV',
  'DC+': '+24VDC',
  'DC-': '0V DC',
  X: 'Conductor (ทั่วไป)',
  AI: 'Analog 4-20mA',
  '485': 'RS485 Modbus RTU',
  ETH: 'Ethernet / Modbus TCP',
  HDMI: 'HDMI Video',
};

export const COMM_KINDS: PortKind[] = ['485', 'ETH', 'HDMI'];
