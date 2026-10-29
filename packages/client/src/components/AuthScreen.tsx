import { useState } from 'react';

interface AuthScreenProps {
    socketUrl: string;
    onAuth: (data: { token: string; userId: string; username: string; isAdmin: boolean }) => void;
}

export function AuthScreen({ socketUrl, onAuth }: AuthScreenProps) {
    // 'verify': e-posta doğrulaması açıldığında kullanılır (sunucuda EMAIL_VERIFICATION_ENABLED)
    // 'forgot' → 'reset': şifremi unuttum (e-postaya kod, sonra kod + yeni şifre)
    const [tab, setTab] = useState<'login' | 'register' | 'verify' | 'forgot' | 'reset'>('login');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newPassword2, setNewPassword2] = useState('');
    const [error, setError] = useState('');
    const [msg, setMsg] = useState('');
    const [loading, setLoading] = useState(false);

    const switchTab = (t: typeof tab) => { setTab(t); setError(''); setMsg(''); };

    const canSubmit = !loading && (
        tab === 'verify' ? verificationCode.length === 6
            : tab === 'forgot' ? !!username.trim()
            : tab === 'reset' ? verificationCode.length === 6 && !!newPassword && newPassword === newPassword2
            : tab === 'login' ? !!username.trim() && !!password
                : !!username.trim() && !!password && !!email.trim()
    );

    // Şifre sıfırlama kodu iste (ilk istek ve "kodu tekrar gönder" aynı yolu kullanır)
    const requestResetCode = async () => {
        const res = await fetch(`${socketUrl}/api/forgot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: username.trim() })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        setTab('reset');
        setError('');
        setMsg(data.message);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        setError('');
        setMsg('');
        setLoading(true);
        try {
            if (tab === 'forgot') {
                await requestResetCode();
                return;
            }

            if (tab === 'reset') {
                const res = await fetch(`${socketUrl}/api/reset-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier: username.trim(), code: verificationCode.trim(), newPassword })
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.message);
                switchTab('login');
                setMsg(data.message);
                setPassword(''); setNewPassword(''); setNewPassword2(''); setVerificationCode('');
                return;
            }

            if (tab === 'verify') {
                const res = await fetch(`${socketUrl}/api/verify-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email.trim(), code: verificationCode.trim() })
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.message);
                switchTab('login');
                setMsg('E-postan doğrulandı. Şimdi giriş yapabilirsin!');
                setPassword('');
                return;
            }

            const endpoint = tab === 'login' ? '/api/login' : '/api/register';
            const res = await fetch(`${socketUrl}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username.trim(), password, email: email.trim() })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.message);

            if (tab === 'register') {
                switchTab('login'); // E-posta doğrulaması açılınca: switchTab('verify')
                setMsg(data.message);
                return;
            }

            // Token'ı localStorage'a kaydet (e-postayla girilse de hesap adı gösterilsin)
            const displayName = data.username || username.trim();
            localStorage.setItem('cumor_token', data.token);
            localStorage.setItem('cumor_userId', data.userId);
            localStorage.setItem('cumor_username', displayName);

            onAuth({
                token: data.token,
                userId: data.userId,
                username: displayName,
                isAdmin: data.isAdmin
            });
        } catch (e: any) {
            setError(e.message === 'Failed to fetch' ? 'Sunucuya ulaşılamadı. Biraz sonra tekrar dene.' : (e.message || 'Bir hata oluştu'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.12),transparent_60%)] flex items-center justify-center p-4">
            <div className="w-full max-w-[420px]">
                <div className="text-center mb-8">
                    <h1 className="text-4xl md:text-5xl font-black tracking-[0.25em] text-amber-400">CUMOR</h1>
                    <p className="text-slate-400 text-sm mt-2">İnşa et, ticaret yap, adaya hükmet.</p>
                </div>

                <div className="card overflow-hidden">
                    {(tab === 'login' || tab === 'register') && (
                        <div className="grid grid-cols-2 border-b border-slate-700" role="tablist">
                            {(['login', 'register'] as const).map(t => (
                                <button key={t} role="tab" aria-selected={tab === t} onClick={() => switchTab(t)}
                                    className={`py-3.5 font-bold text-sm border-b-2 -mb-px transition-colors ${tab === t ? 'text-amber-400 border-amber-400 bg-amber-400/5' : 'text-slate-400 border-transparent hover:text-white'}`}>
                                    {t === 'login' ? 'Giriş yap' : 'Kayıt ol'}
                                </button>
                            ))}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
                        {tab === 'forgot' ? (
                            <>
                                <div className="text-center">
                                    <h2 className="text-lg font-bold text-white mb-1">Şifremi unuttum</h2>
                                    <p className="text-sm text-slate-400">Hesabının e-postasına 6 haneli bir sıfırlama kodu göndereceğiz.</p>
                                </div>
                                <div>
                                    <label htmlFor="identifier" className="label">E-posta veya kullanıcı adı</label>
                                    <input id="identifier" type="text" autoComplete="username" value={username} autoFocus
                                        onChange={e => setUsername(e.target.value)} className="input" placeholder="ornek@mail.com" />
                                </div>
                            </>
                        ) : tab === 'reset' ? (
                            <>
                                <div className="text-center">
                                    <h2 className="text-lg font-bold text-white mb-1">Yeni şifre belirle</h2>
                                    <p className="text-sm text-slate-400">E-postana gelen 6 haneli kodu ve yeni şifreni gir. Kod 15 dakika geçerli.</p>
                                </div>
                                <div>
                                    <label htmlFor="reset-code" className="label">Sıfırlama kodu</label>
                                    <input id="reset-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                                        value={verificationCode} onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                        className="input text-center text-2xl tracking-[0.5em] font-mono" placeholder="------" autoFocus />
                                </div>
                                <div>
                                    <label htmlFor="new-password" className="label">Yeni şifre</label>
                                    <input id="new-password" type="password" autoComplete="new-password" value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)} className="input" placeholder="En az 8 karakter, harf ve rakam" />
                                </div>
                                <div>
                                    <label htmlFor="new-password2" className="label">Yeni şifre (tekrar)</label>
                                    <input id="new-password2" type="password" autoComplete="new-password" value={newPassword2}
                                        onChange={e => setNewPassword2(e.target.value)} className="input" />
                                    {newPassword2 && newPassword !== newPassword2 && <p className="text-xs text-red-300 mt-1.5">Şifreler aynı değil.</p>}
                                </div>
                            </>
                        ) : tab === 'verify' ? (
                            <>
                                <div className="text-center">
                                    <h2 className="text-lg font-bold text-white mb-1">E-posta doğrulama</h2>
                                    <p className="text-sm text-slate-400"><b className="text-slate-200">{email}</b> adresine gönderilen 6 haneli kodu gir.</p>
                                </div>
                                <div>
                                    <label htmlFor="code" className="label">Doğrulama kodu</label>
                                    <input id="code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
                                        value={verificationCode} onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                        className="input text-center text-2xl tracking-[0.5em] font-mono" placeholder="------" autoFocus />
                                </div>
                            </>
                        ) : (
                            <>
                                {tab === 'register' && (
                                    <div>
                                        <label htmlFor="email" className="label">E-posta</label>
                                        <input id="email" type="email" autoComplete="email" value={email}
                                            onChange={e => setEmail(e.target.value)} className="input" placeholder="ornek@mail.com" />
                                    </div>
                                )}
                                <div>
                                    <label htmlFor="username" className="label">{tab === 'login' ? 'Kullanıcı adı veya e-posta' : 'Kullanıcı adı'}</label>
                                    <input id="username" type="text" autoComplete="username" value={username} autoFocus
                                        maxLength={tab === 'register' ? 20 : undefined}
                                        onChange={e => setUsername(e.target.value)} className="input"
                                        placeholder={tab === 'login' ? 'kullaniciadi' : 'Harf, rakam veya _'} />
                                    {tab === 'register' && <p className="text-xs text-slate-500 mt-1.5">2–20 karakter; harf, rakam ve _ kullanılabilir.</p>}
                                </div>
                                <div>
                                    <div className="flex items-baseline justify-between">
                                        <label htmlFor="password" className="label">Şifre</label>
                                        {tab === 'login' && (
                                            <button type="button" onClick={() => switchTab('forgot')} className="text-xs text-amber-400 hover:text-amber-300 hover:underline">
                                                Şifremi unuttum
                                            </button>
                                        )}
                                    </div>
                                    <input id="password" type="password" autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                                        value={password} onChange={e => setPassword(e.target.value)} className="input"
                                        placeholder={tab === 'register' ? 'En az 8 karakter, harf ve rakam' : '••••••••'} />
                                </div>
                            </>
                        )}

                        {error && (
                            <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm p-3 rounded-lg">{error}</div>
                        )}
                        {msg && (
                            <div role="status" className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm p-3 rounded-lg">{msg}</div>
                        )}

                        <button type="submit" disabled={!canSubmit} className="btn btn-primary w-full !py-3">
                            {loading ? 'Bekleyin…' : tab === 'login' ? 'Giriş yap' : tab === 'register' ? 'Hesap oluştur' : tab === 'forgot' ? 'Kod gönder' : tab === 'reset' ? 'Şifreyi değiştir' : 'Kodu onayla'}
                        </button>

                        {tab === 'reset' && (
                            <button type="button" disabled={loading}
                                onClick={async () => { setLoading(true); try { await requestResetCode(); } catch (e: any) { setError(e.message); } finally { setLoading(false); } }}
                                className="btn btn-ghost w-full">Kod gelmedi mi? Tekrar gönder</button>
                        )}
                        {(tab === 'verify' || tab === 'forgot' || tab === 'reset') && (
                            <button type="button" onClick={() => switchTab('login')} className="btn btn-ghost w-full">← Giriş ekranına dön</button>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}
