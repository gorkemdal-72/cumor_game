import type { ReactNode } from 'react';

const SKIN = '#f1c27d';
const INK = '#1e293b';
const GOLD = '#d4af37';

const body = (fill: string, extra?: ReactNode) => (
  <>
    <path d="M10 66 C10 49 19 44 32 44 C45 44 54 49 54 66 Z" fill={fill} stroke={INK} strokeWidth={1.5} />
    {extra}
  </>
);
const face = (
  <>
    <circle cx={32} cy={31} r={11} fill={SKIN} stroke={INK} strokeWidth={1.5} />
    <circle cx={28} cy={31} r={1.3} fill={INK} />
    <circle cx={36} cy={31} r={1.3} fill={INK} />
  </>
);

// Önde karakter, arkada oyuncunun rengi (Avatar bileşeni boyar). Yeni avatar = cosmetics.ts kaydı + burada çizim
const CHARACTERS: Record<string, ReactNode> = {
  default: (
    <>
      {body('#78716c', <path d="M26 45 L32 52 L38 45" fill="none" stroke="#d6d3d1" strokeWidth={1.5} />)}
      {face}
      <path d="M21 29 Q21 18 32 18 Q43 18 43 29 Q38 23 32 23 Q26 23 21 29 Z" fill="#57534e" stroke={INK} strokeWidth={1.2} />
    </>
  ),
  avatar_modern: (
    <>
      {body('#1e3a8a', <>
        <path d="M26 44 L32 54 L38 44 Z" fill="white" />
        <path d="M31 46 L33 46 L34 56 L32 59 L30 56 Z" fill="#dc2626" />
      </>)}
      {face}
      <path d="M20 26 Q20 14 32 14 Q44 14 44 26 Z" fill="#facc15" stroke={INK} strokeWidth={1.2} />
      <rect x={17} y={25} width={30} height={3.5} rx={1.5} fill="#eab308" stroke={INK} strokeWidth={1.2} />
    </>
  ),
  avatar_scifi: (
    <>
      {body('#e5e7eb', <rect x={26} y={50} width={12} height={8} rx={1.5} fill="#94a3b8" stroke={INK} strokeWidth={1} />)}
      <circle cx={32} cy={29} r={15} fill="#f8fafc" stroke={INK} strokeWidth={1.5} />
      <ellipse cx={32} cy={30} rx={10.5} ry={8.5} fill="#0ea5e9" stroke={INK} strokeWidth={1.2} />
      <path d="M25 27 Q28 23 33 23" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" opacity={0.8} />
    </>
  ),
  avatar_winter: (
    <>
      {body('#0f766e', <line x1={32} y1={45} x2={32} y2={66} stroke="#f8fafc" strokeWidth={1.5} />)}
      <circle cx={32} cy={31} r={15.5} fill="#78350f" stroke={INK} strokeWidth={1.5} />
      <circle cx={32} cy={31} r={13} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={2} strokeDasharray="2 2" />
      <circle cx={32} cy={31} r={9.5} fill={SKIN} />
      <circle cx={28.5} cy={31} r={1.3} fill={INK} />
      <circle cx={35.5} cy={31} r={1.3} fill={INK} />
      <circle cx={32} cy={34.5} r={1.4} fill="#f87171" />
    </>
  ),
  avatar_medieval: (
    <>
      {body('#e5e7eb', <path d="M32 47 V64 M24 54 H40" stroke="#dc2626" strokeWidth={3} />)}
      <path d="M32 14 Q38 2 47 6 Q40 8 34 15 Z" fill="#dc2626" stroke={INK} strokeWidth={1} />
      <path d="M20 37 L20 23 Q32 10 44 23 L44 37 Q32 42 20 37 Z" fill="#9ca3af" stroke={INK} strokeWidth={1.5} />
      <rect x={23} y={27} width={18} height={2.6} rx={1} fill={INK} />
      <line x1={32} y1={31} x2={32} y2={39} stroke={INK} strokeWidth={1.2} />
    </>
  ),
  avatar_ottoman: (
    <>
      {body('#b91c1c', <path d="M32 45 V66 M28 50 H36 M28 55 H36" stroke={GOLD} strokeWidth={1.5} />)}
      {/* börkün arkaya sarkan yatırtması */}
      <path d="M39 9 Q53 13 51 38 L46 38 Q46 20 37 13 Z" fill="#f8fafc" stroke={INK} strokeWidth={1.2} />
      {face}
      <path d="M25 36 Q32 32 39 36 Q32 37.5 25 36 Z" fill={INK} />
      <path d="M22 23 L24.5 5 Q32 1 39.5 5 L42 23 Z" fill="#f8fafc" stroke={INK} strokeWidth={1.2} />
      <rect x={21} y={19} width={22} height={5} rx={1} fill={GOLD} stroke={INK} strokeWidth={1} />
      <ellipse cx={32} cy={15} rx={2} ry={4} fill={GOLD} stroke={INK} strokeWidth={0.8} />
    </>
  ),
  avatar_asian: (
    <>
      {body('#7f1d1d', <path d="M18 52 H46 M15 58 H49" stroke={GOLD} strokeWidth={1.2} />)}
      {face}
      <path d="M32 17 L23 3 M32 17 L41 3" stroke={GOLD} strokeWidth={3} strokeLinecap="round" />
      <path d="M19 28 Q19 14 32 14 Q45 14 45 28 Z" fill="#1f2937" stroke={INK} strokeWidth={1.2} />
      <circle cx={32} cy={20} r={2.5} fill={GOLD} />
      <path d="M14 28 Q32 21 50 28 L48 31.5 Q32 25.5 16 31.5 Z" fill="#111827" stroke={INK} strokeWidth={1} />
    </>
  ),
};

export function Avatar({ avatar, color, size = 40, label }: { avatar?: string; color: string; size?: number; label?: string }) {
  return (
    <span className="inline-block shrink-0 rounded-full overflow-hidden ring-1 ring-black/40" style={{ width: size, height: size, backgroundColor: color }}
      role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <circle cx={32} cy={20} r={30} fill="white" opacity={0.18} />
        {CHARACTERS[avatar ?? 'default'] ?? CHARACTERS.default}
      </svg>
    </span>
  );
}
