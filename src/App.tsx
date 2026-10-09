import { useCallback, useEffect, useRef, useState } from 'react';
import type { Comp, Design, Endpoint, View, Wire } from './types';
import { DEF_MAP, compatible, KIND_NAME } from './library';
import { Canvas, Sel } from './Canvas';
import { Palette } from './Palette';
import { Inspector } from './Inspector';
import { BottomPanel } from './BottomPanel';
import { TEMPLATES, newId } from './templates';
import { DrawingDialog } from './DrawingDialog';
import { forceTrip, newSim, repair, resetTrip, setPressed, SimState, step } from './sim';
import { CheckDialog } from './CheckDialog';
import { checkWiring, Issue, wireIssue } from './check';
import type { CtlAction } from './CompView';
import { isUnlocked, LOCKED_GROUPS, verifyLogin } from './auth';

const LS_KEY = 'wirelab.design.v1';

function loadInitial(): Design {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const d = JSON.parse(raw) as Design;
      if (d && Array.isArray(d.comps)) return { ...d, comps: d.comps.filter((c) => DEF_MAP[c.type]) };
    }
  } catch {
    /* ignore corrupt storage */
  }
  return TEMPLATES[0].build();
}

function nextLabel(d: Design, type: string) {
  const df = DEF_MAP[type];
  const base = df.tag ?? df.short.split(' ')[0].replace(/[^\w]/g, '');
  const start = df.tag ? 101 : 1;
  for (let i = start; ; i++) {
    const l = `${base}-${i}`;
    if (!d.comps.some((c) => c.label === l)) return l;
  }
}

export default function App() {
  const [design, setDesignState] = useState<Design>(loadInitial);
  const designRef = useRef(design);
  const past = useRef<Design[]>([]);
  const future = useRef<Design[]>([]);
  const [sel, setSel] = useState<Sel>({ comps: [], wire: null });
  const [view, setView] = useState<View>({ x: 40, y: 30, k: 0.72 });
  const [symbol, setSymbol] = useState(false);
  const [brand, setBrand] = useState('');
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [tick, setTick] = useState(0);
  const [bottomOpen, setBottomOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [preset, setPreset] = useState('process');
  const [help, setHelp] = useState(false);
  const [drawingOpen, setDrawingOpen] = useState(false);
  const [checkOpen, setCheckOpen] = useState(false);
  const [critCount, setCritCount] = useState(0);
  const [unlocked, setUnlocked] = useState(isUnlocked);
  const [login, setLogin] = useState<{ user: string; pw: string; err: string; busy: boolean } | null>(null);
  const simRef = useRef<SimState | null>(null);
  const burnt = useRef(new Set<string>());
  const hist = useRef<Record<string, number[]>>({});
  const lastHist = useRef(-1);
  const clipboard = useRef<{ comps: Comp[]; wires: Wire[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((m: string) => {
    setToast(m);
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(() => setToast(null), Math.max(2600, m.length * 55));
  }, []);

  const update = useCallback((fn: (d: Design) => Design, history = true) => {
    const prev = designRef.current;
    const next = fn(prev);
    if (next === prev) return;
    if (history) {
      past.current.push(prev);
      if (past.current.length > 100) past.current.shift();
      future.current = [];
    }
    designRef.current = next;
    setDesignState(next);
  }, []);

  const undo = useCallback(() => {
    const p = past.current.pop();
    if (!p) return;
    future.current.push(designRef.current);
    designRef.current = p;
    setDesignState(p);
  }, []);
  const redo = useCallback(() => {
    const f = future.current.pop();
    if (!f) return;
    past.current.push(designRef.current);
    designRef.current = f;
    setDesignState(f);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => localStorage.setItem(LS_KEY, JSON.stringify(design)), 400);
    return () => window.clearTimeout(t);
  }, [design]);

  useEffect(() => {
    const t = window.setTimeout(() => setCritCount(checkWiring(design).filter((i) => i.sev === 'crit').length), 700);
    return () => window.clearTimeout(t);
  }, [design]);

  // ─────────────── Simulation loop ───────────────
  const doStep = useCallback((dt: number) => {
    const s = simRef.current;
    if (!s) return;
    const sub = Math.max(1, Math.ceil(dt / 0.25));
    for (let i = 0; i < sub; i++) {
      step(designRef.current, s, dt / sub);
      const sec = Math.floor(s.t);
      if (sec !== lastHist.current) {
        lastHist.current = sec;
        for (const id in s.tags) {
          const arr = (hist.current[id] ??= []);
          arr.push(s.tags[id].value);
          if (arr.length > 240) arr.shift();
        }
      }
    }
    for (const c of designRef.current.comps) {
      const why = s.rt[c.id]?.damaged;
      if (why && !burnt.current.has(c.id)) showToast(`💥 ${c.label} พัง — ${why}`);
      if (why) burnt.current.add(c.id);
      else burnt.current.delete(c.id);
    }
    setTick((x) => x + 1);
  }, [showToast]);

  useEffect(() => {
    if (!running) return;
    const iv = window.setInterval(() => doStep(0.2 * speed), 200);
    return () => window.clearInterval(iv);
  }, [running, speed, doStep]);

  const start = () => {
    if (!simRef.current) {
      simRef.current = newSim();
      hist.current = {};
      lastHist.current = -1;
      doStep(0.01);
    }
    setRunning(true);
  };
  const pause = () => setRunning(false);
  const stop = () => {
    setRunning(false);
    simRef.current = null;
    hist.current = {};
    burnt.current.clear();
    setTick((x) => x + 1);
  };

  // ─────────────── Edit actions ───────────────
  const addComp = useCallback(
    (type: string, x: number, y: number) => {
      const df = DEF_MAP[type];
      if (!df) return;
      const br = (brand && df.brands.find((b) => b.brand === brand)) || df.brands[0];
      const id = newId();
      update((d) => ({
        ...d,
        comps: [
          ...d.comps,
          {
            id,
            type,
            x: Math.round((x - df.w / 2) / 10) * 10,
            y: Math.round((y - df.h / 2) / 10) * 10,
            label: nextLabel(d, type),
            brand: br.brand,
            model: br.model,
            props: { ...df.props },
          },
        ],
      }));
      setSel({ comps: [id], wire: null });
    },
    [brand, update],
  );

  const addAtCenter = (type: string) => {
    const el = document.querySelector('.canvas') as SVGSVGElement | null;
    const r = el?.getBoundingClientRect();
    const cx = r ? r.width / 2 : 400;
    const cy = r ? r.height / 2 : 300;
    addComp(type, (cx - view.x) / view.k, (cy - view.y) / view.k);
  };

  const onAddWire = useCallback(
    (a: Endpoint, b: Endpoint) => {
      const d = designRef.current;
      const ca = d.comps.find((c) => c.id === a.c);
      const cb = d.comps.find((c) => c.id === b.c);
      if (!ca || !cb) return;
      const pa = DEF_MAP[ca.type].ports.find((p) => p.id === a.p)!;
      const pb = DEF_MAP[cb.type].ports.find((p) => p.id === b.p)!;
      if (!compatible(pa.kind, pb.kind)) {
        showToast(`⛔ ต่อไม่ได้: ${KIND_NAME[pa.kind]} ↔ ${KIND_NAME[pb.kind]}`);
        return;
      }
      const dup = d.wires.some(
        (w) => (w.a.c === a.c && w.a.p === a.p && w.b.c === b.c && w.b.p === b.p) || (w.a.c === b.c && w.a.p === b.p && w.b.c === a.c && w.b.p === a.p),
      );
      if (dup) return;
      const wire = { id: newId('w'), a, b };
      const iss = wireIssue({ ...d, wires: [...d.wires, wire] }, wire);
      if (iss) showToast(`${iss.sev === 'crit' ? '⛔' : '⚠️'} ${iss.msg}`);
      update((dd) => ({ ...dd, wires: [...dd.wires, wire] }));
    },
    [update, showToast],
  );

  const moveStart = useRef<Design | null>(null);
  const onMove = useCallback(
    (pos: Record<string, { x: number; y: number }>, commit: boolean) => {
      if (!moveStart.current) moveStart.current = designRef.current;
      update((d) => ({ ...d, comps: d.comps.map((c) => (pos[c.id] ? { ...c, ...pos[c.id] } : c)) }), false);
      if (commit) {
        past.current.push(moveStart.current);
        future.current = [];
        moveStart.current = null;
      }
    },
    [update],
  );

  const deleteSel = useCallback(() => {
    if (sel.wire) update((d) => ({ ...d, wires: d.wires.filter((w) => w.id !== sel.wire) }));
    else if (sel.comps.length)
      update((d) => ({
        ...d,
        comps: d.comps.filter((c) => !sel.comps.includes(c.id)),
        wires: d.wires.filter((w) => !sel.comps.includes(w.a.c) && !sel.comps.includes(w.b.c)),
      }));
    setSel({ comps: [], wire: null });
  }, [sel, update]);

  const pasteFrom = useCallback(
    (src: { comps: Comp[]; wires: Wire[] }, offset = 40) => {
      const map: Record<string, string> = {};
      const d0 = designRef.current;
      const used = new Set(d0.comps.map((c) => c.label));
      const comps = src.comps.map((c) => {
        const id = newId();
        map[c.id] = id;
        let label = c.label;
        for (let i = 2; used.has(label); i++) label = `${c.label.replace(/-\d+$/, '')}-${i}`;
        used.add(label);
        return { ...c, id, label, x: c.x + offset, y: c.y + offset, props: { ...c.props } };
      });
      const wires = src.wires.filter((w) => map[w.a.c] && map[w.b.c]).map((w) => ({ ...w, id: newId('w'), a: { ...w.a, c: map[w.a.c] }, b: { ...w.b, c: map[w.b.c] } }));
      update((d) => ({ ...d, comps: [...d.comps, ...comps], wires: [...d.wires, ...wires] }));
      setSel({ comps: comps.map((c) => c.id), wire: null });
    },
    [update],
  );

  const selection = () => {
    const d = designRef.current;
    const comps = d.comps.filter((c) => sel.comps.includes(c.id));
    const wires = d.wires.filter((w) => sel.comps.includes(w.a.c) && sel.comps.includes(w.b.c));
    return { comps, wires };
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSel();
      } else if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (sel.comps.length) pasteFrom(selection());
      } else if (mod && e.key.toLowerCase() === 'c') {
        if (sel.comps.length) clipboard.current = selection();
      } else if (mod && e.key.toLowerCase() === 'v') {
        if (clipboard.current) pasteFrom(clipboard.current, 60);
      } else if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSel({ comps: designRef.current.comps.map((c) => c.id), wire: null });
      } else if (e.key === 'Escape') setSel({ comps: [], wire: null });
      else if (e.key === ' ' && !mod) {
        e.preventDefault();
        if (running) pause();
        else start();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ─────────────── Controls on devices ───────────────
  const setProps = (id: string, patch: Record<string, any>) =>
    update((d) => ({ ...d, comps: d.comps.map((c) => (c.id === id ? { ...c, props: { ...c.props, ...patch } } : c)) }), false);

  const onCtl = useCallback(
    (id: string, a: CtlAction) => {
      const c = designRef.current.comps.find((x) => x.id === id);
      if (!c) return;
      const df = DEF_MAP[c.type];
      const s = simRef.current;
      const r = s?.rt[id];
      if (df.beh === 'pb') {
        if (s) setPressed(s, id, a === 'down');
        if (s && running) doStep(0);
        return;
      }
      if (a !== 'down') return;
      switch (df.beh) {
        case 'breaker':
        case 'rcbo':
        case 'fuse':
        case 'swg':
        case 'mdb':
          if (s && r?.tripped) {
            resetTrip(s, id);
            setProps(id, { on: true });
          } else setProps(id, { on: c.props.on === false });
          break;
        case 'switch':
          setProps(id, { on: !c.props.on });
          break;
        case 'estop':
          setProps(id, { pressed: !c.props.pressed });
          break;
        case 'selector':
          setProps(id, { pos: c.props.pos === 'A' ? 'O' : c.props.pos === 'O' ? 'B' : 'A' });
          break;
        case 'contact_sw':
          setProps(id, { mode: 'manual', actuated: !(r?.detect ?? c.props.actuated) });
          break;
        case 'sensor_d':
          setProps(id, { mode: 'manual', detect: !(r?.detect ?? c.props.detect) });
          break;
        case 'grid1':
        case 'grid3':
        case 'gridmv':
          setProps(id, { on: c.props.on === false });
          break;
        case 'gen':
          setProps(id, { on: !c.props.on });
          break;
        case 'pv': {
          const irr = +c.props.irr || 0;
          setProps(id, { sun: 'manual', irr: c.props.sun === 'day' ? 1000 : irr > 600 ? 300 : irr > 20 ? 0 : 1000 });
          break;
        }
        case 'pvinv':
        case 'hybrid':
          setProps(id, { on: c.props.on === false });
          break;
        case 'overload':
          if (s) resetTrip(s, id);
          break;
      }
      if (s && running) setTimeout(() => doStep(0), 0);
      else setTick((x) => x + 1);
    },
    [running, doStep],
  );

  const onAction = (id: string, a: 'toggle' | 'reset' | 'test' | 'repair') => {
    const s = simRef.current;
    if (a === 'toggle') onCtl(id, 'down');
    if (a === 'repair' && s) {
      repair(s, id);
      burnt.current.delete(id);
      if (running) doStep(0);
      else setTick((x) => x + 1);
    }
    if (a === 'reset' && s) {
      resetTrip(s, id);
      setTick((x) => x + 1);
    }
    if (a === 'test') {
      if (!s) return showToast('เริ่ม Simulate ก่อนเพื่อทดสอบ RCBO');
      forceTrip(s, id, 'กดปุ่ม TEST');
      doStep(0);
    }
  };

  // ─────────────── File ───────────────
  const loadDesign = (d: Design) => {
    stop();
    update(() => d);
    setSel({ comps: [], wire: null });
    setTimeout(() => fit(d), 0);
  };

  const fit = (d = designRef.current) => {
    if (!d.comps.length) return setView({ x: 40, y: 30, k: 1 });
    const el = document.querySelector('.canvas') as SVGSVGElement | null;
    const r = el?.getBoundingClientRect();
    if (!r) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const c of d.comps) {
      const df = DEF_MAP[c.type];
      x0 = Math.min(x0, c.x);
      y0 = Math.min(y0, c.y);
      x1 = Math.max(x1, c.x + df.w);
      y1 = Math.max(y1, c.y + df.h);
    }
    const k = Math.min(1.4, Math.max(0.2, Math.min((r.width - 60) / (x1 - x0 + 40), (r.height - 60) / (y1 - y0 + 40))));
    setView({ k, x: (r.width - (x1 - x0) * k) / 2 - x0 * k, y: (r.height - (y1 - y0) * k) / 2 - y0 * k });
  };

  const showIssue = (issue: Issue) => {
    setCheckOpen(false);
    setSel(issue.wire ? { comps: [], wire: issue.wire } : { comps: issue.comps, wire: null });
    const c = designRef.current.comps.find((x) => x.id === issue.comps[0]);
    const el = document.querySelector('.canvas') as SVGSVGElement | null;
    const r = el?.getBoundingClientRect();
    if (!c || !r) return;
    const df = DEF_MAP[c.type];
    const k = Math.max(view.k, 0.8);
    setView({ k, x: r.width / 2 - (c.x + df.w / 2) * k, y: r.height / 2 - (c.y + df.h / 2) * k });
  };

  useEffect(() => {
    const t = setTimeout(() => fit(), 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveFile = () => {
    const blob = new Blob([JSON.stringify(designRef.current, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${designRef.current.name.replace(/[^\w\u0E00-\u0E7F-]+/g, '_')}.wirelab.json`;
    a.click();
  };
  const openFile = (f: File) => {
    f.text().then((t) => {
      try {
        const d = JSON.parse(t) as Design;
        if (!Array.isArray(d.comps) || !Array.isArray(d.wires)) throw new Error('bad');
        loadDesign({ ...d, comps: d.comps.filter((c) => DEF_MAP[c.type]) });
        showToast('📂 เปิดไฟล์แล้ว');
      } catch {
        showToast('⛔ ไฟล์ไม่ถูกต้อง');
      }
    });
  };
  const sim = simRef.current;
  const alarmCount = sim ? Object.keys(sim.activeAlarms).length : 0;

  const simple = TEMPLATES.filter((t) => t.group === 'simple');
  const plant = TEMPLATES.filter((t) => t.group === 'plant');
  const full = TEMPLATES.filter((t) => t.group === 'full');
  const isLocked = (id: string) => !unlocked && LOCKED_GROUPS.includes(TEMPLATES.find((x) => x.id === id)?.group ?? '');
  const presetLocked = isLocked(preset);
  const loadPreset = () => {
    const t = TEMPLATES.find((x) => x.id === preset);
    if (!t) return;
    if (presetLocked) {
      setLogin({ user: '', pw: '', err: '', busy: false });
      return;
    }
    loadDesign(t.build());
  };
  const submitLogin = async () => {
    if (!login || login.busy) return;
    setLogin({ ...login, busy: true, err: '' });
    const ok = await verifyLogin(login.user, login.pw);
    if (!ok) {
      setLogin({ ...login, busy: false, err: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
      return;
    }
    setUnlocked(true);
    setLogin(null);
    const t = TEMPLATES.find((x) => x.id === preset);
    if (t) loadDesign(t.build());
    showToast('🔓 ปลดล็อก template งานโรงงานและระบบเต็มแล้ว');
  };
  const presetOption = (t: (typeof TEMPLATES)[number]) => (
    <option key={t.id} value={t.id} className={isLocked(t.id) ? 'opt-locked' : undefined}>
      {isLocked(t.id) ? `🔒 ${t.name}` : t.name}
    </option>
  );

  return (
    <div className="app">
      <header className="toolbar">
        <div className="brand">
          <div className="logo-t">Wire<span>Lab</span></div>
          <div className="logo-s">Wiring & Automation Workspace</div>
        </div>
        <div className="grow" />
        <button className="btn" onClick={saveFile}>Export JSON</button>
        <button className="btn" onClick={() => fileRef.current?.click()}>Import</button>
        <button className="btn" onClick={() => setHelp(true)}>คู่มือ</button>
        {!running ? (
          <button className="btn run" onClick={start}>▶ Run simulation</button>
        ) : (
          <button className="btn pause" onClick={pause}>⏸ Pause</button>
        )}
        <button className="btn" onClick={stop} disabled={!sim} title="หยุดและรีเซ็ต">■</button>
        <input ref={fileRef} type="file" accept=".json" hidden onChange={(e) => e.target.files?.[0] && openFile(e.target.files[0])} />
      </header>
      <div className="main">
        <Palette brand={brand} setBrand={setBrand} onAdd={addAtCenter} />
        <div className="center">
          <div className="stage-bar">
            <select className="input" value={symbol ? 'schematic' : 'panel'} onChange={(e) => setSymbol(e.target.value === 'schematic')} title="รูปแบบแสดงผล">
              <option value="panel">Panel plan</option>
              <option value="schematic">Symbols</option>
            </select>
            <select className={`input preset ${presetLocked ? 'locked' : ''}`} value={preset} onChange={(e) => setPreset(e.target.value)} title="วงจรตัวอย่าง">
              <optgroup label="วงจรง่าย">{simple.map(presetOption)}</optgroup>
              <optgroup label={unlocked ? 'งานโรงงาน' : 'งานโรงงาน 🔒'}>{plant.map(presetOption)}</optgroup>
              <optgroup label={unlocked ? 'ระบบเต็ม' : 'ระบบเต็ม 🔒'}>{full.map(presetOption)}</optgroup>
            </select>
            <button className={`btn ${presetLocked ? 'locked' : ''}`} onClick={loadPreset} title={presetLocked ? 'ต้องเข้าสู่ระบบก่อนโหลด template นี้' : 'โหลดวงจรตัวอย่าง'}>
              {presetLocked ? '🔒 โหลด' : 'โหลด'}
            </button>
            <button className="btn" title="Undo (Ctrl+Z)" onClick={undo}>↶</button>
            <button className="btn" title="Redo (Ctrl+Y)" onClick={redo}>↷</button>
            <button className="btn" title="ลบที่เลือก" onClick={deleteSel} disabled={!sel.wire && !sel.comps.length}>ลบ</button>
            <button className="btn" onClick={() => setView({ ...view, k: Math.max(0.15, view.k / 1.2) })}>−</button>
            <span className="zoom mono">{Math.round(view.k * 100)}%</span>
            <button className="btn" onClick={() => setView({ ...view, k: Math.min(3, view.k * 1.2) })}>+</button>
            <button className="btn" title="พอดีจอ" onClick={() => fit()}>⤢</button>
            <select className="input speed" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} title="ความเร็วจำลอง">
              {[0.5, 1, 2, 5, 10].map((s) => (
                <option key={s} value={s}>{s}×</option>
              ))}
            </select>
            <button className={`btn ${bottomOpen ? 'on' : ''}`} onClick={() => setBottomOpen(!bottomOpen)}>▣ Live display</button>
            <button className={`btn check-btn ${critCount ? 'bad' : ''}`} onClick={() => setCheckOpen(true)} title="ตรวจหาจุดต่อผิดก่อนจ่ายไฟ">
              ตรวจสอบการต่อไฟ{critCount > 0 && <span className="badge">{critCount}</span>}
            </button>
            <button className="btn" onClick={() => setDrawingOpen(true)}>Export แบบไฟฟ้า</button>
          </div>
          <Canvas
            design={design}
            sim={sim}
            view={view}
            setView={setView}
            symbol={symbol}
            sel={sel}
            setSel={setSel}
            hist={hist.current}
            tick={tick}
            onMove={onMove}
            onAddWire={onAddWire}
            onDropType={addComp}
            onCtl={onCtl}
          />
          {!design.comps.length && (
            <div className="canvas-empty">
              <h2>แปลนว่าง</h2>
              <p>ลากอุปกรณ์จากคลังด้านซ้าย หรือเลือกวงจรตัวอย่างแล้วกด <b>โหลด</b></p>
            </div>
          )}
          <BottomPanel
            design={design}
            sim={sim}
            hist={hist.current}
            tick={tick}
            open={bottomOpen}
            setOpen={setBottomOpen}
            onComp={(id, patch) => update((d) => ({ ...d, comps: d.comps.map((c) => (c.id === id ? { ...c, ...patch } : c)) }), false)}
            onSelect={(id) => setSel({ comps: [id], wire: null })}
            onClearAlarms={() => {
              if (simRef.current) simRef.current.alarms = simRef.current.alarms.filter((a) => a.active);
              setTick((x) => x + 1);
            }}
          />
        </div>
        <Inspector
          design={design}
          sel={sel}
          sim={sim}
          onComp={(id, patch, history) => update((d) => ({ ...d, comps: d.comps.map((c) => (c.id === id ? { ...c, ...patch } : c)) }), !!history)}
          onWire={(id, patch) => update((d) => ({ ...d, wires: d.wires.map((w) => (w.id === id ? { ...w, ...patch } : w)) }))}
          onDelete={deleteSel}
          onAction={onAction}
        />
      </div>
      <footer className="statusbar">
        <span className={running ? 'on' : ''}>{running ? '● SIMULATION RUNNING' : sim ? '● PAUSED' : '● EDIT MODE'}</span>
        <span>{design.comps.length} devices · {design.wires.length} wires</span>
        <span>{alarmCount ? `${alarmCount} alarm` : 'ลากจากขั้วไปขั้วเพื่อเดินสาย · ไฟสีเขียว = มีไฟ · สีม่วง = ข้อมูล'}</span>
        <div className="grow" />
        <span className="mono">{sim ? sim.t.toFixed(1) : '0.0'} s</span>
      </footer>
      {drawingOpen && <DrawingDialog design={design} onClose={() => setDrawingOpen(false)} />}
      {checkOpen && <CheckDialog design={design} onClose={() => setCheckOpen(false)} onShow={showIssue} />}
      {help && (
        <div className="help-dialog" onClick={() => setHelp(false)}>
          <div className="help-card" onClick={(e) => e.stopPropagation()}>
            <h2>ต่อวงจรและทดลองการทำงาน</h2>
            <ol>
              <li>เลือกวงจรตัวอย่างแล้วกด “โหลด” หรือเลือก Empty plan</li>
              <li>ลากอุปกรณ์จากด้านซ้ายลงแปลน แล้วลากตัวอุปกรณ์เพื่อย้าย</li>
              <li>ลากจากขั้วหนึ่งไปอีกขั้วเพื่อเดินสาย สีของสายบอกชนิดสัญญาณ</li>
              <li>คลิกอุปกรณ์เพื่อเปลี่ยนชื่อ แบรนด์ และค่าเซนเซอร์ทางด้านขวา</li>
              <li>ถ้าไม่รู้จะต่อกับอะไร ดูหัวข้อ “ควรต่อกับอะไร” ทางขวา หรือชี้ที่ขั้วบนแปลน</li>
              <li>กด “ตรวจสอบการต่อไฟ” ก่อน Run เพื่อหาจุดต่อผิด เช่น เอาไฟ 230V เข้าเซนเซอร์ 24V — ถ้าจ่ายไฟจริงอุปกรณ์จะพังจนกว่าจะกดเปลี่ยนใหม่</li>
              <li>กด Run แล้วกดสวิตช์หรือเบรกเกอร์บนแปลน ดูผลที่โหลดและจอ</li>
              <li>Live display เปิดจอ HMI, กราฟ, Alarm และตารางไฟฟ้า</li>
              <li>Export JSON เก็บวงจร · Import เปิดกลับมา งานล่าสุดถูกจำในเบราว์เซอร์</li>
            </ol>
            <p>จำลองไฟ DC/AC, เบรกเกอร์, รีเลย์, เซนเซอร์ 4-20mA และเครือข่ายไปจนถึง HMI ไม่ได้แทนการคำนวณทางไฟฟ้าแบบละเอียดหรืออุปกรณ์จริง</p>
            <button className="btn run" onClick={() => setHelp(false)}>เริ่มทดลอง</button>
          </div>
        </div>
      )}
      {login && (
        <div className="help-dialog" onClick={() => !login.busy && setLogin(null)}>
          <form
            className="help-card login-card"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              submitLogin();
            }}
          >
            <h2>🔒 Template นี้ถูกล็อก</h2>
            <p className="muted">template งานโรงงานและระบบเต็ม ต้องเข้าสู่ระบบก่อนโหลด</p>
            <label className="field">
              <span>User</span>
              <input className="input" autoFocus autoComplete="username" value={login.user} onChange={(e) => setLogin({ ...login, user: e.target.value, err: '' })} />
            </label>
            <label className="field">
              <span>Password</span>
              <input className="input" type="password" autoComplete="current-password" value={login.pw} onChange={(e) => setLogin({ ...login, pw: e.target.value, err: '' })} />
            </label>
            {login.err && <p className="login-err">{login.err}</p>}
            <div className="btns">
              <button type="button" className="btn" disabled={login.busy} onClick={() => setLogin(null)}>ยกเลิก</button>
              <button type="submit" className="btn run" disabled={login.busy || !login.user || !login.pw}>{login.busy ? 'กำลังตรวจสอบ…' : 'เข้าสู่ระบบและโหลด'}</button>
            </div>
          </form>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
