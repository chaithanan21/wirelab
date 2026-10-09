import { useMemo, useState } from 'react';
import { ALL_BRANDS, BRAND_COLORS, CATEGORIES, DEFS } from './library';
import { Icon } from './icons';
import { WiringAdvice } from './WiringAdvice';

interface Props {
  brand: string;
  setBrand: (b: string) => void;
  onAdd: (type: string) => void;
}

export function Palette({ brand, setBrand, onAdd }: Props) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [open, setOpen] = useState('');

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return DEFS.filter((d) => {
      if (brand && !d.brands.some((b) => b.brand === brand)) return false;
      if (cat && d.category !== cat) return false;
      if (!s) return true;
      return (
        d.name.toLowerCase().includes(s) ||
        d.short.toLowerCase().includes(s) ||
        d.desc.toLowerCase().includes(s) ||
        d.brands.some((b) => b.brand.toLowerCase().includes(s) || b.model.toLowerCase().includes(s))
      );
    });
  }, [q, brand, cat]);

  const models = DEFS.reduce((a, d) => a + d.brands.length, 0);

  return (
    <aside className="palette">
      <div className="pal-head">
        <h3 className="lib-h">Component library</h3>
        <input className="input" placeholder="ค้นหาอุปกรณ์…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="Brand">
          <option value="">All brands</option>
          {ALL_BRANDS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select className="input" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <div className="note">{list.length} รายการ · {models} รุ่น · {ALL_BRANDS.length} แบรนด์</div>
      </div>
      <div className="pal-list">
        {CATEGORIES.map((group) => {
          const items = list.filter((d) => d.category === group.id);
          if (!items.length) return null;
          return (
            <div key={group.id} className="pal-cat">
              {!cat && <div className="group-label">{group.en}</div>}
              {items.map((d) => {
                  const br = (brand && d.brands.find((b) => b.brand === brand)) || d.brands[0];
                  return (
                    <div key={d.type} className="pal-card">
                      <div
                        className="pal-item"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/wirelab', d.type);
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        onDoubleClick={() => onAdd(d.type)}
                        title={`${d.desc}\n\nลากไปวางบนแผนผัง หรือดับเบิลคลิก`}
                      >
                        <div className="pal-icon" style={{ borderColor: BRAND_COLORS[br.brand] ?? '#334155' }}>
                          <Icon name={d.icon} size={20} />
                        </div>
                        <div className="pal-text">
                          <div className="pal-name">{d.name}</div>
                          <div className="pal-sub">
                            <span style={{ color: BRAND_COLORS[br.brand] ?? '#94a3b8' }}>{br.brand}</span> · {br.model}
                            {!brand && d.brands.length > 1 && <span className="muted"> +{d.brands.length - 1}</span>}
                          </div>
                        </div>
                        <button
                          type="button"
                          className={`hint-btn ${open === d.type ? 'on' : ''}`}
                          draggable={false}
                          title="ดูว่าแต่ละขั้วควรต่อกับอะไร"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpen(open === d.type ? '' : d.type);
                          }}
                        >
                          แนะนำ
                        </button>
                      </div>
                      {open === d.type && (
                        <div className="pal-advice">
                          <WiringAdvice type={d.type} />
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          );
        })}
        {!list.length && <div className="empty">ไม่พบอุปกรณ์</div>}
      </div>
    </aside>
  );
}
