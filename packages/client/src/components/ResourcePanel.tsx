import { ResourceType, DevCardType } from '@cumor/shared';
import { CARD_INFO, RESOURCE_INFO } from '../gameInfo';

// Kart/kaynak adları, ikonları ve açıklamaları tek kaynaktan (gameInfo.ts)

interface ResourcePanelProps {
  resources: Record<ResourceType, number>;
  devCards: Record<DevCardType, number>;
  onPlayCard: (card: DevCardType) => void; // YENİ PROP
  isMyTurn: boolean; // YENİ: Sadece sıra bizdeyse oynayabilelim
}

export function DevCardContent({ devCards, onPlayCard, isMyTurn, showDescriptions = false }: { devCards: Record<DevCardType, number>, onPlayCard: (card: DevCardType) => void, isMyTurn: boolean, showDescriptions?: boolean }) {
  const owned = Object.values(DevCardType).filter(type => (devCards?.[type] || 0) > 0);

  if (owned.length === 0) {
    return <div className="text-xs text-purple-200 font-bold self-center px-2 text-center">Kartın yok<br /><span className="font-normal text-purple-300/80">1💎 1🐑 1🌾 ile kart alabilirsin</span></div>;
  }

  return (
    <div className={showDescriptions ? 'flex flex-col gap-3 w-full' : 'flex gap-3 h-28 items-start'}>
      {owned.map(type => {
        const info = CARD_INFO[type];
        const count = devCards[type];
        const action = info.playable ? (
          isMyTurn && (
            <button
              onClick={() => onPlayCard(type)}
              className="bg-green-500 hover:bg-green-400 text-white text-[10px] font-bold py-1 px-2 rounded shadow transition-colors mt-1"
              aria-label={`${info.name} kartını kullan`}
            >
              KULLAN
            </button>
          )
        ) : (
          <span className="text-[9px] text-purple-200 mt-1" title="Bu kart oynanmaz, otomatik çalışır">PASİF</span>
        );

        // MOBİL: hover yok, açıklama kartın yanında yazılı
        if (showDescriptions) {
          return (
            <div key={type} className="flex gap-3 items-start bg-slate-900/60 rounded-xl p-3 border border-purple-500/30">
              <div className="text-3xl shrink-0" aria-hidden>{info.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white text-sm">{info.name} <span className="text-purple-300">×{count}</span></div>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{info.desc}</p>
              </div>
              <div className="shrink-0 self-center">{action}</div>
            </div>
          );
        }

        // MASAÜSTÜ: üzerine gelince açıklama balonu
        return (
          <div key={type} className="flex flex-col items-center justify-between h-full min-w-[56px] group relative" tabIndex={0} aria-label={`${info.name}: ${info.desc}`}>
            <div className="flex flex-col items-center cursor-help">
              <div className="text-2xl mb-1" aria-hidden>{info.icon}</div>
              <div className="font-black text-white text-sm bg-purple-700 rounded-full w-5 h-5 flex items-center justify-center -mt-2 border border-purple-400">
                {count}
              </div>
              <div className="text-[9px] text-purple-200 mt-0.5 whitespace-nowrap">{info.name}</div>
            </div>
            {action}
            <div role="tooltip" className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 p-2.5 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity pointer-events-none z-50 text-left shadow-xl border border-purple-500/40">
              <div className="font-bold text-purple-300 mb-1">{info.icon} {info.name}</div>
              {info.desc}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ResourcePanelContent({ resources, devCards, onPlayCard, isMyTurn, showCards = true }: ResourcePanelProps & { showCards?: boolean }) {
  return (
    <>
      {/* KAYNAKLAR (üzerine gelince adı ve nereden geldiği) */}
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 px-2.5 py-2 md:p-3 rounded-2xl shadow-2xl flex gap-1.5 md:gap-4 h-20 md:h-24 items-center">
        {Object.values(ResourceType).map(type => {
          const info = RESOURCE_INFO[type];
          return (
            <div key={type} className="flex flex-col items-center min-w-[46px] md:min-w-[50px] relative group" tabIndex={0} aria-label={`${info.name}: ${resources[type]} adet. ${info.source}`}>
              <div className="text-xl md:text-2xl md:mb-1" aria-hidden>{info.icon}</div>
              <div className={`font-black text-base md:text-lg leading-tight ${type === ResourceType.GOLD ? 'text-yellow-400' : 'text-white'}`}>
                {resources[type] ?? 0}
              </div>
              <div className="text-[9px] text-slate-400 leading-none">{info.name}</div>
              <div role="tooltip" className="hidden md:block absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-44 p-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity pointer-events-none z-50 text-center shadow-xl border border-slate-600">
                <div className="font-bold">{info.icon} {info.name}</div>
                <div className="text-slate-300 mt-0.5">{info.source}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* KARTLAR (İsteğe bağlı - PC'de var, Mobilde yok) */}
      {showCards && (
        <div className="bg-purple-900/95 backdrop-blur-md border border-purple-500 p-3 rounded-2xl shadow-2xl">
           <DevCardContent devCards={devCards} onPlayCard={onPlayCard} isMyTurn={isMyTurn} />
        </div>
      )}
    </>
  );
}

export function ResourcePanel(props: ResourcePanelProps) {
  return (
    <div className="hidden md:flex fixed bottom-1 left-1/2 -translate-x-1/2 gap-4 z-50 items-end">
      <ResourcePanelContent {...props} showCards={true} />
    </div>
  );
}

export function MobileResourcePanel(props: ResourcePanelProps) {
  return (
    <div className="md:hidden fixed bottom-20 left-1/2 -translate-x-1/2 flex gap-4 z-50 items-end">
      <ResourcePanelContent {...props} showCards={false} />
    </div>
  );
}

export function MobileDevCardPanel({ devCards, onPlayCard, isMyTurn, onClose }: ResourcePanelProps & { onClose?: () => void }) {
  return (
    <div className="md:hidden fixed inset-0 w-full h-full bg-purple-900/95 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6">
       <button 
        onClick={onClose}
        className="absolute top-4 right-4 bg-red-600 text-white p-2 rounded-full shadow-lg z-50 hover:bg-red-500 transition-colors"
      >
        ❌
      </button>
      <h2 className="text-2xl font-bold text-white mb-6">Gelişim Kartları</h2>
      <div className="bg-slate-800 p-4 rounded-2xl border border-purple-500 w-full max-w-sm max-h-[70vh] overflow-y-auto flex flex-col items-center gap-3">
        <DevCardContent devCards={devCards} onPlayCard={onPlayCard} isMyTurn={isMyTurn} showDescriptions />
        <p className="text-[11px] text-slate-400 text-center">Tüm kartların açıklaması için üstteki ❓ Yardım menüsüne bak.</p>
      </div>
    </div>
  );
}