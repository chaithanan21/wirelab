import type { Behavior, Design, PortDef, PortKind } from './types';
import { compatible, DEF_MAP } from './library';

export interface PortHint {
  to: string;
  why: string;
  beh?: Behavior[];
  ports?: string[];
  kinds?: PortKind[];
}

export interface PlanMatch {
  label: string;
  portLabel: string;
  used: boolean;
}

const h = (to: string, why: string, beh?: Behavior[], ports?: string[], kinds?: PortKind[]): PortHint => ({ to, why, beh, ports, kinds });

const PSU_PLUS = h('+V ของ Power Supply 24VDC', 'ไฟเลี้ยง +24V', ['psu', 'battery'], ['P'], ['DC+']);
const PSU_ZERO = h('−V ของ Power Supply 24VDC', '0V ต้องเป็นจุดเดียวกันทั้งวงจรควบคุม', ['psu', 'battery'], ['M'], ['DC-']);
const PLC_DI = h('DI ของ PLC (DI1–DI4)', 'อินพุตดิจิทัล รับ +24V เมื่อตรวจจับหรือสัมผัสปิด', ['plc', 'rio', 'edge'], ['DI1', 'DI2', 'DI3', 'DI4'], ['X']);
const PLC_DO = h('DO ของ PLC (DO1–DO4)', 'เอาต์พุตที่จ่าย +24V เมื่อสั่งงาน', ['plc'], ['DO1', 'DO2', 'DO3', 'DO4'], ['X']);
const PLC_AI = h('AI ของ PLC หรือช่อง 4-20mA ของ Panel Meter', 'สัญญาณแอนะล็อกจากทรานสมิตเตอร์', ['plc', 'rio', 'edge', 'pmeter', 'tempctl'], ['AI1', 'AI2', 'AI3', 'AI4', 'IN'], ['AI']);
const ETH = h('พอร์ต Ethernet ของสวิตช์ PLC HMI หรือเราเตอร์', 'สาย LAN ส่งข้อมูลบนเครือข่ายเดียวกัน', ['eswitch', 'plc', 'rio', 'edge', 'hmi', 'router', 'gateway', 'scada', 'led', 'lora_gw', 'emeter', 'vfd', 'pvinv', 'hybrid'], ['E1', 'E2', 'E3', 'E4', 'E5', 'ETH'], ['ETH']);
const RS485 = h('ขั้ว RS485 ของ PLC, HMI, Gateway หรือมิเตอร์', 'สายคู่บิด Modbus RTU ต้องเป็นบัสเดียวกัน', ['plc', 'hmi', 'gateway', 'emeter', 'vfd', 'sensor_485', 'pvinv', 'hybrid'], ['485'], ['485']);
const PV_PLUS_IN = h('PV+ out ของ DC Isolator / Combiner หรือ PV+ ของแผง', 'สาย DC บวกจากสตริงแผง (สายโซลาร์สีแดง PV1-F)', ['switch', 'pv'], ['op', 'PVP'], ['PV+']);
const PV_MINUS_IN = h('PV− out ของ DC Isolator / Combiner หรือ PV− ของแผง', 'สาย DC ลบจากสตริงแผง (สายโซลาร์สีดำ)', ['switch', 'pv'], ['om', 'PVM'], ['PV-']);
const PV_EARTH = h('บาร์กราวด์ของตู้หรือ PE ของอินเวอร์เตอร์', 'ต่อกราวด์โครงแผง/ตู้ และ SPD ฝั่ง DC', ['pvinv', 'hybrid', 'grid1', 'grid3', 'mdb'], ['PE'], ['PE']);
const HDMI_OUT = h('HDMI IN ของจอมอนิเตอร์', 'ส่งภาพจาก SCADA ไปจอใหญ่', ['monitor'], ['HDMI'], ['HDMI']);
const HDMI_IN = h('HDMI ของ SCADA Workstation', 'รับภาพจากเครื่อง SCADA', ['scada'], ['HDMI'], ['HDMI']);
const FROM_L = h('ขั้ว L ที่ออกจากเบรกเกอร์ สวิตช์ หรือหน้าสัมผัส NO', 'รับสายไลน์ 230V', ['breaker', 'rcbo', 'switch', 'relay', 'timer', 'tempctl', 'ups'], ['out', 'L2', 'NO', 'OL'], ['L', 'X']);
const FROM_N = h('ขั้ว N ของแหล่งจ่าย เบรกเกอร์ หรือ UPS', 'สายนิวทรัล', ['grid1', 'grid3', 'breaker', 'rcbo', 'ups', 'gen'], ['N', 'N2', 'ON'], ['N']);
const TO_BREAKER_L = h('ขั้ว L ด้านเข้าของ MCB, RCBO หรือ UPS', 'จ่ายสายไลน์เข้าอุปกรณ์ป้องกันก่อนถึงโหลด', ['breaker', 'rcbo', 'ups', 'passive'], ['in', 'L1', 'L'], ['L', 'X']);
const TO_BREAKER_N = h('ขั้ว N ด้านเข้าของ MCB, RCBO หรือ UPS', 'จ่ายสายนิวทรัล', ['breaker', 'rcbo', 'ups', 'passive'], ['N1', 'N'], ['N']);
const TO_PE = h('ขั้ว PE ของโหลดที่มีตัวถังโลหะ หรือ SPD', 'สายดินป้องกัน', ['load_ac', 'motor3', 'passive'], ['PE'], ['PE']);
const COIL_PLUS = h('DO ของ PLC หรือขั้ว NO ของปุ่ม/รีเลย์ที่จ่าย +24V', 'ขั้วบวกคอยล์ ได้ไฟแล้วหน้าสัมผัสจึงทำงาน', ['plc', 'pb', 'relay', 'timer'], ['DO1', 'DO2', 'DO3', 'DO4', 'out', 'NO'], ['X']);
const CONTACT_COM = h('+24V ของ PSU หรือสาย L แล้วแต่แรงดันของวงจร', 'ขั้วร่วม ไฟเข้าหน้าสัมผัส', ['psu', 'battery', 'grid1', 'breaker'], ['P', 'L', 'out', 'L2'], ['DC+', 'L', 'X']);
const CONTACT_NO = h('คอยล์รีเลย์ โหลด หรือ DI ของ PLC', 'หน้าสัมผัสปกติเปิด ต่อเมื่อสั่งงาน', ['relay', 'timer', 'contactor', 'plc', 'load_dc', 'load_dc'], ['A1', 'P', 'DI1', 'DI2', 'DI3', 'DI4'], ['X']);
const CONTACT_NC = h('วงจรหยุดหรืออินเตอร์ล็อก ที่ต้องขาดเมื่อทำงาน', 'หน้าสัมผัสปกติปิด', ['relay', 'estop', 'contactor', 'plc'], ['A1', 'in', 'DI1'], ['X']);

const BEH_PORTS: Partial<Record<Behavior, Record<string, PortHint>>> = {
  grid1: {
    L: TO_BREAKER_L,
    N: TO_BREAKER_N,
    PE: TO_PE,
  },
  grid3: {
    P3: h('ช่อง Normal ของ ATS หรือ IN ของ MCCB 3P', 'จ่ายไฟ 3 เฟส 400V', ['ats', 'breaker'], ['I1', 'in'], ['P3']),
    L1: TO_BREAKER_L,
    N: TO_BREAKER_N,
    PE: TO_PE,
  },
  gen: {
    P3: h('ช่อง Emergency ของ ATS', 'ไฟสำรอง 3 เฟส เข้า ATS เมื่อเครื่องติด', ['ats'], ['I2'], ['P3']),
    L1: TO_BREAKER_L,
    N: TO_BREAKER_N,
    PE: TO_PE,
  },
  battery: {
    P: h('+24V ของวงจรควบคุม หรือขั้วที่ต้องการไฟตรง', 'ขั้วบวกแบตเตอรี่', ['psu', 'plc', 'sensor_d', 'sensor_a'], ['P', 'VP'], ['DC+']),
    M: h('0V ของวงจรควบคุม', 'ขั้วลบแบตเตอรี่', ['psu', 'plc'], ['M', 'VM'], ['DC-']),
  },
  psu: {
    L: h('L ที่ออกจากเบรกเกอร์วงจรควบคุม', 'ไฟเข้า 230V ด้านไลน์', ['breaker', 'rcbo', 'grid1', 'ups'], ['out', 'L2', 'L', 'OL'], ['L', 'X']),
    N: FROM_N,
    P: h('+24V ของ PLC, เซนเซอร์, HMI และคอยล์รีเลย์', 'จ่ายไฟเลี้ยงบวกทั้งตู้', ['plc', 'rio', 'edge', 'sensor_a', 'sensor_d', 'sensor_485', 'hmi', 'eswitch', 'router', 'relay'], ['VP', 'P'], ['DC+', 'X']),
    M: h('0V ของ PLC, เซนเซอร์, HMI และ A2 ของรีเลย์', 'จ่าย 0V จุดร่วมทั้งวงจร 24V', ['plc', 'rio', 'edge', 'sensor_a', 'sensor_d', 'hmi', 'relay', 'load_dc', 'tower'], ['VM', 'M', 'A2'], ['DC-', 'X']),
  },
  pv: {
    PVP: h('PV+ in ของ Combiner Box หรือ DC Isolator', 'ขั้วบวกของสตริงแผง แรงดัน DC สูงหลายร้อยโวลต์ ต้องผ่านอุปกรณ์ตัดวงจร DC ก่อนเข้าอินเวอร์เตอร์', ['switch'], ['ip'], ['PV+']),
    PVM: h('PV− in ของ Combiner Box หรือ DC Isolator', 'ขั้วลบของสตริงแผง', ['switch'], ['im'], ['PV-']),
    PE: PV_EARTH,
  },
  pvinv: {
    PVP: PV_PLUS_IN,
    PVM: PV_MINUS_IN,
    L: h('L out ของ MCB/RCBO ที่แยกจากตู้ไฟสำหรับโซลาร์', 'อินเวอร์เตอร์จ่ายไฟย้อนเข้าตู้ ต้องมีเบรกเกอร์ของตัวเอง', ['breaker', 'rcbo'], ['out', 'L2'], ['L']),
    N: h('N ของเบรกเกอร์ชุดเดียวกันหรือบาร์ N ของตู้', 'นิวทรัลอ้างอิงของกริด', ['breaker', 'rcbo', 'grid1', 'grid3', 'tr'], ['N2', 'N'], ['N']),
    P3: h('OUT ของ MCCB 3P ที่ฟีดเดอร์ว่างของ MDB', 'จ่ายไฟ 3 เฟสย้อนเข้าบัส 400V ขนานกับหม้อแปลง', ['breaker', 'mdb'], ['out', 'F1', 'F2', 'F3', 'F4'], ['P3']),
    PE: PV_EARTH,
    ETH: ETH,
    '485': RS485,
  },
  hybrid: {
    PVP: PV_PLUS_IN,
    PVM: PV_MINUS_IN,
    BP: h('BAT+ ของแบตเตอรี่ LiFePO4', 'ขั้วบวกแบต ต้องมีฟิวส์/เบรกเกอร์ DC ใกล้แบต', ['bess'], ['BP'], ['PV+']),
    BM: h('BAT− ของแบตเตอรี่ LiFePO4', 'ขั้วลบแบต', ['bess'], ['BM'], ['PV-']),
    GL: h('L out ของเบรกเกอร์จากกริด', 'ไฟกริดเข้าอินเวอร์เตอร์ ใช้ชาร์จแบต/เสริมโหลด และขายไฟส่วนเกิน', ['breaker', 'rcbo', 'grid1'], ['out', 'L2', 'L'], ['L']),
    GN: h('N จากกริดหรือเบรกเกอร์ตัวเดียวกัน', 'นิวทรัลฝั่งกริด', ['breaker', 'rcbo', 'grid1'], ['N2', 'N'], ['N']),
    OL: h('L in ของ MCB โหลดสำรอง (Backup / EPS)', 'โหลดที่ต้องไม่ดับต่อที่นี่ ไฟดับยังได้ไฟจากแดด+แบต', ['breaker', 'rcbo'], ['in', 'L1'], ['L']),
    ON: h('N in ของ MCB โหลดสำรอง', 'นิวทรัลฝั่งโหลดสำรอง แยกจาก N ของกริด', ['breaker', 'rcbo'], ['N1'], ['N']),
    PE: PV_EARTH,
    ETH: ETH,
    '485': RS485,
  },
  bess: {
    BP: h('BAT+ ของไฮบริดอินเวอร์เตอร์', 'ขั้วบวกแบตเตอรี่ 51.2V', ['hybrid'], ['BP'], ['PV+']),
    BM: h('BAT− ของไฮบริดอินเวอร์เตอร์', 'ขั้วลบแบตเตอรี่', ['hybrid'], ['BM'], ['PV-']),
  },
  ups: {
    L: h('L จากกริดหรือเบรกเกอร์เมน', 'ไฟเข้า UPS', ['grid1', 'breaker', 'rcbo'], ['L', 'out', 'L2'], ['L', 'X']),
    N: h('N จากกริดหรือเบรกเกอร์เมน', 'นิวทรัลเข้า UPS', ['grid1', 'breaker', 'rcbo'], ['N', 'N2'], ['N']),
    OL: h('L ของโหลดที่ต้องไม่ดับ เช่น SCADA หรือคอมพิวเตอร์', 'ไฟออกสำรองฝั่งไลน์', ['scada', 'load_ac', 'pmeter'], ['L'], ['L']),
    ON: h('N ของโหลดชุดเดียวกับขั้ว L out', 'ไฟออกสำรองฝั่งนิวทรัล', ['scada', 'load_ac', 'pmeter'], ['N'], ['N']),
  },
  gridmv: {
    MV: h('ขั้ว IN ของ MV Switchgear', 'สายป้อน 22kV เข้าตู้สวิตช์เกียร์ ห้ามต่อเข้ากับไฟ 400V', ['swg'], ['IN'], ['MV']),
    PE: h('PE ของสวิตช์เกียร์หรือหม้อแปลง', 'สายดินด้านแรงกลาง', ['swg', 'tr'], ['PE'], ['PE']),
  },
  swg: {
    IN: h('22kV จากการไฟฟ้า', 'ด้านเข้าเบรกเกอร์สุญญากาศ', ['gridmv'], ['MV'], ['MV']),
    OUT: h('ขั้ว HV ของหม้อแปลง', 'ด้านออกไปยังหม้อแปลงจำหน่าย', ['tr'], ['HV'], ['MV']),
  },
  tr: {
    HV: h('OUT ของ Switchgear', 'ด้านแรงสูง 22kV', ['swg'], ['OUT'], ['MV']),
    LV: h('MAIN ของตู้ MDB', 'ด้านแรงต่ำ 400V 3 เฟส', ['mdb'], ['IN'], ['P3']),
    L: h('L in ของตู้ MDB', 'เฟสถึงนิวทรัล 230V สำหรับวงจรควบคุม', ['mdb'], ['Lin'], ['L']),
    N: h('N ของตู้ MDB', 'นิวทรัลของหม้อแปลง', ['mdb'], ['N'], ['N']),
    PE: h('PE ของตู้ MDB', 'จุดต่อลงดินที่ตัวถังหม้อแปลง', ['mdb'], ['PE'], ['PE']),
  },
  mdb: {
    IN: h('LV ของหม้อแปลง', 'ไฟ 400V เข้าเมนเบรกเกอร์', ['tr'], ['LV'], ['P3']),
    Lin: h('ขั้ว L ของหม้อแปลง', 'เฟส 230V เข้าบัสไลต์ติ้ง', ['tr'], ['L'], ['L']),
    N: h('N ของหม้อแปลง', 'นิวทรัลบาร์ในตู้เมน โหลด 230V ต่อร่วมที่ขั้วนี้', ['tr'], ['N'], ['N']),
    PE: h('PE ของหม้อแปลง', 'กราวด์บาร์ในตู้เมน', ['tr'], ['PE'], ['PE']),
    F1: h('IN ของ MCCB ฟีดเดอร์ที่ 1 เช่น ตู้ MCC มอเตอร์', 'ฟีดเดอร์ 3 เฟสช่อง 1', ['breaker', 'vfd', 'emeter'], ['in'], ['P3']),
    F2: h('IN ของ MCCB ฟีดเดอร์ที่ 2', 'ฟีดเดอร์ 3 เฟสช่อง 2', ['breaker', 'vfd'], ['in'], ['P3']),
    F3: h('IN ของ MCCB ฟีดเดอร์ที่ 3', 'ฟีดเดอร์ 3 เฟสช่อง 3', ['breaker'], ['in'], ['P3']),
    F4: h('IN ของ MCCB ฟีดเดอร์ที่ 4', 'ฟีดเดอร์ 3 เฟสช่อง 4', ['breaker'], ['in'], ['P3']),
    L: h('ขั้ว L ของ Power Supply หรือเบรกเกอร์วงจรไฟ', 'ไฟ 230V จากตู้เมน', ['psu', 'breaker', 'load_ac'], ['L', 'in'], ['L', 'X']),
  },
  ats: {
    I1: h('L1–L3 ของ Utility Grid 3φ', 'แหล่งจ่ายปกติ', ['grid3'], ['P3'], ['P3']),
    I2: h('L1–L3 ของเครื่องกำเนิดไฟฟ้า', 'แหล่งจ่ายสำรอง', ['gen'], ['P3'], ['P3']),
    O: h('IN ของ MCCB 3P ที่ไปโหลด', 'ไฟที่ ATS เลือกจ่ายออก', ['breaker'], ['in'], ['P3']),
  },
  fuse: {
    in: h('ขั้วต้นทางของวงจรที่จะป้องกัน เช่น +24V หรือ L', 'ไฟเข้าฟิวส์', ['psu', 'breaker', 'grid1'], ['P', 'out', 'L'], ['DC+', 'L', 'X']),
    out: h('โหลดหรืออุปกรณ์ที่ต้องการป้องกัน', 'ไฟออกหลังฟิวส์ ขาดเมื่อกระแสเกิน', ['plc', 'sensor_d', 'load_dc', 'load_ac'], ['VP', 'P', 'L'], ['DC+', 'L', 'X']),
  },
  switch: {
    in: h('L จากเบรกเกอร์', 'ไฟเข้าสวิตช์', ['breaker', 'rcbo', 'grid1'], ['out', 'L2', 'L'], ['L', 'X']),
    out: h('ขั้ว L ของหลอด พัดลม หรือโหลด 230V', 'ไฟออกเมื่อเปิดสวิตช์', ['load_ac'], ['L'], ['L']),
  },
  pb: {
    in: h('+24V หรือสายที่ต้องการสับผ่านปุ่ม', 'ขั้วหนึ่งของหน้าสัมผัส', ['psu', 'battery', 'plc'], ['P', 'DO1'], ['DC+', 'X']),
    out: h('A1 ของรีเลย์/คอนแทคเตอร์ หรือ DI ของ PLC', 'อีกขั้วหนึ่ง ปุ่ม Start เป็น NO, ปุ่ม Stop เป็น NC ต่ออนุกรม', ['relay', 'contactor', 'plc', 'timer'], ['A1', 'DI1', 'DI2'], ['X']),
  },
  estop: {
    in: h('+24V ของวงจรหยุด หรือขั้วก่อนหน้าในวงจรซีรีส์', 'ปุ่มหยุดฉุกเฉินเป็นหน้าสัมผัส NC', ['psu', 'pb'], ['P', 'out'], ['DC+', 'X']),
    out: h('A1 ของคอนแทคเตอร์ หรือ DI หยุดของ PLC', 'วงจรขาดเมื่อกดหยุดฉุกเฉิน', ['contactor', 'relay', 'plc'], ['A1', 'DI1', 'DI2'], ['X']),
  },
  selector: {
    COM: h('+24V หรือสัญญาณที่ต้องการเลือกทาง', 'ขั้วร่วมของสวิตช์ Hand-Off-Auto', ['psu', 'plc'], ['P', 'DO1'], ['DC+', 'X']),
    A: h('วงจร Hand เช่น A1 ของคอนแทคเตอร์โดยตรง', 'ต่อเมื่อหมุนไปตำแหน่ง Hand', ['contactor', 'relay'], ['A1'], ['X']),
    B: h('วงจร Auto เช่น DI ของ PLC', 'ต่อเมื่อหมุนไปตำแหน่ง Auto', ['plc'], ['DI1', 'DI2', 'DI3', 'DI4'], ['X']),
  },
  relay: {
    A1: COIL_PLUS,
    A2: PSU_ZERO,
    COM: CONTACT_COM,
    NO: CONTACT_NO,
    NC: CONTACT_NC,
  },
  contactor: {
    A1: h('วงจรสตาร์ท 24V: ปุ่ม Start, หน้าสัมผัส 13-14 และปุ่ม Stop อนุกรม', 'ขั้วบวกคอยล์', ['pb', 'estop', 'relay'], ['out', 'NO', 'a14'], ['X']),
    A2: PSU_ZERO,
    in: h('T1–T3 ของ MCCB หรือโอเวอร์โหลดด้านเข้า', 'ไฟกำลัง 3 เฟสเข้า', ['breaker', 'overload'], ['out', 'in'], ['P3']),
    out: h('1/3/5 ของ Overload หรือ U/V/W ของมอเตอร์', 'ไฟกำลัง 3 เฟสออกเมื่อคอยล์ดูด', ['overload', 'motor3', 'vfd'], ['in', 'U', 'in'], ['P3']),
    a13: h('+24V ของวงจรควบคุม', 'หน้าสัมผัสช่วย NO ใช้ล็อกตัวเอง (seal-in)', ['psu'], ['P'], ['DC+']),
    a14: h('A1 ของคอนแทคเตอร์ตัวเอง ผ่านปุ่ม Stop', 'ปิดวงจรคอยล์ค้างหลังปล่อยปุ่ม Start', ['contactor', 'pb'], ['A1', 'in'], ['X']),
    a21: h('วงจรสัญญาณหรืออินเตอร์ล็อก', 'หน้าสัมผัสช่วย NC', ['plc', 'relay'], ['DI1', 'A1'], ['X']),
    a22: CONTACT_NC,
  },
  overload: {
    in: h('2/4/6 ของคอนแทคเตอร์', 'ไฟ 3 เฟสเข้าโอเวอร์โหลด', ['contactor'], ['out'], ['P3']),
    out: h('U/V/W ของมอเตอร์หรือปั๊ม', 'ไฟ 3 เฟสออกไปมอเตอร์', ['motor3'], ['U'], ['P3']),
    a95: h('วงจรคอยล์คอนแทคเตอร์ ด้าน +24V', 'หน้าสัมผัส NC 95-96 เปิดเมื่อทริป ตัดคอยล์', ['psu', 'pb'], ['P', 'out'], ['DC+', 'X']),
    a96: h('A1 ของคอนแทคเตอร์ อนุกรมกับปุ่ม Stop', 'ขาดเมื่อมอเตอร์กินกระแสเกิน', ['contactor'], ['A1'], ['X']),
    a97: h('DI ของ PLC หรือหลอดทริป', 'หน้าสัมผัส NO 97-98 ปิดเมื่อทริป', ['plc', 'load_dc', 'load_dc'], ['DI1', 'P'], ['X']),
    a98: PSU_ZERO,
  },
  timer: {
    A1: COIL_PLUS,
    A2: PSU_ZERO,
    COM: CONTACT_COM,
    NO: h('โหลดหรือรีเลย์ที่ต้องทำงานหลังครบเวลา', 'หน้าสัมผัสหน่วงปิด', ['relay', 'load_dc', 'load_dc', 'plc'], ['A1', 'P', 'DI1'], ['X']),
    NC: h('วงจรที่ต้องหลุดหลังครบเวลา', 'หน้าสัมผัสหน่วงเปิด', ['relay', 'plc'], ['A1', 'DI1'], ['X']),
  },
  tempctl: {
    L: FROM_L,
    N: FROM_N,
    IN: h('4-20mA ของ Temperature Transmitter', 'ค่าอุณหภูมิที่วัดได้', ['sensor_a'], ['OUT'], ['AI']),
    C: h('L จากเบรกเกอร์ของฮีตเตอร์', 'ขั้วร่วมหน้าสัมผัสสั่งฮีตเตอร์', ['breaker', 'grid1'], ['out', 'L2', 'L'], ['L', 'X']),
    NO: h('ขั้ว L ของฮีตเตอร์', 'จ่ายไฟเมื่ออุณหภูมิต่ำกว่าค่าตั้ง', ['load_ac'], ['L'], ['L']),
  },
  vfd: {
    in: h('T1–T3 ของ MCCB 3P', 'ไฟเข้าอินเวอร์เตอร์', ['breaker'], ['out'], ['P3']),
    V24: PSU_PLUS,
    V0: PSU_ZERO,
    RUN: h('DO ของ PLC หรือ +24V ผ่านสวิตช์', 'สั่งเดินมอเตอร์เมื่อมี +24V', ['plc', 'psu', 'switch'], ['DO1', 'DO2', 'DO3', 'DO4', 'P', 'out'], ['X', 'DC+']),
    REF: h('เอาต์พุตแอนะล็อกหรือสัญญาณ 4-20mA ที่ใช้ตั้งความเร็ว', 'ไม่มีสายนี้จะใช้ความถี่ที่ตั้งในพารามิเตอร์', ['plc', 'sensor_a'], ['AI1', 'OUT'], ['AI']),
    out: h('U/V/W ของมอเตอร์ 3 เฟส', 'ไฟออกปรับความถี่ได้ อย่าต่อกริดเข้าขั้วนี้', ['motor3'], ['U'], ['P3']),
    ETH,
    '485': RS485,
  },
  sensor_a: {
    P: PSU_PLUS,
    M: h('−V ของ PSU และควรพ่วง 0V ไปที่ M ของ PLC ด้วย', 'ทรานสมิตเตอร์กับ PLC ต้องมี 0V ร่วมกัน', ['psu', 'plc'], ['M', 'VM'], ['DC-']),
    OUT: PLC_AI,
  },
  sensor_d: {
    P: PSU_PLUS,
    M: h('−V ของ PSU ให้เป็น 0V เดียวกับ PLC', 'เอาต์พุต PNP อ้างอิง 0V นี้', ['psu', 'plc'], ['M', 'VM'], ['DC-']),
    OUT: h('DI ของ PLC (DI1–DI4) ไม่ใช่ช่อง AI', 'ขั้ว PNP จ่าย +24V เมื่อตรวจจับวัตถุ', ['plc', 'rio', 'edge'], ['DI1', 'DI2', 'DI3', 'DI4'], ['X']),
  },
  contact_sw: {
    COM: h('+24V ของ PSU', 'หน้าสัมผัสแห้ง ต้องป้อนไฟเอง', ['psu', 'battery'], ['P'], ['DC+']),
    NO: PLC_DI,
  },
  sensor_485: {
    P: PSU_PLUS,
    M: PSU_ZERO,
    '485': RS485,
  },
  emeter: {
    in: h('ด้านออกของ MCCB 3P', 'ไฟ 3 เฟสเข้ามิเตอร์', ['breaker'], ['out'], ['P3']),
    out: h('โหลดหรือบัสบาร์ที่ต้องการวัด', 'ไฟทะลุออกไปวงจร มิเตอร์วัดกระแสที่ไหลผ่าน', ['load_ac', 'motor3', 'tb', 'contactor'], ['L', 'U', 'in'], ['P3', 'L']),
    ETH,
    '485': RS485,
  },
  plc: {
    VP: PSU_PLUS,
    VM: PSU_ZERO,
    AI1: h('4-20mA ของทรานสมิตเตอร์ตัวที่ 1', 'เช่น ความดันหรืออุณหภูมิ', ['sensor_a'], ['OUT'], ['AI']),
    AI2: h('4-20mA ของทรานสมิตเตอร์ตัวที่ 2', 'ช่องแอนะล็อกช่องที่สอง', ['sensor_a'], ['OUT'], ['AI']),
    AI3: h('4-20mA ของทรานสมิตเตอร์ตัวที่ 3', 'ช่องแอนะล็อกช่องที่สาม', ['sensor_a'], ['OUT'], ['AI']),
    AI4: h('4-20mA ของทรานสมิตเตอร์ตัวที่ 4', 'ช่องแอนะล็อกช่องที่สี่', ['sensor_a'], ['OUT'], ['AI']),
    DI1: h('PNP ของเซนเซอร์ หรือ NO ของปุ่ม/ลิมิตสวิตช์', 'อินพุตดิจิทัลช่อง 1', ['sensor_d', 'pb', 'contact_sw', 'selector'], ['OUT', 'out', 'NO', 'B'], ['X']),
    DI2: h('PNP ของเซนเซอร์ หรือหน้าสัมผัสปุ่ม Stop', 'อินพุตดิจิทัลช่อง 2', ['sensor_d', 'pb', 'estop', 'contact_sw'], ['OUT', 'out', 'NO'], ['X']),
    DI3: h('หน้าสัมผัสภาคสนามหรือเซนเซอร์ PNP', 'อินพุตดิจิทัลช่อง 3', ['sensor_d', 'contact_sw', 'pb'], ['OUT', 'NO', 'out'], ['X']),
    DI4: h('หน้าสัมผัสภาคสนามหรือเซนเซอร์ PNP', 'อินพุตดิจิทัลช่อง 4', ['sensor_d', 'contact_sw', 'pb'], ['OUT', 'NO', 'out'], ['X']),
    DO1: h('A1 ของรีเลย์ หรือ X1 ของไพลอต/โซลินอยด์', 'เอาต์พุตช่อง 1 จ่าย +24V ตามลอจิก DO1', ['relay', 'load_dc', 'load_dc', 'tower', 'vfd'], ['A1', 'P', 'R', 'RUN'], ['X']),
    DO2: h('โหลด 24V หรือคอยล์อีกชุด', 'เอาต์พุตช่อง 2', ['relay', 'load_dc', 'load_dc', 'tower'], ['A1', 'P', 'Y'], ['X']),
    DO3: h('โหลด 24V หรือคอยล์อีกชุด', 'เอาต์พุตช่อง 3', ['relay', 'load_dc', 'load_dc', 'tower'], ['A1', 'P', 'G'], ['X']),
    DO4: h('โหลด 24V หรือคอยล์อีกชุด', 'เอาต์พุตช่อง 4', ['relay', 'load_dc', 'load_dc', 'tower'], ['A1', 'P'], ['X']),
    ETH,
    '485': RS485,
  },
  rio: {
    VP: PSU_PLUS,
    VM: PSU_ZERO,
    AI1: h('4-20mA ของทรานสมิตเตอร์', 'ส่งค่าต่อไปยัง PLC ผ่าน Ethernet', ['sensor_a'], ['OUT'], ['AI']),
    AI2: h('4-20mA ของทรานสมิตเตอร์ตัวถัดไป', 'ช่องแอนะล็อกช่อง 2', ['sensor_a'], ['OUT'], ['AI']),
    AI3: h('4-20mA ของทรานสมิตเตอร์ตัวถัดไป', 'ช่องแอนะล็อกช่อง 3', ['sensor_a'], ['OUT'], ['AI']),
    AI4: h('4-20mA ของทรานสมิตเตอร์ตัวถัดไป', 'ช่องแอนะล็อกช่อง 4', ['sensor_a'], ['OUT'], ['AI']),
    DI1: PLC_DI,
    DI2: PLC_DI,
    ETH: h('พอร์ต Ethernet ของสวิตช์ที่ต่อกับ PLC', 'Remote I/O ต้องอยู่เครือข่ายเดียวกับ PLC', ['eswitch', 'plc'], ['E1', 'E2', 'E3', 'E4', 'E5', 'ETH'], ['ETH']),
  },
  edge: {
    VP: PSU_PLUS,
    VM: PSU_ZERO,
    AI1: h('4-20mA ของเซนเซอร์ที่ต้องการส่งขึ้นคลาวด์', 'ค่าที่อ่านได้จะถูกส่งผ่าน Ethernet', ['sensor_a'], ['OUT'], ['AI']),
    AI2: h('4-20mA ของเซนเซอร์ตัวที่สอง', 'ช่องแอนะล็อกช่อง 2', ['sensor_a'], ['OUT'], ['AI']),
    DI1: PLC_DI,
    ETH: h('LAN ของเราเตอร์ 4G หรือสวิตช์', 'ทางออกไปคลาวด์', ['router', 'eswitch'], ['E1', 'E2', 'E3', 'ETH'], ['ETH']),
  },
  eswitch: {
    VP: PSU_PLUS,
    VM: PSU_ZERO,
    E1: ETH,
    E2: ETH,
    E3: ETH,
    E4: ETH,
    E5: ETH,
  },
  router: {
    VP: PSU_PLUS,
    VM: PSU_ZERO,
    E1: h('Ethernet ของ PLC, HMI หรือสวิตช์', 'พอร์ต LAN ฝั่งโรงงาน', ['plc', 'hmi', 'eswitch', 'edge'], ['ETH', 'E1', 'E2'], ['ETH']),
    E2: ETH,
    E3: ETH,
  },
  gateway: {
    VP: PSU_PLUS,
    VM: PSU_ZERO,
    '485': h('RS485 ของเซนเซอร์ Modbus หรือมิเตอร์', 'ฝั่ง RTU ที่ต้องการแปลงเป็น TCP', ['sensor_485', 'emeter', 'plc', 'vfd'], ['485'], ['485']),
    ETH: h('Ethernet ของสวิตช์หรือ PLC', 'ฝั่ง Modbus TCP', ['eswitch', 'plc', 'hmi'], ['E1', 'E2', 'ETH'], ['ETH']),
  },
  lora_gw: {
    VP: PSU_PLUS,
    VM: PSU_ZERO,
    ETH: h('LAN ของเราเตอร์หรือสวิตช์', 'ส่งข้อมูลจากเซนเซอร์ LoRa ขึ้นเครือข่าย ไม่ต้องเดินสายไปหาเซนเซอร์', ['router', 'eswitch'], ['E1', 'E2', 'ETH'], ['ETH']),
  },
  load_ac: {
    L: FROM_L,
    N: FROM_N,
    PE: h('PE ของกริดหรือตู้ไฟ', 'ดินของเต้ารับ ใช้ทดสอบไฟรั่วกับ RCBO', ['grid1', 'grid3', 'passive'], ['PE'], ['PE']),
  },
  motor3: {
    U: h('U/V/W ของ VFD หรือ 2/4/6 ของ Overload', 'ไฟ 3 เฟสเข้ามอเตอร์', ['vfd', 'overload', 'contactor'], ['out'], ['P3']),
    PE: h('PE ของตู้ไฟ', 'ต่อตัวถังมอเตอร์ลงดิน', ['grid3', 'gen', 'passive'], ['PE'], ['PE']),
  },
  load_dc: {
    P: h('DO ของ PLC หรือ NO ของรีเลย์/ไทม์เมอร์', 'ได้ +24V แล้วโหลดจึงทำงาน อีกขั้วต้องไป 0V', ['plc', 'relay', 'timer'], ['DO1', 'DO2', 'DO3', 'DO4', 'NO'], ['X']),
    M: PSU_ZERO,
  },
  tower: {
    R: h('DO ของ PLC สำหรับสถานะผิดปกติ', 'หลอดแดง', ['plc'], ['DO1', 'DO2', 'DO3', 'DO4'], ['X']),
    Y: h('DO ของ PLC สำหรับสถานะรอหรือเตือน', 'หลอดเหลือง', ['plc'], ['DO1', 'DO2', 'DO3', 'DO4'], ['X']),
    G: h('DO ของ PLC สำหรับสถานะเดินเครื่อง', 'หลอดเขียว', ['plc'], ['DO1', 'DO2', 'DO3', 'DO4'], ['X']),
    M: PSU_ZERO,
  },
  hmi: {
    VP: PSU_PLUS,
    VM: PSU_ZERO,
    ETH: h('Ethernet ของสวิตช์หรือ PLC', 'HMI อ่านแท็กจาก PLC ที่อยู่เครือข่ายเดียวกัน', ['eswitch', 'plc'], ['E1', 'E2', 'E3', 'E4', 'E5', 'ETH'], ['ETH']),
    '485': h('RS485 ของ PLC หรือเซนเซอร์ Modbus', 'ใช้เมื่อคุยแบบ Modbus RTU แทน Ethernet', ['plc', 'sensor_485', 'emeter'], ['485'], ['485']),
  },
  scada: {
    L: h('L out ของ UPS หรือเบรกเกอร์', 'ไฟเลี้ยงคอมพิวเตอร์', ['ups', 'breaker', 'rcbo'], ['OL', 'out', 'L2'], ['L', 'X']),
    N: h('N out ของ UPS หรือเบรกเกอร์', 'นิวทรัลของคอมพิวเตอร์', ['ups', 'breaker', 'rcbo'], ['ON', 'N2', 'N'], ['N']),
    ETH: h('Ethernet ของสวิตช์ที่ต่อกับ PLC', 'SCADA ดึงแท็กทั้งระบบผ่าน LAN', ['eswitch', 'plc', 'router'], ['E1', 'E2', 'ETH'], ['ETH']),
    HDMI: HDMI_OUT,
  },
  monitor: {
    L: FROM_L,
    N: FROM_N,
    HDMI: HDMI_IN,
  },
  pmeter: {
    L: FROM_L,
    N: FROM_N,
    IN: h('4-20mA ของทรานสมิตเตอร์โดยตรง', 'มิเตอร์ตัวนี้แสดงค่าโดยไม่ผ่าน PLC', ['sensor_a'], ['OUT'], ['AI']),
  },
  led: {
    VP: PSU_PLUS,
    VM: PSU_ZERO,
    ETH: h('Ethernet ของสวิตช์ที่ต่อกับ PLC', 'ป้าย Andon แสดงแท็กและ Alarm จากเครือข่าย', ['eswitch', 'plc'], ['E1', 'E2', 'ETH'], ['ETH']),
  },
  tb: {
    A: h('สายที่ต้องการแยกไปหลายจุด เช่น +24V หรือ 0V', 'จุด 1 พ่วงถึงกันทั้งบล็อก', ['psu', 'plc', 'sensor_d'], ['P', 'M', 'VP', 'VM'], ['DC+', 'DC-', 'X', 'L', 'N']),
    B: h('อุปกรณ์ตัวถัดไปที่ต้องได้สัญญาณเดียวกัน', 'จุด 2 ต่อถึงจุด 1', ['sensor_d', 'plc', 'relay'], ['P', 'M', 'A2', 'VM'], ['DC+', 'DC-', 'X']),
    C: h('อุปกรณ์ตัวถัดไปที่ต้องได้สัญญาณเดียวกัน', 'จุด 3 ต่อถึงจุด 1', ['sensor_a', 'hmi', 'eswitch'], ['P', 'M', 'VP', 'VM'], ['DC+', 'DC-', 'X']),
    D: h('อุปกรณ์ตัวถัดไปที่ต้องได้สัญญาณเดียวกัน', 'จุด 4 ต่อถึงจุด 1', ['load_dc', 'relay'], ['M', 'A2', 'P'], ['DC-', 'DC+', 'X']),
    in: h('แหล่งจ่ายที่ต้องการแจก เช่น L, +24V หรือบัส 3 เฟส', 'ขั้วเข้าตัวเดียว แล้วแยกออกหลายทาง', ['psu', 'breaker', 'grid1', 'ats'], ['P', 'out', 'L', 'O'], ['DC+', 'L', 'X', 'P3']),
    o1: h('โหลดหรืออุปกรณ์ทางที่ 1', 'ทางแยกที่ 1', ['plc', 'sensor_d', 'load_ac', 'contactor'], ['VP', 'P', 'L', 'in'], ['DC+', 'L', 'X', 'P3']),
    o2: h('โหลดหรืออุปกรณ์ทางที่ 2', 'ทางแยกที่ 2', ['hmi', 'sensor_a', 'load_ac', 'vfd'], ['VP', 'P', 'L', 'in'], ['DC+', 'L', 'X', 'P3']),
    o3: h('โหลดหรืออุปกรณ์ทางที่ 3', 'ทางแยกที่ 3', ['eswitch', 'load_ac', 'motor3'], ['VP', 'L', 'U'], ['DC+', 'L', 'P3']),
    o4: h('โหลดหรืออุปกรณ์ทางที่ 4', 'ทางแยกที่ 4', ['sensor_485', 'load_dc'], ['P', 'VP'], ['DC+']),
    o5: h('โหลดหรืออุปกรณ์ทางที่ 5', 'ทางแยกที่ 5', ['relay', 'load_dc'], ['A1', 'P'], ['X', 'DC+']),
  },
};

const TYPE_SUMMARY: Record<string, string> = {
  prox: 'เลี้ยง +24V กับ 0V จาก PSU แล้วต่อขั้ว PNP เข้า DI ของ PLC',
  photo: 'เลี้ยง +24V กับ 0V จาก PSU แล้วต่อขั้ว PNP เข้า DI ของ PLC',
  pir: 'เลี้ยง +24V กับ 0V จาก PSU แล้วต่อขั้ว PNP เข้า DI ของ PLC',
  smoke: 'เลี้ยง 24V ตามระบบแจ้งเหตุ แล้วต่อขั้ว PNP เข้า DI ของ PLC',
  pb_nc: 'ปุ่ม Stop เป็นหน้าสัมผัส NC ต่ออนุกรมในวงจรคอยล์ ก่อนถึง A1',
  pb_no: 'ปุ่ม Start เป็นหน้าสัมผัส NO ต่อขนานกับหน้าสัมผัสล็อกตัวเองของคอนแทคเตอร์',
  estop: 'ต่อแบบ NC อนุกรมในวงจรหยุด กดแล้ววงจรคอยล์ต้องขาด',
  socket: 'ต่อ L N จากเบรกเกอร์หรือ RCBO และ PE ลงดิน เปิดโหมดไฟรั่วเพื่อลอง RCBO',
  lora_th: 'ไม่ต้องเดินสาย วาง LoRaWAN Gateway ที่มีไฟและ Ethernet เซนเซอร์จะส่งข้อมูลเอง',
  cloud: 'ไม่ต้องเดินสาย ต่อเราเตอร์ 4G เข้ากับ PLC หรือ Edge แล้วแดชบอร์ดจะขึ้นเอง',
  pv_comb: 'สตริงแผงเข้า PV in ผ่านฟิวส์ DC แล้ว PV out ไป DC Isolator หรืออินเวอร์เตอร์ ต่อ PE ให้ SPD',
  dc_iso: 'ติดหน้าอินเวอร์เตอร์ PV in จากแผง/Combiner PV out ไปขั้ว PV ของอินเวอร์เตอร์',
  pvinv3: 'PV+/PV− จาก DC Isolator ฝั่ง AC ต่อ L1-L3 เข้า MCCB ฟีดเดอร์ของ MDB พร้อม N และ PE',
};

const BEH_SUMMARY: Partial<Record<Behavior, string>> = {
  grid1: 'จ่าย L, N และ PE เข้าเบรกเกอร์ก่อน แล้วจึงแยกไปโหลด',
  grid3: 'จ่าย L1–L3 เข้า ATS หรือ MCCB และแยก L1 กับ N ถ้ามีวงจร 230V',
  gridmv: 'จ่าย 22kV เข้าสวิตช์เกียร์เท่านั้น ไม่ต่อตรงเข้าโหลดหรือตู้ MDB',
  swg: 'คั่นระหว่างการไฟฟ้ากับหม้อแปลง ปิด VCB แล้วไฟแรงกลางถึงขั้ว HV',
  tr: 'รับ 22kV ที่ HV แล้วจ่าย 400V ที่ LV, 230V ที่ L, พร้อม N และ PE ไปตู้ MDB',
  mdb: 'รับไฟจากหม้อแปลง แยก 3 เฟสออก F1–F4 และจ่าย 230V ที่ขั้ว L สำหรับวงจรควบคุม',
  gen: 'ต่อ L1–L3 เข้าช่อง Emergency ของ ATS ใช้คู่กับกริด',
  battery: 'ต่อ + และ − เข้าวงจร 24V หรือใช้เป็นแหล่งสำรองของ PSU',
  psu: 'รับ L-N 230V แล้วจ่าย +V/−V ให้ PLC เซนเซอร์ และรีเลย์ทั้งตู้',
  ups: 'รับ L-N จากกริด จ่าย L out/N out ให้โหลดที่ห้ามดับ',
  ats: 'Normal มาจากกริด Emergency มาจากเครื่องกำเนิด ขั้ว Load ไป MCCB',
  pv: 'PV+/PV− ไป Combiner Box หรือ DC Isolator ก่อนเข้าอินเวอร์เตอร์ ต่อ PE โครงแผงลงดิน',
  pvinv: 'PV จาก DC Isolator เข้า PV+/PV− ฝั่ง AC ต่อ L/N ผ่านเบรกเกอร์ของตัวเองเข้าตู้ไฟ อินเวอร์เตอร์จะจ่ายเฉพาะตอนมีไฟกริด',
  hybrid: 'PV จากแผง BAT จากแบต GRID จากเบรกเกอร์กริด และ LOAD ไปตู้โหลดสำรองที่ต้องไม่ดับ',
  bess: 'ต่อ BAT+/BAT− เข้าขั้ว BAT ของไฮบริดอินเวอร์เตอร์เท่านั้น',
  breaker: 'ไฟเข้าด้าน IN หรือ L in ไฟออกด้าน OUT หรือ L out ไปหาโหลด',
  rcbo: 'ต่อ L-N เข้าและออกเหมือนเบรกเกอร์ 2 ขั้ว ใช้กับเต้ารับเพื่อกันไฟรั่ว',
  fuse: 'ต่ออนุกรมบนสายที่ต้องการป้องกัน ไฟเข้า IN ไฟออก OUT',
  passive: 'ต่อคร่อมขนาน L, N และ PE ไม่ได้ต่ออนุกรมกับโหลด',
  switch: 'L จากเบรกเกอร์เข้า IN แล้ว OUT ไปขั้ว L ของหลอดหรือพัดลม',
  pb: 'ต่อหน้าสัมผัสเข้าวงจร 24V ของคอยล์หรือ DI ของ PLC',
  selector: 'COM คือไฟเข้า HAND ไปวงจรเดินมือ AUTO ไป DI ของ PLC',
  relay: 'A1-A2 คือคอยล์ 24V ส่วน COM/NO/NC คือหน้าสัมผัสที่ไปสั่งโหลด',
  contactor: 'A1-A2 คือคอยล์ 1/3/5-2/4/6 คือไฟมอเตอร์ 13-14 ใช้ล็อกตัวเอง',
  overload: 'ต่อระหว่างคอนแทคเตอร์กับมอเตอร์ และเอา 95-96 ไปตัดคอยล์',
  timer: 'ให้ไฟคอยล์ A1-A2 แล้วหน้าสัมผัส 15-18 จะปิดเมื่อครบเวลา',
  tempctl: 'รับ 4-20mA จากหัววัดอุณหภูมิ แล้วหน้าสัมผัส NO ไปสั่งฮีตเตอร์',
  vfd: 'ไฟ 3 เฟสเข้า L1–L3 ออกที่ U/V/W ไปมอเตอร์ สั่งเดินที่ขั้ว RUN',
  sensor_a: 'เลี้ยง +24V กับ 0V แล้วต่อ 4-20mA เข้า AI ของ PLC หรือ Panel Meter',
  sensor_d: 'เลี้ยง +24V กับ 0V แล้วต่อขั้ว PNP เข้า DI ของ PLC',
  contact_sw: 'หน้าสัมผัสแห้ง ป้อน +24V ที่ COM แล้ว NO ไป DI ของ PLC',
  sensor_485: 'เลี้ยง 24V แล้วต่อ RS485 เข้า PLC หรือ Modbus Gateway',
  sensor_lora: 'ไม่ต้องเดินสาย ส่งข้อมูลถึง LoRaWAN Gateway ในพื้นที่เอง',
  emeter: 'ต่ออนุกรมบนบัส 3 เฟส แล้วส่งค่าด้วย Ethernet หรือ RS485',
  plc: 'เลี้ยง L+ กับ M จาก PSU รับเซนเซอร์ที่ AI/DI สั่งของที่ DO แล้วต่อ Ethernet ไป HMI',
  rio: 'เลี้ยง 24V รับเซนเซอร์เหมือน PLC แล้วต่อ Ethernet กลับเข้าสวิตช์ของ PLC',
  edge: 'เลี้ยง 24V รับเซนเซอร์ แล้วต่อ Ethernet ไปเราเตอร์เพื่อขึ้นคลาวด์',
  eswitch: 'ต้องมี 24V ก่อนข้อมูลถึงจะวิ่ง แต่ละพอร์ต P1–P5 ต่อ PLC, HMI, SCADA ได้',
  router: 'เลี้ยง 24V แล้วต่อ LAN เข้าสวิตช์หรือ PLC เพื่อส่งข้อมูลขึ้นคลาวด์',
  gateway: 'ฝั่ง RS485 ไปหาเซนเซอร์ Modbus ฝั่ง Ethernet ไปหา PLC หรือ HMI',
  lora_gw: 'เลี้ยง 24V ต่อ Ethernet ขึ้นเราเตอร์ เซนเซอร์ LoRa ไม่ต้องเดินสายมาหา',
  load_ac: 'ขั้ว L รับไฟจากสวิตช์หรือเบรกเกอร์ ขั้ว N กลับไปนิวทรัล',
  motor3: 'U/V/W รับไฟจาก VFD หรือโอเวอร์โหลด และต่อ PE ลงดิน',
  load_dc: 'ขั้วบวกรับ DO ของ PLC หรือ NO ของรีเลย์ ขั้วลบไป 0V ของ PSU',
  tower: 'แต่ละสีรับ DO คนละช่องของ PLC และ 0V ไปที่ PSU',
  hmi: 'เลี้ยง 24V แล้วต่อ Ethernet เข้าสวิตช์ตัวเดียวกับ PLC จึงเห็นแท็ก',
  scada: 'ต่อไฟผ่าน UPS, Ethernet เข้าเครือข่าย PLC และ HDMI ไปจอใหญ่',
  monitor: 'ต่อไฟ 230V และ HDMI จาก SCADA จึงแสดงภาพเดียวกับเครื่อง SCADA',
  pmeter: 'ต่อไฟ 230V และนำ 4-20mA จากทรานสมิตเตอร์เข้าช่อง IN',
  led: 'เลี้ยง 24V แล้วต่อ Ethernet เข้าเครือข่ายเดียวกับ PLC',
  cloud: 'ไม่ต้องเดินสาย จะมีข้อมูลเมื่อเราเตอร์ 4G ออนไลน์และต่อกับ PLC',
  tb: 'ใช้พ่วงสายเส้นเดียวกันเข้าด้วยกัน เช่น แจก +24V หรือ 0V ให้หลายตัว',
};

const TYPE_PORTS: Record<string, Record<string, PortHint>> = {
  mcb1: {
    in: h('L จากกริดหรือจากเบรกเกอร์ตัวก่อนหน้า', 'ไฟเข้าเบรกเกอร์ 1 ขั้ว', ['grid1', 'breaker', 'ups'], ['L', 'out', 'OL'], ['L', 'X']),
    out: h('IN ของสวิตช์ หรือขั้ว L ของโหลด 230V', 'ไฟออกเมื่อคันโยก ON', ['switch', 'load_ac', 'psu', 'pmeter'], ['in', 'L'], ['L', 'X']),
  },
  mcb2: {
    L1: h('L จากกริดหรือ UPS', 'ไลน์เข้า', ['grid1', 'ups'], ['L', 'OL'], ['L']),
    N1: h('N จากกริดหรือ UPS', 'นิวทรัลเข้า', ['grid1', 'ups'], ['N', 'ON'], ['N']),
    L2: h('L ของโหลดหรือสวิตช์', 'ไลน์ออก', ['switch', 'load_ac', 'psu'], ['in', 'L'], ['L', 'X']),
    N2: h('N ของโหลดชุดเดียวกัน', 'นิวทรัลออก', ['load_ac', 'psu', 'scada'], ['N'], ['N']),
  },
  mccb3: {
    in: h('Load ของ ATS หรือ L1–L3 ของกริด', 'ไฟ 3 เฟสเข้า', ['ats', 'grid3'], ['O', 'P3'], ['P3']),
    out: h('IN ของคอนแทคเตอร์, VFD, มิเตอร์ หรือ L1-L3 ของอินเวอร์เตอร์โซลาร์', 'ไฟ 3 เฟสออก', ['contactor', 'vfd', 'emeter', 'tb', 'pvinv'], ['in', 'P3'], ['P3']),
  },
  rcbo: {
    L1: h('L จากกริด', 'ไลน์เข้า RCBO', ['grid1'], ['L'], ['L']),
    N1: h('N จากกริด', 'นิวทรัลเข้า RCBO', ['grid1'], ['N'], ['N']),
    L2: h('L ของเต้ารับหรือโหลดที่ต้องกันไฟดูด', 'ไลน์ออก', ['load_ac', 'load_ac'], ['L'], ['L']),
    N2: h('N ของโหลดชุดเดียวกัน', 'นิวทรัลออก', ['load_ac', 'load_ac'], ['N'], ['N']),
  },
  spd: {
    L: h('L ของเมนบัส แบบคร่อมขนาน', 'ไม่ต่ออนุกรมกับโหลด', ['grid1', 'breaker'], ['L', 'out'], ['L', 'X']),
    N: h('N ของเมนบัส แบบคร่อมขนาน', 'คู่กับขั้ว L', ['grid1', 'breaker'], ['N', 'N2'], ['N']),
    PE: h('กราวด์ตู้ไฟ', 'ทางระบายไฟกระชาก', ['grid1', 'grid3'], ['PE'], ['PE']),
  },
  limit_sw: {
    COM: h('+24V ของ PSU', 'ลิมิตสวิตช์เป็นหน้าสัมผัสแห้ง', ['psu'], ['P'], ['DC+']),
    NO: h('DI ของ PLC', 'ปิดวงจรเมื่อถูกกด', ['plc', 'rio', 'edge'], ['DI1', 'DI2', 'DI3', 'DI4'], ['X']),
  },
  float_sw: {
    COM: h('+24V ของ PSU', 'ลูกลอยเป็นหน้าสัมผัสแห้ง', ['psu'], ['P'], ['DC+']),
    NO: h('DI ของ PLC', 'ปิดวงจรเมื่อระดับน้ำถึง setpoint', ['plc', 'rio', 'edge'], ['DI1', 'DI2', 'DI3', 'DI4'], ['X']),
  },
  pilot: {
    P: h('DO ของ PLC หรือ NO ของรีเลย์', 'ขั้ว X1 ได้ +24V แล้วหลอดติด', ['plc', 'relay', 'timer'], ['DO1', 'DO2', 'DO3', 'DO4', 'NO'], ['X']),
    M: PSU_ZERO,
  },
  pv_comb: {
    ip: h('PV+ ของสตริงแผงโซลาร์', 'เข้าฟิวส์ DC ขั้วบวก', ['pv'], ['PVP'], ['PV+']),
    im: h('PV− ของสตริงแผงโซลาร์', 'เข้าฟิวส์ DC ขั้วลบ', ['pv'], ['PVM'], ['PV-']),
    op: h('PV+ in ของ DC Isolator หรือ PV+ ของอินเวอร์เตอร์', 'DC บวกที่ผ่านฟิวส์และ SPD แล้ว', ['switch', 'pvinv', 'hybrid'], ['ip', 'PVP'], ['PV+']),
    om: h('PV− in ของ DC Isolator หรือ PV− ของอินเวอร์เตอร์', 'DC ลบที่ผ่านฟิวส์และ SPD แล้ว', ['switch', 'pvinv', 'hybrid'], ['im', 'PVM'], ['PV-']),
    PE: PV_EARTH,
  },
  dc_iso: {
    ip: h('PV+ out ของ Combiner หรือ PV+ ของแผง', 'DC บวกเข้าสวิตช์ตัดวงจร', ['switch', 'pv'], ['op', 'PVP'], ['PV+']),
    im: h('PV− out ของ Combiner หรือ PV− ของแผง', 'DC ลบเข้าสวิตช์ตัดวงจร', ['switch', 'pv'], ['om', 'PVM'], ['PV-']),
    op: h('PV+ ของอินเวอร์เตอร์', 'ตัดได้ทั้ง 2 ขั้วพร้อมกันก่อนซ่อมอินเวอร์เตอร์', ['pvinv', 'hybrid'], ['PVP'], ['PV+']),
    om: h('PV− ของอินเวอร์เตอร์', 'DC ลบเข้าอินเวอร์เตอร์', ['pvinv', 'hybrid'], ['PVM'], ['PV-']),
  },
};

export function deviceAdvice(type: string): { summary: string; ports: Record<string, PortHint> } {
  const df = DEF_MAP[type];
  if (!df) return { summary: '', ports: {} };
  const base = BEH_PORTS[df.beh] ?? {};
  const over = TYPE_PORTS[type] ?? {};
  const ports: Record<string, PortHint> = {};
  for (const p of df.ports) ports[p.id] = over[p.id] ?? base[p.id] ?? fallback(p);
  return {
    summary: TYPE_SUMMARY[type] ?? BEH_SUMMARY[df.beh] ?? df.desc,
    ports,
  };
}

export function portHint(type: string, portId: string): PortHint | undefined {
  return deviceAdvice(type).ports[portId];
}

/** พอร์ตที่ยังไม่มีคำแนะนำเฉพาะ — ใช้กันพลาด ไม่ควรโผล่ถ้าคลุมทุกชนิดแล้ว */
export function missingAdvice(): string[] {
  const miss: string[] = [];
  for (const df of Object.values(DEF_MAP)) {
    const base = BEH_PORTS[df.beh] ?? {};
    const over = TYPE_PORTS[df.type] ?? {};
    if (!TYPE_SUMMARY[df.type] && !BEH_SUMMARY[df.beh]) miss.push(df.type);
    for (const p of df.ports) if (!over[p.id] && !base[p.id]) miss.push(`${df.type}.${p.id}`);
  }
  return miss;
}

function fallback(p: PortDef): PortHint {
  const name = p.label;
  if (p.kind === 'L') return h(`ขั้ว L ของอุปกรณ์ถัดไปในวงจร 230V`, `สายไลน์ของขั้ว ${name}`, ['load_ac', 'breaker'], undefined, ['L', 'X']);
  if (p.kind === 'N') return h('ขั้ว N ของแหล่งจ่ายหรือโหลดคู่กัน', 'สายนิวทรัล', ['grid1', 'load_ac'], undefined, ['N']);
  if (p.kind === 'PE') return h('ขั้ว PE / กราวด์ตู้', 'สายดิน', ['grid1', 'passive'], ['PE'], ['PE']);
  if (p.kind === 'P3') return h('ขั้ว 3 เฟสของแหล่งจ่ายหรือโหลด', 'สาย L1 L2 L3', ['breaker', 'motor3', 'vfd'], undefined, ['P3']);
  if (p.kind === 'MV') return h('ขั้ว 22kV ของสวิตช์เกียร์หรือหม้อแปลง', 'สายแรงกลาง', ['swg', 'tr'], undefined, ['MV']);
  if (p.kind === 'DC+') return PSU_PLUS;
  if (p.kind === 'DC-') return PSU_ZERO;
  if (p.kind === 'PV+') return PV_PLUS_IN;
  if (p.kind === 'PV-') return PV_MINUS_IN;
  if (p.kind === 'AI') return PLC_AI;
  if (p.kind === '485') return RS485;
  if (p.kind === 'ETH') return ETH;
  if (p.kind === 'HDMI') return HDMI_OUT;
  return h('ขั้วชนิดเดียวกันของอุปกรณ์ถัดไปในวงจร', `ดูชื่อขั้ว ${name} ประกอบกับอุปกรณ์ต้นทางและปลายทาง`, undefined, undefined, ['X', 'L', 'N', 'DC+', 'DC-']);
}

export function wiredEnds(design: Design, compId: string, portId: string): string[] {
  const lines: string[] = [];
  for (const w of design.wires) {
    const other = w.a.c === compId && w.a.p === portId ? w.b : w.b.c === compId && w.b.p === portId ? w.a : null;
    if (!other) continue;
    const c = design.comps.find((x) => x.id === other.c);
    const p = c && DEF_MAP[c.type]?.ports.find((x) => x.id === other.p);
    if (c) lines.push(`${c.label} · ${p?.label ?? other.p}`);
  }
  return lines;
}

export function planMatches(design: Design, selfId: string, port: PortDef, hint: PortHint): PlanMatch[] {
  const found: PlanMatch[] = [];
  for (const c of design.comps) {
    if (c.id === selfId) continue;
    const df = DEF_MAP[c.type];
    if (!df) continue;
    if (hint.beh?.length && !hint.beh.includes(df.beh)) continue;
    for (const p of df.ports) {
      if (hint.ports?.length && !hint.ports.includes(p.id)) continue;
      if (hint.kinds?.length ? !hint.kinds.includes(p.kind) : !compatible(port.kind, p.kind)) continue;
      const used = design.wires.some((w) => (w.a.c === c.id && w.a.p === p.id) || (w.b.c === c.id && w.b.p === p.id));
      found.push({ label: c.label, portLabel: p.label, used });
    }
  }
  found.sort((a, b) => Number(a.used) - Number(b.used) || a.label.localeCompare(b.label));
  const free = found.filter((m) => !m.used);
  return (free.length ? free : found).slice(0, 3);
}
