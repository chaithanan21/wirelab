import { TEMPLATES } from '../src/templates';
import { newSim, step, setPressed, repair } from '../src/sim';
import type { Design } from '../src/types';
import { missingAdvice } from '../src/advice';
import { checkWiring } from '../src/check';
import { DEF_MAP } from '../src/library';

const run = (d: Design, secs: number, s = newSim()) => {
  for (let i = 0; i < secs * 5; i++) step(d, s, 0.2);
  return s;
};
const byLabel = (d: Design, l: string) => d.comps.find((c) => c.label === l)!;
let fail = 0;
const check = (name: string, ok: boolean, info = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${info}`);
  if (!ok) fail++;
};

// Factory
{
  const d = TEMPLATES.find((t) => t.id === 'factory')!.build();
  const s = run(d, 3);
  const r = (l: string) => s.rt[byLabel(d, l).id];
  check('PSU powered', r('PSU-1').powered);
  check('PLC powered', r('PLC-1').powered);
  check('TT-101 signal at PLC AI1', !!r('PLC-1').ai?.[0], `${r('PLC-1').ai?.[0]?.value?.toFixed(1)}`);
  check('Heater relay on (temp < 60)', !!r('K1 HEATER').out);
  check('Heater powered', r('EH-101').powered);
  check('HMI display ok', s.displays[byLabel(d, 'HMI-1').id]?.status === 'ok', `${s.displays[byLabel(d, 'HMI-1').id]?.tags.length} tags`);
  check('SCADA ok', s.displays[byLabel(d, 'SCADA-1').id]?.status === 'ok');
  check('Monitor mirrors SCADA', s.displays[byLabel(d, 'WALL-1').id]?.status === 'ok');
  check('Panel meter shows temp', r('TI-101').pv !== undefined, `${r('TI-101').pv?.toFixed(1)}`);
  check('Pump idle before start', !r('P-101').powered);
  setPressed(s, byLabel(d, 'S1 START').id, true);
  run(d, 0.4, s);
  setPressed(s, byLabel(d, 'S1 START').id, false);
  run(d, 8, s);
  check('VFD running after START', (r('VFD-101').freq ?? 0) > 40, `${r('VFD-101').freq?.toFixed(1)}Hz`);
  check('Pump running', r('P-101').powered && (r('P-101').speed ?? 0) > 0.8);
  check('Flow rising', s.plant.flow > 50, `${s.plant.flow.toFixed(1)}`);
  check('Emeter measures power', (r('EM-01').powerW ?? 0) > 1000, `${((r('EM-01').powerW ?? 0) / 1000).toFixed(2)}kW`);
  check('Q1 current', (r('Q1 MAIN').current ?? 0) > 1, `${r('Q1 MAIN').current?.toFixed(2)}A`);
  setPressed(s, byLabel(d, 'S2 STOP').id, true);
  run(d, 0.4, s);
  setPressed(s, byLabel(d, 'S2 STOP').id, false);
  run(d, 8, s);
  check('Pump stops after STOP', (r('VFD-101').freq ?? 0) < 1);
  run(d, 120, s);
  check('Temperature controlled near 60', Math.abs(s.plant.temp - 60) < 6, `${s.plant.temp.toFixed(1)}°C`);
  console.log('alarms:', Object.values(s.activeAlarms).map((a) => a.msg));
}

// DOL
{
  const d = TEMPLATES.find((t) => t.id === 'dol')!.build();
  const s = run(d, 1);
  const r = (l: string) => s.rt[byLabel(d, l).id];
  check('DOL: motor off initially', !r('M1 CONVEYOR').powered);
  check('DOL: STOP lamp on', r('H3 STOP').powered);
  setPressed(s, byLabel(d, 'S1 START').id, true);
  run(d, 0.4, s);
  setPressed(s, byLabel(d, 'S1 START').id, false);
  run(d, 1, s);
  check('DOL: self-hold keeps contactor', !!r('KM1').out);
  check('DOL: motor running', r('M1 CONVEYOR').powered);
  check('DOL: RUN lamp on', r('H1 RUN').powered);
  check('DOL: vibration rises', (r('VI-201').pv ?? 0) > 2, `${r('VI-201').pv?.toFixed(2)}`);
  check('DOL: OLR current', (r('F1 OLR').current ?? 0) > 5, `${r('F1 OLR').current?.toFixed(2)}A`);
  byLabel(d, 'S0 E-STOP').props.pressed = true;
  run(d, 1, s);
  check('DOL: E-stop drops contactor', !r('KM1').out);
  byLabel(d, 'S0 E-STOP').props.pressed = false;
  run(d, 1, s);
  check('DOL: stays off after E-stop release', !r('KM1').out);
  // overload: lower setting
  setPressed(s, byLabel(d, 'S1 START').id, true);
  run(d, 0.4, s);
  setPressed(s, byLabel(d, 'S1 START').id, false);
  byLabel(d, 'F1 OLR').props.setting = 4;
  run(d, 15, s);
  check('DOL: overload trips', !!r('F1 OLR').tripped);
  check('DOL: TRIP lamp on', r('H2 TRIP').powered);
  check('DOL: motor stopped', !r('M1 CONVEYOR').powered);
}

// House: short circuit & earth leakage
{
  const d = TEMPLATES.find((t) => t.id === 'house')!.build();
  const s = run(d, 1);
  const r = (l: string) => s.rt[byLabel(d, l).id];
  check('House: living lamp on', r('LIVING').powered);
  check('House: kitchen lamp off', !r('KITCHEN').powered);
  byLabel(d, 'SOCKET-1').props.leak = true;
  run(d, 0.4, s);
  check('House: RCBO trips on leakage', !!r('C2 SOCKET RCBO').tripped, r('C2 SOCKET RCBO').tripReason);
  check('House: main not tripped', !r('MAIN 50A').tripped);
  // short: wire lamp L to N directly
  d.wires.push({ id: 'short', a: { c: byLabel(d, 'LIVING').id, p: 'L' }, b: { c: byLabel(d, 'LIVING').id, p: 'N' } });
  run(d, 0.4, s);
  check('House: lighting MCB trips on short', !!r('C1 LIGHT 10A').tripped, r('C1 LIGHT 10A').tripReason);
  check('House: aircon still on', r('AIR BEDROOM').powered);
}

// IoT
{
  const d = TEMPLATES.find((t) => t.id === 'iot')!.build();
  const s = run(d, 2);
  const cl = s.displays[byLabel(d, 'CLOUD').id];
  check('IoT: cloud receives data', cl?.status === 'ok', `${cl?.tags.length} tags from ${cl?.via.join(',')}`);
  check('IoT: andon ok', s.displays[byLabel(d, 'ANDON').id]?.status === 'ok');
}

// Backup
{
  const d = TEMPLATES.find((t) => t.id === 'backup')!.build();
  const s = run(d, 2);
  const r = (l: string) => s.rt[byLabel(d, l).id];
  check('Backup: pump on grid', r('FIRE PUMP').powered && r('ATS-1').sel === 1);
  byLabel(d, 'GRID-1').props.on = false;
  run(d, 1, s);
  check('Backup: UPS on battery keeps SCADA', r('SCADA').powered && !r('UPS-1').inOk);
  run(d, 6, s);
  check('Backup: gen auto-started & ATS on gen', r('GEN-1').ready === true && r('ATS-1').sel === 2 && r('FIRE PUMP').powered);
  byLabel(d, 'GRID-1').props.on = true;
  run(d, 2, s);
  check('Backup: back to grid', r('ATS-1').sel === 1);
}

for (const id of ['field', 'relay', 'analog', 'led', 'process', 'timer']) {
  const d = TEMPLATES.find((t) => t.id === id)!.build();
  const s = run(d, id === 'timer' ? 5 : 3);
  const powered = d.comps.filter((c) => s.rt[c.id]?.powered).map((c) => c.label);
  check(`${id}: something is powered`, powered.length >= 2, powered.join(', '));
  if (id === 'field' || id === 'process') {
    const hmi = d.comps.find((c) => c.type === 'hmi')!;
    check(`${id}: HMI online`, s.displays[hmi.id]?.status === 'ok', s.displays[hmi.id]?.status);
  }
  if (id === 'analog') {
    const pm = d.comps.find((c) => c.type === 'pmeter')!;
    check('analog: meter shows value', s.rt[pm.id]?.pv !== undefined, String(s.rt[pm.id]?.pv));
  }
  if (id === 'timer') {
    const lamp = d.comps.find((c) => c.label.startsWith('H1'))!;
    check('timer: lamp on after delay', !!s.rt[lamp.id]?.powered);
  }
  if (id === 'led') {
    const lamp = d.comps.find((c) => c.label.startsWith('LED'))!;
    check('led: lamp off until switch', !s.rt[lamp.id]?.powered);
  }
  if (id === 'relay') {
    const motor = d.comps.find((c) => c.type === 'motor3')!;
    check('relay: motor off until switch', !s.rt[motor.id]?.powered);
  }
}

{
  const miss = missingAdvice();
  check('every device port has wiring advice', miss.length === 0, miss.slice(0, 12).join(', '));
}

{
  const d = TEMPLATES.find((t) => t.id === 'plant')!.build();
  const s = run(d, 1);
  const r = (l: string) => s.rt[byLabel(d, l).id];
  check('plant: transformer powered', !!r('TR1').powered);
  check('plant: motor on MDB feeder', !!r('M1').powered, `${r('M1').powerW?.toFixed(0)}W`);
  check('plant: 24V supply on', !!r('PS1').powered);
  check('plant: switchgear carries MV current', (r('SWG1').current ?? 0) > 0 && (r('SWG1').current ?? 0) < 5, `${r('SWG1').current?.toFixed(3)}A`);
  byLabel(d, 'SWG1').props.on = false;
  run(d, 0.4, s);
  check('plant: opening switchgear kills the motor', !r('M1').powered && !r('TR1').powered);
  byLabel(d, 'SWG1').props.on = true;
  byLabel(d, 'MDB1').props.f1 = false;
  run(d, 0.4, s);
  check('plant: feeder F1 off drops only the motor', !r('M1').powered && !!r('PS1').powered);
}

{
  const d = TEMPLATES.find((t) => t.id === 'pumpstation')!.build();
  const s = run(d, 3);
  const r = (l: string) => s.rt[byLabel(d, l).id];
  const hmi = s.displays[byLabel(d, 'HMI-201').id];
  check('pump: low level starts the pump', !!r('P-201 TRANSFER').powered && !!r('KM1').out, `level ${s.plant.level.toFixed(2)}m`);
  check('pump: run lamp on', !!r('PLC-1').dos?.[1]);
  check('pump: HMI online', hmi?.status === 'ok', `${hmi?.tags.length} tags`);
  check('pump: no alarm while pumping', !r('PLC-1').dos?.[3]);
  run(d, 25, s);
  check('pump: high level stops the pump', !r('P-201 TRANSFER').powered && s.plant.level >= 3.9, `level ${s.plant.level.toFixed(2)}m`);
  check('pump: high level lamp on', !!r('PLC-1').dos?.[2]);
  run(d, 20, s);
  check('pump: stays off between levels', !r('P-201 TRANSFER').powered, `level ${s.plant.level.toFixed(2)}m`);
  run(d, 30, s);
  check('pump: restarts at low level', !!r('P-201 TRANSFER').powered, `level ${s.plant.level.toFixed(2)}m`);
}

{
  const d = TEMPLATES.find((t) => t.id === 'compressor')!.build();
  const s = run(d, 2);
  const r = (l: string) => s.rt[byLabel(d, l).id];
  check('compressor: idle before start', (r('VFD-301').freq ?? 0) < 1);
  check('compressor: dryer on feeder F2', !!r('AD-301 AIR DRYER').powered);
  setPressed(s, byLabel(d, 'S1 START').id, true);
  run(d, 0.4, s);
  setPressed(s, byLabel(d, 'S1 START').id, false);
  run(d, 10, s);
  check('compressor: VFD at 45Hz', Math.abs((r('VFD-301').freq ?? 0) - 45) < 1, `${r('VFD-301').freq?.toFixed(1)}Hz`);
  check('compressor: air pressure built', s.plant.pressure > 4, `${s.plant.pressure.toFixed(2)}bar`);
  check('compressor: meter reads compressor power', (r('EM-301').powerW ?? 0) > 10000, `${((r('EM-301').powerW ?? 0) / 1000).toFixed(1)}kW`);
  check('compressor: MDB carries both feeders', (r('MDB-1 400A').current ?? 0) > (r('Q1 COMP 63A').current ?? 0), `${r('MDB-1 400A').current?.toFixed(1)}A`);
  check('compressor: HMI online', s.displays[byLabel(d, 'HMI-301').id]?.status === 'ok');
  byLabel(d, 'VFD-301').props.freq = 50;
  run(d, 6, s);
  check('compressor: high pressure lamp at 50Hz', !!r('PLC-1').dos?.[2], `${s.plant.pressure.toFixed(2)}bar`);
  setPressed(s, byLabel(d, 'S2 STOP').id, true);
  run(d, 0.4, s);
  setPressed(s, byLabel(d, 'S2 STOP').id, false);
  run(d, 10, s);
  check('compressor: stops after STOP', (r('VFD-301').freq ?? 0) < 1);
}

{
  const d = TEMPLATES.find((t) => t.id === 'mdbmon')!.build();
  const s = run(d, 3);
  const r = (l: string) => s.rt[byLabel(d, l).id];
  const kw = (l: string) => (r(l).powerW ?? 0) / 1000;
  check('mdbmon: chiller feeder running', !!r('CH-1 CHILLER').powered);
  check('mdbmon: M1 idle before start', !r('M1 PRODUCTION').powered);
  check('mdbmon: EM-F2 reads chiller', kw('EM-F2') > 8, `${kw('EM-F2').toFixed(1)}kW`);
  check('mdbmon: EM-F1 zero while stopped', kw('EM-F1') < 0.5, `${kw('EM-F1').toFixed(1)}kW`);
  const sc = s.displays[byLabel(d, 'SCADA-1 ENERGY').id];
  check('mdbmon: SCADA sees all 3 meters', sc?.status === 'ok' && ['EM-MAIN', 'EM-F1', 'EM-F2'].every((m) => sc.via.includes(m)), sc?.via.join(','));
  check('mdbmon: cloud online', s.displays[byLabel(d, 'CLOUD ENERGY').id]?.status === 'ok');
  setPressed(s, byLabel(d, 'S1 START M1').id, true);
  run(d, 0.4, s);
  setPressed(s, byLabel(d, 'S1 START M1').id, false);
  run(d, 3, s);
  check('mdbmon: M1 runs after START', !!r('M1 PRODUCTION').powered);
  check('mdbmon: EM-F1 reads M1', kw('EM-F1') > 10, `${kw('EM-F1').toFixed(1)}kW`);
  check('mdbmon: main meter = sum of feeders', kw('EM-MAIN') >= kw('EM-F1') + kw('EM-F2') - 0.5, `${kw('EM-MAIN').toFixed(1)}kW`);
  check('mdbmon: KM1 feedback at PLC DI3', !!r('PLC-1').di?.[2]);
  check('mdbmon: green lamp = running', !!r('PLC-1').dos?.[1] && !r('PLC-1').dos?.[2]);
  setPressed(s, byLabel(d, 'S2 STOP M1').id, true);
  run(d, 0.4, s);
  setPressed(s, byLabel(d, 'S2 STOP M1').id, false);
  run(d, 2, s);
  check('mdbmon: M1 stops, feedback clears', !r('M1 PRODUCTION').powered && !r('PLC-1').di?.[2]);
}

for (const [id, drive, filler, pump, tt, sv] of [
  ['pet', 'U1 CONTIFORM DRIVE', 'M2 MODULFILL + CAPPER', 'P-301 PRODUCT PUMP', 'TT-101 OVEN', 105],
  ['beer', 'U1 BOTTLE WASHER', 'M2 FILLER + CROWNER', 'P-301 BEER FEED', 'TT-501 PASTEURISER', 62],
] as const) {
  const d = TEMPLATES.find((t) => t.id === id)!.build();
  const s = run(d, 2);
  const r = (l: string) => s.rt[byLabel(d, l).id];
  check(`${id}: line idle before start`, (r(drive).freq ?? 0) < 1 && !r(filler).powered);
  check(`${id}: bowl pump fills on low level`, !!r(pump).powered, `level ${s.plant.level.toFixed(2)}m`);
  setPressed(s, byLabel(d, 'S1 LINE START').id, true);
  run(d, 0.4, s);
  setPressed(s, byLabel(d, 'S1 LINE START').id, false);
  run(d, 12, s);
  check(`${id}: main drive running`, (r(drive).freq ?? 0) > 35, `${r(drive).freq?.toFixed(1)}Hz`);
  check(`${id}: filler running`, !!r(filler).powered && (r(filler).speed ?? 0) > 0.7);
  run(d, 60, s);
  check(`${id}: heater holds setpoint`, Math.abs(s.plant.temp - sv) < 4, `${s.plant.temp.toFixed(1)}°C`);
  check(`${id}: bowl level held 2.4–3.6 m`, s.plant.level > 2.4 && s.plant.level < 3.6, `${s.plant.level.toFixed(2)}m`);
  let rejects = 0;
  const alarms = new Set<string>();
  for (let i = 0; i < 150; i++) {
    step(d, s, 0.2);
    if (r('PLC-1 LINE').dos?.[id === 'pet' ? 1 : 2]) rejects++;
    s.alarms.forEach((a) => alarms.add(a.msg));
  }
  check(`${id}: reject valve fires`, rejects > 0, `${rejects} steps`);
  check(`${id}: no alarm in normal run`, alarms.size === 0, [...alarms].join('; '));
  byLabel(d, 'S0 E-STOP').props.pressed = true;
  run(d, 12, s);
  check(`${id}: E-stop stops line`, (r(drive).freq ?? 0) < 1 && !r(filler).powered);
}

{
  const d = TEMPLATES.find((t) => t.id === 'conveyor')!.build();
  const s = run(d, 2);
  const r = (l: string) => s.rt[byLabel(d, l).id];
  check('conveyor: motor off initially', !r('M1 CONVEYOR').powered);
  setPressed(s, byLabel(d, 'S1 START').id, true);
  run(d, 0.4, s);
  setPressed(s, byLabel(d, 'S1 START').id, false);
  run(d, 1, s);
  check('conveyor: START runs the belt', !!r('M1 CONVEYOR').powered && !!r('PLC-1').dos?.[1]);
  let seen = false;
  for (let i = 0; i < 20; i++) {
    run(d, 0.2, s);
    seen ||= !!r('PLC-1').di?.[2];
  }
  check('conveyor: photo sensor counts parts', seen);
  byLabel(d, 'B2 ชิ้นงานโลหะ').props.mode = 'manual';
  byLabel(d, 'B2 ชิ้นงานโลหะ').props.detect = true;
  run(d, 0.6, s);
  check('conveyor: metal part fires reject valve', !!r('Y1 คัดแยก').powered);
  byLabel(d, 'S0 E-STOP').props.pressed = true;
  run(d, 1, s);
  check('conveyor: E-stop stops the belt', !r('M1 CONVEYOR').powered);
  byLabel(d, 'S0 E-STOP').props.pressed = false;
  run(d, 1, s);
  check('conveyor: stays off after E-stop release', !r('M1 CONVEYOR').powered);
}

{
  const mk = (type: string, label: string, x = 0, y = 0) => ({ id: label, type, x, y, label, brand: '', model: '', props: { ...DEF_MAP[type].props } });
  const w = (a: string, pa: string, b: string, pb: string) => ({ id: `${a}.${pa}-${b}.${pb}`, a: { c: a, p: pa }, b: { c: b, p: pb } });
  const d: Design = {
    name: 'wrong',
    comps: [mk('grid1', 'GRID'), mk('prox', 'B1'), mk('psu24', 'PS1'), mk('relay', 'K1'), mk('pilot', 'H1')],
    wires: [w('GRID', 'L', 'B1', 'P'), w('GRID', 'N', 'B1', 'M'), w('GRID', 'L', 'PS1', 'L'), w('GRID', 'N', 'PS1', 'N'),
      w('GRID', 'L', 'K1', 'A1'), w('GRID', 'N', 'K1', 'A2'), w('PS1', 'P', 'K1', 'COM'), w('K1', 'NC', 'H1', 'P'), w('H1', 'M', 'PS1', 'M')],
  };
  const issues = checkWiring(d);
  check('check: predicts sensor burns on 230V', issues.some((i) => i.sev === 'crit' && i.id === 'dmg:B1'), issues.map((i) => i.id).join(','));
  check('check: predicts 24V relay coil burns on 230V', issues.some((i) => i.id === 'dmg:K1'));
  check('check: warns PSU has no breaker', issues.some((i) => i.id === 'prot:PS1'));
  const s = run(d, 1);
  check('damage: sensor on 230V is destroyed', !!s.rt.B1.damaged && !s.rt.B1.powered, s.rt.B1.damaged);
  check('damage: alarm raised', !!s.activeAlarms['B1:dmg']);
  check('damage: burnt relay falls back to NC', !s.rt.K1.out && !!s.rt.H1.powered);
  d.wires = d.wires.filter((x) => x.a.c !== 'GRID' || x.b.c === 'PS1');
  d.wires.push(w('PS1', 'P', 'B1', 'P'), w('PS1', 'M', 'B1', 'M'));
  run(d, 1, s);
  check('damage: stays broken after rewiring', !!s.rt.B1.damaged && !s.rt.B1.powered);
  repair(s, 'B1');
  run(d, 1, s);
  check('damage: replaced sensor works on 24V', !s.rt.B1.damaged && !!s.rt.B1.powered);
}

for (const t of TEMPLATES) {
  const d = t.build();
  const crit = checkWiring(d).filter((i) => i.sev === 'crit');
  check(`${t.id}: no dangerous wiring`, crit.length === 0, crit.map((i) => i.msg).join(' | '));
  const s = run(d, 3);
  const dmg = d.comps.filter((c) => s.rt[c.id]?.damaged).map((c) => c.label);
  check(`${t.id}: nothing damaged`, dmg.length === 0, dmg.join(', '));
}

console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);
