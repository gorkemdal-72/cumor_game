import { useState, useEffect } from 'react';
import { COSMETICS_CATALOG, CosmeticItem, PlayerColor } from '@cumor/shared';
import { toast } from 'react-toastify';
import { BuildingShape } from './BuildingShape';
import { Modal } from './Modal';
import { Avatar } from './Avatar';
import { COLOR_NAMES } from './Lobby';

interface StorePanelProps {
  socketUrl: string;
  userId: string;
  token: string;
  sikke: number;
  isAdmin?: boolean; // Admin: sınırsız sikke, her şey ücretsiz
  equippedBuilding: string;
  equippedAvatar: string;
  onUpdate: () => void;
}

// Tasarımın köy, şehir ve yol önizlemesi (oyundaki çizimin aynısı)
function DesignPreview({ design, color }: { design: string; color: string }) {
  return (
    <svg viewBox="-70 -32 140 44" className="w-full h-28" role="img" aria-label="Bina önizlemesi">
      <g transform="translate(-42, 6)"><BuildingShape type="settlement" design={design} color={color} /></g>
      <g transform="translate(0, 6)"><BuildingShape type="city" design={design} color={color} /></g>
      <g transform="translate(44, 0) rotate(-30) scale(0.6)"><BuildingShape type="road" design={design} color={color} /></g>
    </svg>
  );
}

export function StorePanel({ socketUrl, userId, token, sikke, isAdmin = false, equippedBuilding, equippedAvatar, onUpdate }: StorePanelProps) {
  const [previewColor, setPreviewColor] = useState<string>(PlayerColor.BLUE);
  const [ownedIds, setOwnedIds] = useState<string[] | null>(null);
  const [confirmItem, setConfirmItem] = useState<CosmeticItem | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchOwnedItems = async () => {
    try {
      const res = await fetch(`${socketUrl}/api/user/cosmetics/${userId}`);
      const data = await res.json();
      setOwnedIds(data.success ? data.ownedIds : []);
    } catch (e) {
      console.error(e);
      setOwnedIds([]);
    }
  };

  useEffect(() => { fetchOwnedItems(); }, [userId]);

  const post = async (path: string, body: object) => {
    setBusy(true);
    try {
      const res = await fetch(`${socketUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...body })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchOwnedItems();
        onUpdate();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error('Sunucuya ulaşılamadı');
    } finally {
      setBusy(false);
    }
  };

  const buy = async (item: CosmeticItem) => {
    setConfirmItem(null);
    await post('/api/store/buy', { cosmeticId: item.id });
  };

  return (
    <div className="space-y-6">
      <section className="card p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-white">Mağaza</h1>
          <p className="text-sm text-slate-400 mt-1">Binalarının ve avatarının görünüşünü değiştir. Her oyun sikke kazandırır: galibiyet 10, katılım 2.</p>
        </div>
        <div className="badge bg-amber-400/15 text-amber-300 border border-amber-400/30 !text-base !px-4 !py-2 self-start sm:self-auto">
          💰 {isAdmin ? '∞ Sikke (Admin)' : `${sikke} Sikke`}
        </div>
      </section>

      <section className="card p-4 flex flex-wrap items-center gap-3" aria-label="Önizleme rengi">
        <span className="label !mb-0" id="preview-color-label">Önizleme rengi: {COLOR_NAMES[Object.entries(PlayerColor).find(([, v]) => v === previewColor)?.[0] ?? '']}</span>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="preview-color-label">
          {Object.entries(PlayerColor).map(([key, c]) => (
            <button key={c} type="button" role="radio" aria-checked={previewColor === c} aria-label={COLOR_NAMES[key]} title={COLOR_NAMES[key]}
              onClick={() => setPreviewColor(c)}
              className={`w-8 h-8 rounded-full border-2 transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${previewColor === c ? 'border-amber-400 scale-110' : 'border-slate-600 hover:scale-105'}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
        <span className="text-xs text-slate-500 w-full">Oyunda hangi rengi seçersen binaların ve avatarının arka planı o renk olur.</span>
      </section>

      {ownedIds === null ? (
        <div className="card p-8 text-center text-slate-400" role="status">Mağaza yükleniyor…</div>
      ) : (['building', 'avatar'] as const).map(type => (
        <section key={type} aria-label={type === 'building' ? 'Bina tasarımları' : 'Avatarlar'}>
          <h2 className="text-lg font-black text-white mb-3">{type === 'building' ? 'Bina Tasarımları' : 'Avatarlar'}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {COSMETICS_CATALOG.filter(c => c.type === type).map(item => {
              const isOwned = item.price === 0 || ownedIds.includes(item.id);
              const isEquipped = (type === 'building' ? equippedBuilding : equippedAvatar) === item.id;
              const canAfford = isAdmin || sikke >= item.price;

              return (
                <article key={item.id} className={`card p-4 flex flex-col ${isEquipped ? '!border-emerald-500/70' : ''}`}>
                  <div className="bg-slate-900/70 rounded-xl border border-slate-700/60 mb-4 h-28 flex items-center justify-center">
                    {type === 'building'
                      ? <DesignPreview design={item.id} color={previewColor} />
                      : <Avatar avatar={item.id} color={previewColor} size={88} label={`${item.name} avatarı`} />}
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-bold text-white">{item.name}</h3>
                    {isEquipped
                      ? <span className="badge bg-emerald-500/15 text-emerald-400">Kullanılıyor</span>
                      : isOwned && <span className="badge bg-slate-500/20 text-slate-300">Sahipsin</span>}
                  </div>
                  <p className="text-sm text-slate-400 mt-1 mb-4 flex-1">{item.description}</p>

                  {isOwned ? (
                    <button onClick={() => post('/api/user/equip', { cosmeticId: item.id, type: item.type })}
                      disabled={isEquipped || busy} className="btn btn-secondary w-full">
                      {isEquipped ? 'Kuşanıldı ✓' : 'Kuşan'}
                    </button>
                  ) : (
                    <button onClick={() => setConfirmItem(item)} disabled={!canAfford || busy} className="btn btn-primary w-full"
                      title={canAfford ? undefined : `${item.price - sikke} sikke daha gerekiyor`}>
                      {canAfford ? `Satın al · ${item.price} 💰` : `${item.price} 💰 · ${item.price - sikke} eksik`}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}

      {confirmItem && (
        <Modal
          title="Satın almayı onayla"
          onClose={() => setConfirmItem(null)}
          maxWidth="max-w-sm"
          footer={
            <div className="flex gap-2 justify-end">
              <button className="btn btn-ghost" onClick={() => setConfirmItem(null)}>Vazgeç</button>
              <button className="btn btn-primary" onClick={() => buy(confirmItem)} disabled={busy}>Satın al</button>
            </div>
          }
        >
          <p className="text-slate-300">
            <strong className="text-white">{confirmItem.name}</strong> {confirmItem.type === 'avatar' ? 'avatarını' : 'tasarımını'} <strong className="text-amber-300">{confirmItem.price} sikke</strong> karşılığında almak istiyor musun?
          </p>
          <p className="text-sm text-slate-500 mt-2">Kalan bakiye: {isAdmin ? '∞ (Admin — sikke sınırsız)' : `${sikke - confirmItem.price} sikke`}</p>
        </Modal>
      )}
    </div>
  );
}
