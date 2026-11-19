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
// Kadın karakterler: kirpik, yanak, dudak + omuza dökülen uzun saç
const faceF = (
  <>
    {face}
    <path d="M26.6 29.6 L25.4 28.6 M37.4 29.6 L38.6 28.6" stroke={INK} strokeWidth={1} strokeLinecap="round" />
    <circle cx={25.8} cy={34.5} r={1.7} fill="#fb7185" opacity={0.55} />
    <circle cx={38.2} cy={34.5} r={1.7} fill="#fb7185" opacity={0.55} />
    <path d="M30 36.6 Q32 38.2 34 36.6" fill="none" stroke="#be123c" strokeWidth={1.4} strokeLinecap="round" />
  </>
);
const longHair = (fill: string) => <path d="M19 32 Q17 16 32 16 Q47 16 45 32 L47 52 Q32 56 17 52 Z" fill={fill} stroke={INK} strokeWidth={1.2} />;
const fringe = (fill: string) => <path d="M21 30 Q20 18 32 18 Q44 18 43 30 Q40 22 33 23 Q26 23 21 30 Z" fill={fill} stroke={INK} strokeWidth={1.1} />;

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

  avatar_f_default: (
    <>
      {longHair('#78350f')}
      {body('#4d7c0f', <path d="M25 45 Q32 51 39 45" fill="none" stroke="#fef3c7" strokeWidth={2} />)}
      {faceF}
      {fringe('#78350f')}
    </>
  ),
  avatar_f_modern: (
    <>
      <path d="M42 24 Q56 28 51 46 Q47 37 42 32 Z" fill="#292524" stroke={INK} strokeWidth={1.1} />
      {body('#1e3a8a', <>
        <path d="M26 44 L32 53 L38 44 Z" fill="white" />
        <circle cx={32} cy={57} r={1} fill="white" /><circle cx={32} cy={61} r={1} fill="white" />
      </>)}
      {faceF}
      <path d="M20 26 Q20 14 32 14 Q44 14 44 26 Z" fill="#facc15" stroke={INK} strokeWidth={1.2} />
      <rect x={17} y={25} width={30} height={3.5} rx={1.5} fill="#eab308" stroke={INK} strokeWidth={1.2} />
    </>
  ),
  avatar_f_scifi: (
    <>
      {body('#e5e7eb', <rect x={26} y={50} width={12} height={8} rx={1.5} fill="#f472b6" stroke={INK} strokeWidth={1} />)}
      <circle cx={32} cy={29} r={15} fill="#f8fafc" stroke={INK} strokeWidth={1.5} />
      <ellipse cx={32} cy={30} rx={10.5} ry={8.5} fill="#0c4a6e" stroke={INK} strokeWidth={1.2} />
      {/* vizörün ardında yüz görünür */}
      <ellipse cx={32} cy={29.5} rx={8.5} ry={7.5} fill="#7c2d12" />
      <circle cx={32} cy={32} r={5.8} fill={SKIN} />
      <circle cx={29.8} cy={31.5} r={0.9} fill={INK} /><circle cx={34.2} cy={31.5} r={0.9} fill={INK} />
      <path d="M30.8 34.3 Q32 35.3 33.2 34.3" fill="none" stroke="#be123c" strokeWidth={1} strokeLinecap="round" />
      <ellipse cx={32} cy={30} rx={10.5} ry={8.5} fill="#38bdf8" opacity={0.25} />
      <path d="M25 27 Q28 23 33 23" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" opacity={0.8} />
    </>
  ),
  avatar_f_winter: (
    <>
      {body('#9f1239', <line x1={32} y1={45} x2={32} y2={66} stroke="#f8fafc" strokeWidth={1.5} />)}
      <path d="M18 29 h4 v22 h-4 Z M42 29 h4 v22 h-4 Z" fill="#ca8a04" stroke={INK} strokeWidth={1} />
      <path d="M18 35 h4 M18 41 h4 M18 47 h4 M42 35 h4 M42 41 h4 M42 47 h4" stroke="#713f12" strokeWidth={1} />
      {faceF}
      <path d="M20 27 Q20 13 32 13 Q44 13 44 27 Z" fill="#e11d48" stroke={INK} strokeWidth={1.2} />
      <rect x={19} y={23.5} width={26} height={5} rx={2} fill="#f8fafc" stroke={INK} strokeWidth={1} />
      <circle cx={32} cy={12} r={3.6} fill="#f8fafc" stroke={INK} strokeWidth={1} />
    </>
  ),
  avatar_f_medieval: (
    <>
      {/* hennin'in tülü arkadan omuza iner */}
      <path d="M47 1 Q60 22 53 50 L49 50 Q53 24 44 7 Z" fill="#f8fafc" opacity={0.85} stroke={INK} strokeWidth={0.8} />
      {longHair('#facc15')}
      {body('#7e22ce', <>
        <path d="M24 46 Q32 52 40 46" fill="none" stroke={GOLD} strokeWidth={2} />
        <circle cx={32} cy={52} r={1.8} fill="#f43f5e" stroke={GOLD} strokeWidth={0.8} />
      </>)}
      {faceF}
      {fringe('#facc15')}
      <path d="M23 22 Q32 17 41 22 L47 1 Z" fill="#f472b6" stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
      <path d="M22.5 22.5 Q32 17.5 41.5 22.5" fill="none" stroke={GOLD} strokeWidth={2.2} />
    </>
  ),
  avatar_f_ottoman: (
    <>
      <path d="M39 10 Q53 16 51 48 L46 48 Q46 24 37 14 Z" fill="#f8fafc" opacity={0.85} stroke={INK} strokeWidth={0.8} />
      {longHair('#292524')}
      {body('#166534', <path d="M26 45 L32 55 L38 45 M32 55 V66" fill="none" stroke={GOLD} strokeWidth={1.6} />)}
      {faceF}
      {fringe('#292524')}
      <path d="M23 22 L25 8 Q32 5 39 8 L41 22 Z" fill="#b91c1c" stroke={INK} strokeWidth={1.2} />
      <rect x={22} y={18.5} width={20} height={4.5} rx={1} fill={GOLD} stroke={INK} strokeWidth={1} />
      <circle cx={32} cy={13} r={2.4} fill="#10b981" stroke={GOLD} strokeWidth={1} />
    </>
  ),
  avatar_f_asian: (
    <>
      {longHair('#111827')}
      {body('#831843', <path d="M18 52 H46 M15 58 H49" stroke={GOLD} strokeWidth={1.2} />)}
      <circle cx={32} cy={13} r={6} fill="#111827" stroke={INK} strokeWidth={1} />
      <path d="M22 6 L42 18" stroke={GOLD} strokeWidth={1.6} strokeLinecap="round" />
      <circle cx={22} cy={6} r={1.8} fill="#f43f5e" />
      {faceF}
      {fringe('#111827')}
      <rect x={20} y={22.5} width={24} height={3.5} rx={1} fill="#f8fafc" stroke={INK} strokeWidth={0.8} />
      <circle cx={32} cy={24.25} r={1.6} fill="#dc2626" />
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
