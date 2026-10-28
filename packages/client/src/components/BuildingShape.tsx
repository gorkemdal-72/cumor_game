import type { ReactNode } from 'react';

type Kind = 'settlement' | 'city' | 'road';

const GOLD = '#d4af37';
const STONE = '#9ca3af';
const LACQUER = '#7f1d1d';
const SNOW = '#f8fafc';

// Satın alınabilir temalar. Gövde her zaman oyuncu rengiyle boyanır (kimin binası olduğu karışmasın).
const THEMES: Record<string, Record<Kind, (color: string) => ReactNode>> = {
  // OSMANLI: ahşap köşk köy, kubbe + minareli şehir, kaldırım taşı yol
  ottoman: {
    settlement: c => (
      <>
        <rect x={-9} y={-10} width={18} height={10} fill={c} stroke="#f5deb3" strokeWidth={1.5} />
        <rect x={-4} y={-8} width={8} height={4} fill="#f5deb3" />
        <path d="M -13 -10 L 0 -18 L 13 -10 Z" fill="#8b5a2b" stroke="white" strokeWidth={1.5} />
      </>
    ),
    city: c => (
      <>
        <rect x={-12} y={-8} width={24} height={8} fill={c} stroke="white" strokeWidth={1.5} />
        <path d="M -9 -8 A 9 9 0 0 1 9 -8 Z" fill={c} stroke="white" strokeWidth={1.5} />
        <line x1={0} y1={-17} x2={0} y2={-21} stroke={GOLD} strokeWidth={1.5} />
        <circle cx={0} cy={-21.5} r={1.3} fill={GOLD} />
        <rect x={13} y={-24} width={3.5} height={24} fill={c} stroke="white" strokeWidth={1} />
        <path d="M 12.5 -24 L 14.75 -30 L 17 -24 Z" fill={GOLD} />
      </>
    ),
    road: c => (
      <>
        <rect x={-22} y={-4} width={44} height={8} fill={c} stroke={GOLD} strokeWidth={1.5} rx={2} />
        <line x1={-19} y1={0} x2={19} y2={0} stroke="#f5deb3" strokeWidth={1.5} strokeDasharray="4 3" />
      </>
    ),
  },
  // ORTAÇAĞ: taş kule köy, surlu kale şehir, taş döşeli yol
  medieval: {
    settlement: c => (
      <>
        <rect x={-7} y={-15} width={14} height={15} fill={c} stroke={STONE} strokeWidth={2} />
        <rect x={-7} y={-19} width={3.5} height={4} fill={c} stroke={STONE} strokeWidth={1} />
        <rect x={-1.75} y={-19} width={3.5} height={4} fill={c} stroke={STONE} strokeWidth={1} />
        <rect x={3.5} y={-19} width={3.5} height={4} fill={c} stroke={STONE} strokeWidth={1} />
        <rect x={-1.5} y={-10} width={3} height={4} fill="#1f2937" />
      </>
    ),
    city: c => (
      <>
        <rect x={-15} y={-10} width={30} height={10} fill={c} stroke={STONE} strokeWidth={2} />
        <rect x={-16} y={-20} width={8} height={20} fill={c} stroke={STONE} strokeWidth={2} />
        <rect x={8} y={-20} width={8} height={20} fill={c} stroke={STONE} strokeWidth={2} />
        <path d="M -16 -20 v -3 h 2.5 v 3 h 3 v -3 h 2.5 v 3 M 8 -20 v -3 h 2.5 v 3 h 3 v -3 h 2.5 v 3" fill="none" stroke={STONE} strokeWidth={1.5} />
        <path d="M -3.5 0 L -3.5 -4 A 3.5 3.5 0 0 1 3.5 -4 L 3.5 0 Z" fill="#1f2937" />
      </>
    ),
    road: c => (
      <>
        <rect x={-22} y={-4} width={44} height={8} fill={c} stroke="#4b5563" strokeWidth={2} rx={1} />
        <line x1={-20} y1={0} x2={20} y2={0} stroke={STONE} strokeWidth={2} strokeDasharray="3 2" opacity={0.8} />
      </>
    ),
  },
  // UZAK DOĞU: kıvrık çatılı ev, iki katlı pagoda, kırmızı ahşap yol
  asian: {
    settlement: c => (
      <>
        <rect x={-7} y={-8} width={14} height={8} fill={c} stroke="white" strokeWidth={1.5} />
        <path d="M -14 -8 Q -10 -9 -7 -15 L 7 -15 Q 10 -9 14 -8 Z" fill={LACQUER} stroke="#fbbf24" strokeWidth={1} />
      </>
    ),
    city: c => (
      <>
        <rect x={-9} y={-7} width={18} height={7} fill={c} stroke="white" strokeWidth={1.5} />
        <path d="M -16 -7 Q -12 -8 -9 -13 L 9 -13 Q 12 -8 16 -7 Z" fill={LACQUER} stroke="#fbbf24" strokeWidth={1} />
        <rect x={-6} y={-19} width={12} height={6} fill={c} stroke="white" strokeWidth={1.5} />
        <path d="M -12 -19 Q -9 -20 -6 -24 L 6 -24 Q 9 -20 12 -19 Z" fill={LACQUER} stroke="#fbbf24" strokeWidth={1} />
        <line x1={0} y1={-24} x2={0} y2={-29} stroke="#fbbf24" strokeWidth={1.5} />
      </>
    ),
    road: c => (
      <>
        <rect x={-22} y={-4} width={44} height={8} fill={c} stroke={LACQUER} strokeWidth={2} rx={4} />
        <line x1={-20} y1={-1.5} x2={20} y2={-1.5} stroke="#fbbf24" strokeWidth={1} opacity={0.7} />
      </>
    ),
  },
  // KIŞ: karlı çatılar, buzdan yol
  winter: {
    settlement: c => (
      <>
        <path d="M -10 0 L -10 -10 L 0 -18 L 10 -10 L 10 0 Z" fill={c} stroke="white" strokeWidth={2} />
        <path d="M -12 -9.5 L 0 -20 L 12 -9.5 L 8 -8.5 L 0 -15 L -8 -8.5 Z" fill={SNOW} />
        <path d="M -6 -8.5 l 1 3 l 1 -3 M 4 -8.5 l 1 2.5 l 1 -2.5" fill="#bae6fd" />
      </>
    ),
    city: c => (
      <>
        <rect x={-12} y={-8} width={24} height={16} fill={c} stroke="white" strokeWidth={2} rx={2} />
        <path d="M -12 -8 L 0 -18 L 12 -8" fill={c} stroke="white" strokeWidth={2} />
        <path d="M -14 -7.5 L 0 -20 L 14 -7.5 L 10 -7 L 0 -15 L -10 -7 Z" fill={SNOW} />
        <rect x={-4} y={-22} width={8} height={6} fill={c} stroke="white" strokeWidth={1} />
        <rect x={-5} y={-24} width={10} height={2.5} rx={1.2} fill={SNOW} />
      </>
    ),
    road: c => (
      <>
        <rect x={-22} y={-4} width={44} height={8} fill={c} stroke="#bae6fd" strokeWidth={2} rx={3} />
        <rect x={-19} y={-2.5} width={38} height={2.5} rx={1.2} fill="#e0f2fe" opacity={0.6} />
      </>
    ),
  },
};

// Bina tasarımlarının SVG çizimi: oyun tahtası (HexBoard) ve mağaza önizlemesi ortak kullanır.
// Orijin (0,0) binanın oturduğu nokta; yol yatay ve merkezlidir.
export function BuildingShape({ type, design, color }: { type: Kind; design: string; color: string }) {
  const themed = THEMES[design]?.[type];
  if (themed) return <>{themed(color)}</>;

  if (type === 'settlement') {
    if (design === 'modern') {
      return (
        <>
          <rect x={-8} y={-14} width={16} height={14} fill={color} stroke="white" strokeWidth={1.5} rx={1} />
          <rect x={-4} y={-10} width={3} height={4} fill="cyan" opacity={0.8} />
          <rect x={1} y={-10} width={3} height={4} fill="cyan" opacity={0.8} />
        </>
      );
    }
    if (design === 'scifi') {
      return (
        <>
          <path d="M -12 0 A 12 12 0 0 1 12 0 Z" fill={color} stroke="cyan" strokeWidth={1.5} />
          <circle cx={0} cy={-6} r={2} fill="white" />
          <circle cx={-6} cy={-3} r={1.5} fill="cyan" />
          <circle cx={6} cy={-3} r={1.5} fill="cyan" />
        </>
      );
    }
    return <path d="M -10 0 L -10 -10 L 0 -18 L 10 -10 L 10 0 Z" fill={color} stroke="white" strokeWidth={2} />;
  }

  if (type === 'city') {
    if (design === 'modern') {
      return (
        <>
          <rect x={-14} y={-12} width={28} height={12} fill={color} stroke="white" strokeWidth={1.5} rx={1} />
          <rect x={-6} y={-26} width={12} height={14} fill={color} stroke="white" strokeWidth={1.5} rx={1} />
          {/* Camlar */}
          <rect x={-2} y={-22} width={4} height={4} fill="cyan" opacity={0.8} />
          <rect x={-2} y={-16} width={4} height={4} fill="cyan" opacity={0.8} />
          <rect x={-10} y={-8} width={4} height={4} fill="cyan" opacity={0.8} />
          <rect x={6} y={-8} width={4} height={4} fill="cyan" opacity={0.8} />
        </>
      );
    }
    if (design === 'scifi') {
      return (
        <>
          <path d="M -16 0 A 16 16 0 0 1 16 0 Z" fill={color} stroke="cyan" strokeWidth={2} />
          <circle cx={0} cy={-8} r={4} fill="white" />
          <path d="M -8 -4 L -12 -12 L -8 -16" stroke="cyan" strokeWidth={1.5} fill="none" />
          <path d="M 8 -4 L 12 -12 L 8 -16" stroke="cyan" strokeWidth={1.5} fill="none" />
        </>
      );
    }
    return (
      <>
        <rect x={-12} y={-8} width={24} height={16} fill={color} stroke="white" strokeWidth={2} rx={2} />
        <path d="M -12 -8 L 0 -18 L 12 -8" fill={color} stroke="white" strokeWidth={2} />
        <rect x={-4} y={-22} width={8} height={6} fill={color} stroke="white" strokeWidth={1} />
      </>
    );
  }

  // YOL
  if (design === 'modern') return <rect x={-22} y={-3} width={44} height={6} fill={color} stroke="#333" strokeWidth={1} rx={0} />;
  if (design === 'scifi') {
    return (
      <>
        <rect x={-22} y={-4} width={44} height={8} fill={color} stroke="cyan" strokeWidth={1} rx={4} />
        <rect x={-15} y={-1} width={30} height={2} fill="cyan" opacity={0.6} />
      </>
    );
  }
  return <rect x={-22} y={-4} width={44} height={8} fill={color} stroke="white" strokeWidth={1.5} rx={2} />;
}
