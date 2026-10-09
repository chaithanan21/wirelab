import React from 'react';

const P: Record<string, React.ReactNode> = {
  grid: (
    <>
      <path d="M12 2 7 22M12 2l5 20M8.5 15h7M9.5 10h5M5 6h14" />
    </>
  ),
  gen: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M8 12c1.3-2.5 2.7-2.5 4 0s2.7 2.5 4 0" />
    </>
  ),
  battery: (
    <>
      <rect x="3" y="7" width="16" height="10" rx="2" />
      <path d="M21 10v4M7 12h4M9 10v4" />
    </>
  ),
  psu: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 20 21 4M6 9c.8-1.2 1.7-1.2 2.5 0s1.7 1.2 2.5 0M13 15h5M13 17h5" />
    </>
  ),
  ats: (
    <>
      <path d="M4 6h5l6 6h5M4 18h5" />
      <circle cx="9" cy="18" r="1.4" />
    </>
  ),
  breaker: (
    <>
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <rect x="9.5" y="7" width="5" height="8" rx="1" />
    </>
  ),
  fuse: (
    <>
      <rect x="4" y="8" width="16" height="8" rx="1.5" />
      <path d="M2 12h20" />
    </>
  ),
  surge: <path d="M13 2 5 13h6l-1 9 9-12h-6z" />,
  switch: (
    <>
      <path d="M3 16h5l9-7M17 16h4" />
      <circle cx="8" cy="16" r="1.3" />
      <circle cx="17" cy="16" r="1.3" />
    </>
  ),
  pb: (
    <>
      <circle cx="12" cy="13" r="7" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  estop: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 8l8 8M16 8l-8 8" />
    </>
  ),
  selector: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 12 7 7" />
    </>
  ),
  relay: (
    <>
      <rect x="3" y="8" width="7" height="8" />
      <path d="M10 12h3M14 16l5-5M19 16h2M12 4v4" strokeDasharray="0" />
    </>
  ),
  thermal: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="1.5" />
      <path d="M8 15v-4h4v-2h4" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 13V9M12 13l3 2M9 3h6" />
    </>
  ),
  thermo: (
    <>
      <path d="M10 4a2 2 0 0 1 4 0v10a4 4 0 1 1-4 0z" />
      <path d="M12 9v7" />
    </>
  ),
  vfd: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 21 21 3M6 9c.8-1.2 1.7-1.2 2.5 0s1.7 1.2 2.5 0M13 16c.8-1.2 1.7-1.2 2.5 0s1.7 1.2 2.5 0" />
    </>
  ),
  sensor: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M8 12h2l1.5-3 2 6 1.5-3h1" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
  limit: (
    <>
      <rect x="5" y="9" width="10" height="11" rx="1" />
      <path d="M10 9V5l6-2" />
      <circle cx="17" cy="3" r="1.5" />
    </>
  ),
  float: (
    <>
      <path d="M3 14c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" />
      <circle cx="12" cy="9" r="3" />
      <path d="M12 6V2" />
    </>
  ),
  wifi: (
    <>
      <path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0" />
      <circle cx="12" cy="19" r="1" />
    </>
  ),
  meter: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 15a5 5 0 0 1 10 0M12 15l3-4" />
    </>
  ),
  plc: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M6 8h2M6 11h2M6 14h2M16 8h2M16 11h2M16 14h2M10 8h4v8h-4z" />
    </>
  ),
  chip: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
      <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
    </>
  ),
  network: (
    <>
      <rect x="2" y="7" width="20" height="10" rx="1.5" />
      <path d="M6 13v-2M9 13v-2M12 13v-2M15 13v-2M18 13v-2" />
    </>
  ),
  router: (
    <>
      <rect x="3" y="12" width="18" height="7" rx="1.5" />
      <path d="M7 12V5M17 12V5M7 15.5h1M10 15.5h1" />
    </>
  ),
  gateway: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="M7 10h10l-3-3M17 14H7l3 3" />
    </>
  ),
  lamp: (
    <>
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />
    </>
  ),
  fan: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 12c0-4 1-6 3-6s1 5-3 6zM12 12c4 0 6 1 6 3s-5 1-6-3zM12 12c0 4-1 6-3 6s-1-5 3-6zM12 12c-4 0-6-1-6-3s5-1 6 3z" />
    </>
  ),
  heater: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="1.5" />
      <path d="M6 12l2-3 2 6 2-6 2 6 2-6 2 3" />
    </>
  ),
  snow: <path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 2 3-2M9 20l3-2 3 2" />,
  socket: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M9.5 9v3M14.5 9v3M10 16h4" />
    </>
  ),
  motor: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 16V8l4 5 4-5v8" />
    </>
  ),
  pump: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3 21 12M12 3 3.5 9" />
      <path d="M8 13l4-4 4 4" />
    </>
  ),
  buzzer: (
    <>
      <path d="M5 16a7 7 0 0 1 14 0z" />
      <path d="M3 16h18M12 4v3M5 7l2 2M19 7l-2 2" />
    </>
  ),
  valve: (
    <>
      <path d="M3 9v8l9-4zM21 9v8l-9-4zM12 13V6M9 6h6" />
    </>
  ),
  tower: (
    <>
      <rect x="8" y="2" width="8" height="5" rx="1" />
      <rect x="8" y="7" width="8" height="5" rx="1" />
      <rect x="8" y="12" width="8" height="5" rx="1" />
      <path d="M12 17v4M8 21h8" />
    </>
  ),
  screen: (
    <>
      <rect x="2" y="4" width="20" height="13" rx="1.5" />
      <path d="M8 21h8M12 17v4M6 13l3-3 3 2 5-5" />
    </>
  ),
  pc: (
    <>
      <rect x="2" y="3" width="15" height="11" rx="1.5" />
      <path d="M6 18h7M9.5 14v4M19 6h3v14h-3z" />
    </>
  ),
  led: (
    <>
      <rect x="2" y="7" width="20" height="10" rx="1.5" />
      <path d="M5 10v4M8 10v4M11 10h2v4M16 10v4h3" />
    </>
  ),
  cloud: <path d="M7 18a5 5 0 0 1-.6-10A6 6 0 0 1 18 8.5 4.5 4.5 0 0 1 17.5 18z" />,
  swg: (
    <>
      <rect x="3" y="2" width="18" height="20" rx="1.5" />
      <path d="M7 8h4M15 8h2M7 16h10M11 8l4 5" />
    </>
  ),
  tr: (
    <>
      <circle cx="9" cy="12" r="5" />
      <circle cx="15" cy="12" r="5" />
    </>
  ),
  mdb: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="1.5" />
      <path d="M6 8h12M8 8v8M12 8v8M16 8v8" />
    </>
  ),
  tb: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="1" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="16" cy="12" r="2" />
      <path d="M10 12h4" />
    </>
  ),
  solar: (
    <>
      <path d="M4 20 7 9h13l-3 11z" />
      <path d="M5.5 14.5h13M12 9l-1.5 11M15.8 9l-1.6 11M8.3 9l-1.5 11" />
      <circle cx="6" cy="4.5" r="2" />
    </>
  ),
  inverter: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 21 21 3M6 8h6M6 10.5h6M13.5 16c.8-1.2 1.7-1.2 2.5 0s1.7 1.2 2.5 0" />
    </>
  ),
  combiner: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M8 4v16M16 4v16" />
      <rect x="6.5" y="9" width="3" height="6" rx="0.5" />
      <rect x="14.5" y="9" width="3" height="6" rx="0.5" />
    </>
  ),
};

export function Icon({ name, size = 20, color = 'currentColor' }: { name: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      {P[name] ?? <rect x="4" y="4" width="16" height="16" rx="2" />}
    </svg>
  );
}

export function IconG({ name, x, y, size = 20, color = 'currentColor' }: { name: string; x: number; y: number; size?: number; color?: string }) {
  const k = size / 24;
  return (
    <g transform={`translate(${x},${y}) scale(${k})`} fill="none" stroke={color} strokeWidth={1.6 / Math.max(k, 0.6)} strokeLinecap="round" strokeLinejoin="round">
      {P[name] ?? <rect x="4" y="4" width="16" height="16" rx="2" />}
    </g>
  );
}
