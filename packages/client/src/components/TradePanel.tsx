import { useState } from 'react';
import { ResourceType, TradeOffer, Player, Building, BuildingType, Tile } from '@cumor/shared';
import { hexToPixel, getHexCorners } from '@cumor/shared';

// Kural Kitabına Göre Türkçe İsimler
const RESOURCE_NAMES: Record<ResourceType, string> = {
  [ResourceType.LUMBER]: 'KERESTE',
  [ResourceType.CONCRETE]: 'BETON',
  [ResourceType.TEXTILE]: 'TEKSTİL',
  [ResourceType.FOOD]: 'GIDA',
  [ResourceType.DIAMOND]: 'ELMAS',
  [ResourceType.GOLD]: 'ALTIN'
};

// ResourcePanel ile aynı ikonlar
const RESOURCE_ICONS: Record<ResourceType, string> = {
  [ResourceType.LUMBER]: '🌲',
  [ResourceType.CONCRETE]: '🧱',
  [ResourceType.TEXTILE]: '🐑',
  [ResourceType.FOOD]: '🌾',
  [ResourceType.DIAMOND]: '💎',
  [ResourceType.GOLD]: '💰'
};

// İhracat (Satış) Fiyatları: 1 kaynak sat → X altın kazan
const SELL_PRICES: Record<string, number> = {
  [ResourceType.FOOD]: 1,      // Tier 1: Temel
  [ResourceType.LUMBER]: 1,    // Tier 1
  [ResourceType.CONCRETE]: 2,  // Tier 2: Orta
  [ResourceType.TEXTILE]: 2,   // Tier 2
  [ResourceType.DIAMOND]: 3    // Tier 3: Nadir
};

interface TradePanelProps {
  onBankSell: (res: ResourceType) => void;
  onBankBuy: (res: ResourceType) => void;
  // P2P Props
  onCreateOffer: (give: Record<ResourceType, number>, want: Record<ResourceType, number>) => void;
  onAcceptOffer: () => void;
  onFinalizeTrade: (partnerId: string) => void;
  onCancelOffer: () => void;
  currentOffer: TradeOffer | null;
  myId: string;
  players: Player[];
  buildings: Building[];
  tiles: Tile[];
  onBuyVictoryPoint?: () => void;
  canBuyVP?: boolean;
  isMyTurn?: boolean; // YENİ: Sıra kontrolü - sadece sırası gelen ihracat/karaborsa yapabilir
}

// Arazi Tipine Göre Kaynak Haritası
const TERRAIN_RESOURCE_MAP: Partial<Record<string, ResourceType>> = {
  'forest': ResourceType.LUMBER,
  'hills': ResourceType.CONCRETE,
  'pasture': ResourceType.TEXTILE,
  'fields': ResourceType.FOOD,
  'mountains': ResourceType.DIAMOND
};

// Konum Bazlı Karaborsa Oranı Hesaplama
// Formül: SatışFiyatı × 2 + KonumVergisi (Şehir=+0, Köy=+1, Yol=+2, Yok=+3)
function getBlackMarketRate(myId: string, buildings: Building[], tiles: Tile[], targetResource: ResourceType): number {
  const baseSellPrice = SELL_PRICES[targetResource] || 1;
  const baseRate = baseSellPrice * 2;

  if (!tiles || !buildings || tiles.length === 0) return baseRate + 3;

  const HEX_SIZE = 50;
  let locationTax = 3; // Varsayılan: Hiçbir şey yok (+3)

  const targetTiles = tiles.filter(t => TERRAIN_RESOURCE_MAP[t.terrain] === targetResource);
  const myBuildings = buildings.filter(b => b.ownerId === myId);
  const myStructures = myBuildings.filter(b => b.type === BuildingType.SETTLEMENT || b.type === BuildingType.CITY);

  for (const tile of targetTiles) {
    const { x, y } = hexToPixel(tile.coord.q, tile.coord.r, HEX_SIZE);
    const tileCorners = getHexCorners(x, y, HEX_SIZE);

    for (const building of myStructures) {
      const { x: bx, y: by } = hexToPixel(building.coord.q, building.coord.r, HEX_SIZE);
      const buildingCorners = getHexCorners(bx, by, HEX_SIZE);
      const vIndex = building.coord.vertexIndex ?? 0;
      if (vIndex < 0 || vIndex >= 6) continue;
      const buildingPos = buildingCorners[vIndex];
      if (!buildingPos) continue;

      const isOnTile = tileCorners.some(corner => {
        const dx = corner.x - buildingPos.x;
        const dy = corner.y - buildingPos.y;
        return Math.sqrt(dx * dx + dy * dy) < 5;
      });

      if (isOnTile) {
        if (building.type === BuildingType.CITY) locationTax = Math.min(locationTax, 0);       // Şehir: +0
        else if (building.type === BuildingType.SETTLEMENT) locationTax = Math.min(locationTax, 1); // Köy: +1
      }
    }
  }

  // Yol varsa vergi +2 (bina yoksa)
  if (locationTax === 3 && myBuildings.some(b => b.type === BuildingType.ROAD)) {
    locationTax = 2;
  }

  return baseRate + locationTax;
}

export function TradePanelContent(props: TradePanelProps) {
  const [activeTab, setActiveTab] = useState<'bank' | 'p2p'>('bank');

  // Teklif Formu State'i (Altın dahil!)
  const initialResources = { [ResourceType.LUMBER]: 0, [ResourceType.CONCRETE]: 0, [ResourceType.TEXTILE]: 0, [ResourceType.FOOD]: 0, [ResourceType.DIAMOND]: 0, [ResourceType.GOLD]: 0 };
  const [giveState, setGiveState] = useState<Record<ResourceType, number>>({ ...initialResources });
  const [wantState, setWantState] = useState<Record<ResourceType, number>>({ ...initialResources });

  // P2P'de Altın dahil tüm kaynaklar
  const allResources = Object.values(ResourceType);
  // Banka işlemlerinde Altın hariç
  const resources = Object.values(ResourceType).filter(r => r !== ResourceType.GOLD);

  const updateAmount = (type: 'give' | 'want', res: ResourceType, delta: number) => {
    if (type === 'give') {
      setGiveState(prev => ({ ...prev, [res]: Math.max(0, prev[res] + delta) }));
    } else {
      setWantState(prev => ({ ...prev, [res]: Math.max(0, prev[res] + delta) }));
    }
  };

  return (
    <>
      {/* SEKMELER */}
      <div className="flex border-b border-slate-700 mb-4">
        <button onClick={() => setActiveTab('bank')} className={`flex-1 py-2 font-bold text-sm ${activeTab === 'bank' ? 'text-yellow-500 border-b-2 border-yellow-500' : 'text-gray-400'}`}>BANKA</button>
        <button onClick={() => setActiveTab('p2p')} className={`flex-1 py-2 font-bold text-sm ${activeTab === 'p2p' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}>OYUNCULAR</button>
      </div>

      {/* --- BANKA MODU --- */}
      {activeTab === 'bank' && (
        <div className="space-y-6">

          {/* İHRACAT (SATIŞ) */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-green-400 font-bold">İHRACAT (SAT)</span>
              <span className="text-[10px] text-gray-500">1 adet sat → altın kazan</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {resources.map(res => {
                const price = SELL_PRICES[res] || 1;
                const tierColor = price >= 3 ? 'text-purple-400' : price >= 2 ? 'text-blue-400' : 'text-green-400';
                return (
                  <button
                    key={`sell-${res}`}
                    onClick={() => props.onBankSell(res)}
                    disabled={!props.isMyTurn}
                    className={`bg-slate-800 hover:bg-green-900/50 p-2 rounded border border-slate-700 text-xs text-gray-300 flex flex-col items-center gap-1 transition-all ${!props.isMyTurn ? 'opacity-40 cursor-not-allowed' : ''}`}
                    title={!props.isMyTurn ? 'Sıra sende değil!' : `1 ${RESOURCE_NAMES[res]} satıp ${price} Altın kazan`}
                  >
                    <span className="font-bold text-white">{RESOURCE_NAMES[res]}</span>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                      <span>1 {RESOURCE_ICONS[res]}</span>
                      <span>→</span>
                      <span className={`font-bold ${tierColor}`}>{price} 💰</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* İTHALAT (KARABORSA) */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-red-400 font-bold">KARABORSA (AL)</span>
              <span className="text-[10px] text-gray-500">Altın → Kaynak</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {resources.map(res => {
                const rate = getBlackMarketRate(props.myId, props.buildings, props.tiles, res);
                return (
                  <button
                    key={`buy-${res}`}
                    onClick={() => props.onBankBuy(res)}
                    disabled={!props.isMyTurn}
                    className={`bg-slate-800 hover:bg-red-900/50 p-2 rounded border border-slate-700 text-xs text-gray-300 flex flex-col items-center gap-1 transition-all ${!props.isMyTurn ? 'opacity-40 cursor-not-allowed' : ''}`}
                    title={!props.isMyTurn ? 'Sıra sende değil!' : `${rate} Altın ödeyerek 1 ${RESOURCE_NAMES[res]} al`}
                  >
                    <span className="font-bold text-white">{RESOURCE_NAMES[res]}</span>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                      <span className="text-yellow-400 font-bold">{rate} 💰</span>
                      <span>→</span>
                      <span>1 {RESOURCE_ICONS[res]}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="text-[9px] text-gray-500 text-center mt-2 italic border-t border-slate-700 pt-1 space-y-0.5">
              <div>Fiyat = kaynağın değeri + konumuna göre vergi</div>
              <div>🏰Şehir: en ucuz · 🏠Köy: ucuz · 🛤️Yol: orta · ❌Yok: pahalı</div>
            </div>
          </div>

          {/* PUAN SATIN ALMA (YENİ) */}
          <div className="border-t border-slate-700 mt-4 pt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-yellow-400 font-bold">ZAFER PUANI 🏆</span>
              <span className="text-[10px] text-gray-500">33 Altın = 1 VP</span>
            </div>
            <button onClick={() => props.onBuyVictoryPoint?.()} disabled={!props.canBuyVP} className={`w-full py-3 rounded-lg font-black shadow-lg transition-transform active:scale-95 flex justify-center items-center gap-2 ${props.canBuyVP ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-slate-900 border-2 border-yellow-300' : 'bg-slate-800 text-gray-500 cursor-not-allowed border border-slate-700'}`}>
              <span className="text-xl">🏆</span>
              <span>PUAN SATIN AL (33 💰)</span>
            </button>
          </div>
        </div>
      )}

      {/* --- OYUNCU TAKASI MODU (P2P) --- */}
      {activeTab === 'p2p' && (
        <div className="space-y-4">

          {!props.currentOffer && (
            <>
              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                <div className="text-center text-xs text-green-400 font-bold mb-2">VERİLECEK (SEN)</div>
                <div className="grid grid-cols-2 gap-2">
                  {allResources.map(res => (
                    <div key={`give-${res}`} className="flex justify-between items-center bg-slate-900 px-2 py-1 rounded">
                      <span className="text-[10px]">{RESOURCE_NAMES[res]}</span>
                      <div className="flex gap-1 items-center">
                        <button onClick={() => updateAmount('give', res, -1)} className="text-red-500 font-bold px-1 hover:bg-slate-700 rounded">-</button>
                        <span className="text-xs w-4 text-center">{giveState[res]}</span>
                        <button onClick={() => updateAmount('give', res, 1)} className="text-green-500 font-bold px-1 hover:bg-slate-700 rounded">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                <div className="text-center text-xs text-blue-400 font-bold mb-2">İSTENEN (RAKİP)</div>
                <div className="grid grid-cols-2 gap-2">
                  {allResources.map(res => (
                    <div key={`want-${res}`} className="flex justify-between items-center bg-slate-900 px-2 py-1 rounded">
                      <span className="text-[10px]">{RESOURCE_NAMES[res]}</span>
                      <div className="flex gap-1 items-center">
                        <button onClick={() => updateAmount('want', res, -1)} className="text-red-500 font-bold px-1 hover:bg-slate-700 rounded">-</button>
                        <span className="text-xs w-4 text-center">{wantState[res]}</span>
                        <button onClick={() => updateAmount('want', res, 1)} className="text-green-500 font-bold px-1 hover:bg-slate-700 rounded">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  props.onCreateOffer(giveState, wantState);
                  setGiveState({ ...initialResources });
                  setWantState({ ...initialResources });
                }}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded shadow-lg text-sm transition-transform active:scale-95"
              >
                TEKLİFİ YAYINLA 📢
              </button>
            </>
          )}

          {props.currentOffer && (
            <div className="bg-slate-800 p-4 rounded-xl border border-blue-500/50 animate-pulse-slow relative">
              <div className="text-center font-bold text-white mb-3 pb-2 border-b border-slate-700">
                {props.currentOffer.offererId === props.myId ? "TEKLİFİN YAYINDA" : "YENİ TİCARET TEKLİFİ!"}
              </div>

              <div className="flex justify-between text-xs mb-4 bg-slate-900 p-3 rounded-lg">
                <div className="text-green-400">
                  <span className="block font-bold mb-1 text-[10px] uppercase text-gray-500">VERİYOR</span>
                  {Object.entries(props.currentOffer.give).map(([k, v]) => v > 0 && <div key={k} className="font-bold">+{v} {RESOURCE_NAMES[k as ResourceType]}</div>)}
                </div>
                <div className="border-l border-slate-700 mx-2"></div>
                <div className="text-blue-400 text-right">
                  <span className="block font-bold mb-1 text-[10px] uppercase text-gray-500">İSTİYOR</span>
                  {Object.entries(props.currentOffer.want).map(([k, v]) => v > 0 && <div key={k} className="font-bold">-{v} {RESOURCE_NAMES[k as ResourceType]}</div>)}
                </div>
              </div>

              {props.currentOffer.offererId === props.myId ? (
                <div>
                  <div className="text-xs text-gray-400 mb-2 font-bold">KABUL EDEN OYUNCULAR:</div>
                  {props.currentOffer.acceptors.length === 0 && <div className="text-xs italic text-gray-600 mb-3 text-center">Henüz kimse kabul etmedi...</div>}

                  <div className="flex flex-col gap-2 mb-3">
                    {props.currentOffer.acceptors.map(accId => {
                      const pName = props.players.find(p => p.id === accId)?.name || "Bilinmeyen";
                      return (
                        <button key={accId} onClick={() => props.onFinalizeTrade(accId)} className="bg-green-600 text-white text-xs py-2 px-3 rounded font-bold hover:bg-green-500 flex justify-between items-center">
                          <span>{pName}</span>
                          <span>İLE ANLAŞ ✅</span>
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={props.onCancelOffer} className="w-full bg-red-600/80 hover:bg-red-600 text-white text-xs py-2 rounded font-bold">
                    TEKLİFİ İPTAL ET ❌
                  </button>
                </div>
              ) : (
                <div>
                  {props.currentOffer.acceptors.includes(props.myId) ? (
                    <div className="bg-green-900/30 text-green-400 text-center text-xs p-3 rounded border border-green-500/30">
                      ✅ Teklifi kabul ettin.<br />Sahibinin onayı bekleniyor... ⏳
                    </div>
                  ) : (
                    <button onClick={props.onAcceptOffer} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded text-sm shadow-lg transition-transform active:scale-95">
                      KABUL ET 👍
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export function TradePanel(props: TradePanelProps) {
  return (
    <div className="hidden md:block absolute left-2 top-2 w-80 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-4 shadow-2xl z-40 max-h-[70vh] overflow-y-auto">
      <TradePanelContent {...props} />
    </div>
  );
}

export function MobileTradePanel(props: TradePanelProps & { onClose?: () => void }) {
  return (
    <div className="md:hidden fixed inset-0 w-full h-full bg-slate-900/95 backdrop-blur-md z-[100] p-4 pt-16 overflow-y-auto">
      <button 
        onClick={props.onClose}
        className="absolute top-4 right-4 bg-red-600 text-white p-2 rounded-full shadow-lg z-50 hover:bg-red-500 transition-colors"
      >
        ❌
      </button>
      <TradePanelContent {...props} />
    </div>
  );
}