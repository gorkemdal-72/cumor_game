import { useEffect, useState } from 'react';
import type { Player } from '@cumor/shared';

interface Props {
  vote: { endVotes: string[]; deadline: number };
  players: Player[];
  myId: string;
  onVote: (end: boolean) => void;
}

// Bir oyuncu düşünce bağlı oyunculara çıkan oylama: oyun bekler, çoğunluk "bitir" derse en yüksek puanlı kazanır
export function DisconnectVotePanel({ vote, players, myId, onVote }: Props) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const gone = players.filter(p => p.disconnected);
  const connected = players.filter(p => !p.disconnected);
  const needed = Math.floor(connected.length / 2) + 1; // sunucudaki endVotesNeeded ile aynı
  const iVotedEnd = vote.endVotes.includes(myId);
  const leader = [...players].sort((a, b) => b.victoryPoints - a.victoryPoints)[0];

  const left = Math.max(0, vote.deadline - now);
  const mm = Math.floor(left / 60000);
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');

  if (gone.length === 0 || !connected.some(p => p.id === myId)) return null;

  return (
    <div role="alertdialog" aria-label="Oyuncu düştü oylaması"
      className="absolute top-16 md:top-20 left-1/2 -translate-x-1/2 z-[75] w-[calc(100vw-1.5rem)] max-w-md card !bg-slate-900/95 !border-red-500/60 p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>🔌</span>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-white">
            {gone.map(p => p.name).join(', ')} oyundan düştü
          </h2>
          <p className="text-sm text-slate-300 mt-1">
            Oyun bekliyor. <b className="text-white">{mm}:{ss}</b> içinde dönmezse oyun biter.
            Bitirmeye karar verirseniz <b className="text-amber-300">en yüksek puanlı oyuncu</b> kazanır
            {leader && <> (şu an: {leader.name}, {leader.victoryPoints} VP)</>}.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400 mt-3 mb-2">
        <span>"Bitir" oyu: <b className="text-white">{vote.endVotes.length}</b> / {needed} gerekli</span>
        <span>{iVotedEnd ? 'Oyun: Bitir' : 'Oyun: Bekle'}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => onVote(false)} className={`btn ${!iVotedEnd ? 'btn-secondary ring-2 ring-slate-400' : 'btn-ghost border border-slate-600'}`}>
          ⏳ Bekleyelim
        </button>
        <button onClick={() => onVote(true)} className={`btn ${iVotedEnd ? 'bg-red-600 text-white ring-2 ring-red-300' : 'bg-red-600/80 text-white hover:bg-red-600'}`}>
          🏁 Oyunu bitir
        </button>
      </div>
    </div>
  );
}
