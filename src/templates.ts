import type { Comp, Design, Wire } from './types';
import { DEF_MAP } from './library';

let uid = 0;
export const newId = (p = 'c') => `${p}${Date.now().toString(36)}${(uid++).toString(36)}`;

class B {
  comps: Comp[] = [];
  wires: Wire[] = [];
  add(type: string, x: number, y: number, label: string, props: Record<string, any> = {}, brandIdx = 0) {
    const df = DEF_MAP[type];
    if (!df) throw new Error('unknown type ' + type);
    const br = df.brands[Math.min(brandIdx, df.brands.length - 1)];
    const id = newId();
    this.comps.push({ id, type, x, y, label, brand: br.brand, model: br.model, props: { ...df.props, ...props } });
    return id;
  }
  w(a: string, pa: string, b: string, pb: string) {
    this.wires.push({ id: newId('w'), a: { c: a, p: pa }, b: { c: b, p: pb } });
  }
}

export interface Template {
  id: string;
  name: string;
  desc: string;
  group: 'simple' | 'plant' | 'full';
  build: () => Design;
}

function sensorPlcHmi(): Design {
  const b = new B();
  const G = b.add('grid1', 20, 30, 'GRID');
  const PS = b.add('psu24', 220, 50, 'PS1 · 24V DC', {}, 0);
  const B1 = b.add('prox', 430, 50, 'B1 · Proximity', { mode: 'auto', period: 4 }, 0);
  const PLC = b.add('plc', 680, 10, 'PLC1 · Controller', { do1_mode: 'DI1', do2_mode: 'OFF', do3_mode: 'OFF', do4_mode: 'OFF' }, 0);
  const SW = b.add('eswitch', 960, 50, 'SW1 · Ethernet', {}, 0);
  const HMI = b.add('hmi', 1240, 30, 'HMI1 · Process', {}, 0);
  const H1 = b.add('pilot', 680, 280, 'H1 · Detect', { color: 'green' }, 0);
  b.w(G, 'L', PS, 'L');
  b.w(G, 'N', PS, 'N');
  for (const n of [B1, PLC, SW, HMI]) {
    const pwr = n === PLC || n === SW || n === HMI ? ['VP', 'VM'] : ['P', 'M'];
    b.w(n, pwr[0], PS, 'P');
    b.w(n, pwr[1], PS, 'M');
  }
  b.w(B1, 'OUT', PLC, 'DI1');
  b.w(PLC, 'DO1', H1, 'P');
  b.w(H1, 'M', PS, 'M');
  b.w(PLC, 'ETH', SW, 'E1');
  b.w(SW, 'E2', HMI, 'ETH');
  return { name: 'Sensor → PLC → HMI', comps: b.comps, wires: b.wires };
}

function relayMotor(): Design {
  const b = new B();
  const G = b.add('grid3', 20, 20, 'GRID', {}, 0);
  const Q = b.add('mccb3', 240, 30, 'Q1', { rating: 32 }, 0);
  const K = b.add('contactor', 460, 20, 'K1 · Contactor', {}, 0);
  const M = b.add('motor3', 720, 40, 'M1 · Motor', { kw: 2.2, process: 'none' }, 0);
  const PS = b.add('psu24', 240, 280, 'PS1 · 24V', {}, 0);
  const S = b.add('switch1', 20, 290, 'S1 · Enable', { on: false }, 0);
  const H = b.add('pilot', 520, 290, 'H1 · RUN', { color: 'green' }, 0);
  b.w(G, 'P3', Q, 'in');
  b.w(Q, 'out', K, 'in');
  b.w(K, 'out', M, 'U');
  b.w(G, 'PE', M, 'PE');
  b.w(G, 'L1', PS, 'L');
  b.w(G, 'N', PS, 'N');
  b.w(PS, 'P', S, 'in');
  b.w(S, 'out', K, 'A1');
  b.w(K, 'A2', PS, 'M');
  b.w(S, 'out', H, 'P');
  b.w(H, 'M', PS, 'M');
  return { name: 'Relay & motor control', comps: b.comps, wires: b.wires };
}

function analogDisplay(): Design {
  const b = new B();
  const G = b.add('grid1', 20, 40, 'GRID', {}, 0);
  const PS = b.add('psu24', 240, 50, 'PS1 · 24V', {}, 0);
  const PT = b.add('pressure_tx', 460, 50, 'PT1 · Pressure', { mode: 'wave', period: 12, hi: 8, lo: '' }, 0);
  const PM = b.add('pmeter', 720, 40, 'PM1 · Display', { decimals: 2 }, 0);
  b.w(G, 'L', PS, 'L');
  b.w(G, 'N', PS, 'N');
  b.w(G, 'L', PM, 'L');
  b.w(G, 'N', PM, 'N');
  b.w(PT, 'P', PS, 'P');
  b.w(PT, 'M', PS, 'M');
  b.w(PT, 'OUT', PM, 'IN');
  return { name: 'Analog sensor display', comps: b.comps, wires: b.wires };
}

function ledCircuit(): Design {
  const b = new B();
  const G = b.add('grid1', 20, 40, 'GRID', {}, 0);
  const PS = b.add('psu24', 240, 50, 'PS1 · 24V', {}, 0);
  const S = b.add('switch1', 460, 50, 'S1 · Switch', { on: false }, 1);
  const H = b.add('pilot', 680, 50, 'LED1 · Green', { color: 'green' }, 0);
  b.w(G, 'L', PS, 'L');
  b.w(G, 'N', PS, 'N');
  b.w(PS, 'P', S, 'in');
  b.w(S, 'out', H, 'P');
  b.w(H, 'M', PS, 'M');
  return { name: 'LED indicator circuit', comps: b.comps, wires: b.wires };
}

function processSiemens(): Design {
  const b = new B();
  const G = b.add('grid1', 20, 20, 'GRID', {}, 0);
  const PS = b.add('psu24', 220, 40, 'PS1 · Siemens SITOP', {}, 2);
  const PT = b.add('pressure_tx', 430, 40, 'PT1 · Pressure', { mode: 'wave', period: 12, hi: 8, lo: '' }, 3);
  const PLC = b.add('plc', 680, 0, 'PLC1 · SIMATIC', { do1_mode: 'AI1>SP', do1_sp: 6.5, do2_mode: 'OFF', do3_mode: 'OFF', do4_mode: 'OFF' }, 0);
  const SW = b.add('eswitch', 980, 40, 'SW1 · SCALANCE', {}, 4);
  const HMI = b.add('hmi', 1260, 20, 'HMI1 · SIMATIC', {}, 1);
  const H1 = b.add('pilot', 680, 280, 'H1 · Pressure high', { color: 'red' }, 2);
  b.w(G, 'L', PS, 'L');
  b.w(G, 'N', PS, 'N');
  for (const n of [PT, PLC, SW, HMI]) {
    const pwr = n === PT ? ['P', 'M'] : ['VP', 'VM'];
    b.w(n, pwr[0], PS, 'P');
    b.w(n, pwr[1], PS, 'M');
  }
  b.w(PT, 'OUT', PLC, 'AI1');
  b.w(PLC, 'DO1', H1, 'P');
  b.w(H1, 'M', PS, 'M');
  b.w(PLC, 'ETH', SW, 'E1');
  b.w(SW, 'E2', HMI, 'ETH');
  return { name: 'Process data · Siemens', comps: b.comps, wires: b.wires };
}

function timerSchneider(): Design {
  const b = new B();
  const G = b.add('grid1', 20, 40, 'GRID', {}, 0);
  const PS = b.add('psu24', 240, 50, 'PS1 · 24V', {}, 6);
  const S = b.add('switch1', 460, 50, 'S1 · Enable', { on: true }, 1);
  const T = b.add('timer', 680, 40, 'KT1 · TON 3s', { delay: 3 }, 3);
  const H = b.add('pilot', 920, 50, 'H1 · Delayed', { color: 'yellow' }, 0);
  b.w(G, 'L', PS, 'L');
  b.w(G, 'N', PS, 'N');
  b.w(PS, 'P', S, 'in');
  b.w(S, 'out', T, 'A1');
  b.w(T, 'A2', PS, 'M');
  b.w(PS, 'P', T, 'COM');
  b.w(T, 'NO', H, 'P');
  b.w(H, 'M', PS, 'M');
  return { name: 'Timer relay · Schneider', comps: b.comps, wires: b.wires };
}

function factory(): Design {
  const b = new B();
  const G1 = b.add('grid3', 40, 40, 'GRID-1');
  const Q1 = b.add('mccb3', 240, 40, 'Q1 MAIN', { rating: 63 });
  const EM = b.add('emeter', 440, 40, 'EM-01', {}, 0);
  const VFD = b.add('vfd', 680, 40, 'VFD-101', { freq: 50, accel: 4 }, 0);
  const P101 = b.add('pump3', 940, 40, 'P-101', {}, 0);
  b.w(G1, 'P3', Q1, 'in');
  b.w(Q1, 'out', EM, 'in');
  b.w(EM, 'out', VFD, 'in');
  b.w(VFD, 'out', P101, 'U');
  b.w(G1, 'PE', P101, 'PE');

  const Q2 = b.add('mcb2', 240, 220, 'Q2 CTRL', { rating: 16 });
  const PSU = b.add('psu24', 440, 220, 'PSU-1', {}, 0);
  b.w(G1, 'L1', Q2, 'L1');
  b.w(G1, 'N', Q2, 'N1');
  b.w(Q2, 'L2', PSU, 'L');
  b.w(Q2, 'N2', PSU, 'N');

  const TT = b.add('temp_tx', 40, 400, 'TT-101', { hi: 75, lo: 20 }, 0);
  const PT = b.add('pressure_tx', 40, 520, 'PT-101', { hi: 6.5, lo: '' }, 0);
  const FT = b.add('flow_tx', 40, 640, 'FT-101', { hi: '', lo: '' }, 0);
  const LT = b.add('level_tx', 40, 760, 'LT-101', { hi: 4.6, lo: 0.6 }, 0);
  const PLC = b.add('plc', 360, 420, 'PLC-1', {
    do1_mode: 'AI1<SP', do1_sp: 60,
    do2_mode: 'START DI1 / STOP DI2', do2_sp: 0,
    do3_mode: 'ANY ALARM', do3_sp: 0,
    do4_mode: 'START DI1 / STOP DI2', do4_sp: 0,
  }, 0);
  [TT, PT, FT, LT].forEach((s, i) => {
    b.w(s, 'P', PSU, 'P');
    b.w(s, 'M', PSU, 'M');
    b.w(s, 'OUT', PLC, `AI${i + 1}`);
  });
  b.w(PLC, 'VP', PSU, 'P');
  b.w(PLC, 'VM', PSU, 'M');

  const K1 = b.add('relay', 660, 400, 'K1 HEATER', {}, 0);
  const H1 = b.add('heater', 900, 400, 'EH-101', { power: 2000 }, 0);
  b.w(PLC, 'DO1', K1, 'A1');
  b.w(K1, 'A2', PSU, 'M');
  b.w(K1, 'COM', Q2, 'L2');
  b.w(K1, 'NO', H1, 'L');
  b.w(H1, 'N', Q2, 'N2');

  const S1 = b.add('pb_no', 660, 540, 'S1 START', {}, 0);
  const S2 = b.add('pb_nc', 660, 640, 'S2 STOP', {}, 0);
  b.w(S1, 'in', PLC, 'DI1');
  b.w(S1, 'out', PSU, 'P');
  b.w(S2, 'in', PLC, 'DI2');
  b.w(S2, 'out', PSU, 'P');
  b.w(PLC, 'DO2', VFD, 'RUN');

  const TW = b.add('tower', 900, 540, 'TW-1', {}, 0);
  b.w(PLC, 'DO3', TW, 'R');
  b.w(PLC, 'DO4', TW, 'G');
  b.w(TW, 'M', PSU, 'M');

  const PM = b.add('pmeter', 40, 880, 'TI-101', { decimals: 1 }, 0);
  b.w(PM, 'L', Q2, 'L2');
  b.w(PM, 'N', Q2, 'N2');
  b.w(PM, 'IN', TT, 'OUT');

  const ESW = b.add('eswitch', 360, 720, 'SW-ETH-1', {}, 0);
  b.w(ESW, 'VP', PSU, 'P');
  b.w(ESW, 'VM', PSU, 'M');
  const HMI = b.add('hmi', 300, 880, 'HMI-1', {}, 0);
  b.w(HMI, 'VP', PSU, 'P');
  b.w(HMI, 'VM', PSU, 'M');
  const PC = b.add('scada', 580, 880, 'SCADA-1', {}, 2);
  b.w(PC, 'L', Q2, 'L2');
  b.w(PC, 'N', Q2, 'N2');
  const MON = b.add('monitor', 900, 880, 'WALL-1', {}, 0);
  b.w(MON, 'L', Q2, 'L2');
  b.w(MON, 'N', Q2, 'N2');
  b.w(PC, 'HDMI', MON, 'HDMI');

  b.w(PLC, 'ETH', ESW, 'E1');
  b.w(ESW, 'E2', HMI, 'ETH');
  b.w(ESW, 'E3', PC, 'ETH');
  b.w(ESW, 'E4', EM, 'ETH');
  b.w(ESW, 'E5', VFD, 'ETH');
  return { name: 'Factory: Sensor Field → PLC → SCADA', comps: b.comps, wires: b.wires };
}

function dol(): Design {
  const b = new B();
  const G1 = b.add('grid3', 40, 40, 'GRID-1');
  const Q1 = b.add('mccb3', 240, 40, 'Q1', { rating: 32 }, 1);
  const KM = b.add('contactor', 440, 40, 'KM1', {}, 0);
  const F1 = b.add('overload', 680, 40, 'F1 OLR', { setting: 14 }, 0);
  const M1 = b.add('motor3', 920, 40, 'M1 CONVEYOR', { kw: 5.5 }, 0);
  b.w(G1, 'P3', Q1, 'in');
  b.w(Q1, 'out', KM, 'in');
  b.w(KM, 'out', F1, 'in');
  b.w(F1, 'out', M1, 'U');
  b.w(G1, 'PE', M1, 'PE');

  const Q2 = b.add('mcb2', 240, 240, 'Q2', { rating: 6 }, 1);
  const PSU = b.add('psu24', 440, 240, 'PSU-1', {}, 2);
  b.w(G1, 'L1', Q2, 'L1');
  b.w(G1, 'N', Q2, 'N1');
  b.w(Q2, 'L2', PSU, 'L');
  b.w(Q2, 'N2', PSU, 'N');

  const FU = b.add('fuse', 680, 240, 'FU1', { rating: 2 }, 0);
  b.w(PSU, 'P', FU, 'in');
  const S0 = b.add('estop', 40, 420, 'S0 E-STOP', {}, 0);
  const S2 = b.add('pb_nc', 240, 420, 'S2 STOP', {}, 0);
  const S1 = b.add('pb_no', 440, 420, 'S1 START', {}, 0);
  b.w(FU, 'out', F1, 'a95');
  b.w(F1, 'a96', S0, 'in');
  b.w(S0, 'out', S2, 'in');
  b.w(S2, 'out', S1, 'in');
  b.w(S2, 'out', KM, 'a13');
  b.w(S1, 'out', KM, 'A1');
  b.w(KM, 'a14', KM, 'A1');
  b.w(KM, 'A2', PSU, 'M');

  const H1 = b.add('pilot', 680, 420, 'H1 RUN', { color: 'green' }, 0);
  const H2 = b.add('pilot', 680, 520, 'H2 TRIP', { color: 'red' }, 0);
  const H3 = b.add('pilot', 680, 620, 'H3 STOP', { color: 'yellow' }, 0);
  b.w(H1, 'P', KM, 'A1');
  b.w(H1, 'M', PSU, 'M');
  b.w(FU, 'out', F1, 'a97');
  b.w(F1, 'a98', H2, 'P');
  b.w(H2, 'M', PSU, 'M');
  b.w(FU, 'out', KM, 'a21');
  b.w(KM, 'a22', H3, 'P');
  b.w(H3, 'M', PSU, 'M');

  const VT = b.add('vib_tx', 900, 240, 'VT-201', {}, 0);
  const PM = b.add('pmeter', 900, 400, 'VI-201', { decimals: 2 }, 0);
  b.w(VT, 'P', PSU, 'P');
  b.w(VT, 'M', PSU, 'M');
  b.w(VT, 'OUT', PM, 'IN');
  b.w(PM, 'L', Q2, 'L2');
  b.w(PM, 'N', Q2, 'N2');
  return { name: 'Motor DOL Start/Stop + Overload', comps: b.comps, wires: b.wires };
}

function house(): Design {
  const b = new B();
  const G1 = b.add('grid1', 40, 40, 'MEA 1φ', {}, 1);
  const Q0 = b.add('mcb2', 240, 40, 'MAIN 50A', { rating: 50 }, 0);
  const SPD = b.add('spd', 240, 200, 'SPD', {}, 0);
  b.w(G1, 'L', Q0, 'L1');
  b.w(G1, 'N', Q0, 'N1');
  b.w(SPD, 'L', Q0, 'L2');
  b.w(SPD, 'N', Q0, 'N2');
  b.w(SPD, 'PE', G1, 'PE');

  const Q1 = b.add('mcb1', 460, 20, 'C1 LIGHT 10A', { rating: 10 }, 0);
  const SW1 = b.add('switch1', 660, 20, 'SW1', { on: true }, 0);
  const LP1 = b.add('lamp', 860, 20, 'LIVING', {}, 0);
  const LP2 = b.add('lamp', 860, 120, 'KITCHEN', {}, 2);
  const SW2 = b.add('switch1', 660, 120, 'SW2', { on: false }, 0);
  b.w(Q0, 'L2', Q1, 'in');
  b.w(Q1, 'out', SW1, 'in');
  b.w(Q1, 'out', SW2, 'in');
  b.w(SW1, 'out', LP1, 'L');
  b.w(SW2, 'out', LP2, 'L');
  b.w(LP1, 'N', Q0, 'N2');
  b.w(LP2, 'N', Q0, 'N2');

  const RC = b.add('rcbo', 460, 240, 'C2 SOCKET RCBO', { rating: 16 }, 0);
  const SO1 = b.add('socket', 660, 240, 'SOCKET-1', { power: 800 }, 0);
  const SO2 = b.add('socket', 860, 240, 'SOCKET-2 (เครื่องซักผ้า)', { power: 1200 }, 1);
  b.w(Q0, 'L2', RC, 'L1');
  b.w(Q0, 'N2', RC, 'N1');
  b.w(RC, 'L2', SO1, 'L');
  b.w(RC, 'N2', SO1, 'N');
  b.w(RC, 'L2', SO2, 'L');
  b.w(RC, 'N2', SO2, 'N');
  b.w(SO1, 'PE', G1, 'PE');
  b.w(SO2, 'PE', G1, 'PE');

  const Q3 = b.add('mcb1', 460, 420, 'C3 AIR 20A', { rating: 20 }, 0);
  const AC = b.add('aircon', 660, 420, 'AIR BEDROOM', {}, 0);
  b.w(Q0, 'L2', Q3, 'in');
  b.w(Q3, 'out', AC, 'L');
  b.w(AC, 'N', Q0, 'N2');

  const Q4 = b.add('mcb1', 460, 540, 'C4 HEATER 16A', { rating: 16 }, 0);
  const WH = b.add('heater', 660, 540, 'WATER HEATER', { power: 4500, process: 'none' }, 0);
  b.w(Q0, 'L2', Q4, 'in');
  b.w(Q4, 'out', WH, 'L');
  b.w(WH, 'N', Q0, 'N2');
  return { name: 'Home Wiring: RCBO + Lighting + Sockets', comps: b.comps, wires: b.wires };
}

function iot(): Design {
  const b = new B();
  const G1 = b.add('grid1', 40, 40, 'GRID', {}, 0);
  const Q1 = b.add('mcb2', 240, 40, 'Q1', { rating: 10 }, 0);
  const PSU = b.add('psu24', 440, 40, 'PSU-1', {}, 0);
  b.w(G1, 'L', Q1, 'L1');
  b.w(G1, 'N', Q1, 'N1');
  b.w(Q1, 'L2', PSU, 'L');
  b.w(Q1, 'N2', PSU, 'N');

  b.add('lora_th', 40, 240, 'COLD-ROOM-1', {}, 0);
  b.add('lora_th', 40, 340, 'COLD-ROOM-2', {}, 1);
  b.add('lora_th', 40, 440, 'WAREHOUSE', {}, 2);
  const LGW = b.add('lora_gw', 240, 300, 'LoRa-GW', {}, 0);
  const MB = b.add('modbus_th', 440, 220, 'RS485-TH1', {}, 0);
  const GW = b.add('gateway', 440, 340, 'MGATE-1', {}, 0);
  const ESW = b.add('eswitch', 260, 520, 'SW-1', {}, 0);
  const R1 = b.add('router', 660, 260, 'RUT-4G', {}, 0);
  const CL = b.add('cloud', 880, 220, 'CLOUD', {}, 2);
  const LED = b.add('led', 660, 480, 'ANDON', {}, 0);
  for (const d of [LGW, MB, GW, ESW, R1, LED]) {
    const df = DEF_MAP[b.comps.find((c) => c.id === d)!.type];
    const pp = df.ports.find((p) => p.id === 'VP') ? ['VP', 'VM'] : ['P', 'M'];
    b.w(d, pp[0], PSU, 'P');
    b.w(d, pp[1], PSU, 'M');
  }
  void CL;
  b.w(MB, '485', GW, '485');
  b.w(LGW, 'ETH', ESW, 'E1');
  b.w(GW, 'ETH', ESW, 'E2');
  b.w(ESW, 'E3', R1, 'E1');
  b.w(ESW, 'E4', LED, 'ETH');
  return { name: 'IoT: LoRaWAN + Modbus → 4G → Cloud', comps: b.comps, wires: b.wires };
}

function backup(): Design {
  const b = new B();
  const G1 = b.add('grid3', 40, 40, 'GRID-1');
  const GEN = b.add('gen', 40, 220, 'GEN-1', { auto: true, startDelay: 4 }, 0);
  const ATS = b.add('ats', 260, 120, 'ATS-1', {}, 0);
  const Q1 = b.add('mccb3', 480, 120, 'Q1', { rating: 63 }, 0);
  const EM = b.add('emeter', 680, 120, 'EM-MAIN', {}, 1);
  const M1 = b.add('pump3', 920, 120, 'FIRE PUMP', { process: 'pump' }, 0);
  b.w(G1, 'P3', ATS, 'I1');
  b.w(GEN, 'P3', ATS, 'I2');
  b.w(ATS, 'O', Q1, 'in');
  b.w(Q1, 'out', EM, 'in');
  b.w(EM, 'out', M1, 'U');
  b.w(G1, 'PE', M1, 'PE');

  const Q2 = b.add('mcb2', 260, 380, 'Q2 IT', { rating: 10 }, 0);
  const UPS = b.add('ups', 480, 380, 'UPS-1', { backupMin: 3 }, 0);
  const PC = b.add('scada', 700, 360, 'SCADA', {}, 0);
  const PSU = b.add('psu24', 480, 520, 'PSU-1', {}, 0);
  const ESW = b.add('eswitch', 260, 600, 'SW-1', {}, 0);
  b.w(G1, 'L1', Q2, 'L1');
  b.w(G1, 'N', Q2, 'N1');
  b.w(Q2, 'L2', UPS, 'L');
  b.w(Q2, 'N2', UPS, 'N');
  b.w(UPS, 'OL', PC, 'L');
  b.w(UPS, 'ON', PC, 'N');
  b.w(UPS, 'OL', PSU, 'L');
  b.w(UPS, 'ON', PSU, 'N');
  b.w(ESW, 'VP', PSU, 'P');
  b.w(ESW, 'VM', PSU, 'M');
  b.w(ESW, 'E1', EM, 'ETH');
  b.w(ESW, 'E2', PC, 'ETH');
  return { name: 'Backup Power: ATS + Generator + UPS', comps: b.comps, wires: b.wires };
}

function plantPower(): Design {
  const b = new B();
  const G = b.add('grid22', 20, 50, 'PEA 22kV');
  const SWG = b.add('swg', 200, 40, 'SWG1');
  const TR = b.add('tr', 420, 20, 'TR1', { kva: 1000 });
  const MDB = b.add('mdb', 680, 10, 'MDB1');
  const Q = b.add('mccb3', 980, 30, 'Q1 MCC', { rating: 63 });
  const M = b.add('motor3', 1220, 40, 'M1', { kw: 15, process: 'none' });
  const PS = b.add('psu24', 980, 280, 'PS1');
  b.w(G, 'MV', SWG, 'IN');
  b.w(SWG, 'OUT', TR, 'HV');
  b.w(TR, 'LV', MDB, 'IN');
  b.w(TR, 'L', MDB, 'Lin');
  b.w(TR, 'N', MDB, 'N');
  b.w(TR, 'PE', MDB, 'PE');
  b.w(MDB, 'F1', Q, 'in');
  b.w(Q, 'out', M, 'U');
  b.w(MDB, 'PE', M, 'PE');
  b.w(MDB, 'L', PS, 'L');
  b.w(MDB, 'N', PS, 'N');
  return { name: 'โรงงาน: Switchgear → TR → MDB', comps: b.comps, wires: b.wires };
}

function pumpStation(): Design {
  const b = new B();
  const G = b.add('grid3', 40, 40, 'PEA 3φ 400V');
  const Q1 = b.add('mccb3', 240, 40, 'Q1 PUMP 32A', { rating: 32 }, 1);
  const KM = b.add('contactor', 460, 30, 'KM1', {}, 0);
  const F1 = b.add('overload', 700, 30, 'F1 OLR', { setting: 16 }, 0);
  const P = b.add('pump3', 940, 40, 'P-201 TRANSFER', { kw: 7.5, process: 'pump' }, 0);
  b.w(G, 'P3', Q1, 'in');
  b.w(Q1, 'out', KM, 'in');
  b.w(KM, 'out', F1, 'in');
  b.w(F1, 'out', P, 'U');
  b.w(G, 'PE', P, 'PE');

  const Q2 = b.add('mcb2', 240, 240, 'Q2 CTRL 6A', { rating: 6 }, 0);
  const PSU = b.add('psu24', 460, 240, 'PSU-1', {}, 0);
  b.w(G, 'L1', Q2, 'L1');
  b.w(G, 'N', Q2, 'N1');
  b.w(Q2, 'L2', PSU, 'L');
  b.w(Q2, 'N2', PSU, 'N');

  const LSL = b.add('float_sw', 40, 420, 'LSL-201 ต่ำ', { mode: 'process', sp: 2.5 }, 0);
  const LSH = b.add('float_sw', 40, 560, 'LSH-201 สูง', { mode: 'process', sp: 4 }, 0);
  const K1 = b.add('relay', 240, 410, 'K1 LOW', {}, 0);
  const K2 = b.add('relay', 240, 560, 'K2 HIGH', {}, 0);
  const PLC = b.add('plc', 480, 400, 'PLC-1', {
    do1_mode: 'START DI1 / STOP DI2', do1_sp: 0,
    do2_mode: 'START DI1 / STOP DI2', do2_sp: 0,
    do3_mode: 'AI1>SP', do3_sp: 3.8,
    do4_mode: 'ANY ALARM', do4_sp: 0,
  }, 0);
  for (const [ls, k, di] of [[LSL, K1, 'DI1'], [LSH, K2, 'DI2']]) {
    b.w(PSU, 'P', ls, 'COM');
    b.w(ls, 'NO', k, 'A1');
    b.w(k, 'A2', PSU, 'M');
    b.w(PSU, 'P', k, 'COM');
    b.w(k, 'NC', PLC, di);
  }
  b.w(PLC, 'VP', PSU, 'P');
  b.w(PLC, 'VM', PSU, 'M');
  b.w(PLC, 'DO1', F1, 'a95');
  b.w(F1, 'a96', KM, 'A1');
  b.w(KM, 'A2', PSU, 'M');

  const LT = b.add('level_tx', 40, 700, 'LT-201', { hi: 4.6, lo: 0.6 }, 0);
  const PT = b.add('pressure_tx', 40, 820, 'PT-201', { hi: 7.5, lo: '' }, 0);
  [LT, PT].forEach((s, i) => {
    b.w(s, 'P', PSU, 'P');
    b.w(s, 'M', PSU, 'M');
    b.w(s, 'OUT', PLC, `AI${i + 1}`);
  });

  const TW = b.add('tower', 780, 400, 'TW-201', {}, 0);
  b.w(PLC, 'DO2', TW, 'G');
  b.w(PLC, 'DO3', TW, 'Y');
  b.w(PLC, 'DO4', TW, 'R');
  b.w(TW, 'M', PSU, 'M');

  const ESW = b.add('eswitch', 480, 680, 'SW-ETH-1', {}, 0);
  const HMI = b.add('hmi', 760, 640, 'HMI-201', {}, 0);
  for (const n of [ESW, HMI]) {
    b.w(n, 'VP', PSU, 'P');
    b.w(n, 'VM', PSU, 'M');
  }
  b.w(PLC, 'ETH', ESW, 'E1');
  b.w(ESW, 'E2', HMI, 'ETH');
  return { name: 'โรงงาน: ห้องปั๊มน้ำ คุมระดับถังอัตโนมัติ', comps: b.comps, wires: b.wires };
}

function compressorRoom(): Design {
  const b = new B();
  const G = b.add('grid3', 40, 60, 'PEA 3φ 400V');
  const MDB = b.add('mdb', 240, 20, 'MDB-1 400A', { rating: 400, f3: false, f4: false }, 0);
  b.w(G, 'P3', MDB, 'IN');
  b.w(G, 'L1', MDB, 'Lin');
  b.w(G, 'N', MDB, 'N');
  b.w(G, 'PE', MDB, 'PE');

  const Q1 = b.add('mccb3', 520, 20, 'Q1 COMP 63A', { rating: 63 }, 0);
  const EM = b.add('emeter', 740, 20, 'EM-301', {}, 0);
  const VFD = b.add('vfd', 980, 10, 'VFD-301', { freq: 45, accel: 6 }, 0);
  const AC = b.add('motor3', 1240, 30, 'AC-301 COMPRESSOR', { kw: 22, rpm: 2950, process: 'pump' }, 2);
  b.w(MDB, 'F1', Q1, 'in');
  b.w(Q1, 'out', EM, 'in');
  b.w(EM, 'out', VFD, 'in');
  b.w(VFD, 'out', AC, 'U');
  b.w(MDB, 'PE', AC, 'PE');

  const Q2 = b.add('mccb3', 520, 220, 'Q2 DRYER 16A', { rating: 16 }, 1);
  const DRY = b.add('motor3', 740, 220, 'AD-301 AIR DRYER', { kw: 2.2, process: 'none' }, 4);
  b.w(MDB, 'F2', Q2, 'in');
  b.w(Q2, 'out', DRY, 'U');
  b.w(MDB, 'PE', DRY, 'PE');

  const Q3 = b.add('mcb2', 520, 400, 'Q3 CTRL 6A', { rating: 6 }, 0);
  const PSU = b.add('psu24', 740, 400, 'PSU-1', {}, 2);
  b.w(MDB, 'L', Q3, 'L1');
  b.w(MDB, 'N', Q3, 'N1');
  b.w(Q3, 'L2', PSU, 'L');
  b.w(Q3, 'N2', PSU, 'N');

  const S1 = b.add('pb_no', 40, 420, 'S1 START', {}, 0);
  const S2 = b.add('pb_nc', 40, 540, 'S2 STOP', {}, 0);
  const PT = b.add('pressure_tx', 40, 660, 'PT-301 AIR', { hi: 6.5, lo: '' }, 1);
  const VT = b.add('vib_tx', 40, 780, 'VT-301', {}, 0);
  const PLC = b.add('plc', 260, 560, 'PLC-1', {
    do1_mode: 'START DI1 / STOP DI2', do1_sp: 0,
    do2_mode: 'START DI1 / STOP DI2', do2_sp: 0,
    do3_mode: 'AI1>SP', do3_sp: 6,
    do4_mode: 'ANY ALARM', do4_sp: 0,
  }, 0);
  b.w(S1, 'in', PSU, 'P');
  b.w(S1, 'out', PLC, 'DI1');
  b.w(S2, 'in', PSU, 'P');
  b.w(S2, 'out', PLC, 'DI2');
  [PT, VT].forEach((s, i) => {
    b.w(s, 'P', PSU, 'P');
    b.w(s, 'M', PSU, 'M');
    b.w(s, 'OUT', PLC, `AI${i + 1}`);
  });
  b.w(PLC, 'VP', PSU, 'P');
  b.w(PLC, 'VM', PSU, 'M');
  b.w(PLC, 'DO1', VFD, 'RUN');

  const TW = b.add('tower', 560, 560, 'TW-301', {}, 0);
  b.w(PLC, 'DO2', TW, 'G');
  b.w(PLC, 'DO3', TW, 'Y');
  b.w(PLC, 'DO4', TW, 'R');
  b.w(TW, 'M', PSU, 'M');

  const ESW = b.add('eswitch', 260, 820, 'SW-ETH-1', {}, 0);
  const HMI = b.add('hmi', 560, 760, 'HMI-301', {}, 0);
  for (const n of [ESW, HMI]) {
    b.w(n, 'VP', PSU, 'P');
    b.w(n, 'VM', PSU, 'M');
  }
  b.w(PLC, 'ETH', ESW, 'E1');
  b.w(ESW, 'E2', HMI, 'ETH');
  b.w(ESW, 'E3', EM, 'ETH');
  b.w(ESW, 'E4', VFD, 'ETH');
  return { name: 'โรงงาน: ห้องคอมเพรสเซอร์ลม VFD', comps: b.comps, wires: b.wires };
}

function conveyorLine(): Design {
  const b = new B();
  const G = b.add('grid3', 40, 40, 'PEA 3φ 400V');
  const Q1 = b.add('mccb3', 240, 40, 'Q1 CONV 20A', { rating: 20 }, 3);
  const KM = b.add('contactor', 460, 30, 'KM1', {}, 1);
  const F1 = b.add('overload', 700, 30, 'F1 OLR', { setting: 8 }, 1);
  const M = b.add('motor3', 940, 40, 'M1 CONVEYOR', { kw: 3, process: 'none' }, 2);
  b.w(G, 'P3', Q1, 'in');
  b.w(Q1, 'out', KM, 'in');
  b.w(KM, 'out', F1, 'in');
  b.w(F1, 'out', M, 'U');
  b.w(G, 'PE', M, 'PE');

  const Q2 = b.add('mcb2', 240, 240, 'Q2 CTRL 6A', { rating: 6 }, 1);
  const PSU = b.add('psu24', 460, 240, 'PSU-1', {}, 1);
  b.w(G, 'L1', Q2, 'L1');
  b.w(G, 'N', Q2, 'N1');
  b.w(Q2, 'L2', PSU, 'L');
  b.w(Q2, 'N2', PSU, 'N');

  const S0 = b.add('estop', 40, 420, 'S0 E-STOP', {}, 0);
  const S2 = b.add('pb_nc', 40, 540, 'S2 STOP', {}, 0);
  const S1 = b.add('pb_no', 40, 660, 'S1 START', {}, 0);
  const B1 = b.add('photo', 40, 780, 'B1 ชิ้นงานเข้า', { mode: 'auto', period: 3 }, 0);
  const B2 = b.add('prox', 40, 900, 'B2 ชิ้นงานโลหะ', { mode: 'auto', period: 7 }, 1);
  const PLC = b.add('plc', 300, 440, 'PLC-1', {
    do1_mode: 'START DI1 / STOP DI2', do1_sp: 0,
    do2_mode: 'START DI1 / STOP DI2', do2_sp: 0,
    do3_mode: 'DI3', do3_sp: 0,
    do4_mode: 'DI4', do4_sp: 0,
  }, 4);
  b.w(PSU, 'P', S0, 'in');
  b.w(S0, 'out', S2, 'in');
  b.w(S2, 'out', PLC, 'DI2');
  b.w(PSU, 'P', S1, 'in');
  b.w(S1, 'out', PLC, 'DI1');
  [B1, B2].forEach((s, i) => {
    b.w(s, 'P', PSU, 'P');
    b.w(s, 'M', PSU, 'M');
    b.w(s, 'OUT', PLC, `DI${i + 3}`);
  });
  b.w(PLC, 'VP', PSU, 'P');
  b.w(PLC, 'VM', PSU, 'M');
  b.w(PLC, 'DO1', F1, 'a95');
  b.w(F1, 'a96', KM, 'A1');
  b.w(KM, 'A2', PSU, 'M');

  const TW = b.add('tower', 620, 420, 'TW-1', {}, 0);
  const Y1 = b.add('valve', 620, 580, 'Y1 คัดแยก', {}, 0);
  b.w(PLC, 'DO2', TW, 'G');
  b.w(PLC, 'DO3', TW, 'Y');
  b.w(PSU, 'P', F1, 'a97');
  b.w(F1, 'a98', TW, 'R');
  b.w(TW, 'M', PSU, 'M');
  b.w(PLC, 'DO4', Y1, 'P');
  b.w(Y1, 'M', PSU, 'M');

  const ESW = b.add('eswitch', 300, 720, 'SW-ETH-1', {}, 0);
  const HMI = b.add('hmi', 620, 700, 'HMI-1', {}, 0);
  for (const n of [ESW, HMI]) {
    b.w(n, 'VP', PSU, 'P');
    b.w(n, 'VM', PSU, 'M');
  }
  b.w(PLC, 'ETH', ESW, 'E1');
  b.w(ESW, 'E2', HMI, 'ETH');
  return { name: 'โรงงาน: ไลน์สายพานคัดแยกชิ้นงาน', comps: b.comps, wires: b.wires };
}

export const TEMPLATES: Template[] = [
  { id: 'field', name: 'Sensor → PLC → HMI', desc: 'พร็อกซิมิตี้ส่งเข้า PLC แล้วไฟแสดงสถานะและค่าขึ้น HMI', group: 'simple', build: sensorPlcHmi },
  { id: 'relay', name: 'Relay & motor control', desc: 'สวิตช์ 24V สั่งคอนแทคเตอร์เดินมอเตอร์ 3 เฟส', group: 'simple', build: relayMotor },
  { id: 'analog', name: 'Analog sensor display', desc: 'ทรานสมิตเตอร์ความดันแสดงค่าตรงบนมิเตอร์', group: 'simple', build: analogDisplay },
  { id: 'led', name: 'LED indicator circuit', desc: 'สวิตช์เปิด-ปิดไฟแสดงสถานะ 24V', group: 'simple', build: ledCircuit },
  { id: 'process', name: 'Process data · Siemens', desc: 'SITOP → เซนเซอร์ความดัน → SIMATIC → SCALANCE → HMI', group: 'simple', build: processSiemens },
  { id: 'timer', name: 'Timer relay · Schneider', desc: 'หน่วงเวลาก่อนติดไฟแสดงสถานะ', group: 'simple', build: timerSchneider },
  { id: 'blank', name: 'Empty plan', desc: 'แปลนว่าง', group: 'simple', build: () => ({ name: 'Empty plan', comps: [], wires: [] }) },
  { id: 'plant', name: 'ไฟโรงงาน · Switchgear → TR → MDB', desc: '22kV ผ่านสวิตช์เกียร์และหม้อแปลง เข้าตู้เมน แล้วแยกไปมอเตอร์กับวงจร 24V', group: 'plant', build: plantPower },
  { id: 'pumpstation', name: 'ห้องปั๊มน้ำ · คุมระดับถังอัตโนมัติ', desc: 'ลูกลอยระดับต่ำ/สูงผ่านรีเลย์เข้า PLC สั่งปั๊มเดิน-หยุดเอง พร้อม LT, PT, ทาวเวอร์ไลท์ และ HMI', group: 'plant', build: pumpStation },
  { id: 'compressor', name: 'ห้องคอมเพรสเซอร์ลม · VFD + Energy meter', desc: 'MDB แยก feeder คอมเพรสเซอร์ 22kW ผ่านมิเตอร์และ VFD กับเครื่องทำลมแห้ง วัดแรงดันลมและการสั่น', group: 'plant', build: compressorRoom },
  { id: 'conveyor', name: 'ไลน์สายพาน · คัดแยกชิ้นงาน', desc: 'Start/Stop + E-Stop สั่งสายพาน เซนเซอร์นับชิ้นงานและโซลินอยด์คัดชิ้นงานโลหะ', group: 'plant', build: conveyorLine },
  { id: 'factory', name: 'โรงงาน: Sensor Field → PLC → SCADA', desc: 'เซนเซอร์ 4-20mA → PLC → Ethernet → HMI, SCADA, จอใหญ่ + ฮีตเตอร์และปั๊ม', group: 'plant', build: factory },
  { id: 'dol', name: 'มอเตอร์ DOL Start/Stop + Overload', desc: 'สตาร์ทมอเตอร์แบบกดค้างตัวเอง มี E-Stop และไพลอตแลมป์', group: 'plant', build: dol },
  { id: 'house', name: 'ระบบไฟฟ้าในบ้าน + RCBO', desc: 'ตู้ไฟบ้าน สวิตช์ หลอดไฟ เต้ารับ และแอร์', group: 'full', build: house },
  { id: 'iot', name: 'IoT: LoRaWAN + Modbus → Cloud', desc: 'เซนเซอร์ไร้สายส่งขึ้นคลาวด์ผ่านเราเตอร์ 4G', group: 'full', build: iot },
  { id: 'backup', name: 'ไฟสำรอง ATS + Generator + UPS', desc: 'ไฟดับแล้วสลับไปเครื่องปั่นไฟ อัตโนมัติ', group: 'full', build: backup },
];
