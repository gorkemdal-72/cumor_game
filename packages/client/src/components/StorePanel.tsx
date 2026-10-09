import React, { useState, useEffect } from 'react';
import { COSMETICS_CATALOG, CosmeticItem } from '@cumor/shared';
import { toast } from 'react-toastify';

interface StorePanelProps {
  userId: string;
  token: string;
  sikke: number;
  equippedBuilding: string;
  onUpdate: () => void;
  onClose: () => void;
}

export function StorePanel({ userId, token, sikke, equippedBuilding, onUpdate, onClose }: StorePanelProps) {
  const [ownedIds, setOwnedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Use the same server URL logic as App.tsx
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const apiUrl = isLocal ? 'http://localhost:3001' : 'https://cumor-game.onrender.com';


  useEffect(() => {
    fetchOwnedItems();
  }, []);

  const fetchOwnedItems = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/user/cosmetics/${userId}`);
      const data = await res.json();
      if (data.success) {
        setOwnedIds(data.ownedIds);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (item: CosmeticItem) => {
    if (sikke < item.price) {
      toast.error('Yetersiz Sikke!');
      return;
    }
    
    if (window.confirm(`"${item.name}" eşyasını ${item.price} Sikke karşılığında almak istiyor musunuz?`)) {
      try {
        const res = await fetch(`${apiUrl}/api/store/buy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, cosmeticId: item.id })
        });
        const data = await res.json();
        if (data.success) {
          toast.success(data.message);
          fetchOwnedItems();
          onUpdate();
        } else {
          toast.error(data.message);
        }
      } catch (e: any) {
        toast.error('Hata oluştu');
      }
    }
  };

  const handleEquip = async (item: CosmeticItem) => {
    try {
      const res = await fetch(`${apiUrl}/api/user/equip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, cosmeticId: item.id, type: item.type })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        onUpdate();
      } else {
        toast.error(data.message);
      }
    } catch (e: any) {
      toast.error('Hata oluştu');
    }
  };

  if (loading) return <div className="text-white text-center p-4">Yükleniyor...</div>;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
      <div className="bg-[#1e293b] p-6 rounded-xl border-2 border-yellow-500 w-full max-w-2xl text-white max-h-[90vh] overflow-y-auto relative shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl font-bold">×</button>
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-yellow-400 flex items-center gap-2">
            🛒 Mağaza
          </h2>
          <div className="bg-yellow-900/50 text-yellow-300 font-bold px-4 py-2 rounded-lg border border-yellow-500/50 flex items-center gap-2">
            💰 {sikke} Sikke
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {COSMETICS_CATALOG.filter(c => c.type === 'building').map(item => {
            const isOwned = item.id === 'default' || ownedIds.includes(item.id);
            const isEquipped = equippedBuilding === item.id;

            return (
              <div key={item.id} className={`p-4 rounded-lg border-2 flex flex-col justify-between ${isEquipped ? 'border-green-500 bg-green-900/20' : 'border-slate-600 bg-slate-800'}`}>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{item.name}</h3>
                  <p className="text-sm text-gray-300 mb-4">{item.description}</p>
                </div>
                
                <div className="flex justify-between items-center mt-4">
                  {!isOwned ? (
                    <div className="flex flex-col gap-2 w-full">
                      <span className="text-yellow-400 font-bold text-center">{item.price} Sikke</span>
                      <button 
                        onClick={() => handleBuy(item)}
                        disabled={sikke < item.price}
                        className={`w-full py-2 rounded font-bold ${sikke >= item.price ? 'bg-yellow-500 hover:bg-yellow-400 text-black' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}
                      >
                        Satın Al
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleEquip(item)}
                      disabled={isEquipped}
                      className={`w-full py-2 rounded font-bold ${isEquipped ? 'bg-green-600 text-white cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}
                    >
                      {isEquipped ? 'Kuşanıldı ✓' : 'Kuşan'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
