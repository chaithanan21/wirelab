import React from 'react';
import type { Comp, CompDef } from './types';
import type { DisplayState, RT, SimState, Tag } from './sim';
import { BRAND_COLORS, KIND_COLOR } from './library';
import { IconG } from './icons';

export type CtlAction = 'down' | 'up' | 'reset';

interface Props {
  c: Comp;
  df: CompDef;
  sim: SimState | null;
  symbol: boolean;
  selected: boolean;
  hist: Record<string, number[]>;
  tick: number;
  onCtl: (id: string, a: CtlAction) => void;
}

const LAMP_COLORS: Record<string, string> = {
  green: '#22c55e',
  red: '#ef4444',
  yellow: '#facc15',
  blue: '#3b82f6',
  white: '#f8fafc',
  black: '#334155',
};

export function fmt(v: number | undefined, d?: number) {
  if (v === undefined || Number.isNaN(v)) return '--';
  const a = Math.abs(v);
  const dec = d ?? (a >= 1000 ? 0 : a >= 100 ? 1 : a >= 10 ? 1 : 2);
  return v.toFixed(dec);
}

const trunc = (s: string, px: number, size = 8) => {
  const n = Math.max(3, Math.floor(px / (size * 0.56)));
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
};

function Lcd({ x, y, w, h, text, sub, color = '#4ade80', on = true, size = 13 }: { x: number; y: number; w: number; h: number; text: string; sub?: string; color?: string; on?: boolean; size?: number }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={3} fill={on ? '#06140c' : '#0b0f14'} stroke="#1f2937" />
      <text x={x + w / 2} y={y + h / 2 + (sub ? -1 : 1)} textAnchor="middle" dominantBaseline="middle" className="mono" fontSize={size} fill={on ? color : '#1f2937'} fontWeight={700}>
        {on ? text : '----'}
      </text>
      {sub && (
        <text x={x + w / 2} y={y + h - 3} textAnchor="middle" fontSize={6.5} fill={on ? '#86efac' : '#1f2937'} className="mono">
          {sub}
        </text>
      )}
    </g>
  );
}

function Led({ x, y, on, color = '#22c55e', r = 3 }: { x: number; y: number; on: boolean; color?: string; r?: number }) {
  return (
    <g>
      {on && <circle cx={x} cy={y} r={r * 2.2} fill={color} opacity={0.25} />}
      <circle cx={x} cy={y} r={r} fill={on ? color : '#1e293b'} stroke={on ? color : '#334155'} strokeWidth={0.8} />
    </g>
  );
}

function Ctl({ children, id, onCtl, momentary }: { children: React.ReactNode; id: string; onCtl: Props['onCtl']; momentary?: boolean }) {
  return (
    <g
      className="ctl"
      onPointerDown={(e) => {
        e.stopPropagation();
        onCtl(id, 'down');
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        if (momentary) onCtl(id, 'up');
      }}
      onPointerLeave={() => momentary && onCtl(id, 'up')}
    >
      {children}
    </g>
  );
}

function Spark({ data, x, y, w, h, min, max, color }: { data?: number[]; x: number; y: number; w: number; h: number; min: number; max: number; color: string }) {
  if (!data || data.length < 2) return null;
  const pts = data.slice(-60);
  const span = max - min || 1;
  const d = pts
    .map((v, i) => `${(x + (i / (pts.length - 1)) * w).toFixed(1)},${(y + h - ((Math.min(max, Math.max(min, v)) - min) / span) * h).toFixed(1)}`)
    .join(' ');
  return (
    <>
      <polygon points={`${x},${y + h} ${d} ${x + w},${y + h}`} fill={color} opacity={0.12} />
      <polyline points={d} fill="none" stroke={color} strokeWidth={1} />
    </>
  );
}

const SYMBOL_AS_DEVICE = ['tempctl', 'plc', 'rio', 'edge', 'eswitch', 'router', 'gateway', 'lora_gw', 'pmeter'];

const isAlarm = (t: Tag) => (t.hi != null && t.value > t.hi) || (t.lo != null && t.value < t.lo);

export function Screen({ x, y, w, h, ds, style, title, hist, t }: { x: number; y: number; w: number; h: number; ds?: DisplayState; style: string; title: string; hist: Record<string, number[]>; t: number }) {
  const clipId = `clip-${style}-${x}-${y}-${w}-${title.replace(/\W/g, '')}`;
  if (!ds || ds.status === 'off')
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} rx={3} fill="#020409" stroke="#334155" />
        <path d={`M${x + w * 0.6},${y} L${x + w * 0.8},${y} L${x + w * 0.4},${y + h} L${x + w * 0.2},${y + h}z`} fill="#fff" opacity={0.03} />
      </g>
    );
  if (ds.status === 'nocomm')
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} rx={3} fill="#0a1530" stroke="#334155" />
        <text x={x + w / 2} y={y + h / 2 - 4} textAnchor="middle" fontSize={Math.min(12, w / 14)} fill="#fbbf24" fontWeight={700} opacity={Math.floor(t * 2) % 2 ? 1 : 0.4}>
          {style === 'monitor' ? 'NO SIGNAL' : 'NO COMMUNICATION'}
        </text>
        <text x={x + w / 2} y={y + h / 2 + 10} textAnchor="middle" fontSize={7} fill="#94a3b8">
          {style === 'monitor' ? 'ต่อ HDMI จาก SCADA PC' : 'ตรวจสอบสาย ETH/RS485 และไฟเลี้ยงสวิตช์'}
        </text>
      </g>
    );

  const analog = ds.tags.filter((tg) => !tg.bool);
  const bools = ds.tags.filter((tg) => tg.bool);
  const alarms = analog.filter(isAlarm);

  if (style === 'led') {
    const items = analog.map((tg) => `${tg.name} ${fmt(tg.value)}${tg.unit}`).join('   •   ');
    const text = (alarms.length ? `⚠ ALARM: ${alarms.map((a) => a.name).join(', ')}   •   ` : '') + items;
    const tw = text.length * 7.2;
    const off = ((t * 45) % (tw + w)) | 0;
    return (
      <g>
        <defs>
          <clipPath id={clipId}>
            <rect x={x} y={y} width={w} height={h} rx={3} />
          </clipPath>
        </defs>
        <rect x={x} y={y} width={w} height={h} rx={3} fill="#050505" stroke="#334155" />
        <pattern id="ledgrid" width="3" height="3" patternUnits="userSpaceOnUse">
          <circle cx="1.5" cy="1.5" r="0.6" fill="#1a1a1a" />
        </pattern>
        <rect x={x} y={y} width={w} height={h} fill="url(#ledgrid)" />
        <g clipPath={`url(#${clipId})`}>
          <text x={x + w - off} y={y + h / 2 + 5} fontSize={13} className="mono" fill={alarms.length ? '#f87171' : '#fbbf24'} fontWeight={700}>
            {text}
          </text>
        </g>
      </g>
    );
  }

  const light = style === 'cloud';
  const bg = light ? '#f1f5f9' : style === 'hmi' ? '#0f172a' : '#0b1220';
  const cols = style === 'hmi' || style === 'cloud' ? 2 : 3;
  const head = 14;
  const boolH = bools.length ? 14 : 0;
  const rows = Math.max(1, Math.min(2, Math.ceil(analog.length / cols)));
  const maxTiles = cols * rows;
  const tiles = analog.slice(0, maxTiles);
  const tw = (w - 6 - (cols - 1) * 3) / cols;
  const th = (h - head - boolH - 6 - (rows - 1) * 3) / rows;
  const mm = Math.floor(t / 60);
  const ss = Math.floor(t % 60);
  const titleColor = light ? '#0f172a' : '#e2e8f0';
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={3} fill={bg} stroke="#334155" />
      <rect x={x} y={y} width={w} height={head} rx={3} fill={light ? '#2563eb' : style === 'hmi' ? '#1e3a8a' : '#111827'} />
      <text x={x + 5} y={y + 10} fontSize={7.5} fill="#fff" fontWeight={600}>
        {trunc(title, w - 70, 7.5)}
      </text>
      <text x={x + w - 5} y={y + 10} fontSize={7} fill="#cbd5e1" textAnchor="end" className="mono">
        {alarms.length ? `⚠${alarms.length} ` : ''}
        {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
      </text>
      {tiles.map((tg, i) => {
        const cx = x + 3 + (i % cols) * (tw + 3);
        const cy = y + head + 3 + Math.floor(i / cols) * (th + 3);
        const al = isAlarm(tg);
        const frac = Math.max(0, Math.min(1, (tg.value - tg.min) / (tg.max - tg.min || 1)));
        const col = al ? '#ef4444' : light ? '#2563eb' : '#22d3ee';
        const vs = Math.min(th * 0.42, tw / 5.5);
        return (
          <g key={tg.id}>
            <rect x={cx} y={cy} width={tw} height={th} rx={2.5} fill={light ? '#fff' : '#111c33'} stroke={al ? '#ef4444' : light ? '#cbd5e1' : '#1e293b'} />
            {style !== 'hmi' && <Spark data={hist[tg.id]} x={cx + 1} y={cy + th * 0.45} w={tw - 2} h={th * 0.5} min={tg.min} max={tg.max} color={col} />}
            <text x={cx + 4} y={cy + 9} fontSize={6.5} fill={light ? '#475569' : '#94a3b8'}>
              {trunc(tg.name, tw - 6, 6.5)}
            </text>
            <text x={cx + 4} y={cy + 10 + vs} fontSize={vs} fill={al ? '#f87171' : titleColor} fontWeight={700} className="mono">
              {fmt(tg.value)}
              <tspan fontSize={vs * 0.5} fill={light ? '#64748b' : '#94a3b8'}>
                {' '}
                {tg.unit}
              </tspan>
            </text>
            {style === 'hmi' && (
              <>
                <rect x={cx + 4} y={cy + th - 7} width={tw - 8} height={3} rx={1.5} fill="#1e293b" />
                <rect x={cx + 4} y={cy + th - 7} width={(tw - 8) * frac} height={3} rx={1.5} fill={col} />
              </>
            )}
          </g>
        );
      })}
      {!tiles.length && (
        <text x={x + w / 2} y={y + h / 2} textAnchor="middle" fontSize={8} fill="#94a3b8">
          เชื่อมต่อแล้ว — ไม่มีแท็กอนาล็อก
        </text>
      )}
      {bools.slice(0, Math.floor((w - 10) / 9)).map((tg, i) => (
        <Led key={tg.id} x={x + 7 + i * 9} y={y + h - 7} r={2.6} on={tg.value > 0} color={tg.name.includes('DO') ? '#f59e0b' : '#22c55e'} />
      ))}
    </g>
  );
}

// ───────────────────────── IEC symbols ─────────────────────────

function Sym({ df, c, r, w, cy, on }: { df: CompDef; c: Comp; r?: RT; w: number; cy: number; on: boolean }) {
  const cx = w / 2;
  const k = '#0f172a';
  const sw = { stroke: k, strokeWidth: 1.6, fill: 'none' } as const;
  const contact = (closed: boolean, nc = false, x0 = cx - 18, x1 = cx + 18) => (
    <g {...sw}>
      <line x1={x0 - 10} y1={cy} x2={x0} y2={cy} />
      <line x1={x1} y1={cy} x2={x1 + 10} y2={cy} />
      {nc && <line x1={x1} y1={cy} x2={x1} y2={cy - 8} />}
      <line x1={x0} y1={cy} x2={closed ? x1 : x1 - 4} y2={closed ? cy : nc ? cy + 0 : cy - 12} />
    </g>
  );
  switch (df.symbol) {
    case 'src_ac':
    case 'src_ac3':
    case 'src_gen':
    case 'src_mv':
      return (
        <g {...sw}>
          <circle cx={cx} cy={cy} r={15} fill={on ? '#fef3c7' : 'none'} />
          <path d={`M${cx - 8},${cy + (df.symbol === 'src_ac' ? 0 : 4)} c3,-7 5,-7 8,0 s5,7 8,0`} />
          {df.symbol !== 'src_ac' && (
            <text x={cx} y={cy - 3} fontSize={9} textAnchor="middle" fill={k} stroke="none" fontWeight={700}>
              {df.symbol === 'src_gen' ? 'G' : df.symbol === 'src_mv' ? '22' : '3'}
            </text>
          )}
        </g>
      );
    case 'src_dc':
      return (
        <g {...sw}>
          <line x1={cx - 20} y1={cy} x2={cx - 4} y2={cy} />
          <line x1={cx - 4} y1={cy - 12} x2={cx - 4} y2={cy + 12} />
          <line x1={cx + 3} y1={cy - 6} x2={cx + 3} y2={cy + 6} strokeWidth={3} />
          <line x1={cx + 3} y1={cy} x2={cx + 20} y2={cy} />
        </g>
      );
    case 'psu':
    case 'ups':
    case 'vfd':
      return (
        <g {...sw}>
          <rect x={cx - 16} y={cy - 16} width={32} height={32} fill={on ? '#ecfeff' : 'none'} />
          <line x1={cx - 16} y1={cy + 16} x2={cx + 16} y2={cy - 16} />
          <path d={`M${cx - 13},${cy - 8} c2,-4 3,-4 5,0 s3,4 5,0`} />
          {df.symbol === 'vfd' ? <path d={`M${cx + 2},${cy + 9} c2,-4 3,-4 5,0 s3,4 5,0`} /> : <path d={`M${cx + 3},${cy + 6} h9 M${cx + 3},${cy + 10} h9`} />}
        </g>
      );
    case 'ats':
      return (
        <g {...sw}>
          <line x1={cx - 30} y1={cy - 10} x2={cx - 12} y2={cy - 10} />
          <line x1={cx - 30} y1={cy + 10} x2={cx - 12} y2={cy + 10} />
          <line x1={cx + 12} y1={cy} x2={cx + 30} y2={cy} />
          <line x1={cx + 12} y1={cy} x2={cx - 12} y2={r?.sel === 2 ? cy + 10 : r?.sel === 1 ? cy - 10 : cy} strokeWidth={2.2} />
        </g>
      );
    case 'breaker':
    case 'breaker3':
    case 'rcbo':
      return (
        <g>
          {contact(on)}
          <g {...sw}>
            <path d={`M${cx + 15},${cy - 3} l6,6 M${cx + 21},${cy - 3} l-6,6`} />
            {df.symbol === 'breaker3' && (
              <text x={cx} y={cy + 14} fontSize={8} textAnchor="middle" fill={k} stroke="none">
                3P
              </text>
            )}
            {df.symbol === 'rcbo' && <ellipse cx={cx - 2} cy={cy + 10} rx={8} ry={3.5} />}
          </g>
          {r?.tripped && (
            <text x={cx} y={cy - 14} fontSize={8} fill="#dc2626" textAnchor="middle" fontWeight={700}>
              TRIP
            </text>
          )}
        </g>
      );
    case 'fuse':
      return (
        <g {...sw}>
          <line x1={cx - 28} y1={cy} x2={cx + 28} y2={cy} />
          <rect x={cx - 14} y={cy - 6} width={28} height={12} fill={r?.tripped ? '#fecaca' : '#fff'} />
        </g>
      );
    case 'spd':
      return (
        <g {...sw}>
          <rect x={cx - 8} y={cy - 14} width={16} height={28} />
          <path d={`M${cx - 12},${cy + 10} L${cx + 12},${cy - 10} h-5`} />
        </g>
      );
    case 'sw_no':
    case 'limit':
    case 'float':
      return (
        <g>
          {contact(on)}
          {df.symbol === 'limit' && <circle cx={cx + 2} cy={cy - 16} r={3.5} {...sw} />}
          {df.symbol === 'float' && <circle cx={cx} cy={cy - 17} r={4.5} {...sw} />}
        </g>
      );
    case 'pb_no':
    case 'pb_nc':
    case 'estop':
      return (
        <g>
          {contact(on, df.symbol !== 'pb_no')}
          <g {...sw}>
            <line x1={cx} y1={cy - 6} x2={cx} y2={cy - 18} strokeDasharray="2 2" />
            {df.symbol === 'estop' ? <path d={`M${cx - 8},${cy - 18} a8,6 0 0 1 16,0z`} fill="#fecaca" /> : <path d={`M${cx - 6},${cy - 22} v4 h12 v-4`} />}
          </g>
        </g>
      );
    case 'selector':
      return (
        <g {...sw}>
          <line x1={cx - 28} y1={cy} x2={cx - 14} y2={cy} />
          <line x1={cx + 14} y1={cy - 10} x2={cx + 28} y2={cy - 10} />
          <line x1={cx + 14} y1={cy + 10} x2={cx + 28} y2={cy + 10} />
          <line x1={cx - 14} y1={cy} x2={cx + 12} y2={c.props.pos === 'A' ? cy - 10 : c.props.pos === 'B' ? cy + 10 : cy} strokeWidth={2.2} />
        </g>
      );
    case 'relay':
    case 'contactor':
    case 'timer':
      return (
        <g>
          <g {...sw}>
            <rect x={cx - 34} y={cy - 9} width={18} height={18} fill={r?.coil ? '#dcfce7' : 'none'} />
            {df.symbol === 'timer' && <path d={`M${cx - 34},${cy - 9} l18,18 M${cx - 16},${cy - 9} l-18,18`} strokeWidth={0.8} />}
            <line x1={cx - 16} y1={cy} x2={cx - 6} y2={cy} strokeDasharray="2 2" />
          </g>
          {contact(!!r?.out, false, cx + 2, cx + 24)}
        </g>
      );
    case 'overload':
      return (
        <g {...sw}>
          <rect x={cx - 16} y={cy - 12} width={32} height={24} fill={r?.tripped ? '#fecaca' : 'none'} />
          <path d={`M${cx - 9},${cy + 5} v-8 h9 v8 h9 v-8`} />
        </g>
      );
    case 'tempctl':
    case 'plc':
    case 'net':
      return null;
    case 'isa':
    case 'prox':
    case 'wireless': {
      const tag = df.tag ?? 'XT';
      const num = (c.label.match(/\d+/) ?? [''])[0];
      return (
        <g>
          <circle cx={cx} cy={cy} r={17} {...sw} fill={on ? '#ecfeff' : '#fff'} />
          {df.symbol === 'prox' && <rect x={cx - 12} y={cy - 12} width={24} height={24} {...sw} transform={`rotate(45 ${cx} ${cy})`} opacity={0.35} />}
          <text x={cx} y={cy - 1} fontSize={10} textAnchor="middle" fill={k} fontWeight={700}>
            {tag}
          </text>
          <text x={cx} y={cy + 10} fontSize={8} textAnchor="middle" fill={k}>
            {num}
          </text>
          {df.symbol === 'wireless' && <path d={`M${cx + 16},${cy - 16} a8,8 0 0 1 8,8 M${cx + 16},${cy - 22} a14,14 0 0 1 14,14`} {...sw} />}
        </g>
      );
    }
    case 'meter':
      return (
        <g {...sw}>
          <circle cx={cx} cy={cy} r={16} />
          <text x={cx} y={cy + 3} fontSize={9} textAnchor="middle" fill={k} stroke="none" fontWeight={700}>
            kWh
          </text>
        </g>
      );
    case 'lamp': {
      const col = df.beh === 'load_dc' ? LAMP_COLORS[c.props.color] ?? '#facc15' : '#fde047';
      return (
        <g {...sw}>
          {on && <circle cx={cx} cy={cy} r={22} fill={col} opacity={0.3} stroke="none" />}
          <circle cx={cx} cy={cy} r={12} fill={on ? col : '#fff'} />
          <path d={`M${cx - 8.5},${cy - 8.5} l17,17 M${cx + 8.5},${cy - 8.5} l-17,17`} />
        </g>
      );
    }
    case 'motor1':
    case 'motor3':
    case 'pump':
      return (
        <g {...sw}>
          <circle cx={cx} cy={cy} r={16} fill={on ? '#dbeafe' : '#fff'} />
          {df.symbol === 'pump' ? (
            <path d={`M${cx - 8},${cy + 10} L${cx},${cy - 12} L${cx + 8},${cy + 10}`} />
          ) : (
            <>
              <text x={cx} y={cy + 1} fontSize={11} textAnchor="middle" fill={k} stroke="none" fontWeight={700}>
                M
              </text>
              <text x={cx} y={cy + 11} fontSize={7} textAnchor="middle" fill={k} stroke="none">
                {df.symbol === 'motor3' ? '3~' : '1~'}
              </text>
            </>
          )}
        </g>
      );
    case 'heater':
      return (
        <g {...sw}>
          <rect x={cx - 20} y={cy - 9} width={40} height={18} fill={on ? '#fed7aa' : '#fff'} />
          <path d={`M${cx - 16},${cy} l4,-5 4,10 4,-10 4,10 4,-10 4,10 4,-5`} stroke={on ? '#ea580c' : k} />
        </g>
      );
    case 'socket':
      return (
        <g {...sw}>
          <path d={`M${cx - 14},${cy + 6} a14,14 0 0 1 28,0`} fill={on ? '#fef9c3' : '#fff'} />
          <line x1={cx - 18} y1={cy + 6} x2={cx + 18} y2={cy + 6} />
          <line x1={cx} y1={cy - 8} x2={cx} y2={cy - 16} />
        </g>
      );
    case 'buzzer':
      return (
        <g {...sw}>
          <path d={`M${cx - 14},${cy + 8} a14,14 0 0 1 28,0z`} fill={on ? '#fde68a' : '#fff'} />
        </g>
      );
    case 'valve':
      return (
        <g {...sw}>
          <path d={`M${cx - 16},${cy - 8} v16 l32,-16 v16z`} fill={on ? '#bbf7d0' : '#fff'} />
          <line x1={cx} y1={cy} x2={cx} y2={cy - 14} />
          <rect x={cx - 6} y={cy - 22} width={12} height={8} />
        </g>
      );
    case 'tower':
      return (
        <g {...sw}>
          {['#ef4444', '#facc15', '#22c55e'].map((col, i) => (
            <circle key={i} cx={cx} cy={cy - 14 + i * 13} r={6} fill={r?.lamps?.[i] ? col : '#fff'} />
          ))}
        </g>
      );
    case 'swg':
      return (
        <g {...sw}>
          <rect x={cx - 16} y={cy - 22} width={32} height={44} />
          {contact(on, false, cx - 8, cx + 8)}
        </g>
      );
    case 'tr':
      return (
        <g {...sw}>
          <circle cx={cx - 8} cy={cy} r={12} />
          <circle cx={cx + 8} cy={cy} r={12} />
        </g>
      );
    case 'mdb':
      return (
        <g {...sw}>
          <line x1={cx - 18} y1={cy - 16} x2={cx + 18} y2={cy - 16} strokeWidth={2.4} />
          {[-12, -4, 4, 12].map((dx) => (
            <line key={dx} x1={cx + dx} y1={cy - 16} x2={cx + dx} y2={cy + 14} />
          ))}
        </g>
      );
    case 'tb':
      return (
        <g {...sw}>
          <line x1={cx - 14} y1={cy} x2={cx + 14} y2={cy} />
          <circle cx={cx - 14} cy={cy} r={4} fill="#fff" />
          <circle cx={cx + 14} cy={cy} r={4} fill="#fff" />
        </g>
      );
    case 'cloud':
      return null;
    default:
      return null;
  }
}

// ───────────────────────── Component ─────────────────────────

export const CompView = React.memo(function CompView({ c, df, sim, symbol, selected, hist, onCtl }: Props) {
  const r = sim?.rt[c.id];
  const ds = sim?.displays[c.id];
  const t = sim?.t ?? 0;
  const running = !!sim;
  const { w, h } = df;
  const pw = !!r?.powered;
  const brandCol = BRAND_COLORS[c.brand] ?? '#475569';
  const hasL = df.ports.some((p) => p.side === 'l');
  const hasR = df.ports.some((p) => p.side === 'r');
  const hasB = df.ports.some((p) => p.side === 'b');
  const x0 = hasL ? 38 : 8;
  const x1 = w - (hasR ? 38 : 8);
  const iw = x1 - x0;
  const y0 = 40;
  const y1 = h - (hasB ? 22 : 8);
  const ih = y1 - y0;
  const icx = (x0 + x1) / 2;
  const icy = (y0 + y1) / 2;
  const isDisplay = ['hmi', 'scada', 'monitor', 'led', 'cloud'].includes(df.beh);

  const statusColor = !running
    ? '#334155'
    : r?.tripped || r?.fault || r?.damaged
      ? '#ef4444'
      : pw
        ? '#22c55e'
        : '#64748b';

  const onState = (() => {
    switch (df.beh) {
      case 'breaker':
      case 'rcbo':
      case 'fuse':
      case 'switch':
      case 'swg':
      case 'mdb':
        return c.props.on !== false && !r?.tripped;
      case 'pb':
        return !!r?.pressed !== !!c.props.nc;
      case 'estop':
        return !c.props.pressed;
      case 'contact_sw':
      case 'sensor_d':
        return !!r?.detect;
      default:
        return pw;
    }
  })();

  const content = (): React.ReactNode => {
    const b = df.beh;
    if (isDisplay) {
      const sx = hasL ? 30 : 6;
      const titles: Record<string, string> = {
        hmi: `${c.brand} ${c.model}`,
        scada: `${c.model} — Plant Overview`,
        monitor: `Control Room — ${c.label}`,
        led: '',
        cloud: `${c.brand} · ${c.model}`,
      };
      return (
        <Screen
          x={sx}
          y={y0 - 12}
          w={w - sx - 6}
          h={y1 - y0 + 10}
          ds={ds}
          style={b}
          title={titles[b] ?? c.label}
          hist={hist}
          t={t}
        />
      );
    }
    switch (b) {
      case 'grid1':
      case 'grid3':
      case 'gridmv':
      case 'gen': {
        const on = b === 'gen' ? !!r?.ready || !!c.props.on : c.props.on !== false;
        const label =
          b === 'gen'
            ? r?.ready ? 'RUNNING' : (r?.genT ?? 0) > 0 ? 'STARTING…' : c.props.auto ? 'AUTO STANDBY' : 'STOP'
            : on ? (b === 'grid1' ? '230V 50Hz' : b === 'gridmv' ? '22kV 50Hz' : '400V 50Hz') : 'OUTAGE';
        return (
          <>
            <Ctl id={c.id} onCtl={onCtl}>
              <rect x={x0} y={y0} width={iw} height={18} rx={4} fill={on ? '#14532d' : '#3f1d1d'} stroke={on ? '#22c55e' : '#ef4444'} />
              <text x={icx} y={y0 + 12.5} textAnchor="middle" fontSize={8.5} fill={on ? '#86efac' : '#fca5a5'} fontWeight={700}>
                {label}
              </text>
            </Ctl>
            {running && (
              <text x={icx} y={y0 + 30} textAnchor="middle" fontSize={8} fill="#94a3b8" className="mono">
                {fmt((r?.powerW ?? 0) / 1000, 2)} kW · {fmt(r?.current ?? 0, 1)} A
              </text>
            )}
          </>
        );
      }
      case 'battery':
        return <Lcd x={x0} y={y0} w={iw} h={20} text="24.0V" on={running} />;
      case 'psu':
        return (
          <Lcd
            x={x0}
            y={y0}
            w={iw}
            h={26}
            text={pw ? '24.0V' : r?.fault ? 'SHORT' : '0.0V'}
            sub={running ? `${fmt(r?.dcLoad ?? 0, 0)}W / ${c.props.ratedW}W` : undefined}
            color={r?.fault ? '#f87171' : '#4ade80'}
            on={running}
          />
        );
      case 'ups': {
        const bat = r?.battery ?? 100;
        return (
          <>
            <text x={icx} y={y0 + 8} textAnchor="middle" fontSize={8} fontWeight={700} fill={!running ? '#475569' : r?.inOk ? '#4ade80' : r?.on ? '#fbbf24' : '#f87171'}>
              {!running ? 'STANDBY' : r?.inOk ? 'ONLINE' : r?.on ? 'ON BATTERY' : 'OFF'}
            </text>
            <rect x={x0} y={y0 + 14} width={iw} height={10} rx={2} fill="#0f172a" stroke="#334155" />
            <rect x={x0 + 1} y={y0 + 15} width={(iw - 2) * (bat / 100)} height={8} rx={1.5} fill={bat > 30 ? '#22c55e' : '#ef4444'} />
            <text x={icx} y={y0 + 22} textAnchor="middle" fontSize={6.5} fill="#fff" className="mono">
              {fmt(bat, 0)}%
            </text>
          </>
        );
      }
      case 'ats':
        return (
          <>
            <Lcd x={x0} y={y0} w={iw} h={22} text={!running ? 'AUTO' : r?.sel === 1 ? '◀ NORMAL' : r?.sel === 2 ? '◀ EMERG.' : 'NO SOURCE'} size={9} color={r?.sel === 2 ? '#fbbf24' : '#4ade80'} on={running} />
          </>
        );
      case 'swg':
      case 'mdb':
      case 'breaker':
      case 'rcbo':
      case 'fuse': {
        const trip = !!r?.tripped;
        const on = c.props.on !== false && !trip;
        const lbl = trip ? (b === 'fuse' ? 'BLOWN' : 'TRIP') : on ? 'ON' : 'OFF';
        const col = trip ? '#ef4444' : on ? '#22c55e' : '#64748b';
        return (
          <>
            <Ctl id={c.id} onCtl={onCtl}>
              <rect x={icx - 22} y={y0 - 2} width={44} height={20} rx={4} fill="#0f172a" stroke={col} strokeWidth={1.4} />
              <rect x={on ? icx : icx - 20} y={y0} width={20} height={16} rx={3} fill={col} />
              <text x={on ? icx - 10 : icx + 10} y={y0 + 11} textAnchor="middle" fontSize={7.5} fill="#e2e8f0" fontWeight={700}>
                {lbl}
              </text>
            </Ctl>
            <text x={icx} y={y1 + 2} textAnchor="middle" fontSize={7.5} fill={trip ? '#fca5a5' : '#94a3b8'} className="mono">
              {running ? `${fmt(r?.current ?? 0, b === 'swg' ? 2 : 1)}A / ${c.props.rating}A` : `${c.props.rating}A${b === 'rcbo' ? ` ${c.props.sens}mA` : ''}`}
            </text>
          </>
        );
      }
      case 'switch':
      case 'contact_sw': {
        const on = b === 'switch' ? !!c.props.on : !!r?.detect;
        return (
          <Ctl id={c.id} onCtl={onCtl}>
            <rect x={icx - 16} y={y0 - 2} width={32} height={26} rx={4} fill="#e2e8f0" stroke="#94a3b8" />
            <rect x={icx - 10} y={on ? y0 + 1 : y0 + 9} width={20} height={12} rx={2} fill={on ? '#22c55e' : '#64748b'} />
            <text x={icx} y={y0 + 34} textAnchor="middle" fontSize={7} fill="#94a3b8">
              {b === 'contact_sw' ? (c.props.mode === 'manual' ? 'คลิกเพื่อกด' : c.props.mode.toUpperCase()) : on ? 'ON' : 'OFF'}
            </text>
          </Ctl>
        );
      }
      case 'pb': {
        const col = LAMP_COLORS[c.props.color] ?? '#22c55e';
        const pr = !!r?.pressed;
        return (
          <Ctl id={c.id} onCtl={onCtl} momentary>
            <circle cx={icx} cy={icy} r={15} fill="#cbd5e1" stroke="#64748b" />
            <circle cx={icx} cy={icy + (pr ? 1.5 : 0)} r={pr ? 10 : 11.5} fill={col} stroke="#0f172a" strokeOpacity={0.3} />
            <text x={icx} y={icy + 3} textAnchor="middle" fontSize={6.5} fill="#fff" fontWeight={700}>
              {c.props.nc ? 'STOP' : 'START'}
            </text>
          </Ctl>
        );
      }
      case 'estop': {
        const pr = !!c.props.pressed;
        return (
          <Ctl id={c.id} onCtl={onCtl}>
            <circle cx={icx} cy={icy} r={17} fill="#facc15" stroke="#a16207" />
            <circle cx={icx} cy={icy} r={pr ? 10 : 12.5} fill="#dc2626" stroke="#7f1d1d" />
            <text x={icx} y={icy + 2.5} textAnchor="middle" fontSize={6} fill="#fff" fontWeight={700}>
              {pr ? 'PRESSED' : 'E-STOP'}
            </text>
          </Ctl>
        );
      }
      case 'selector': {
        const ang = c.props.pos === 'A' ? -45 : c.props.pos === 'B' ? 45 : 0;
        return (
          <Ctl id={c.id} onCtl={onCtl}>
            <circle cx={icx} cy={icy} r={15} fill="#1e293b" stroke="#64748b" />
            <rect x={icx - 3} y={icy - 13} width={6} height={26} rx={2} fill="#e2e8f0" transform={`rotate(${ang} ${icx} ${icy})`} />
            <text x={icx - 20} y={y0 + 2} fontSize={6.5} fill="#94a3b8">H</text>
            <text x={icx - 2} y={y0 - 2} fontSize={6.5} fill="#94a3b8">O</text>
            <text x={icx + 16} y={y0 + 2} fontSize={6.5} fill="#94a3b8">A</text>
          </Ctl>
        );
      }
      case 'relay':
      case 'contactor':
      case 'timer': {
        const rem = b === 'timer' && r?.coil && !r?.out ? Math.max(0, (+c.props.delay || 0) - (r?.timer ?? 0)) : null;
        return (
          <>
            <Led x={x0 + 6} y={y0 + 6} on={!!r?.coil} color="#22c55e" />
            <text x={x0 + 14} y={y0 + 9} fontSize={7.5} fill="#cbd5e1">
              COIL {r?.coil ? 'ON' : 'OFF'}
            </text>
            <text x={x0 + 2} y={y0 + 24} fontSize={7.5} fill={r?.out ? '#4ade80' : '#94a3b8'} className="mono">
              {b === 'timer' ? (rem !== null ? `⏱ ${rem.toFixed(1)}s` : r?.out ? 'TIME UP' : `T=${c.props.delay}s`) : r?.out ? 'NO: CLOSED' : 'NO: OPEN'}
            </text>
          </>
        );
      }
      case 'overload':
        return (
          <>
            {r?.tripped ? (
              <Ctl id={c.id} onCtl={onCtl}>
                <rect x={x0} y={y0} width={iw} height={18} rx={4} fill="#7f1d1d" stroke="#ef4444" />
                <text x={icx} y={y0 + 12} textAnchor="middle" fontSize={8} fill="#fff" fontWeight={700}>
                  TRIP — RESET
                </text>
              </Ctl>
            ) : (
              <Lcd x={x0} y={y0} w={iw} h={18} text={running ? `${fmt(r?.current ?? 0, 1)}A` : `${c.props.setting}A`} size={10} on />
            )}
            <text x={icx} y={y0 + 32} textAnchor="middle" fontSize={7} fill="#94a3b8">
              set {c.props.setting}A
            </text>
          </>
        );
      case 'tempctl':
        return (
          <>
            <rect x={x0} y={y0 - 4} width={iw} height={36} rx={3} fill="#0b0f14" stroke="#1f2937" />
            <text x={x0 + 4} y={y0 + 8} fontSize={6.5} fill="#94a3b8">PV</text>
            <text x={x1 - 4} y={y0 + 10} fontSize={12} textAnchor="end" fill={pw ? '#f87171' : '#1f2937'} className="mono" fontWeight={700}>
              {pw && r?.pv !== undefined ? fmt(r.pv, 1) : '----'}
            </text>
            <text x={x0 + 4} y={y0 + 25} fontSize={6.5} fill="#94a3b8">SV</text>
            <text x={x1 - 4} y={y0 + 27} fontSize={10} textAnchor="end" fill={pw ? '#4ade80' : '#1f2937'} className="mono" fontWeight={700}>
              {fmt(+c.props.sv, 1)}
            </text>
            <Led x={x0 + 18} y={y0 + 22} on={!!r?.out} color="#f59e0b" r={2.5} />
          </>
        );
      case 'vfd':
        return (
          <>
            <Lcd x={x0} y={y0} w={iw} h={28} text={`${fmt(r?.freq ?? 0, 1)} Hz`} sub={running ? `${r?.run ? 'RUN' : 'STOP'} · ${fmt(r?.current ?? 0, 1)}A` : 'READY'} on={running && pw} />
            <Led x={x0 + 6} y={y0 + 40} on={pw} />
            <text x={x0 + 13} y={y0 + 43} fontSize={7} fill="#94a3b8">PWR</text>
            <Led x={x0 + 40} y={y0 + 40} on={(r?.freq ?? 0) > 0.5} color="#22c55e" />
            <text x={x0 + 47} y={y0 + 43} fontSize={7} fill="#94a3b8">RUN</text>
          </>
        );
      case 'sensor_a': {
        const al = pw && r?.value !== undefined && ((c.props.hi !== '' && r.value > +c.props.hi) || (c.props.lo !== '' && r.value < +c.props.lo));
        return (
          <>
            <Lcd x={x0} y={y0} w={iw} h={24} text={`${fmt(r?.value)} ${c.props.unit}`} size={10.5} color={al ? '#f87171' : '#4ade80'} on={running && pw} />
            <text x={icx} y={y1 + 2} textAnchor="middle" fontSize={7} fill="#64748b">
              {c.props.min}…{c.props.max} {c.props.unit} · {c.props.mode}
            </text>
          </>
        );
      }
      case 'sensor_d':
        return (
          <Ctl id={c.id} onCtl={onCtl}>
            <rect x={x0} y={y0} width={iw} height={22} rx={4} fill="#0f172a" stroke="#334155" />
            <Led x={x0 + 10} y={y0 + 11} on={pw && !!r?.detect} color="#f59e0b" r={4} />
            <text x={x0 + 20} y={y0 + 14} fontSize={7.5} fill={r?.detect && pw ? '#fbbf24' : '#64748b'} fontWeight={600}>
              {pw ? (r?.detect ? 'DETECT' : 'CLEAR') : 'NO PWR'}
            </text>
            <text x={icx} y={y0 + 32} textAnchor="middle" fontSize={6.5} fill="#64748b">
              {c.props.mode === 'manual' ? 'คลิกเพื่อจำลองตรวจจับ' : `mode: ${c.props.mode}`}
            </text>
          </Ctl>
        );
      case 'sensor_485':
      case 'sensor_lora':
        return (
          <>
            <Lcd x={x0} y={y0} w={iw} h={24} text={`${fmt(r?.value, 1)}°C ${fmt(r?.value2, 0)}%`} size={9.5} on={running && pw} />
            {b === 'sensor_lora' && (
              <text x={icx} y={y1 + 2} textAnchor="middle" fontSize={7} fill="#64748b">
                🔋 {fmt(r?.battery ?? 100, 0)}% · LoRaWAN
              </text>
            )}
          </>
        );
      case 'emeter':
        return (
          <>
            <Lcd x={x0} y={y0} w={iw} h={26} text={`${fmt((r?.powerW ?? 0) / 1000, 2)} kW`} sub={`${fmt(r?.current ?? 0, 1)}A · ${fmt(r?.kwh ?? 0, 3)}kWh`} on={running && pw} size={11} />
          </>
        );
      case 'plc':
      case 'rio':
      case 'edge': {
        const dis = r?.di ?? [];
        const dos = r?.dos ?? [];
        return (
          <>
            <rect x={x0} y={y0 - 4} width={iw} height={14} rx={2} fill="#0f172a" />
            <Led x={x0 + 7} y={y0 + 3} on={pw} color="#22c55e" r={2.5} />
            <text x={x0 + 13} y={y0 + 5.5} fontSize={6.5} fill="#94a3b8">RUN</text>
            <Led x={x0 + 36} y={y0 + 3} on={pw && !!sim && !!sim.tags[`${c.id}:AI1`]} color="#22d3ee" r={2.5} />
            <text x={x0 + 42} y={y0 + 5.5} fontSize={6.5} fill="#94a3b8">COM</text>
            {(r?.ai ?? []).map((sg, i) =>
              sg ? (
                <text key={i} x={x0 + 2} y={84 + i * 20} fontSize={7} fill="#fbbf24" className="mono">
                  {fmt(sg.value)}{sg.unit}
                </text>
              ) : null,
            )}
            {df.ports
              .filter((p) => p.side === 'r')
              .map((p, i) => {
                const isDO = p.id.startsWith('DO');
                const idx = +p.id.slice(2) - 1;
                const on = isDO ? !!dos[idx] : !!dis[idx];
                return <Led key={p.id} x={x1 - 2} y={p.y} on={on} color={isDO ? '#f59e0b' : '#22c55e'} r={2.6} />;
              })}
            <IconG name={df.icon} x={icx - 12} y={y1 - 30} size={24} color="#475569" />
          </>
        );
      }
      case 'eswitch':
      case 'router':
      case 'gateway':
      case 'lora_gw': {
        const blink = Math.floor(t * 5) % 2 === 0;
        return (
          <>
            <Led x={x0 + 6} y={y0 + 2} on={pw} r={2.6} />
            <text x={x0 + 13} y={y0 + 5} fontSize={7} fill="#94a3b8">PWR</text>
            {df.ports
              .filter((p) => p.side === 'b')
              .map((p) => {
                const wired = sim && Object.values(sim.wire).length > 0;
                return <Led key={p.id} x={p.x} y={h - 12} on={pw && !!wired && blink} color="#14b8a6" r={2.4} />;
              })}
            <IconG name={df.icon} x={x1 - 24} y={y0 - 6} size={22} color={pw ? '#2dd4bf' : '#475569'} />
          </>
        );
      }
      case 'load_ac':
      case 'load_dc': {
        if (df.icon === 'lamp') {
          const col = b === 'load_dc' ? LAMP_COLORS[c.props.color] ?? '#facc15' : '#fde047';
          return (
            <g>
              {pw && <circle cx={icx} cy={icy} r={20} fill={col} opacity={0.55} filter="url(#blur)" />}
              <circle cx={icx} cy={icy} r={11} fill={pw ? col : '#1e293b'} stroke={b === 'load_dc' ? col : '#64748b'} strokeWidth={1.5} />
              {b === 'load_ac' && <path d={`M${icx - 4},${icy + 2} l2,-4 2,4 2,-4 2,4`} stroke={pw ? '#92400e' : '#475569'} fill="none" />}
            </g>
          );
        }
        if (df.icon === 'fan' || df.icon === 'snow') {
          return (
            <g>
              <circle cx={icx} cy={icy} r={14} fill="#0f172a" stroke={pw ? '#38bdf8' : '#475569'} />
              <g className={pw ? 'spin' : ''} style={{ animationDuration: '0.6s' }}>
                <IconG name={df.icon} x={icx - 11} y={icy - 11} size={22} color={pw ? '#7dd3fc' : '#475569'} />
              </g>
            </g>
          );
        }
        if (df.icon === 'heater') {
          return (
            <g>
              <rect x={icx - 24} y={icy - 10} width={48} height={20} rx={3} fill={pw ? '#431407' : '#0f172a'} stroke={pw ? '#f97316' : '#475569'} />
              <path d={`M${icx - 19},${icy} l4,-6 4,12 4,-12 4,12 4,-12 4,12 4,-12 4,12 3,-6`} fill="none" stroke={pw ? '#fb923c' : '#475569'} strokeWidth={1.6} className={pw ? 'heat' : ''} />
            </g>
          );
        }
        if (df.icon === 'socket') {
          return (
            <g>
              <rect x={icx - 15} y={icy - 15} width={30} height={30} rx={6} fill="#e2e8f0" stroke="#94a3b8" />
              <rect x={icx - 7} y={icy - 7} width={3} height={8} rx={1} fill="#334155" />
              <rect x={icx + 4} y={icy - 7} width={3} height={8} rx={1} fill="#334155" />
              <circle cx={icx} cy={icy + 7} r={2.5} fill="#334155" />
              <Led x={icx + 12} y={icy - 12} on={pw} color={c.props.leak ? '#ef4444' : '#22c55e'} r={2.5} />
            </g>
          );
        }
        if (df.icon === 'buzzer') {
          return (
            <g>
              <circle cx={icx} cy={icy} r={13} fill="#111827" stroke={pw ? '#facc15' : '#475569'} />
              {pw && <circle cx={icx} cy={icy} r={16} fill="none" stroke="#facc15" className="pulse" />}
              <IconG name="buzzer" x={icx - 9} y={icy - 9} size={18} color={pw ? '#facc15' : '#475569'} />
            </g>
          );
        }
        if (df.icon === 'valve') {
          return (
            <g>
              <path d={`M${icx - 18},${icy - 8} v16 l36,-16 v16z`} fill={pw ? '#14532d' : '#0f172a'} stroke={pw ? '#22c55e' : '#64748b'} />
              <text x={icx} y={y1 + 2} textAnchor="middle" fontSize={7} fill={pw ? '#4ade80' : '#64748b'}>
                {pw ? 'OPEN' : 'CLOSED'}
              </text>
            </g>
          );
        }
        return <IconG name={df.icon} x={icx - 12} y={icy - 12} size={24} color={pw ? '#facc15' : '#475569'} />;
      }
      case 'motor3': {
        const sp = r?.speed ?? 0;
        const rpm = pw ? sp * (+c.props.rpm || 1450) : 0;
        return (
          <g>
            <circle cx={icx} cy={icy - 4} r={16} fill="#0f172a" stroke={pw ? '#60a5fa' : '#475569'} strokeWidth={1.5} />
            <g className={pw && sp > 0.02 ? 'spin' : ''} style={{ animationDuration: `${Math.max(0.15, 1.2 / Math.max(sp, 0.05))}s` }}>
              {[0, 60, 120].map((a) => (
                <rect key={a} x={icx - 1.5} y={icy - 17} width={3} height={26} rx={1.5} fill={pw ? '#93c5fd' : '#475569'} transform={`rotate(${a} ${icx} ${icy - 4})`} />
              ))}
            </g>
            <text x={icx} y={y1 + 4} textAnchor="middle" fontSize={7.5} fill={pw ? '#93c5fd' : '#64748b'} className="mono">
              {running ? `${fmt(rpm, 0)} rpm` : `${c.props.kw} kW`}
            </text>
          </g>
        );
      }
      case 'tower': {
        const cols = ['#ef4444', '#facc15', '#22c55e'];
        return (
          <g>
            {cols.map((col, i) => (
              <g key={i}>
                {r?.lamps?.[i] && <rect x={icx - 14} y={y0 - 4 + i * 20} width={28} height={18} rx={4} fill={col} opacity={0.3} />}
                <rect x={icx - 10} y={y0 - 2 + i * 20} width={20} height={14} rx={3} fill={r?.lamps?.[i] ? col : '#1e293b'} stroke={col} strokeOpacity={0.6} />
              </g>
            ))}
            <rect x={icx - 2} y={y0 + 56} width={4} height={8} fill="#64748b" />
          </g>
        );
      }
      case 'pmeter':
        return (
          <Lcd
            x={x0}
            y={y0}
            w={iw}
            h={28}
            text={r?.pv === undefined ? '- - -' : fmt(r.pv, Math.max(0, +c.props.decimals || 0))}
            sub={r?.unit ?? ''}
            color="#f87171"
            on={running && pw}
            size={15}
          />
        );
      case 'tr': {
        const pct = r?.powered ? (100 * (r.powerW ?? 0)) / ((+c.props.kva || 1) * 1000) : 0;
        return (
          <g>
            <circle cx={icx - 10} cy={icy - 2} r={12} fill="none" stroke={pw ? '#fb7185' : '#64748b'} />
            <circle cx={icx + 10} cy={icy - 2} r={12} fill="none" stroke={pw ? '#94a3b8' : '#475569'} />
            <text x={icx} y={y1 + 2} textAnchor="middle" fontSize={7.5} fill={pw ? '#e2e8f0' : '#64748b'} className="mono">
              {c.props.pri}/{c.props.sec}V · {running && pw ? `${fmt(pct, 0)}%` : `${c.props.kva} kVA`}
            </text>
          </g>
        );
      }
      case 'tb':
        return (
          <g>
            {df.ports.map((p) => (
              <circle key={p.id} cx={p.side === 'l' ? 16 : w - 16} cy={p.y} r={4} fill="#94a3b8" stroke="#475569" />
            ))}
          </g>
        );
      case 'passive':
        return <IconG name={df.icon} x={icx - 12} y={icy - 12} size={24} color="#fbbf24" />;
      default:
        return <IconG name={df.icon} x={icx - 12} y={icy - 12} size={24} color="#64748b" />;
    }
  };

  const modelText = trunc(`${c.brand} · ${c.model}`, w - 12, 7);

  return (
    <g transform={`translate(${c.x},${c.y})`} className={`comp ${selected ? 'sel' : ''}`} data-id={c.id}>
      {symbol ? (
        <>
          <rect x={0} y={0} width={w} height={h} rx={3} fill="#ffffff" stroke={selected ? '#0284c7' : '#94a3b8'} strokeWidth={selected ? 2 : 1} strokeDasharray={isDisplay ? '' : '4 3'} />
          <text x={w / 2} y={13} textAnchor="middle" fontSize={9.5} fontWeight={700} fill="#0f172a">
            {c.label}
          </text>
          <text x={w / 2} y={24} textAnchor="middle" fontSize={6.5} fill="#64748b">
            {trunc(c.model, w - 10, 6.5)}
          </text>
          {isDisplay || SYMBOL_AS_DEVICE.includes(df.beh) ? content() : <Sym df={df} c={c} r={r} w={w} cy={Math.max(44, (y0 + y1) / 2)} on={running && onState} />}
          {['breaker', 'rcbo', 'fuse', 'switch', 'pb', 'estop', 'selector', 'contact_sw', 'sensor_d', 'grid1', 'grid3', 'gridmv', 'gen', 'overload', 'swg', 'mdb'].includes(df.beh) && (
            <Ctl id={c.id} onCtl={onCtl} momentary={df.beh === 'pb'}>
              <rect x={w / 2 - 26} y={30} width={52} height={Math.max(24, h - 44)} fill="transparent" />
            </Ctl>
          )}
        </>
      ) : (
        <>
          <rect x={0} y={0} width={w} height={h} rx={8} fill="#253447" stroke={selected ? '#69baff' : pw && running ? '#77e7b4' : '#4a6178'} strokeWidth={selected ? 2 : 1} />
          <rect x={0} y={0} width={4} height={h} fill={brandCol} />
          <rect x={4} y={0} width={w - 4} height={24} rx={8} fill="#304359" />
          <rect x={4} y={16} width={w - 4} height={8} fill="#304359" />
          <text x={12} y={16} fontSize={10} fontWeight={700} fill="#dbe7f4">
            {trunc(c.label || df.short, w - 30, 9)}
          </text>
          <circle cx={w - 10} cy={11} r={4} fill={statusColor} stroke="#0b1220" strokeWidth={1.2} />
          <text x={w / 2} y={33} textAnchor="middle" fontSize={7} fill="#94a3b8">
            {modelText}
          </text>
          {content()}
        </>
      )}
      {running && r?.damaged && (
        <g pointerEvents="none">
          <rect x={1} y={1} width={w - 2} height={h - 2} rx={symbol ? 3 : 8} fill="#7f1d1d" fillOpacity={0.55} stroke="#ef4444" strokeWidth={2} />
          <path d={`M10 10L${w - 10} ${h - 10}M${w - 10} 10L10 ${h - 10}`} stroke="#ef4444" strokeOpacity={0.45} strokeWidth={2} />
          {[0, 1, 2].map((i) => (
            <circle key={i} className={`burnt-smoke s${i + 1}`} cx={w / 2 - 12 + i * 12} cy={h / 2 - 14} r={6} fill="#94a3b8" />
          ))}
          <rect x={w / 2 - 34} y={h / 2 - 9} width={68} height={18} rx={9} fill="#dc2626" />
          <text x={w / 2} y={h / 2 + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill="#fff">
            เสียหาย
          </text>
        </g>
      )}
      {df.ports.map((p) => {
        const col = KIND_COLOR[p.kind];
        const lx = p.side === 'l' ? p.x + 8 : p.side === 'r' ? p.x - 8 : p.x;
        const ly = p.side === 't' ? p.y + 13 : p.side === 'b' ? p.y - 7 : p.y + 3;
        const anchor = p.side === 'l' ? 'start' : p.side === 'r' ? 'end' : 'middle';
        return (
          <g key={p.id}>
            <text x={lx} y={ly} fontSize={7} textAnchor={anchor} fill={symbol ? '#475569' : '#cbd5e1'} className="plabel">
              {p.label}
            </text>
            <circle className="port" data-c={c.id} data-p={p.id} cx={p.x} cy={p.y} r={5} fill={symbol ? '#fff' : '#0b1220'} stroke={col} strokeWidth={2} />
          </g>
        );
      })}
    </g>
  );
});