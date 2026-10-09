import { useMemo } from 'react';
import type { Design } from './types';
import { checkWiring, Issue } from './check';

interface Props {
  design: Design;
  onClose: () => void;
  onShow: (issue: Issue) => void;
}

const SEV: Record<Issue['sev'], string> = { crit: 'อันตราย', warn: 'ควรแก้', info: 'ข้อสังเกต' };

export function CheckDialog({ design, onClose, onShow }: Props) {
  const issues = useMemo(() => checkWiring(design), [design]);
  const count = (s: Issue['sev']) => issues.filter((i) => i.sev === s).length;

  return (
    <div className="draw-back" onClick={onClose}>
      <div className="check-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="draw-head">
          <div>
            <h2>ตรวจสอบการต่อไฟ</h2>
            <div className="muted small">ไล่ดูสายทุกเส้นและลองจ่ายไฟให้แบบจำลองล่วงหน้า 3 วินาที — อุปกรณ์จริงยังไม่ถูกจ่ายไฟ</div>
          </div>
          <div className="grow" />
          <button className="btn" onClick={onClose}>✕ ปิด</button>
        </div>
        <div className="check-sum">
          <span className="chip crit">อันตราย {count('crit')}</span>
          <span className="chip warn">ควรแก้ {count('warn')}</span>
          <span className="chip info">ข้อสังเกต {count('info')}</span>
        </div>
        {!design.comps.length ? (
          <div className="empty">ยังไม่มีอุปกรณ์บนแปลน</div>
        ) : !issues.length ? (
          <div className="check-ok">✓ ไม่พบจุดต่อผิด ลอง Run simulation ได้เลย</div>
        ) : (
          <ul className="check-list">
            {issues.map((i) => (
              <li key={i.id} className={`check-item ${i.sev}`}>
                <span className={`chip ${i.sev}`}>{SEV[i.sev]}</span>
                <div className="check-body">
                  <div>{i.msg}</div>
                  {i.fix && <div className="check-fix">วิธีแก้: {i.fix}</div>}
                </div>
                <button className="btn tiny" onClick={() => onShow(i)}>ดูบนแปลน</button>
              </li>
            ))}
          </ul>
        )}
        <p className="note">ตรวจตามสภาพตอนเริ่มจ่ายไฟ วงจรที่ต้องกด START หรือรอเซนเซอร์ก่อนจะทำงาน ให้ Run แล้วดู Alarm ประกอบด้วย</p>
      </div>
    </div>
  );
}
