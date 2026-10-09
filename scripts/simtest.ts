import { TEMPLATES } from '../src/templates';
import { newSim, step, setPressed } from '../src/sim';
import type { Design } from '../src/types';
import { missingAdvice } from '../src/advice';

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

console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);
