import { useState } from 'react';

interface AuthScreenProps {
    socketUrl: string;
    onAuth: (data: { token: string; userId: string; username: string; isAdmin: boolean }) => void;
}

export function AuthScreen({ socketUrl, onAuth }: AuthScreenProps) {
    const [tab, setTab] = useState<'login' | 'register' | 'forgot' | 'verify'>('login');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [error, setError] = useState('');
    const [msg, setMsg] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        setError('');
        setMsg('');
        setLoading(true);
        try {
            if (tab === 'forgot') {
                const res = await fetch(`${socketUrl}/api/forgot`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: username.trim() })
                });
                const data = await res.json();
                if (!data.success) throw new Error(data.message);
                setMsg('Şifre sıfırlama bağlantısı e-postanıza gönderildi!');
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
                setMsg('E-postanız başarıyla doğrulandı. Şimdi giriş yapabilirsiniz!');
                setTab('login');
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
                setMsg(data.message);
                setTab('verify');
                return;
            }

            // Token'ı localStorage'a kaydet
            localStorage.setItem('cumor_token', data.token);
            localStorage.setItem('cumor_userId', data.userId);
            localStorage.setItem('cumor_username', username.trim());

            onAuth({
                token: data.token,
                userId: data.userId,
                username: username.trim(),
                isAdmin: data.isAdmin
            });
        } catch (e: any) {
            setError(e.message || 'Bir hata oluştu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="w-[420px] bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
                {/* HEADER */}
                <div className="bg-gradient-to-r from-blue-600/30 to-purple-600/30 p-8 text-center border-b border-slate-700/50">
                    <h1 className="text-4xl font-black text-white tracking-widest mb-1">CUMOR</h1>
                    <p className="text-slate-400 text-sm">Strateji Masa Oyunu</p>
                </div>

                {/* TABS (Verify ekranında sekmeleri gizleyelim) */}
                {tab !== 'verify' && (
                    <div className="flex border-b border-slate-700/50">
                        <button
                            onClick={() => { setTab('login'); setError(''); }}
                            className={`flex-1 py-3 font-bold text-sm transition-all ${tab === 'login'
                                    ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5'
                                    : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            GİRİŞ YAP
                        </button>
                        <button
                            onClick={() => { setTab('register'); setError(''); }}
                            className={`flex-1 py-3 font-bold text-sm transition-all ${tab === 'register'
                                    ? 'text-green-400 border-b-2 border-green-400 bg-green-500/5'
                                    : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            KAYIT OL
                        </button>
                    </div>
                )}

                {/* FORM */}
                <div className="p-6 space-y-4">
                    {tab === 'verify' ? (
                        <>
                            <div className="text-center mb-4">
                                <h2 className="text-lg font-bold text-white mb-2">E-posta Doğrulama</h2>
                                <p className="text-sm text-slate-400">
                                    Lütfen <b>{email}</b> adresine gönderilen 6 haneli doğrulama kodunu girin.
                                </p>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">Doğrulama Kodu</label>
                                <input
                                    type="text"
                                    maxLength={6}
                                    value={verificationCode}
                                    onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                    onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                                    className="w-full p-3 bg-slate-900/50 text-white rounded-lg border border-slate-600/50 outline-none focus:border-blue-500 transition-colors placeholder-slate-600 text-center text-2xl tracking-widest font-mono"
                                    placeholder="------"
                                    autoFocus
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            {(tab === 'register' || tab === 'forgot') && (
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">E-posta</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                                        className="w-full p-3 bg-slate-900/50 text-white rounded-lg border border-slate-600/50 outline-none focus:border-blue-500 transition-colors placeholder-slate-600"
                                        placeholder="E-posta adresini gir"
                                    />
                                </div>
                            )}

                            {tab !== 'forgot' && (
                                <div>
                                    <label className="text-xs text-slate-400 block mb-1">Kullanıcı Adı</label>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={e => setUsername(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                                        className="w-full p-3 bg-slate-900/50 text-white rounded-lg border border-slate-600/50 outline-none focus:border-blue-500 transition-colors placeholder-slate-600"
                                        placeholder="Kullanıcı adını gir"
                                        autoFocus={tab === 'login'}
                                    />
                                </div>
                            )}

                            {tab !== 'forgot' && (
                                <div>
                                    <div className="flex justify-between items-end mb-1">
                                        <label className="text-xs text-slate-400 block">Şifre</label>
                                        {tab === 'login' && (
                                            <button
                                                onClick={() => { setTab('forgot'); setError(''); }}
                                                className="text-[10px] text-blue-400 hover:text-blue-300"
                                            >
                                                Şifremi Unuttum
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                                        className="w-full p-3 bg-slate-900/50 text-white rounded-lg border border-slate-600/50 outline-none focus:border-blue-500 transition-colors placeholder-slate-600"
                                        placeholder={tab === 'register' ? 'En az 8 karakter (harf + rakam)' : 'Şifreni gir'}
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-lg animate-pulse">
                            ❌ {error}
                        </div>
                    )}
                    {msg && (
                        <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm p-3 rounded-lg">
                            ✅ {msg}
                        </div>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={loading || 
                            (tab === 'verify' && verificationCode.length !== 6) ||
                            (tab === 'login' && (!username.trim() || !password)) || 
                            (tab === 'register' && (!username.trim() || !password || !email.trim())) ||
                            (tab === 'forgot' && !username.trim())
                        }
                        className={`w-full py-3 rounded-lg font-bold text-white transition-all ${tab === 'login'
                                ? 'bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/50'
                                : tab === 'register' ? 'bg-green-600 hover:bg-green-500 disabled:bg-green-800/50'
                                : tab === 'verify' ? 'bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/50'
                                : 'bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800/50'
                            } disabled:cursor-not-allowed shadow-lg`}
                    >
                        {loading ? '⏳ Bekleyin...' : tab === 'login' ? '🔑 Giriş Yap' : tab === 'register' ? '📝 Kayıt Ol' : tab === 'verify' ? '✅ Kodu Onayla' : 'Sıfırlama Gönder'}
                    </button>

                    <p className="text-center text-slate-500 text-xs mt-2">
                        {tab === 'login' && (
                            <>Hesabın yok mu? <span onClick={() => { setTab('register'); setError(''); setMsg(''); }} className="text-green-400 cursor-pointer hover:underline">Kayıt Ol</span></>
                        )}
                        {tab === 'register' && (
                            <>Zaten hesabın var mı? <span onClick={() => { setTab('login'); setError(''); setMsg(''); }} className="text-blue-400 cursor-pointer hover:underline">Giriş Yap</span></>
                        )}
                        {(tab === 'forgot' || tab === 'verify') && (
                            <><span onClick={() => { setTab('login'); setError(''); setMsg(''); }} className="text-blue-400 cursor-pointer hover:underline">← Giriş Ekranına Dön</span></>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
}
