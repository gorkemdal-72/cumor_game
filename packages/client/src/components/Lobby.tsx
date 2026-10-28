import { useState } from 'react';

import { GameStatus, PlayerColor, type RoomInfo } from '@cumor/shared';

interface LobbyProps {
  rooms: RoomInfo[];
  defaultName: string;
  onCreateRoom: (roomName: string, pass: string, playerName: string, color: PlayerColor) => void;
  onJoinRoom: (roomId: string, pass: string, playerName: string, color: PlayerColor) => void;
}

// Oda durumlarının Türkçe etiketi (oyun içi başlık da kullanır)
export const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  [GameStatus.LOBBY]: { label: 'Oyuncu bekliyor', className: 'bg-emerald-500/15 text-emerald-400' },
  [GameStatus.ROLLING_FOR_START]: { label: 'Sıra belirleniyor', className: 'bg-sky-500/15 text-sky-400' },
  [GameStatus.SETUP_ROUND_1]: { label: 'Kurulum', className: 'bg-sky-500/15 text-sky-400' },
  [GameStatus.SETUP_ROUND_2]: { label: 'Kurulum', className: 'bg-sky-500/15 text-sky-400' },
  [GameStatus.PLAYING]: { label: 'Oyunda', className: 'bg-amber-500/15 text-amber-400' },
  [GameStatus.FINISHED]: { label: 'Bitti', className: 'bg-slate-500/20 text-slate-400' },
};

const COLOR_NAMES: Record<string, string> = {
  RED: 'Kırmızı', BLUE: 'Mavi', ORANGE: 'Turuncu', WHITE: 'Beyaz',
  GREEN: 'Yeşil', PURPLE: 'Mor', PINK: 'Pembe', CYAN: 'Turkuaz',
};

export function Lobby({ rooms, defaultName, onCreateRoom, onJoinRoom }: LobbyProps) {
  const [playerName, setPlayerName] = useState(defaultName.slice(0, 20));
  const [selectedColor, setSelectedColor] = useState<PlayerColor>(PlayerColor.RED);

  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPass, setNewRoomPass] = useState('');

  // Şifreli odaya girerken şifre alanı açılan oda
  const [passwordRoomId, setPasswordRoomId] = useState<string | null>(null);
  const [joinPass, setJoinPass] = useState('');

  const name = playerName.trim();
  const joinable = rooms.filter(r => r.status === GameStatus.LOBBY).length;

  const join = (room: RoomInfo) => {
    if (room.isLocked && passwordRoomId !== room.id) {
      setPasswordRoomId(room.id);
      setJoinPass('');
      return;
    }
    onJoinRoom(room.id, joinPass, name, selectedColor);
  };

  return (
    <div className="space-y-6">
      {/* KİMLİK: takma ad + renk */}
      <section className="card p-5">
        <h2 className="text-sm font-bold text-slate-300 mb-4">Oyuncu bilgilerin</h2>
        <div className="flex flex-col md:flex-row gap-5 md:items-end">
          <div className="md:w-64">
            <label htmlFor="player-name" className="label">Takma ad</label>
            <input
              id="player-name" type="text" maxLength={20} value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              className="input" placeholder="Oyunda görünecek adın"
            />
          </div>
          <div className="flex-1">
            <span className="label" id="color-label">Renk: {COLOR_NAMES[Object.entries(PlayerColor).find(([, v]) => v === selectedColor)?.[0] ?? '']}</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="color-label">
              {Object.entries(PlayerColor).map(([key, c]) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={selectedColor === c}
                  aria-label={COLOR_NAMES[key]}
                  title={COLOR_NAMES[key]}
                  onClick={() => setSelectedColor(c)}
                  className={`w-9 h-9 rounded-full border-2 transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${selectedColor === c ? 'border-amber-400 scale-110 shadow-[0_0_0_3px_rgba(251,191,36,0.25)]' : 'border-slate-600 hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
        {!name && <p className="text-xs text-amber-400 mt-3">Odaya girmek için bir takma ad yaz.</p>}
      </section>

      <div className="grid md:grid-cols-[1fr_320px] gap-6 items-start">
        {/* ODA LİSTESİ */}
        <section className="card p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Odalar</h2>
            <span className="text-xs text-slate-400">{joinable} oda katılıma açık</span>
          </div>

          {rooms.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-slate-700 rounded-xl">
              <div className="text-4xl mb-3" aria-hidden>🏝️</div>
              <p className="font-semibold text-slate-200">Henüz açık oda yok</p>
              <p className="text-sm text-slate-400 mt-1">Yeni bir oda kur, arkadaşların katılsın.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {rooms.map(room => {
                const status = STATUS_LABELS[room.status] ?? { label: room.status, className: 'bg-slate-500/20 text-slate-400' };
                const isOpen = room.status === GameStatus.LOBBY;
                const isFull = room.playerCount >= room.maxPlayers;
                return (
                  <li key={room.id} className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-3 md:p-4">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-white truncate flex items-center gap-2">
                          {room.name}
                          {room.isLocked && <span title="Şifreli oda" aria-label="Şifreli oda">🔒</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`badge ${status.className}`}>{status.label}</span>
                          <span className="text-xs text-slate-400" aria-label={`${room.playerCount} / ${room.maxPlayers} oyuncu`}>
                            👥 {room.playerCount}/{room.maxPlayers}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => join(room)}
                        disabled={!isOpen || isFull || !name}
                        className="btn btn-primary shrink-0"
                      >
                        {!isOpen ? 'Başladı' : isFull ? 'Dolu' : 'Katıl'}
                      </button>
                    </div>

                    {passwordRoomId === room.id && isOpen && (
                      <form
                        className="flex gap-2 mt-3"
                        onSubmit={e => { e.preventDefault(); onJoinRoom(room.id, joinPass, name, selectedColor); }}
                      >
                        <input
                          type="password" autoFocus value={joinPass} onChange={e => setJoinPass(e.target.value)}
                          className="input !py-2" placeholder="Oda şifresi" aria-label="Oda şifresi"
                        />
                        <button type="submit" className="btn btn-secondary" disabled={!name}>Gir</button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ODA OLUŞTUR */}
        <section className="card p-5">
          <h2 className="text-lg font-bold text-white mb-4">Oda kur</h2>
          <form
            className="space-y-4"
            onSubmit={e => { e.preventDefault(); if (name && newRoomName.trim()) onCreateRoom(newRoomName.trim(), newRoomPass, name, selectedColor); }}
          >
            <div>
              <label htmlFor="room-name" className="label">Oda adı</label>
              <input id="room-name" type="text" maxLength={30} value={newRoomName} onChange={e => setNewRoomName(e.target.value)}
                className="input" placeholder="Örn: Cuma akşamı" />
            </div>
            <div>
              <label htmlFor="room-pass" className="label">Şifre <span className="text-slate-500 font-normal">(isteğe bağlı)</span></label>
              <input id="room-pass" type="password" value={newRoomPass} onChange={e => setNewRoomPass(e.target.value)}
                className="input" placeholder="Boş bırakırsan herkes girebilir" autoComplete="new-password" />
            </div>
            <button type="submit" disabled={!name || !newRoomName.trim()} className="btn btn-primary w-full">
              Odayı kur ve gir
            </button>
            <p className="text-xs text-slate-500">Oyun 3–5 kişiyle başlar. 5 kişide harita büyür.</p>
          </form>
        </section>
      </div>
    </div>
  );
}
