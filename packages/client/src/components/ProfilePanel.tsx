import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Modal } from './Modal';

interface ProfilePanelProps {
    socketUrl: string;
    userId: string;   // Giriş yapan kullanıcı (kendi profili açılır)
    isAdmin: boolean; // Giriş yapan kullanıcının admin yetkisi
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

type Visibility = 'public' | 'friends' | 'private';
type Relation = 'self' | 'friends' | 'pending_out' | 'pending_in' | 'none';
interface Access { username: string; visibility: Visibility; relation: Relation; canView: boolean }
interface UserRef { id: string; username: string }

const VISIBILITY_LABELS: Record<Visibility, string> = {
    public: '🌍 Herkes görebilir',
    friends: '👥 Sadece arkadaşlarım',
    private: '🔒 Sadece ben',
};

const PLACE_STYLES = ['bg-amber-400/20 text-amber-300', 'bg-slate-300/15 text-slate-200', 'bg-orange-700/25 text-orange-300'];

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('cumor_token')}` });

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

// Yazarken arama: "Ara"ya basmadan, kısa bir beklemeden sonra öneriler gelir
function useUserSearch<T>(url: string, query: string) {
    const [results, setResults] = useState<T[]>([]);
    const [reloadKey, setReloadKey] = useState(0);
    useEffect(() => {
        const q = query.trim();
        if (!q) { setResults([]); return; }
        let stale = false;
        const t = setTimeout(async () => {
            try {
                const res = await fetch(`${url}?q=${encodeURIComponent(q)}`, { headers: authHeaders() });
                const data = await res.json();
                if (!stale && data.success) setResults(data.users);
            } catch { /* ağ hatası: önerileri boş bırak */ }
        }, 250);
        return () => { stale = true; clearTimeout(t); };
    }, [url, query, reloadKey]);
    return { results, reload: () => setReloadKey(k => k + 1) };
}

// Profil gezinmesi: kendi profilinden başkasının profiline geçiş ve geri dönüş
export function ProfilePanel({ socketUrl, userId, isAdmin }: ProfilePanelProps) {
    const [viewingId, setViewingId] = useState<string | null>(null);
    const shownId = viewingId ?? userId;
    return (
        <ProfileView
            key={shownId}
            socketUrl={socketUrl}
            profileId={shownId}
            viewerId={userId}
            viewerIsAdmin={isAdmin}
            onOpenProfile={id => { setViewingId(id === userId ? null : id); window.scrollTo(0, 0); }}
            onBack={viewingId ? () => setViewingId(null) : undefined}
        />
    );
}

interface ProfileViewProps {
    socketUrl: string;
    profileId: string;
    viewerId: string;
    viewerIsAdmin: boolean;
    onOpenProfile: (id: string) => void;
    onBack?: () => void;
}

function ProfileView({ socketUrl, profileId, viewerId, viewerIsAdmin, onOpenProfile, onBack }: ProfileViewProps) {
    const isSelf = profileId === viewerId;
    const [tab, setTab] = useState<'history' | 'friends' | 'search' | 'admin'>('history');
    const [access, setAccess] = useState<Access | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [history, setHistory] = useState<GameHistoryEntry[] | null>(null);
    const [friends, setFriends] = useState<{ friends: UserRef[]; incoming: UserRef[]; outgoing: UserRef[] } | null>(null);
    const [error, setError] = useState('');
    const [expandedGameId, setExpandedGameId] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [adminQuery, setAdminQuery] = useState('');
    const [adminMsg, setAdminMsg] = useState('');
    const [giftAmount, setGiftAmount] = useState('50');
    const [pendingGift, setPendingGift] = useState<{ target: UserProfile; amount: number } | null>(null);

    const playerSearch = useUserSearch<UserRef>(`${socketUrl}/api/users/search`, searchQuery);
    const adminSearch = useUserSearch<UserProfile>(`${socketUrl}/api/search-users`, adminQuery);

    const load = async () => {
        setError('');
        try {
            const p = await fetch(`${socketUrl}/api/profile/${profileId}`, { headers: authHeaders() }).then(r => r.json());
            if (!p.success) throw new Error(p.message);
            setAccess(p.access);
            setProfile(p.profile);
            if (p.access.canView) {
                const h = await fetch(`${socketUrl}/api/history/${profileId}`, { headers: authHeaders() }).then(r => r.json());
                if (!h.success) throw new Error(h.message);
                setHistory(h.history);
            }
            if (isSelf) {
                const f = await fetch(`${socketUrl}/api/friends`, { headers: authHeaders() }).then(r => r.json());
                if (f.success) setFriends(f);
            }
        } catch (e: any) {
            setError(e.message || 'Profil yüklenemedi');
        }
    };

    useEffect(() => { load(); }, [socketUrl, profileId]);

    // Arkadaşlık / görünürlük işlemleri: hepsi aynı kalıp → POST, bildirim, yeniden yükle
    const post = async (path: string, body: object) => {
        setBusy(true);
        try {
            const res = await fetch(`${socketUrl}${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.success) toast.success(data.message); else toast.error(data.message);
            await load();
        } catch {
            toast.error('Sunucuya ulaşılamadı');
        } finally {
            setBusy(false);
        }
    };

    const giveSikke = async (target: UserProfile, amount: number) => {
        setPendingGift(null);
        const res = await fetch(`${socketUrl}/api/admin/give-sikke`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: localStorage.getItem('cumor_token'), targetUserId: target.id, amount })
        });
        const data = await res.json();
        setAdminMsg(data.success ? `${target.username}: ${data.message}` : data.message);
        if (data.success) adminSearch.reload();
    };

    const toggleAdmin = async (targetId: string, makeAdmin: boolean) => {
        const res = await fetch(`${socketUrl}/api/set-admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: localStorage.getItem('cumor_token'), targetUserId: targetId, makeAdmin })
        });
        const data = await res.json();
        setAdminMsg(data.message);
        adminSearch.reload();
    };

    if (error) {
        return (
            <div className="card p-8 text-center">
                {onBack && <button onClick={onBack} className="btn btn-ghost mb-4">← Profilime dön</button>}
                <p className="text-red-400 font-semibold">Profil yüklenemedi</p>
                <p className="text-sm text-slate-400 mt-1">{error}</p>
            </div>
        );
    }

    if (!access) {
        return <div className="card p-8 text-center text-slate-400" role="status">Profil yükleniyor…</div>;
    }

    const name = access.username;
    const winRate = profile && profile.gamesPlayed > 0 ? Math.round((profile.gamesWon / profile.gamesPlayed) * 100) : 0;
    const avgVP = profile && profile.gamesPlayed > 0 ? ((profile.totalVP || 0) / profile.gamesPlayed).toFixed(1) : '0';
    const incomingCount = friends?.incoming.length || 0;

    // Başkasının profilinde arkadaşlık butonları
    const friendActions = !isSelf && (
        <div className="flex flex-wrap gap-2">
            {access.relation === 'none' && (
                <button disabled={busy} onClick={() => post('/api/friends/request', { userId: profileId })} className="btn btn-primary">➕ Arkadaş ekle</button>
            )}
            {access.relation === 'pending_out' && (
                <>
                    <span className="badge bg-slate-600/40 text-slate-300 !text-xs !py-2 !px-3">⏳ İstek gönderildi</span>
                    <button disabled={busy} onClick={() => post('/api/friends/remove', { userId: profileId })} className="btn btn-ghost">Geri çek</button>
                </>
            )}
            {access.relation === 'pending_in' && (
                <>
                    <button disabled={busy} onClick={() => post('/api/friends/respond', { userId: profileId, accept: true })} className="btn btn-primary">✓ İsteği kabul et</button>
                    <button disabled={busy} onClick={() => post('/api/friends/respond', { userId: profileId, accept: false })} className="btn btn-ghost">Reddet</button>
                </>
            )}
            {access.relation === 'friends' && (
                <>
                    <span className="badge bg-emerald-500/15 text-emerald-400 !text-xs !py-2 !px-3">✓ Arkadaşsınız</span>
                    <button disabled={busy} onClick={() => post('/api/friends/remove', { userId: profileId })} className="btn btn-ghost text-xs">Arkadaşlıktan çıkar</button>
                </>
            )}
        </div>
    );

    return (
        <div className="space-y-6">
            {onBack && <button onClick={onBack} className="btn btn-ghost !px-2">← Profilime dön</button>}

            {/* ÜST: kimlik + arkadaşlık / görünürlük */}
            <section className="card p-5 md:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-2xl font-black text-slate-950 shrink-0">
                        {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl md:text-2xl font-black text-white flex items-center gap-2 truncate">
                            {name}
                            {profile?.isAdmin && <span className="badge bg-red-500/15 text-red-400">ADMİN</span>}
                        </h1>
                        <p className="text-sm text-slate-400">
                            {profile ? `${profile.gamesPlayed} oyun · %${winRate} kazanma oranı` : VISIBILITY_LABELS[access.visibility]}
                        </p>
                    </div>
                </div>
                {friendActions}
                {isSelf && (
                    <div>
                        <label htmlFor="visibility" className="label">Profilimi kimler görebilir?</label>
                        <select
                            id="visibility"
                            value={access.visibility}
                            disabled={busy}
                            onChange={e => post('/api/profile/visibility', { visibility: e.target.value })}
                            className="input !py-2"
                        >
                            {(Object.keys(VISIBILITY_LABELS) as Visibility[]).map(v => <option key={v} value={v}>{VISIBILITY_LABELS[v]}</option>)}
                        </select>
                    </div>
                )}
            </section>

            {/* GİZLİ PROFİL */}
            {!access.canView && (
                <section className="card p-8 text-center">
                    <div className="text-4xl mb-2" aria-hidden>🔒</div>
                    <p className="font-semibold text-slate-200">
                        {access.visibility === 'friends' ? 'Bu profil sadece arkadaşlarına açık' : 'Bu profil gizli'}
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                        {access.visibility === 'friends'
                            ? 'Arkadaş olduğunuzda istatistiklerini ve oyun geçmişini görebilirsin.'
                            : 'Bu oyuncu istatistiklerini kimseyle paylaşmıyor.'}
                    </p>
                </section>
            )}

            {/* İSTATİSTİKLER */}
            {profile && (
                <>
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
                </>
            )}

            {/* SEKMELER: geçmiş / arkadaşlar / oyuncu bul / admin */}
            {(access.canView || isSelf) && (
                <section className="card p-5">
                    <div className="flex gap-1 mb-4 border-b border-slate-700 overflow-x-auto overflow-y-hidden" role="tablist">
                        {([
                            ['history', 'Son oyunlar', true],
                            ['friends', `Arkadaşlar${incomingCount ? ` (${incomingCount})` : ''}`, isSelf],
                            ['search', 'Oyuncu bul', isSelf],
                            ['admin', 'Kullanıcı yönetimi', isSelf && viewerIsAdmin],
                        ] as const).filter(([, , show]) => show).map(([id, label]) => (
                            <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                                className={`px-3 py-2 text-sm font-bold border-b-2 -mb-px whitespace-nowrap ${tab === id
                                    ? (id === 'admin' ? 'text-red-400 border-red-400' : 'text-amber-400 border-amber-400')
                                    : 'text-slate-400 border-transparent hover:text-white'}`}>
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* SON OYUNLAR */}
                    {tab === 'history' && history && (
                        history.length === 0 ? (
                            <div className="text-center py-10">
                                <div className="text-4xl mb-2" aria-hidden>📜</div>
                                <p className="font-semibold text-slate-200">Henüz tamamlanmış oyun yok</p>
                                <p className="text-sm text-slate-400 mt-1">Bir oyun bittiğinde sonucu burada görünür.</p>
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {history.map(g => {
                                    const ranked = [...g.players].sort((a, b) => b.vp - a.vp);
                                    const myIndex = ranked.findIndex(p => p.userId === profileId);
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
                                                    title={`${myIndex + 1}. oldu`}>
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
                                                            {/* Oyuncu adına tıklayınca profili açılır */}
                                                            <button
                                                                onClick={() => p.userId && onOpenProfile(p.userId)}
                                                                className={`flex-1 truncate text-left hover:underline ${p.userId === profileId ? 'text-amber-300 font-bold' : 'text-slate-200'}`}
                                                                title="Profili gör"
                                                            >
                                                                {p.username}{p.isWinner && ' 👑'}
                                                            </button>
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

                    {/* ARKADAŞLAR */}
                    {tab === 'friends' && friends && (
                        <div className="space-y-5">
                            {friends.incoming.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Gelen istekler</h3>
                                    <ul className="space-y-1.5">
                                        {friends.incoming.map(u => (
                                            <li key={u.id} className="flex flex-wrap items-center gap-2 bg-slate-900/50 p-2.5 rounded-lg text-sm">
                                                <button onClick={() => onOpenProfile(u.id)} className="flex-1 text-left font-bold text-white hover:underline">{u.username}</button>
                                                <button disabled={busy} onClick={() => post('/api/friends/respond', { userId: u.id, accept: true })} className="btn btn-primary !py-1 !px-2.5 text-xs">✓ Kabul et</button>
                                                <button disabled={busy} onClick={() => post('/api/friends/respond', { userId: u.id, accept: false })} className="btn btn-ghost !py-1 !px-2.5 text-xs">Reddet</button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Arkadaşlarım ({friends.friends.length})</h3>
                                {friends.friends.length === 0 ? (
                                    <p className="text-sm text-slate-400">Henüz arkadaşın yok. "Oyuncu bul" sekmesinden arayıp istek gönderebilirsin.</p>
                                ) : (
                                    <ul className="space-y-1.5">
                                        {friends.friends.map(u => (
                                            <li key={u.id} className="flex items-center gap-2 bg-slate-900/50 p-2.5 rounded-lg text-sm">
                                                <button onClick={() => onOpenProfile(u.id)} className="flex-1 text-left font-bold text-white hover:underline">{u.username}</button>
                                                <button onClick={() => onOpenProfile(u.id)} className="btn btn-secondary !py-1 !px-2.5 text-xs">Profili gör</button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            {friends.outgoing.length > 0 && (
                                <div>
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Gönderdiğin istekler</h3>
                                    <ul className="space-y-1.5">
                                        {friends.outgoing.map(u => (
                                            <li key={u.id} className="flex items-center gap-2 bg-slate-900/50 p-2.5 rounded-lg text-sm">
                                                <button onClick={() => onOpenProfile(u.id)} className="flex-1 text-left text-slate-200 hover:underline">{u.username}</button>
                                                <button disabled={busy} onClick={() => post('/api/friends/remove', { userId: u.id })} className="btn btn-ghost !py-1 !px-2.5 text-xs">Geri çek</button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* OYUNCU BUL: yazdıkça öneri */}
                    {tab === 'search' && (
                        <div className="space-y-3">
                            <input type="search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus
                                placeholder="Oyuncu adı yaz…" className="input" aria-label="Oyuncu ara" />
                            {!searchQuery.trim() ? (
                                <p className="text-sm text-slate-400">Yazmaya başla, eşleşen oyuncular burada listelenir.</p>
                            ) : playerSearch.results.length === 0 ? (
                                <p className="text-sm text-slate-400">Eşleşen oyuncu yok.</p>
                            ) : (
                                <ul className="space-y-1.5">
                                    {playerSearch.results.map(u => (
                                        <li key={u.id}>
                                            <button onClick={() => onOpenProfile(u.id)}
                                                className="w-full flex items-center gap-3 bg-slate-900/50 hover:bg-slate-800 p-2.5 rounded-lg text-sm text-left transition-colors">
                                                <span className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-xs font-black text-slate-950 shrink-0">
                                                    {u.username.charAt(0).toUpperCase()}
                                                </span>
                                                <span className="flex-1 font-bold text-white">{u.username}{u.id === viewerId && <span className="text-slate-400 font-normal"> (sen)</span>}</span>
                                                <span className="text-xs text-slate-400">Profili gör →</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    {/* KULLANICI YÖNETİMİ (admin): yazdıkça öneri, sikke hediyesi, admin yetkisi */}
                    {tab === 'admin' && isSelf && viewerIsAdmin && (
                        <div className="space-y-3">
                            {adminMsg && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm p-2.5 rounded-lg">{adminMsg}</div>}
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input type="search" value={adminQuery} onChange={e => setAdminQuery(e.target.value)}
                                    placeholder="Kullanıcı adı yaz…" className="input" aria-label="Kullanıcı ara" />
                                <div className="flex items-center gap-2 text-sm shrink-0">
                                    <label htmlFor="gift-amount" className="text-slate-300">Hediye:</label>
                                    <input id="gift-amount" type="number" min={1} max={100000} value={giftAmount}
                                        onChange={e => setGiftAmount(e.target.value)} className="input !py-2 !w-28" />
                                    <span aria-hidden>💰</span>
                                </div>
                            </div>
                            <ul className="space-y-1.5">
                                {adminSearch.results.map(u => (
                                    <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/50 p-2.5 rounded-lg text-sm">
                                        <span>
                                            <button onClick={() => onOpenProfile(u.id)} className="text-white font-bold hover:underline">{u.username}</button>
                                            {u.isAdmin && <span className="badge bg-red-500/15 text-red-400 ml-2">ADMİN</span>}
                                            <span className="text-slate-500 ml-2">{u.gamesPlayed} oyun · 💰 {u.sikke ?? 0}</span>
                                        </span>
                                        <span className="flex gap-1.5">
                                            <button
                                                onClick={() => {
                                                    const amount = Number(giftAmount);
                                                    if (!Number.isInteger(amount) || amount < 1) { setAdminMsg('Geçerli bir sikke miktarı gir (1 veya daha fazla).'); return; }
                                                    setPendingGift({ target: u, amount });
                                                }}
                                                className="btn !py-1 !px-2.5 text-xs bg-amber-400/15 text-amber-300 hover:bg-amber-400/30">
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
            )}

            {/* Sikke hediyesi onayı (tarayıcının üstte açılan penceresi yerine) */}
            {pendingGift && (
                <Modal
                    title="Sikke gönder"
                    onClose={() => setPendingGift(null)}
                    maxWidth="max-w-sm"
                    footer={
                        <div className="flex gap-2 justify-end">
                            <button className="btn btn-ghost" onClick={() => setPendingGift(null)}>Vazgeç</button>
                            <button className="btn btn-primary" onClick={() => giveSikke(pendingGift.target, pendingGift.amount)}>Gönder</button>
                        </div>
                    }
                >
                    <p className="text-slate-300">
                        <strong className="text-white">{pendingGift.target.username}</strong> kullanıcısına <strong className="text-amber-300">{pendingGift.amount} sikke</strong> gönderilsin mi?
                    </p>
                </Modal>
            )}
        </div>
    );
}
