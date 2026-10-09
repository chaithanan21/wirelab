import type { Comp, Design, Wire } from './types';
import type { SimState } from './sim';
import { BRAND_COLORS, CATEGORIES, DEF_MAP, KIND_COLOR, KIND_NAME } from './library';
import { Icon } from './icons';
import { fmt } from './CompView';
import type { Sel } from './Canvas';
import { wireColor } from './Canvas';
import { WiringAdvice } from './WiringAdvice';
import { wireIssue } from './check';

interface Props {
  design: Design;
  sel: Sel;
  sim: SimState | null;
  onComp: (id: string, patch: Partial<Comp>, history?: boolean) => void;
  onWire: (id: string, patch: Partial<Wire>) => void;
  onDelete: () => void;
  onAction: (id: string, a: 'toggle' | 'reset' | 'test' | 'repair') => void;
}

const WIRE_COLORS = ['#c2703d', '#4f8ff7', '#4ade80', '#a1a1aa', '#ef4444', '#6366f1', '#f8fafc', '#111827', '#f59e0b', '#facc15', '#14b8a6', '#c084fc', '#ec4899'];

export function Inspector({ design, sel, sim, onComp, onWire, onDelete, onAction }: Props) {
  if (sel.wire) {
    const w = design.wires.find((x) => x.id === sel.wire);
    if (!w) return <aside className="inspector" />;
    const ca = design.comps.find((c) => c.id === w.a.c);
    const cb = design.comps.find((c) => c.id === w.b.c);
    const pa = ca && DEF_MAP[ca.type].ports.find((p) => p.id === w.a.p);
    const pb = cb && DEF_MAP[cb.type].ports.find((p) => p.id === w.b.p);
    const st = sim?.wire[w.id];
    const sig = sim?.netSignal[w.id];
    const iss = wireIssue(design, w);
    return (
      <aside className="inspector">
        <div className="ins-head">
          <div className="ins-icon" style={{ background: wireColor(design, w) }} />
          <div>
            <div className="ins-title">สายไฟ / สายสัญญาณ</div>
            <div className="muted small">{pa ? KIND_NAME[pa.kind === 'X' && pb ? pb.kind : pa.kind] : ''}</div>
          </div>
        </div>
        <div className="sec">
          <div className="row"><span>จาก</span><b>{ca?.label}.{pa?.label}</b></div>
          <div className="row"><span>ไปยัง</span><b>{cb?.label}.{pb?.label}</b></div>
          {sim && (
            <div className="row">
              <span>สถานะ</span>
              <b className={`st st-${st}`}>{STATE_TH[st ?? 'off']}</b>
            </div>
          )}
          {sig && (
            <div className="row">
              <span>สัญญาณ</span>
              <b className="mono">
                {fmt(sig.value)} {sig.unit} = {fmt(4 + (16 * (sig.value - sig.min)) / (sig.max - sig.min || 1), 2)} mA
              </b>
            </div>
          )}
        </div>
        {iss && (
          <div className={`sec wire-issue ${iss.sev}`}>
            <div className="sec-h">{iss.sev === 'crit' ? '⛔ ต่อผิด อันตราย' : '⚠️ ควรตรวจสอบ'}</div>
            <p>{iss.msg}</p>
            {iss.fix && <p className="check-fix">วิธีแก้: {iss.fix}</p>}
          </div>
        )}
        <div className="sec">
          <div className="sec-h">สีสาย</div>
          <div className="swatches">
            {WIRE_COLORS.map((c) => (
              <button key={c} className={`sw ${w.color === c ? 'on' : ''}`} style={{ background: c }} onClick={() => onWire(w.id, { color: c })} />
            ))}
            <button className="btn tiny" onClick={() => onWire(w.id, { color: undefined })}>
              อัตโนมัติ
            </button>
          </div>
        </div>
        <div className="sec">
          <button className="btn danger full" onClick={onDelete}>
            ลบสาย (Delete)
          </button>
        </div>
      </aside>
    );
  }

  if (sel.comps.length > 1) {
    return (
      <aside className="inspector">
        <div className="ins-head">
          <div>
            <div className="ins-title">เลือก {sel.comps.length} อุปกรณ์</div>
            <div className="muted small">ลากเพื่อย้ายพร้อมกัน · Ctrl+D ทำซ้ำ</div>
          </div>
        </div>
        <div className="sec">
          {sel.comps.map((id) => {
            const c = design.comps.find((x) => x.id === id);
            return c ? <div key={id} className="row"><span>{c.label}</span><b className="muted">{DEF_MAP[c.type].short}</b></div> : null;
          })}
        </div>
        <div className="sec">
          <button className="btn danger full" onClick={onDelete}>ลบทั้งหมด</button>
        </div>
      </aside>
    );
  }

  const c = design.comps.find((x) => x.id === sel.comps[0]);
  if (!c) return <ProjectInfo design={design} sim={sim} />;
  const df = DEF_MAP[c.type];
  const r = sim?.rt[c.id];
  const cat = CATEGORIES.find((x) => x.id === df.category);
  const brands = Array.from(new Set(df.brands.map((b) => b.brand)));

  const live: [string, string][] = [];
  if (sim && r) {
    live.push(['สถานะไฟ', r.damaged ? 'เสียหาย (พัง)' : r.fault ? `FAULT: ${r.fault}` : r.tripped ? `TRIPPED (${r.tripReason ?? ''})` : r.powered ? 'มีไฟ / ทำงาน' : 'ไม่มีไฟ']);
    if (r.src) live.push(['แหล่งจ่าย', `${design.comps.find((x) => x.id === r.src!.split('~')[0])?.label ?? r.src} (${r.supply === 'dc' ? '24VDC' : r.supply === '3p' ? '400V 3φ' : '230VAC'})`]);
    if (r.current !== undefined && (r.current > 0 || r.powered)) live.push(['กระแส', `${fmt(r.current, 2)} A`]);
    if (r.powerW !== undefined && r.powerW > 0) live.push(['กำลังไฟ', r.powerW >= 1000 ? `${fmt(r.powerW / 1000, 2)} kW` : `${fmt(r.powerW, 1)} W`]);
    if (df.beh === 'tr' && r.powered) live.push(['โหลดเทียบพิกัด', `${fmt((100 * (r.powerW ?? 0)) / ((+c.props.kva || 1) * 1000), 0)} % ของ ${c.props.kva} kVA`]);
    if (df.beh === 'psu') live.push(['โหลด DC', `${fmt(r.dcLoad ?? 0, 1)} W / ${c.props.ratedW} W`]);
    if (df.beh === 'sensor_a' && r.value !== undefined) {
      live.push(['ค่าที่วัดได้', `${fmt(r.value)} ${c.props.unit}`]);
      live.push(['สัญญาณออก', r.powered ? `${fmt(4 + (16 * (r.value - c.props.min)) / (c.props.max - c.props.min || 1), 2)} mA` : '0 mA (ไม่มีไฟเลี้ยง)']);
    }
    if (r.freq !== undefined && df.beh === 'vfd') live.push(['ความถี่', `${fmt(r.freq, 1)} Hz (target ${fmt(r.target ?? 0, 1)})`]);
    if (df.beh === 'motor3') live.push(['ความเร็ว', `${fmt((r.speed ?? 0) * c.props.rpm, 0)} rpm`]);
    if (r.battery !== undefined) live.push(['แบตเตอรี่', `${fmt(r.battery, 0)} %`]);
    if (r.kwh !== undefined) live.push(['พลังงาน', `${fmt(r.kwh, 3)} kWh`]);
    if (r.coil !== undefined) live.push(['คอยล์', r.coil ? 'ON' : 'OFF']);
    if (df.beh === 'plc' || df.beh === 'rio' || df.beh === 'edge') {
      (r.ai ?? []).forEach((s, i) => live.push([`AI${i + 1}`, s ? `${fmt(s.value)} ${s.unit} (${s.name})` : '—']));
      if (r.di) live.push(['DI', r.di.map((v, i) => `${i + 1}:${v ? '■' : '□'}`).join('  ')]);
      if (r.dos) live.push(['DO', r.dos.map((v, i) => `${i + 1}:${v ? '■' : '□'}`).join('  ')]);
    }
    const ds = sim.displays[c.id];
    if (ds) {
      live.push(['จอแสดงผล', ds.status === 'ok' ? `ออนไลน์ · ${ds.tags.length} แท็ก` : ds.status === 'off' ? 'ปิด (ไม่มีไฟ)' : 'ไม่มีการสื่อสาร']);
      if (ds.via.length) live.push(['รับข้อมูลจาก', ds.via.join(', ')]);
    }
  }

  const canToggle = ['breaker', 'rcbo', 'fuse', 'switch', 'estop', 'selector', 'contact_sw', 'sensor_d', 'grid1', 'grid3', 'gridmv', 'gen', 'swg', 'mdb'].includes(df.beh);

  return (
    <aside className="inspector">
      <div className="ins-head">
        <div className="ins-icon" style={{ borderColor: BRAND_COLORS[c.brand] ?? '#334155' }}>
          <Icon name={df.icon} size={22} />
        </div>
        <div>
          <div className="ins-title">{df.name}</div>
          <div className="muted small">{cat?.name} · {cat?.en}</div>
        </div>
      </div>
      <div className="sec">
        <p className="desc">{df.desc}</p>
        <label className="field">
          <span>ชื่อ / Tag</span>
          <input className="input" value={c.label} onChange={(e) => onComp(c.id, { label: e.target.value })} />
        </label>
        <label className="field">
          <span>แบรนด์</span>
          <select
            className="input"
            value={c.brand}
            onChange={(e) => {
              const b = df.brands.find((x) => x.brand === e.target.value)!;
              onComp(c.id, { brand: b.brand, model: b.model }, true);
            }}
          >
            {brands.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>รุ่น (Model)</span>
          <input className="input" list={`models-${c.type}`} value={c.model} onChange={(e) => onComp(c.id, { model: e.target.value })} />
          <datalist id={`models-${c.type}`}>
            {df.brands.filter((b) => b.brand === c.brand).map((b) => (
              <option key={b.model} value={b.model} />
            ))}
          </datalist>
        </label>
      </div>

      {r?.damaged && (
        <div className="sec wire-issue crit">
          <div className="sec-h">💥 อุปกรณ์เสียหาย</div>
          <p>{r.damaged}</p>
          <p className="check-fix">แก้สายที่ต่อผิดก่อน แล้วค่อยเปลี่ยนอุปกรณ์ใหม่ ไม่อย่างนั้นตัวใหม่จะพังซ้ำ</p>
          <button className="btn warn full" onClick={() => onAction(c.id, 'repair')}>เปลี่ยนอุปกรณ์ใหม่</button>
        </div>
      )}

      {sim && live.length > 0 && (
        <div className="sec live">
          <div className="sec-h">
            <span className="dot live-dot" /> ค่าจำลองแบบเรียลไทม์
          </div>
          {live.map(([k, v]) => (
            <div key={k} className="row">
              <span>{k}</span>
              <b className="mono">{v}</b>
            </div>
          ))}
        </div>
      )}

      {(canToggle || df.beh === 'rcbo' || df.beh === 'overload' || df.beh === 'plc') && (
        <div className="sec">
          <div className="sec-h">ควบคุม</div>
          <div className="btns">
            {canToggle && (
              <button className="btn" onClick={() => onAction(c.id, 'toggle')}>
                {r?.tripped ? 'รีเซ็ต / ON' : 'สลับสถานะ'}
              </button>
            )}
            {(r?.tripped || r?.fault) && (
              <button className="btn warn" onClick={() => onAction(c.id, 'reset')}>
                Reset
              </button>
            )}
            {df.beh === 'rcbo' && (
              <button className="btn" onClick={() => onAction(c.id, 'test')}>
                กด TEST
              </button>
            )}
            {df.beh === 'plc' && (
              <button className={`btn ${c.props.hmiCmd ? 'ok' : ''}`} onClick={() => onComp(c.id, { props: { ...c.props, hmiCmd: !c.props.hmiCmd } })}>
                HMI CMD: {c.props.hmiCmd ? 'ON' : 'OFF'}
              </button>
            )}
          </div>
        </div>
      )}

      {df.propDefs.length > 0 && (
        <div className="sec">
          <div className="sec-h">พารามิเตอร์</div>
          {df.propDefs.map((pd) => {
            const v = c.props[pd.key];
            const set = (nv: any) => onComp(c.id, { props: { ...c.props, [pd.key]: nv } });
            return (
              <label key={pd.key} className={`field ${pd.type === 'bool' ? 'inline' : ''}`}>
                <span>
                  {pd.label}
                  {pd.unit ? ` (${pd.unit})` : ''}
                </span>
                {pd.type === 'bool' ? (
                  <input type="checkbox" checked={!!v} onChange={(e) => set(e.target.checked)} />
                ) : pd.type === 'select' ? (
                  <select className="input" value={v} onChange={(e) => set(e.target.value)}>
                    {pd.options!.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                ) : pd.type === 'number' ? (
                  <input
                    className="input"
                    type="number"
                    value={v ?? ''}
                    step={pd.step ?? 'any'}
                    min={pd.min}
                    max={pd.max}
                    onChange={(e) => set(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                ) : (
                  <input className="input" value={v ?? ''} onChange={(e) => set(e.target.value)} />
                )}
              </label>
            );
          })}
          {df.beh === 'sensor_a' && c.props.mode === 'manual' && (
            <input
              type="range"
              className="range"
              min={c.props.min}
              max={c.props.max}
              step={(c.props.max - c.props.min) / 200}
              value={c.props.manual}
              onChange={(e) => onComp(c.id, { props: { ...c.props, manual: Number(e.target.value) } })}
            />
          )}
        </div>
      )}

      <div className="sec">
        <div className="sec-h">ควรต่อกับอะไร</div>
        <WiringAdvice type={c.type} design={design} compId={c.id} />
      </div>
      <div className="sec">
        <button className="btn danger full" onClick={onDelete}>
          ลบอุปกรณ์ (Delete)
        </button>
      </div>
    </aside>
  );
}

const STATE_TH: Record<string, string> = {
  off: 'ไม่มีไฟ',
  ac: 'มีไฟ AC 230V',
  p3: 'มีไฟ 3φ 400V',
  mv: 'มีไฟ 22kV',
  dc: 'มีไฟ 24VDC',
  pe: 'สายดิน',
  sig: 'สัญญาณ 4-20mA',
  data: 'กำลังส่งข้อมูล',
  fault: 'ลัดวงจร / FAULT',
};

function ProjectInfo({ design, sim }: { design: Design; sim: SimState | null }) {
  const log = sim?.alarms.slice(0, 8) ?? [];
  return (
    <aside className="inspector">
      <div className="ins-head">
        <div>
          <div className="sec-h" style={{ margin: 0 }}>Simulation overview</div>
          <div className="ins-title">Field to display</div>
        </div>
      </div>
      <div className="sec">
        <p className="desc">เริ่มด้วยวงจรที่ต่อไว้แล้ว กด Run แล้วกดสวิตช์หรือเซนเซอร์ ดูสัญญาณไปจนถึงจอแสดงผล</p>
        <div className="sec live">
          <div className="row"><span>Power</span><b className="mono">{sim ? `${fmt(sim.plant.totalKW, 2)} kW` : '—'}</b></div>
          <div className="row"><span>Electrical solver</span><b>DC / AC logic</b></div>
          <div className="row"><span>Network</span><b>Data routing</b></div>
          <div className="row"><span>โครงการ</span><b>{design.name}</b></div>
        </div>
      </div>
      <div className="sec">
        <div className="sec-h">Event log</div>
        <div className="log">
          {log.length
            ? log.map((a, i) => (
                <div key={a.id + i}>{a.active ? '●' : '○'} {a.msg}</div>
              ))
            : 'พร้อมเริ่ม simulation'}
        </div>
      </div>
      {sim && (
        <div className="sec live">
          <div className="sec-h">
            <span className="dot live-dot" /> ภาพรวมระบบ
          </div>
          <div className="row"><span>เวลาจำลอง</span><b className="mono">{fmt(sim.t, 1)} s</b></div>
          <div className="row"><span>กำลังไฟรวม</span><b className="mono">{fmt(sim.plant.totalKW, 2)} kW</b></div>
          <div className="row"><span>กระแสรวม</span><b className="mono">{fmt(sim.plant.totalA, 1)} A</b></div>
          <div className="row"><span>อุณหภูมิกระบวนการ</span><b className="mono">{fmt(sim.plant.temp, 1)} °C</b></div>
          <div className="row"><span>ระดับถัง</span><b className="mono">{fmt(sim.plant.level, 2)} m</b></div>
          <div className="row"><span>Alarm ที่ active</span><b className="mono">{Object.keys(sim.activeAlarms).length}</b></div>
        </div>
      )}
      <div className="sec">
        <div className="sec-h">สีสายและชนิดขั้ว</div>
        {(Object.keys(KIND_COLOR) as (keyof typeof KIND_COLOR)[]).map((k) => (
          <div key={k} className="port-row">
            <span className="wline" style={{ background: KIND_COLOR[k] }} />
            <span className="small">{KIND_NAME[k]}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
