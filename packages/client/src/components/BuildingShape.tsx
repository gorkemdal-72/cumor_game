// Bina tasarımlarının SVG çizimi: oyun tahtası (HexBoard) ve mağaza önizlemesi ortak kullanır.
// Orijin (0,0) binanın oturduğu nokta; yol yatay ve merkezlidir.
export function BuildingShape({ type, design, color }: { type: 'settlement' | 'city' | 'road'; design: string; color: string }) {
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
