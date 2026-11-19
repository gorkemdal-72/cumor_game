export interface CosmeticItem {
  id: string;
  type: 'building' | 'avatar' | 'dice';
  name: string;
  description: string;
  price: number;
}

export const COSMETICS_CATALOG: CosmeticItem[] = [
  { id: 'default', type: 'building', name: 'Klasik (Varsayılan)', description: 'Oyunun orijinal köy ve şehir tasarımı.', price: 0 },
  { id: 'modern', type: 'building', name: 'Modern', description: 'Keskin hatlara sahip gökdelen görünümlü modern binalar.', price: 50 },
  { id: 'scifi', type: 'building', name: 'Sci-Fi', description: 'Gelecekten gelmiş gibi görünen kubbeli yaşam alanları.', price: 100 },
  // Çizimler: packages/client/src/components/BuildingShape.tsx (yeni tema = buraya kayıt + orada çizim)
  { id: 'winter', type: 'building', name: 'Kış', description: 'Karla kaplı çatılar ve buzdan yollar.', price: 80 },
  { id: 'medieval', type: 'building', name: 'Ortaçağ Kalesi', description: 'Taş kuleler, mazgallı surlar ve kale kapısı.', price: 120 },
  { id: 'ottoman', type: 'building', name: 'Osmanlı', description: 'Ahşap köşk köyler, kubbe ve minareli şehirler.', price: 150 },
  { id: 'asian', type: 'building', name: 'Uzak Doğu', description: 'Kıvrık çatılı pagodalar ve kırmızı ahşap yollar.', price: 150 },

  // AVATARLAR: arka plan oyunda seçilen renk olur. Çizimler: packages/client/src/components/Avatar.tsx
  { id: 'default', type: 'avatar', name: 'Gezgin (Varsayılan)', description: 'Sade kıyafetli yolcu.', price: 0 },
  { id: 'avatar_modern', type: 'avatar', name: 'Mimar', description: 'Baret ve kravatıyla şantiyeden geldi.', price: 50 },
  { id: 'avatar_scifi', type: 'avatar', name: 'Astronot', description: 'Uzay kaskıyla yıldızlardan iniş.', price: 100 },
  { id: 'avatar_winter', type: 'avatar', name: 'Kutup Kâşifi', description: 'Kürklü kapşonuyla soğuğa meydan okur.', price: 80 },
  { id: 'avatar_medieval', type: 'avatar', name: 'Şövalye', description: 'Tüylü miğfer ve haçlı zırh.', price: 120 },
  { id: 'avatar_ottoman', type: 'avatar', name: 'Yeniçeri', description: 'Uzun börkü ve kaftanıyla ocağın neferi.', price: 150 },
  { id: 'avatar_asian', type: 'avatar', name: 'Samuray', description: 'Altın boynuzlu kabuto miğferi.', price: 150 },
];
