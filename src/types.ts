export type PortKind = 'L' | 'N' | 'PE' | 'P3' | 'MV' | 'DC+' | 'DC-' | 'X' | 'AI' | '485' | 'ETH' | 'HDMI';
export type Side = 'l' | 'r' | 't' | 'b';

export interface PortDef {
  id: string;
  label: string;
  kind: PortKind;
  side: Side;
  x: number;
  y: number;
}

export type PropType = 'number' | 'select' | 'bool' | 'text' | 'color';

export interface PropDef {
  key: string;
  label: string;
  type: PropType;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export type Behavior =
  | 'grid1' | 'grid3' | 'gridmv' | 'gen' | 'battery' | 'psu' | 'ups' | 'ats'
  | 'swg' | 'tr' | 'mdb'
  | 'breaker' | 'rcbo' | 'fuse' | 'passive'
  | 'switch' | 'pb' | 'estop' | 'selector'
  | 'relay' | 'contactor' | 'overload' | 'timer' | 'tempctl' | 'vfd'
  | 'sensor_a' | 'sensor_d' | 'contact_sw' | 'sensor_485' | 'sensor_lora' | 'emeter'
  | 'plc' | 'rio' | 'edge'
  | 'eswitch' | 'router' | 'gateway' | 'lora_gw'
  | 'load_ac' | 'motor3' | 'load_dc' | 'tower'
  | 'hmi' | 'scada' | 'monitor' | 'pmeter' | 'led' | 'cloud'
  | 'tb';

export interface Brand {
  brand: string;
  model: string;
}

export interface CompDef {
  type: string;
  category: string;
  name: string;
  short: string;
  icon: string;
  symbol: string;
  beh: Behavior;
  w: number;
  h: number;
  ports: PortDef[];
  brands: Brand[];
  props: Record<string, any>;
  propDefs: PropDef[];
  links: Record<string, [string, string][]>;
  desc: string;
  tag?: string;
}

export interface Comp {
  id: string;
  type: string;
  x: number;
  y: number;
  label: string;
  brand: string;
  model: string;
  props: Record<string, any>;
}

export interface Endpoint {
  c: string;
  p: string;
}

export interface Wire {
  id: string;
  a: Endpoint;
  b: Endpoint;
  color?: string;
}

export interface Design {
  name: string;
  comps: Comp[];
  wires: Wire[];
}

export interface View {
  x: number;
  y: number;
  k: number;
}
