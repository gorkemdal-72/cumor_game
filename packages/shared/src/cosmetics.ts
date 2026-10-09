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
];
