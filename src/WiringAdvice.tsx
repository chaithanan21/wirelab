import type { Design } from './types';
import { DEF_MAP, KIND_COLOR } from './library';
import { deviceAdvice, planMatches, wiredEnds } from './advice';

interface Props {
  type: string;
  design?: Design;
  compId?: string;
}

export function WiringAdvice({ type, design, compId }: Props) {
  const df = DEF_MAP[type];
  if (!df) return null;
  const advice = deviceAdvice(type);
  return (
    <div className="advice">
      <p className="desc">{advice.summary}</p>
      {df.ports.map((p) => {
        const hint = advice.ports[p.id];
        const now = design && compId ? wiredEnds(design, compId, p.id) : [];
        const plan = design && compId && !now.length ? planMatches(design, compId, p, hint) : [];
        return (
          <div key={p.id} className="hint">
            <div className="port-row">
              <span className="pdot" style={{ borderColor: KIND_COLOR[p.kind] }} />
              <b>{p.label}</b>
              {design && compId && <span className={`pc ${now.length ? 'on' : ''}`}>{now.length ? 'ต่อแล้ว' : 'ยังว่าง'}</span>}
            </div>
            <div className="hint-to">{hint.to}</div>
            <div className="muted small">{hint.why}</div>
            {now.length > 0 && <div className="hint-now">ตอนนี้ต่อกับ {now.join(', ')}</div>}
            {plan.length > 0 && (
              <div className="hint-plan">บนแปลนนี้: {plan.map((m) => `${m.label} · ${m.portLabel}`).join(' · ')}</div>
            )}
          </div>
        );
      })}
      {!df.ports.length && <div className="muted small">อุปกรณ์นี้ไม่ต้องเดินสาย</div>}
    </div>
  );
}
