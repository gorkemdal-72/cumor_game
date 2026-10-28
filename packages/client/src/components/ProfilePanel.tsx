import { useState, useEffect } from 'react';

interface ProfilePanelProps {
    socketUrl: string;
    userId: string;
    username: string;
    isAdmin: boolean;
}

interface HistoryPlayer {
    userId: string;
    username: string;
    color: string;
    vp: number;
    isWinner: boolean;
    gameStats?: { sabotagesUsed: number; robbedByTaxCollector: number; tradesMade: number };
}

interface GameHistoryEntry {
    id: string;
    roomName: string;
    date: number;
    durationMinutes?: number;
    players: HistoryPlayer[];
    winnerId: string | null;
    winnerName: string;
}

interface UserProfile {
    id: string;
    username: string;
    isAdmin: boolean;
    gamesPlayed: number;
    gamesWon: number;
    totalVP?: number;
    totalPlaytimeMinutes?: number;
    awardGaddar?: number;
    awardSanssiz?: number;
    awardBorsa?: number;
    sikke?: number;
}

const PLACE_STYLES = ['bg-amber-400/20 text-amber-300', 'bg-slate-300/15 text-slate-200', 'bg-orange-700/25 text-orange-300'];

// Oyun sonundaki ödüllerle aynı kural: istatistikte en yüksek (ve > 0) olan oyuncu(lar) alır
function awardsOf(game: GameHistoryEntry, player: HistoryPlayer) {
    const max = (key: keyof NonNullable<HistoryPlayer['gameStats']>) => Math.max(0, ...game.players.map(p => p.gameStats?.[key] || 0));
    const has = (key: keyof NonNullable<HistoryPlayer['gameStats']>) => max(key) > 0 && (player.gameStats?.[key] || 0) === max(key);
    return [
        has('sabotagesUsed') && { icon: '😈', title: 'En Gaddar' },
        has('robbedByTaxCollector') && { icon: '😭', title: 'En Şanssız' },
        has('tradesMade') && { icon: '📈', title: 'Borsa Kurdu' },
    ].filter(Boolean) as { icon: string; title: string }[];
}

function formatPlaytime(mins: number) {
    if (!mins) return '0 dk';
    if (mins < 60) return `${mins} dk`;
    return `${Math.floor(mins / 60)} sa ${mins % 60} dk`;
}

export function ProfilePanel({ socketUrl, userId, username, isAdmin }: ProfilePanelProps) {
    const [tab, setTab] = useState<'history' | 'admin'>('history');
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [history, setHistory] = useState<GameHistoryEntry[] | null>(null);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [adminMsg, setAdminMsg] = useState('');
    const [giftAmount, setGiftAmount] = useState('50');
    const [expandedGameId, setExpandedGameId] = useState<string | null>(null);

    useEffect(() => {
        setError('');
        Promise.all([
            fetch(`${socketUrl}/api/profile/${userId}`).then(r => r.json()),
            fetch(`${socketUrl}/api/history/${userId}`).then(r => r.json()),
        ])
            .then(([p, h]) => {
                if (!p.success) throw new Error(p.message);
                if (!h.success) throw new Error(h.message);
                setProfile(p.profile);
                setHistory(h.history);
            })
            .catch(e => setError(e.message || 'Profil yüklenemedi'));
    }, [socketUrl, userId]);

    const searchUsers = async () => {
        if (!searchQuery.trim()) return;
        const res = await fetch(`${socketUrl}/api/search-users?q=${encodeURIComponent(searchQuery)}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('cumor_token')}` }
        });
        const data = await res.json();
        if (data.success) setSearchResults(data.users);
        else setAdminMsg(data.message);
    };

    const giveSikke = async (target: UserProfile) => {
        const amount = Number(giftAmount);
        if (!Number.isInteger(amount) || amount < 1) { setAdminMsg('Geçerli bir sikke miktarı gir (1 veya daha fazla).'); return; }
        if (!confirm(`${target.username} kullanıcısına ${amount} sikke gönderilsin mi?`)) return;
        const res = await fetch(`${socketUrl}/api/admin/give-sikke`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: localStorage.getItem('cumor_token'), targetUserId: target.id, amount })
        });
        const data = await res.json();
        setAdminMsg(data.success ? `${target.username}: ${data.message}` : data.message);
        if (data.success) searchUsers();
    };

    const toggleAdmin = async (targetId: string, makeAdmin: boolean) => {
        const token = localStorage.getItem('cumor_token');
        const res = await fetch(`${socketUrl}/api/set-admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, targetUserId: targetId, makeAdmin })
        });
        const data = await res.json();
        setAdminMsg(data.message);
        searchUsers();
        setTimeout(() => setAdminMsg(''), 3000);
    };

    if (error) {
        return (
            <div className="card p-8 text-center">
                <p className="text-red-400 font-semibold">Profil yüklenemedi</p>
                <p className="text-sm text-slate-400 mt-1">{error}</p>
            </div>
        );
    }

    if (!profile || !history) {
        return <div className="card p-8 text-center text-slate-400" role="status">Profil yükleniyor…</div>;
    }

    const winRate = profile.gamesPlayed > 0 ? Math.round((profile.gamesWon / profile.gamesPlayed) * 100) : 0;
    const avgVP = profile.gamesPlayed > 0 ? ((profile.totalVP || 0) / profile.gamesPlayed).toFixed(1) : '0';

    return (
        <div className="space-y-6">
            {/* ÜST: kimlik */}
            <section className="card p-5 md:p-6 flex items-center gap-4">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-2xl font-black text-slate-950 shrink-0">
                    {username.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                    <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2 truncate">
                        {username}
                        {isAdmin && <span className="badge bg-red-500/15 text-red-400">ADMİN</span>}
                    </h1>
                    <p className="text-sm text-slate-400">{profile.gamesPlayed} oyun · %{winRate} kazanma oranı</p>
                </div>
            </section>

            {/* İSTATİSTİKLER */}
            <section className="grid grid-cols-2 md:grid-cols-5 gap-3" aria-label="İstatistikler">
                <div className="stat"><div className="text-3xl font-black text-white">{profile.gamesPlayed}</div><div className="stat-label">Toplam oyun</div></div>
                <div className="stat"><div className="text-3xl font-black text-emerald-400">{profile.gamesWon}</div><div className="stat-label">Galibiyet</div></div>
                <div className="stat"><div className="text-3xl font-black text-amber-400">%{winRate}</div><div className="stat-label">Kazanma oranı</div></div>
                <div className="stat"><div className="text-3xl font-black text-sky-400">{avgVP}</div><div className="stat-label">Ortalama VP ({profile.totalVP || 0} toplam)</div></div>
                <div className="stat col-span-2 md:col-span-1"><div className="text-2xl font-black text-violet-400">{formatPlaytime(profile.totalPlaytimeMinutes || 0)}</div><div className="stat-label">Oyunda geçen süre</div></div>
            </section>

            <section className="card p-5">
                <h2 className="text-sm font-bold text-slate-300 mb-3">Başarımlar</h2>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { icon: '😈', label: 'En Gaddar', hint: 'En çok sabotaj', value: profile.awardGaddar, color: 'text-red-400' },
                        { icon: '😭', label: 'En Şanssız', hint: 'En çok soyulan', value: profile.awardSanssiz, color: 'text-sky-400' },
                        { icon: '📈', label: 'Borsa Kurdu', hint: 'En çok ticaret', value: profile.awardBorsa, color: 'text-amber-400' },
                    ].map(a => (
                        <div key={a.label} className="stat !p-3" title={a.hint}>
                            <div className="text-2xl" aria-hidden>{a.icon}</div>
                            <div className={`text-xl font-black ${a.color}`}>{a.value || 0}</div>
                            <div className="stat-label">{a.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* GEÇMİŞ / ADMİN */}
            <section className="card p-5">
                <div className="flex gap-1 mb-4 border-b border-slate-700" role="tablist">
                    <button role="tab" aria-selected={tab === 'history'} onClick={() => setTab('history')}
                        className={`px-3 py-2 text-sm font-bold border-b-2 -mb-px ${tab === 'history' ? 'text-amber-400 border-amber-400' : 'text-slate-400 border-transparent hover:text-white'}`}>
                        Son oyunlar
                    </button>
                    {isAdmin && (
                        <button role="tab" aria-selected={tab === 'admin'} onClick={() => setTab('admin')}
                            className={`px-3 py-2 text-sm font-bold border-b-2 -mb-px ${tab === 'admin' ? 'text-red-400 border-red-400' : 'text-slate-400 border-transparent hover:text-white'}`}>
                            Kullanıcı yönetimi
                        </button>
                    )}
                </div>

                {tab === 'history' && (
                    history.length === 0 ? (
                        <div className="text-center py-10">
                            <div className="text-4xl mb-2" aria-hidden>📜</div>
                            <p className="font-semibold text-slate-200">Henüz tamamlanmış oyunun yok</p>
                            <p className="text-sm text-slate-400 mt-1">Bir oyun bitirdiğinde sonucu burada görünür.</p>
                        </div>
                    ) : (
                        <ul className="space-y-2">
                            {history.map(g => {
                                const ranked = [...g.players].sort((a, b) => b.vp - a.vp);
                                const myIndex = ranked.findIndex(p => p.userId === userId);
                                const me = ranked[myIndex];
                                const isExpanded = expandedGameId === g.id;
                                const date = new Date(g.date);
                                return (
                                    <li key={g.id} className="bg-slate-900/50 border border-slate-700/60 rounded-xl overflow-hidden">
                                        <button
                                            className="w-full p-3 md:p-4 flex items-center gap-3 text-left hover:bg-slate-800/50 transition-colors"
                                            onClick={() => setExpandedGameId(isExpanded ? null : g.id)}
                                            aria-expanded={isExpanded}
                                        >
                                            <span className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center font-black ${PLACE_STYLES[myIndex] ?? 'bg-slate-700/50 text-slate-300'}`}
                                                title={`${myIndex + 1}. oldun`}>
                                                {me?.isWinner ? '🏆' : `${myIndex + 1}.`}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block font-bold text-white truncate">{g.roomName}</span>
                                                <span className="block text-xs text-slate-400 mt-0.5">
                                                    {date.toLocaleDateString('tr-TR')} {date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                                    {' · '}{g.durationMinutes ? `${g.durationMinutes} dk` : 'süre yok'}
                                                    {' · '}Kazanan: {g.winnerName}
                                                </span>
                                            </span>
                                            {me && <span className="text-sm font-bold text-slate-200 shrink-0">{me.vp} VP</span>}
                                            <span className="text-slate-500 text-xs" aria-hidden>{isExpanded ? '▲' : '▼'}</span>
                                        </button>

                                        {isExpanded && (
                                            <ol className="border-t border-slate-700/60 p-3 space-y-1.5">
                                                {ranked.map((p, idx) => (
                                                    <li key={idx} className="flex items-center gap-2 text-sm bg-slate-800/50 px-3 py-2 rounded-lg">
                                                        <span className="w-5 text-slate-500 font-bold">{idx + 1}.</span>
                                                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: p.color }} aria-hidden />
                                                        <span className={`flex-1 truncate ${p.userId === userId ? 'text-amber-300 font-bold' : 'text-slate-200'}`}>
                                                            {p.username}{p.isWinner && ' 👑'}
                                                        </span>
                                                        {awardsOf(g, p).map(a => <span key={a.title} title={a.title} aria-label={a.title}>{a.icon}</span>)}
                                                        <span className="font-bold text-slate-200 w-12 text-right">{p.vp} VP</span>
                                                    </li>
                                                ))}
                                            </ol>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )
                )}

                {tab === 'admin' && isAdmin && (
                    <div className="space-y-3">
                        {adminMsg && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm p-2.5 rounded-lg">{adminMsg}</div>}
                        <form className="flex gap-2" onSubmit={e => { e.preventDefault(); searchUsers(); }}>
                            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Kullanıcı adı ara…" className="input" aria-label="Kullanıcı adı ara" />
                            <button type="submit" className="btn btn-secondary">Ara</button>
                        </form>
                        {searchResults.length > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                                <label htmlFor="gift-amount" className="text-slate-300 shrink-0">Hediye sikke miktarı:</label>
                                <input id="gift-amount" type="number" min={1} max={100000} value={giftAmount}
                                    onChange={e => setGiftAmount(e.target.value)} className="input !py-1.5 !w-28" />
                            </div>
                        )}
                        <ul className="space-y-1.5">
                            {searchResults.map(u => (
                                <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/50 p-2.5 rounded-lg text-sm">
                                    <span>
                                        <span className="text-white font-bold">{u.username}</span>
                                        {u.isAdmin && <span className="badge bg-red-500/15 text-red-400 ml-2">ADMİN</span>}
                                        <span className="text-slate-500 ml-2">{u.gamesPlayed} oyun · 💰 {u.sikke ?? 0}</span>
                                    </span>
                                    <span className="flex gap-1.5">
                                        <button onClick={() => giveSikke(u)} className="btn !py-1 !px-2.5 text-xs bg-amber-400/15 text-amber-300 hover:bg-amber-400/30">
                                            💰 Sikke gönder
                                        </button>
                                        <button onClick={() => toggleAdmin(u.id, !u.isAdmin)} className={`btn !py-1 !px-2.5 text-xs ${u.isAdmin ? 'bg-red-500/15 text-red-400 hover:bg-red-500/30' : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30'}`}>
                                            {u.isAdmin ? 'Admin kaldır' : 'Admin yap'}
                                        </button>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </section>
        </div>
    );
}
