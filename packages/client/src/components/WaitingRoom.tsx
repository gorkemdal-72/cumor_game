import type { Player } from '@cumor/shared';

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 5;

interface Props {
  players: Player[];
  myId: string | null;
  hostId: string | null;
  onStart: () => void;
  onLeave: () => void;
}

// Oda lobisi: oyun başlamadan önce kimler var, kaç kişi eksik, kim başlatabilir
export function WaitingRoom({ players, myId, hostId, onStart, onLeave }: Props) {
  const isHost = myId === hostId;
  const missing = Math.max(0, MIN_PLAYERS - players.length);
  const host = players.find(p => p.id === hostId);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-[2px]">
      <div className="card w-full max-w-md p-5">
        <div className="flex items-baseline justify-between mb-1">
          <h2 className="text-xl font-black text-white">Oyuncular bekleniyor</h2>
          <span className={`badge ${missing ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-400'}`}>
            {players.length}/{MIN_PLAYERS}{players.length >= MIN_PLAYERS && ` · en fazla ${MAX_PLAYERS}`}
          </span>
        </div>
        <p className={`text-sm mb-4 ${missing ? 'text-amber-300' : 'text-emerald-400'}`}>
          {missing
            ? `Oyun en az ${MIN_PLAYERS} kişiyle oynanır — ${missing} oyuncu daha gerekli.`
            : `Hazır! ${players.length} oyuncu var.${players.length === MAX_PLAYERS ? ' 5 kişide büyük harita kullanılır.' : ''}`}
        </p>

        <ul className="space-y-2 mb-5">
          {players.map(p => (
            <li key={p.id} className="flex items-center gap-3 bg-slate-900/60 border border-slate-700/60 rounded-xl px-3 py-2.5">
              <span className="w-4 h-4 rounded-full border border-white/30" style={{ backgroundColor: p.color }} aria-hidden />
              <span className="flex-1 font-semibold text-white truncate">
                {p.name}{p.id === myId && <span className="text-slate-400 font-normal"> (sen)</span>}
              </span>
              {p.id === hostId && <span className="badge bg-amber-400/15 text-amber-300">👑 Oda sahibi</span>}
            </li>
          ))}
          {Array.from({ length: missing }).map((_, i) => (
            <li key={`empty-${i}`} className="flex items-center gap-3 border border-dashed border-slate-700 rounded-xl px-3 py-2.5 text-slate-500 text-sm">
              <span className="w-4 h-4 rounded-full border border-dashed border-slate-600" aria-hidden />
              Boş yer — arkadaşlarını davet et
            </li>
          ))}
        </ul>

        {isHost ? (
          <button onClick={onStart} disabled={missing > 0} className="btn btn-primary w-full !py-3"
            title={missing ? `${missing} oyuncu daha gerekli` : 'Oyunu başlat'}>
            {missing ? `Başlatmak için ${missing} oyuncu daha gerekli` : 'Oyunu başlat 🚀'}
          </button>
        ) : (
          <p className="text-center text-sm text-slate-400 bg-slate-900/60 rounded-lg py-3">
            {host ? `${host.name} oyunu başlatınca` : 'Oda sahibi başlatınca'} oyun başlayacak.
          </p>
        )}
        <button onClick={onLeave} className="btn btn-ghost w-full mt-2">Odadan ayrıl</button>
      </div>
    </div>
  );
}
