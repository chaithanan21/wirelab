import { useMemo, useState } from 'react';
import type { Design } from './types';
import { buildDrawing } from './drawing';

interface Props {
  design: Design;
  onClose: () => void;
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

export function DrawingDialog({ design, onClose }: Props) {
  const [title, setTitle] = useState('Control panel — Electrical wiring');
  const [number, setNumber] = useState('WL-001');
  const [revision, setRevision] = useState('A');
  const [layout, setLayout] = useState<'plan' | 'grid'>('plan');
  const date = useMemo(() => new Date().toLocaleDateString('en-GB'), []);
  const doc = useMemo(
    () => buildDrawing(design, { title: title.trim() || 'Electrical wiring diagram', number: number.trim() || 'WL-001', revision: revision.trim() || 'A', layout, date }),
    [design, title, number, revision, layout, date],
  );

  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([doc.svg], { type: 'image/svg+xml;charset=utf-8' }));
    a.download = `${(number || 'WL-001').replace(/[^\w-]+/g, '_')}-wiring.svg`;
    a.click();
  };

  const print = () => {
    const head = ['Wire', 'From', 'Terminal', 'To', 'Terminal', 'Type'];
    const devHead = ['Ref', 'Tag', 'Brand', 'Model', 'Terminals'];
    const table = (headers: string[], rows: string[][]) =>
      `<table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const pages =
      `<section class="sheet"><h2>${esc(title)} · Connection schedule</h2><p>${esc(number)} / Rev ${esc(revision)} · ${esc(date)}</p>${table(head, doc.wires.map((w) => [w.name, w.fromRef, w.fromTerm, w.toRef, w.toTerm, w.type]))}</section>` +
      `<section class="sheet"><h2>${esc(title)} · Device schedule</h2><p>${esc(number)} / Rev ${esc(revision)} · ${esc(date)}</p>${table(devHead, doc.devices.map((d) => [d.ref, d.tag, d.brand, d.model, d.terminals]))}</section>`;
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:1200px;height:850px';
    frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(number)} Electrical drawing</title>
<style>@page{size:A3 landscape;margin:10mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,Tahoma,sans-serif;color:#142535}
.drawing{break-after:page}.drawing svg{display:block;width:100%;height:273mm}
.sheet{break-after:page}h2{font-size:20px;margin:0 0 4px}p{margin:0 0 12px;font-size:13px}
table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #99a8b5;padding:8px;text-align:left}th{background:#e8eef3}tr{break-inside:avoid}</style>
</head><body><section class="drawing">${doc.svg}</section>${pages}</body></html>`;
    document.body.append(frame);
    frame.onload = () => setTimeout(() => frame.contentWindow?.print(), 200);
  };

  return (
    <div className="draw-back" onClick={onClose}>
      <div className="draw-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="draw-head">
          <div>
            <h2>Electrical drawing</h2>
            <div className="muted small">แบบการต่อสาย พร้อมตารางอุปกรณ์และจุดเชื่อมต่อ</div>
          </div>
          <div className="grow" />
          <button className="btn" onClick={download} disabled={!design.comps.length}>Download SVG</button>
          <button className="btn run" onClick={print} disabled={!design.comps.length}>Print / Save PDF</button>
          <button className="btn" onClick={onClose}>✕ ปิด</button>
        </div>
        <div className="draw-fields">
          <label>ชื่อแบบ<input className="input" value={title} maxLength={90} onChange={(e) => setTitle(e.target.value)} /></label>
          <label>เลขที่แบบ<input className="input" value={number} maxLength={32} onChange={(e) => setNumber(e.target.value)} /></label>
          <label>Revision<input className="input" value={revision} maxLength={12} onChange={(e) => setRevision(e.target.value)} /></label>
          <label>
            Layout
            <select className="input" value={layout} onChange={(e) => setLayout(e.target.value as 'plan' | 'grid')}>
              <option value="plan">ตามแปลนที่จัดวาง</option>
              <option value="grid">จัดอุปกรณ์เป็นแถว</option>
            </select>
          </label>
        </div>
        <p className="note">PDF: เลือก Save as PDF ในหน้าต่างพิมพ์ · แบบ A3 แนวนอน รวมตารางสายและอุปกรณ์ · สายทึบคือไฟฟ้า เส้นประคือ Network</p>
        {!design.comps.length ? (
          <div className="empty">เพิ่มอุปกรณ์ลงแปลนก่อนส่งออก</div>
        ) : (
          <>
            <div className="draw-preview" dangerouslySetInnerHTML={{ __html: doc.svg.replace(/^<\?xml[^>]*>\s*/, '') }} />
            <h3 className="draw-h">Connection schedule</h3>
            <table className="tbl">
              <thead>
                <tr><th>Wire</th><th>From</th><th>Terminal</th><th>To</th><th>Terminal</th><th>Type</th></tr>
              </thead>
              <tbody>
                {doc.wires.map((w) => (
                  <tr key={w.name}><td className="mono">{w.name}</td><td>{w.fromRef}</td><td>{w.fromTerm}</td><td>{w.toRef}</td><td>{w.toTerm}</td><td>{w.type}</td></tr>
                ))}
              </tbody>
            </table>
            <h3 className="draw-h">Device schedule</h3>
            <table className="tbl">
              <thead>
                <tr><th>Ref</th><th>Tag</th><th>Brand</th><th>Model</th><th>Terminals</th></tr>
              </thead>
              <tbody>
                {doc.devices.map((d) => (
                  <tr key={d.ref}><td className="mono">{d.ref}</td><td>{d.tag}</td><td>{d.brand}</td><td>{d.model}</td><td className="small">{d.terminals}</td></tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
