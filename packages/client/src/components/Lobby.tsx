import { useState } from 'react';

import { PlayerColor, type RoomInfo } from '@cumor/shared';

interface LobbyProps {
  rooms: RoomInfo[];
  onCreateRoom: (roomName: string, pass: string, playerName: string, color: PlayerColor) => void;
  onJoinRoom: (roomId: string, pass: string, playerName: string, color: PlayerColor) => void;
}

export function Lobby({ rooms, onCreateRoom, onJoinRoom }: LobbyProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [showRulebook, setShowRulebook] = useState(false); // YENİ: Kural kitabı modalı

  // Form State
  const [playerName, setPlayerName] = useState("");
  // PlayerColor.RED artık çalışacak çünkü Enum yaptık
  const [selectedColor, setSelectedColor] = useState<PlayerColor>(PlayerColor.RED);

  // Create Room State
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomPass, setNewRoomPass] = useState("");

  // Join Room State
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [joinPass, setJoinPass] = useState("");

  return (
    <div className="flex flex-col items-center bg-slate-800 p-4 md:p-6 rounded-xl shadow-2xl border border-slate-700 w-full max-w-[600px] max-h-[85vh] overflow-y-auto">
      <div className="flex items-center justify-between w-full mb-4 md:mb-6">
        <h2 className="text-xl md:text-3xl font-bold text-white tracking-widest font-mono">SERVER BROWSER</h2>
        <button
          onClick={() => setShowRulebook(true)}
          className="bg-amber-700 hover:bg-amber-600 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-bold text-xs md:text-sm transition-colors shrink-0 ml-2"
          title="Oyun kurallarını gör"
        >
          📖 Kurallar
        </button>
      </div>

      {/* TABLAR */}
      <div className="flex w-full mb-4 md:mb-6 border-b border-slate-600">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-2 font-bold text-sm md:text-base ${activeTab === 'list' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
        >
          ODALAR
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-2 font-bold text-sm md:text-base ${activeTab === 'create' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400'}`}
        >
          ODA OLUŞTUR
        </button>
      </div>

      {/* ORTAK ALAN: İSİM VE RENK SEÇİMİ */}
      <div className="w-full bg-slate-900 p-3 md:p-4 rounded-lg mb-4 flex flex-col md:flex-row gap-3 md:gap-4 items-stretch md:items-center">
        <input
          type="text" placeholder="Takma Adın" value={playerName} onChange={e => setPlayerName(e.target.value)}
          className="bg-slate-800 text-white p-2 rounded border border-slate-600 flex-1 outline-none text-sm md:text-base"
        />
        <div className="flex gap-1.5 flex-wrap justify-center md:justify-start">
          {/* Enum değerleri üzerinde dönüyoruz */}
          {Object.values(PlayerColor).map(c => (
            <div
              key={c} onClick={() => setSelectedColor(c)}
              className={`w-7 h-7 md:w-6 md:h-6 rounded-full cursor-pointer ${selectedColor === c ? 'ring-2 ring-white scale-110' : 'opacity-50'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* --- TAB 1: ODA LİSTESİ --- */}
      {activeTab === 'list' && (
        <div className="w-full flex-1 overflow-y-auto pr-2 space-y-2">
          {rooms.length === 0 ? (
            <div className="text-center text-gray-500 mt-10">Hiç oda yok. İlk kuran sen ol!</div>
          ) : (
            rooms.map(room => (
              <div key={room.id} className={`p-3 rounded border flex justify-between items-center transition-all ${selectedRoomId === room.id ? 'bg-blue-900/50 border-blue-500' : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700'}`}>
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    {room.name}
                    {room.isLocked && <span className="text-xs text-yellow-500">🔒</span>}
                  </div>
                  <div className="text-xs text-gray-400">Oyuncular: {room.playerCount}/{room.maxPlayers} • {room.status}</div>
                </div>

                {selectedRoomId === room.id ? (
                  <div className="flex gap-2">
                    {room.isLocked && (
                      <input
                        type="password" placeholder="Şifre"
                        className="w-20 p-1 rounded bg-slate-900 text-white text-xs border border-slate-500"
                        onChange={e => setJoinPass(e.target.value)}
                      />
                    )}
                    <button
                      className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-sm rounded font-bold"
                      onClick={() => onJoinRoom(room.id, joinPass, playerName, selectedColor)}
                    >
                      GİR
                    </button>
                  </div>
                ) : (
                  <button
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded"
                    onClick={() => setSelectedRoomId(room.id)}
                  >
                    SEÇ
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* --- TAB 2: ODA OLUŞTUR --- */}
      {activeTab === 'create' && (
        <div className="w-full flex-1 flex flex-col gap-4">
          <div>
            <label className="text-sm text-gray-400">Oda İsmi</label>
            <input
              type="text" value={newRoomName} onChange={e => setNewRoomName(e.target.value)}
              className="w-full p-3 bg-slate-700 rounded text-white border border-slate-600 outline-none focus:border-green-500"
              placeholder="Örn: Catan Ustaları"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400">Şifre (Opsiyonel)</label>
            <input
              type="password" value={newRoomPass} onChange={e => setNewRoomPass(e.target.value)}
              className="w-full p-3 bg-slate-700 rounded text-white border border-slate-600 outline-none focus:border-green-500"
              placeholder="Boş bırakırsan şifresiz olur"
            />
          </div>
          <button
            className="mt-auto w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg"
            onClick={() => playerName && newRoomName && onCreateRoom(newRoomName, newRoomPass, playerName, selectedColor)}
          >
            ODAYI KUR VE GİR 🎲
          </button>
        </div>
      )}
      {/* KURAL KİTABI MODALI */}
      {showRulebook && (
        <div className="fixed inset-0 bg-black/80 z-[999] flex items-center justify-center backdrop-blur-sm" onClick={() => setShowRulebook(false)}>
          <div className="bg-slate-800 p-8 rounded-2xl border-2 border-amber-500 shadow-2xl max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-black text-amber-400 mb-4">📖 CUMOR - Oyun Kuralları</h2>
            <div className="text-gray-300 text-sm space-y-3 leading-relaxed">
              <p><strong className="text-white">🎯 Amaç:</strong> 10 Zafer Puanı'na (VP) ilk ulaşan oyuncu kazanır.</p>
              <p><strong className="text-white">🎲 Tur Döngüsü:</strong> Zar at → Kaynak topla → İnşa et / Ticaret yap / Kart oyna → Turu bitir.</p>
              <p><strong className="text-white">🏠 Yapılar:</strong></p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li><span className="text-white">Yol:</span> 1 Beton + 1 Kereste</li>
                <li><span className="text-white">Köy:</span> 1 Beton + 1 Kereste + 1 Tekstil + 1 Gıda (+1 VP)</li>
                <li><span className="text-white">Şehir:</span> 2 Gıda + 3 Elmas (Çift kaynak + 2 VP)</li>
              </ul>
              <p><strong className="text-white">💰 Ticaret:</strong></p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li><span className="text-white">İhracat:</span> Kaynak satıp Altın kazan</li>
                <li><span className="text-white">Karaborsa:</span> Altın vererek kaynak al (oran binana göre: Şehir=2, Köy=3, Yol=4, Yok=5)</li>
                <li><span className="text-white">15 Altın = 1 VP</span> satın alabilirsin</li>
              </ul>
              <p><strong className="text-white">🃏 Gelişim Kartları:</strong></p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li><span className="text-white">Vergi Memuru (💼):</span> Vergi Memurunu taşı + memur sayısını artır (3 = Vergi Rekortmeni +2 VP)</li>
                <li><span className="text-white">Sabotaj (💣):</span> Rakip yol yık</li>
                <li><span className="text-white">Kartel (🏢):</span> Tüm kaynak üretimi sana gelsin</li>
                <li><span className="text-white">Sigorta (🛡️):</span> Sabotajdan otomatik koru</li>
                <li><span className="text-white">Mühendis (🛣️):</span> Ücretsiz 2 yol inşa et</li>
                <li><span className="text-white">Tüccar (📦):</span> Bankadan 3 kaynak bedava al</li>
                <li><span className="text-white">Mercator (🌍):</span> Rakiplerden kaynak topla (ceza sistemli)</li>
              </ul>
              <p><strong className="text-white">🎲 7 Zarı:</strong> 7+ kaynağı olan oyuncular yarısını kaybeder. Vergi Memuru harekete geçer.</p>
              <p><strong className="text-white">🛤️ En Uzun Yol:</strong> 5+ kesilmeyen yol zinciri = +2 VP</p>
            </div>
            <button onClick={() => setShowRulebook(false)} className="mt-6 w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-bold">Kapat</button>
          </div>
        </div>
      )}
    </div>
  );
}