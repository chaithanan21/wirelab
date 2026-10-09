import { useMemo, useState } from 'react';
import type { Comp, Design } from './types';
import type { SimState, Tag } from './sim';
import { CATEGORIES, DEF_MAP } from './library';
import { Screen, fmt } from './CompView';

interface Props {
  design: Design;
  sim: SimState | null;
  hist: Record<string, number[]>;
  tick: number;
  open: boolean;
  setOpen: (v: boolean) => void;
  onComp: (id: string, patch: Partial<Comp>) => void;
  onSelect: (id: string) => void;
  onClearAlarms: () => void;
}

const TABS = [
  { id: 'display', name: '🖥 จอแสดงผล' },
  { id: 'process', name: '🏭 กระบวนการ' },
  { id: 'trend', name: '📈 กราฟแนวโน้ม' },
  { id: 'alarm', name: '🚨 Alarm' },
  { id: 'elec', name: '⚡ ไฟฟ้า' },
  { id: 'bom', name: '📋 BOM' },
];

const COLORS = ['#22d3ee', '#f59e0b', '#a78bfa', '#4ade80', '#f472b6', '#fb7185', '#60a5fa', '#facc15'];

export function BottomPanel(p: Props) {
  const { design, sim, open, setOpen } = p;
  const [tab, setTab] = useState('display');
  const activeCount = sim ? Object.keys(sim.activeAlarms).length : 0;
  if (!open) return null;
  return (
    <section className="bottom open">
      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id && open ? 'on' : ''}`}
            onClick={() => {
              setTab(t.id);
              setOpen(true);
            }}
          >
            {t.name}
            {t.id === 'alarm' && activeCount > 0 && <span className="badge">{activeCount}</span>}
          </button>
        ))}
        <div className="grow" />
        {sim && (
          <span className="muted small mono">
            t = {fmt(sim.t, 1)}s · {fmt(sim.plant.totalKW, 2)} kW · {fmt(sim.plant.totalA, 1)} A
          </span>
        )}
        <button className="tab" onClick={() => setOpen(false)}>
          ▾ ซ่อน
        </button>
      </div>
      <div className="tab-body">
          {tab === 'display' && <Displays {...p} />}
          {tab === 'process' && <Process sim={sim} />}
          {tab === 'trend' && <Trends sim={sim} hist={p.hist} />}
          {tab === 'alarm' && <Alarms sim={sim} onClear={p.onClearAlarms} />}
          {tab === 'elec' && <Electrical design={design} sim={sim} onSelect={p.onSelect} />}
          {tab === 'bom' && <Bom design={design} />}
      </div>
    </section>
  );
}

function NeedSim() {
  return <div className="empty">กด <b>▶ Simulate</b> ที่แถบด้านบนเพื่อเริ่มจำลองและดูข้อมูลแบบเรียลไทม์</div>;
}

function Displays({ design, sim, hist, onComp, onSelect }: Props) {
  const displays = design.comps.filter((c) => ['hmi', 'scada', 'monitor', 'led', 'cloud', 'pmeter'].includes(DEF_MAP[c.type].beh));
  const plcs = design.comps.filter((c) => DEF_MAP[c.type].beh === 'plc');
  if (!displays.length)
    return <div className="empty">ยังไม่มีจอแสดงผล — ลาก <b>HMI / SCADA / Monitor / LED Andon / Cloud</b> จากหมวด "จอแสดงผล" มาวาง แล้วต่อสาย Ethernet กับ PLC ผ่าน Switch</div>;
  if (!sim) return <NeedSim />;
  return (
    <div className="disp-grid">
      {displays.map((c) => {
        const df = DEF_MAP[c.type];
        const ds = sim.displays[c.id];
        const r = sim.rt[c.id];
        const W = df.beh === 'led' ? 520 : df.beh === 'pmeter' ? 240 : 420;
        const H = df.beh === 'led' ? 70 : df.beh === 'pmeter' ? 90 : 236;
        return (
          <div key={c.id} className="disp-card" style={{ width: W + 22 }}>
            <div className="disp-h" onClick={() => onSelect(c.id)}>
              <b>{c.label}</b>
              <span className="muted small">{c.brand} {c.model}</span>
              <span className={`pill ${ds?.status ?? (r?.powered ? 'ok' : 'off')}`}>{ds?.status === 'ok' || (df.beh === 'pmeter' && r?.powered) ? 'ONLINE' : ds?.status === 'nocomm' ? 'COMM FAIL' : 'OFF'}</span>
            </div>
            <svg width={W} height={H} className="disp-svg">
              {df.beh === 'pmeter' ? (
                <g>
                  <rect x={0} y={0} width={W} height={H} rx={6} fill="#0b0f14" stroke="#1f2937" />
                  <text x={W - 16} y={58} textAnchor="end" fontSize={44} className="mono" fill={r?.powered ? '#f87171' : '#1f2937'} fontWeight={700}>
                    {r?.powered && r?.pv !== undefined ? fmt(r.pv, Math.max(0, +c.props.decimals || 0)) : '----'}
                  </text>
                  <text x={W - 16} y={80} textAnchor="end" fontSize={12} fill="#94a3b8">{r?.unit ?? ''}</text>
                </g>
              ) : (
                <Screen x={0} y={0} w={W} h={H} ds={ds} style={df.beh} title={df.beh === 'scada' || df.beh === 'monitor' ? `${c.model} — Plant Overview` : `${c.brand} ${c.model}`} hist={hist} t={sim.t} />
              )}
            </svg>
            {ds?.via?.length ? <div className="muted small">รับข้อมูลจาก: {ds.via.join(', ')}</div> : null}
            {(df.beh === 'hmi' || df.beh === 'scada') && ds?.status === 'ok' && plcs.length > 0 && (
              <div className="btns">
                {plcs
                  .filter((pl) => ds.via.includes(pl.label))
                  .map((pl) => (
                    <button key={pl.id} className={`btn tiny ${pl.props.hmiCmd ? 'ok' : ''}`} onClick={() => onComp(pl.id, { props: { ...pl.props, hmiCmd: !pl.props.hmiCmd } })}>
                      {pl.label} HMI CMD: {pl.props.hmiCmd ? 'ON' : 'OFF'}
                    </button>
                  ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Gauge({ label, value, min, max, unit, color }: { label: string; value: number; min: number; max: number; unit: string; color: string }) {
  const f = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  const a0 = Math.PI * 0.8;
  const a1 = a0 + Math.PI * 1.4 * f;
  const R = 42;
  const pt = (a: number) => `${60 + R * Math.cos(a)},${60 + R * Math.sin(a)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return (
    <svg width={120} height={110} className="gauge">
      <path d={`M${pt(a0)} A${R},${R} 0 1 1 ${pt(a0 + Math.PI * 1.4)}`} stroke="#1e293b" strokeWidth={9} fill="none" strokeLinecap="round" />
      {f > 0.001 && <path d={`M${pt(a0)} A${R},${R} 0 ${large} 1 ${pt(a1)}`} stroke={color} strokeWidth={9} fill="none" strokeLinecap="round" />}
      <text x={60} y={62} textAnchor="middle" fontSize={17} fill="#e2e8f0" className="mono" fontWeight={700}>
        {fmt(value)}
      </text>
      <text x={60} y={76} textAnchor="middle" fontSize={9} fill="#94a3b8">{unit}</text>
      <text x={60} y={104} textAnchor="middle" fontSize={10} fill="#cbd5e1">{label}</text>
    </svg>
  );
}

function Process({ sim }: { sim: SimState | null }) {
  if (!sim) return <NeedSim />;
  const p = sim.plant;
  const lv = p.level / 5;
  return (
    <div className="process">
      <Gauge label="อุณหภูมิ" value={p.temp} min={0} max={150} unit="°C" color="#f97316" />
      <Gauge label="ความดัน" value={p.pressure} min={0} max={10} unit="bar" color="#22d3ee" />
      <Gauge label="อัตราการไหล" value={p.flow} min={0} max={100} unit="m³/h" color="#a78bfa" />
      <Gauge label="การสั่นสะเทือน" value={p.vib} min={0} max={25} unit="mm/s" color="#4ade80" />
      <Gauge label="กำลังไฟรวม" value={p.totalKW} min={0} max={50} unit="kW" color="#facc15" />
      <svg width={140} height={130}>
        <rect x={30} y={10} width={70} height={100} rx={6} fill="#0f172a" stroke="#334155" strokeWidth={2} />
        <rect x={32} y={12 + 96 * (1 - lv)} width={66} height={96 * lv} rx={4} fill="#0ea5e9" opacity={0.7} />
        <text x={65} y={64} textAnchor="middle" fontSize={15} fill="#fff" className="mono" fontWeight={700}>
          {fmt(p.level, 2)}m
        </text>
        <text x={65} y={126} textAnchor="middle" fontSize={10} fill="#cbd5e1">ระดับถัง (Tank)</text>
      </svg>
      <div className="process-info">
        <div className="row"><span>ฮีตเตอร์ทำงาน</span><b className="mono">{fmt(p.heatKW, 2)} kW</b></div>
        <div className="row"><span>แอร์/ทำความเย็น</span><b className="mono">{fmt(p.coolKW, 2)} kW</b></div>
        <div className="row"><span>ปั๊ม (ความเร็ว)</span><b className="mono">{fmt(p.pumpFrac * 100, 0)} %</b></div>
        <div className="row"><span>กระแสรวม</span><b className="mono">{fmt(p.totalA, 1)} A</b></div>
        {p.solarKW > 0 && <div className="row"><span>ไฟจากโซลาร์</span><b className="mono">{fmt(p.solarKW, 2)} kW</b></div>}
        <p className="muted small">เซนเซอร์โหมด <b>process</b> จะอ่านค่าจากแบบจำลองกระบวนการนี้ — เปิดฮีตเตอร์ อุณหภูมิขึ้น, เดินปั๊ม แรงดัน/อัตราการไหล/ระดับถังเพิ่ม</p>
      </div>
    </div>
  );
}

function Trends({ sim, hist }: { sim: SimState | null; hist: Record<string, number[]> }) {
  const [pick, setPick] = useState<string[] | null>(null);
  if (!sim) return <NeedSim />;
  const tags = Object.values(sim.tags).filter((t) => !t.bool);
  if (!tags.length) return <div className="empty">ยังไม่มีแท็กในเครือข่าย — ต่อเซนเซอร์เข้า PLC/Remote I/O หรือใช้เซนเซอร์ Modbus/LoRa</div>;
  const chosen = (pick ?? tags.slice(0, 5).map((t) => t.id)).filter((id) => sim.tags[id]);
  const W = 760;
  const H = 200;
  return (
    <div className="trends">
      <div className="trend-list">
        {tags.map((t) => {
          const on = chosen.includes(t.id);
          const col = COLORS[chosen.indexOf(t.id) % COLORS.length];
          return (
            <label key={t.id} className="trend-item">
              <input type="checkbox" checked={on} onChange={() => setPick(on ? chosen.filter((x) => x !== t.id) : [...chosen, t.id])} />
              <span className="sw-mini" style={{ background: on ? col : '#334155' }} />
              <span className="grow">{t.name}</span>
              <b className="mono">{fmt(t.value)} {t.unit}</b>
            </label>
          );
        })}
      </div>
      <svg width={W} height={H + 24} className="trend-svg">
        <rect x={0} y={0} width={W} height={H} fill="#0b1220" rx={6} />
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <g key={g}>
            <line x1={0} x2={W} y1={H * g} y2={H * g} stroke="#1e293b" />
            <text x={4} y={H * g + (g === 0 ? 10 : -2)} fontSize={9} fill="#475569">{100 - g * 100}%</text>
          </g>
        ))}
        {chosen.map((id, i) => {
          const t = sim.tags[id] as Tag;
          const data = (hist[id] ?? []).slice(-120);
          if (data.length < 2) return null;
          const pts = data.map((v, j) => `${(W - ((data.length - 1 - j) / 119) * W).toFixed(1)},${(H - ((v - t.min) / (t.max - t.min || 1)) * H).toFixed(1)}`).join(' ');
          return <polyline key={id} points={pts} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth={1.8} />;
        })}
        <text x={W} y={H + 16} textAnchor="end" fontSize={10} fill="#64748b">ตอนนี้</text>
        <text x={0} y={H + 16} fontSize={10} fill="#64748b">−120 s (สเกลตามช่วงของแต่ละแท็ก)</text>
      </svg>
    </div>
  );
}

function Alarms({ sim, onClear }: { sim: SimState | null; onClear: () => void }) {
  if (!sim) return <NeedSim />;
  return (
    <div className="alarms">
      <div className="btns">
        <button className="btn tiny" onClick={onClear}>ล้างประวัติที่หายแล้ว</button>
      </div>
      <table className="tbl">
        <thead>
          <tr><th>เวลา</th><th>ระดับ</th><th>ข้อความ</th><th>สถานะ</th></tr>
        </thead>
        <tbody>
          {sim.alarms.map((a, i) => (
            <tr key={a.id + a.t + i} className={a.active ? `al-${a.sev}` : 'al-cleared'}>
              <td className="mono">{fmt(a.t, 1)}s</td>
              <td>{a.sev === 'crit' ? '🔴 CRITICAL' : a.sev === 'warn' ? '🟠 WARNING' : 'ℹ INFO'}</td>
              <td>{a.msg}</td>
              <td>{a.active ? <b>ACTIVE</b> : `cleared @${fmt(a.cleared ?? 0, 1)}s`}</td>
            </tr>
          ))}
          {!sim.alarms.length && (
            <tr><td colSpan={4} className="muted">✅ ไม่มี Alarm — ระบบปกติ</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Electrical({ design, sim, onSelect }: { design: Design; sim: SimState | null; onSelect: (id: string) => void }) {
  if (!sim) return <NeedSim />;
  const rows = design.comps
    .map((c) => ({ c, df: DEF_MAP[c.type], r: sim.rt[c.id] }))
    .filter(({ df }) => !['tb', 'sensor_lora', 'cloud'].includes(df.beh))
    .sort((a, b) => CATEGORIES.findIndex((x) => x.id === a.df.category) - CATEGORIES.findIndex((x) => x.id === b.df.category));
  return (
    <table className="tbl">
      <thead>
        <tr><th>อุปกรณ์</th><th>ชนิด</th><th>สถานะ</th><th>แหล่งจ่าย</th><th>กระแส (A)</th><th>กำลัง</th><th>พิกัด/โหลด</th></tr>
      </thead>
      <tbody>
        {rows.map(({ c, df, r }) => {
          const rating = c.props.rating ?? c.props.setting;
          const load = rating && r?.current ? (r.current / rating) * 100 : null;
          return (
            <tr key={c.id} onClick={() => onSelect(c.id)} className="clickable">
              <td><b>{c.label}</b></td>
              <td className="muted">{df.short}</td>
              <td>{r?.fault ? <span className="pill off">FAULT</span> : r?.tripped ? <span className="pill off">TRIP</span> : r?.powered ? <span className="pill ok">ON</span> : <span className="pill">OFF</span>}</td>
              <td className="muted">{r?.src ? design.comps.find((x) => x.id === r.src!.split('~')[0])?.label : '—'}</td>
              <td className="mono">{r?.current ? fmt(r.current, 2) : '—'}</td>
              <td className="mono">{r?.powerW ? (r.powerW >= 1000 ? `${fmt(r.powerW / 1000, 2)} kW` : `${fmt(r.powerW, 1)} W`) : '—'}</td>
              <td>
                {load !== null ? (
                  <div className="bar"><div style={{ width: `${Math.min(100, load)}%`, background: load > 100 ? '#ef4444' : load > 80 ? '#f59e0b' : '#22c55e' }} /><span>{fmt(load, 0)}% of {rating}A</span></div>
                ) : '—'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Bom({ design }: { design: Design }) {
  const rows = useMemo(() => {
    const m = new Map<string, { cat: string; name: string; brand: string; model: string; qty: number; tags: string[] }>();
    for (const c of design.comps) {
      const df = DEF_MAP[c.type];
      const k = `${c.type}|${c.brand}|${c.model}`;
      const e = m.get(k) ?? { cat: CATEGORIES.find((x) => x.id === df.category)?.name ?? '', name: df.name, brand: c.brand, model: c.model, qty: 0, tags: [] };
      e.qty++;
      e.tags.push(c.label);
      m.set(k, e);
    }
    return [...m.values()].sort((a, b) => a.cat.localeCompare(b.cat));
  }, [design]);
  const exportCsv = () => {
    const lines = [['Category', 'Item', 'Brand', 'Model', 'Qty', 'Tags'], ...rows.map((r) => [r.cat, r.name, r.brand, r.model, String(r.qty), r.tags.join(' ')])];
    const csv = '\uFEFF' + lines.map((l) => l.map((x) => `"${x.replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `${design.name.replace(/[^\w\u0E00-\u0E7F-]+/g, '_')}_BOM.csv`;
    a.click();
  };
  return (
    <div>
      <div className="btns">
        <button className="btn tiny" onClick={exportCsv}>⬇ Export CSV</button>
        <span className="muted small">{rows.reduce((a, r) => a + r.qty, 0)} ชิ้น · {design.wires.length} เส้นสาย</span>
      </div>
      <table className="tbl">
        <thead>
          <tr><th>หมวด</th><th>รายการ</th><th>แบรนด์</th><th>รุ่น</th><th>จำนวน</th><th>Tag</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="muted">{r.cat}</td>
              <td>{r.name}</td>
              <td><b>{r.brand}</b></td>
              <td className="mono small">{r.model}</td>
              <td className="mono">{r.qty}</td>
              <td className="muted small">{r.tags.join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
