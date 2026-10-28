export type HomeTab = 'play' | 'profile' | 'store';

interface HomeHeaderProps {
  tab: HomeTab;
  onTabChange: (tab: HomeTab) => void;
  username: string;
  isAdmin: boolean;
  sikke: number | null;
  isConnected: boolean;
  onLogout: () => void;
}

const TABS: { id: HomeTab; label: string; icon: string }[] = [
  { id: 'play', label: 'Oyna', icon: '🎲' },
  { id: 'profile', label: 'Profil', icon: '📊' },
  { id: 'store', label: 'Mağaza', icon: '🛒' },
];

// Oyun dışı sayfaların üst menüsü (oyun içi başlık App.tsx'te ayrı)
export function HomeHeader({ tab, onTabChange, username, isAdmin, sikke, isConnected, onLogout }: HomeHeaderProps) {
  return (
    <header className="bg-slate-900/95 border-b border-slate-800 z-20 shrink-0">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-lg md:text-xl font-black tracking-[0.2em] text-amber-400">CUMOR</span>
          <span
            className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-500'}`}
            title={isConnected ? 'Sunucuya bağlı' : 'Bağlantı yok'}
            aria-label={isConnected ? 'Sunucuya bağlı' : 'Bağlantı yok'}
          />
        </div>

        <nav className="hidden md:flex items-center gap-1 ml-4" aria-label="Ana menü">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`btn !py-1.5 ${tab === t.id ? 'bg-slate-800 text-amber-400' : 'btn-ghost'}`}
            >
              <span aria-hidden>{t.icon}</span>{t.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => window.dispatchEvent(new Event('openCumorTutorial'))} className="btn btn-ghost !px-2.5 !py-1.5 text-xs" title="Nasıl oynanır?">
            <span aria-hidden>❓</span><span className="hidden sm:inline">Nasıl Oynanır</span>
          </button>
          <a href="/Cumor_Kural_Kitabi.pdf" target="_blank" rel="noopener noreferrer" className="btn btn-ghost !px-2.5 !py-1.5 text-xs" title="Kural kitabı (PDF)">
            <span aria-hidden>📖</span><span className="hidden sm:inline">Kural Kitabı</span>
          </a>
          {sikke !== null && (
            <span className="badge bg-amber-400/15 text-amber-300 border border-amber-400/30 !text-xs !py-1" title="Sikke bakiyen">
              💰 {isAdmin ? '∞' : sikke}
            </span>
          )}
          <span className="hidden sm:flex items-center gap-2 text-sm font-semibold text-slate-200">
            <span className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-xs font-black text-slate-950">
              {username.charAt(0).toUpperCase()}
            </span>
            {username}
            {isAdmin && <span className="badge bg-red-500/15 text-red-400">ADMİN</span>}
          </span>
          <button onClick={onLogout} className="btn btn-ghost !px-2.5 !py-1.5 text-xs" title="Çıkış yap">Çıkış</button>
        </div>
      </div>

      {/* Mobil: sekmeler ikinci satırda */}
      <nav className="md:hidden grid grid-cols-3 border-t border-slate-800" aria-label="Ana menü">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
            className={`py-2.5 text-sm font-bold flex items-center justify-center gap-1.5 border-b-2 ${tab === t.id ? 'text-amber-400 border-amber-400' : 'text-slate-400 border-transparent'}`}
          >
            <span aria-hidden>{t.icon}</span>{t.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
