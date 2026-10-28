import { useEffect } from 'react';
import { DevCardType } from '@cumor/shared';
import { CARD_INFO, FAQ } from '../gameInfo';

// Oyun içi yardım: SSS + tüm gelişim kartları. Masaüstünde sağdan panel, telefonda tam ekran.
export function GameHelpPanel({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[95] flex justify-end bg-black/40" onClick={onClose}>
      <aside
        role="dialog"
        aria-label="Yardım ve SSS"
        onClick={e => e.stopPropagation()}
        className="w-full md:w-[400px] h-full bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 shrink-0">
          <h2 className="text-lg font-bold text-white">❓ Yardım ve SSS</h2>
          <button onClick={onClose} className="btn btn-ghost !px-2 !py-1" aria-label="Kapat">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <section>
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Sık sorulan sorular</h3>
            <div className="space-y-2">
              {FAQ.map((item, i) => (
                <details key={i} className="group bg-slate-800/60 border border-slate-700 rounded-xl" open={i === 0}>
                  <summary className="cursor-pointer list-none px-3 py-2.5 font-semibold text-sm text-white flex items-center justify-between gap-2">
                    {item.q}
                    <span className="text-slate-500 text-xs group-open:rotate-90 transition-transform" aria-hidden>▶</span>
                  </summary>
                  <ul className="px-3 pb-3 space-y-1.5 text-sm text-slate-300 leading-relaxed">
                    {item.a.map((line, j) => <li key={j}>{line}</li>)}
                  </ul>
                </details>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-2">Gelişim kartları</h3>
            <ul className="space-y-2">
              {Object.values(DevCardType).map(type => {
                const info = CARD_INFO[type];
                return (
                  <li key={type} className="flex gap-3 bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                    <span className="text-2xl shrink-0" aria-hidden>{info.icon}</span>
                    <div>
                      <div className="font-bold text-sm text-white">
                        {info.name}
                        {!info.playable && <span className="badge bg-slate-600/40 text-slate-300 ml-2">Pasif</span>}
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{info.desc}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-slate-500 mt-2">Kart fiyatı: 1 Elmas + 1 Tekstil + 1 Gıda. Aldığın kartı bir sonraki turunda oynayabilirsin.</p>
          </section>

          <section className="flex flex-col sm:flex-row gap-2">
            <button onClick={() => { onClose(); window.dispatchEvent(new Event('openCumorTutorial')); }} className="btn btn-secondary flex-1">
              Tanıtımı tekrar izle
            </button>
            <a href="/Cumor_Kural_Kitabi.pdf" target="_blank" rel="noopener noreferrer" className="btn btn-secondary flex-1">📖 Kural kitabı</a>
          </section>
        </div>
      </aside>
    </div>
  );
}
