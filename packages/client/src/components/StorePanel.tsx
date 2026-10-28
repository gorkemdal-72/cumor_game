import { useState, useEffect } from 'react';
import { COSMETICS_CATALOG, CosmeticItem } from '@cumor/shared';
import { toast } from 'react-toastify';
import { BuildingShape } from './BuildingShape';
import { Modal } from './Modal';

interface StorePanelProps {
  socketUrl: string;
  userId: string;
  token: string;
  sikke: number;
  equippedBuilding: string;
  onUpdate: () => void;
}

const PREVIEW_COLOR = '#3b82f6';

// Tasarımın köy, şehir ve yol önizlemesi (oyundaki çizimin aynısı)
function DesignPreview({ design }: { design: string }) {
  return (
    <svg viewBox="-70 -32 140 44" className="w-full h-28" role="img" aria-label="Bina önizlemesi">
      <g transform="translate(-42, 6)"><BuildingShape type="settlement" design={design} color={PREVIEW_COLOR} /></g>
      <g transform="translate(0, 6)"><BuildingShape type="city" design={design} color={PREVIEW_COLOR} /></g>
      <g transform="translate(44, 0) rotate(-30) scale(0.6)"><BuildingShape type="road" design={design} color={PREVIEW_COLOR} /></g>
    </svg>
  );
}

export function StorePanel({ socketUrl, userId, token, sikke, equippedBuilding, onUpdate }: StorePanelProps) {
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
          <p className="text-sm text-slate-400 mt-1">Binalarının görünüşünü değiştir. Her oyun sikke kazandırır: galibiyet 10, katılım 2.</p>
        </div>
        <div className="badge bg-amber-400/15 text-amber-300 border border-amber-400/30 !text-base !px-4 !py-2 self-start sm:self-auto">
          💰 {sikke} Sikke
        </div>
      </section>

      {ownedIds === null ? (
        <div className="card p-8 text-center text-slate-400" role="status">Mağaza yükleniyor…</div>
      ) : (
        <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-label="Bina tasarımları">
          {COSMETICS_CATALOG.filter(c => c.type === 'building').map(item => {
            const isOwned = item.id === 'default' || ownedIds.includes(item.id);
            const isEquipped = equippedBuilding === item.id;
            const canAfford = sikke >= item.price;

            return (
              <article key={item.id} className={`card p-4 flex flex-col ${isEquipped ? '!border-emerald-500/70' : ''}`}>
                <div className="bg-slate-900/70 rounded-xl border border-slate-700/60 mb-4">
                  <DesignPreview design={item.id} />
                </div>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-bold text-white">{item.name}</h2>
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
        </section>
      )}

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
            <strong className="text-white">{confirmItem.name}</strong> tasarımını <strong className="text-amber-300">{confirmItem.price} sikke</strong> karşılığında almak istiyor musun?
          </p>
          <p className="text-sm text-slate-500 mt-2">Kalan bakiye: {sikke - confirmItem.price} sikke</p>
        </Modal>
      )}
    </div>
  );
}
