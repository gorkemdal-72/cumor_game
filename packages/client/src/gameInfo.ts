// OYUN BİLGİLERİ: kart açıklamaları, kaynaklar ve SSS tek yerde (sunucu kurallarıyla birebir; RoomManager.ts'i değiştirirsen burayı da güncelle)
import { DevCardType, ResourceType } from '@cumor/shared';

export const RESOURCE_INFO: Record<ResourceType, { icon: string; name: string; source: string }> = {
  [ResourceType.LUMBER]: { icon: '🌲', name: 'Kereste', source: 'Orman arazilerinden gelir' },
  [ResourceType.CONCRETE]: { icon: '🧱', name: 'Beton', source: 'Tepe (kiremit rengi) arazilerinden gelir' },
  [ResourceType.TEXTILE]: { icon: '🐑', name: 'Tekstil', source: 'Mera (açık yeşil) arazilerinden gelir' },
  [ResourceType.FOOD]: { icon: '🌾', name: 'Gıda', source: 'Tarla (sarı) arazilerinden gelir' },
  [ResourceType.DIAMOND]: { icon: '💎', name: 'Elmas', source: 'Dağ (gri) arazilerinden gelir' },
  [ResourceType.GOLD]: { icon: '💰', name: 'Altın', source: 'Satış, yol geliri ve başlangıç parasıyla gelir. 33+ Altın = +1 VP (Ekonomik Lider)' },
};

export const CARD_INFO: Record<DevCardType, { icon: string; name: string; desc: string; playable: boolean }> = {
  [DevCardType.MERCENARY]: { icon: '💼', name: 'Vergi Memuru', playable: true, desc: 'Vergi Memurunu istediğin araziye taşı (o arazi üretmez) ve oradaki bir rakipten kaynak al. 3 memur açan ilk oyuncu "Vergi Rekortmeni" olur: +2 VP.' },
  [DevCardType.SABOTAGE]: { icon: '💣', name: 'Sabotaj', playable: true, desc: 'Bir rakip yolunu yık, yerinde enkaz kalır. Rakibin Yol Sigortası varsa sabotaj engellenir ve kartın boşa gider.' },
  [DevCardType.CARTEL]: { icon: '🏢', name: 'Kartel', playable: true, desc: 'Sıra tekrar sana gelene kadar sadece senin binaların üretir; rakipler zarlardan hiçbir şey alamaz ve yol altını dağıtılmaz.' },
  [DevCardType.INSURANCE]: { icon: '🛡️', name: 'Yol Sigortası', playable: false, desc: 'Elinde durur, oynanmaz. Biri yoluna sabotaj yaparsa otomatik devreye girer ve yolunu korur (kart harcanır).' },
  [DevCardType.VICTORY_POINT]: { icon: '🏆', name: 'Zafer Puanı', playable: false, desc: 'Oynanmaz. Elinde durduğu sürece otomatik olarak +1 VP sayılır.' },
  [DevCardType.ENGINEER]: { icon: '🛣️', name: 'Mühendis', playable: true, desc: 'Hemen 2 yolu ücretsiz inşa et.' },
  [DevCardType.TRADER]: { icon: '📦', name: 'Tüccar', playable: true, desc: 'Bankadan istediğin 3 kaynağı (Altın hariç) bedava seç.' },
  [DevCardType.MERCATOR]: { icon: '🌍', name: 'Mercator', playable: true, desc: 'Bir kaynak türü seç: her rakipten o kaynaktan en fazla 2 tane al. Rakipte 1 varsa 1 kaynak + 1 Altın, hiç yoksa 2 Altın alırsın.' },
};

export const FAQ: { q: string; a: string[] }[] = [
  {
    q: 'Turum nasıl işler?',
    a: [
      '1. Zar at. Gelen sayının yazdığı araziler, köşesinde binası olanlara kaynak verir (köy 1, şehir 2).',
      '2. İnşa et, ticaret yap veya gelişim kartı oyna (sırası önemli değil).',
      '3. "Turu Bitir" ile sırayı sonraki oyuncuya ver.',
      'Bu tur aldığın gelişim kartını ancak bir sonraki turunda oynayabilirsin.',
    ],
  },
  {
    q: 'Ne inşa edebilirim, maliyeti ne?',
    a: [
      '🛣️ Yol: 1 Beton + 1 Kereste (en fazla 15)',
      '🏠 Köy: 1 Beton + 1 Kereste + 1 Tekstil + 1 Gıda — +1 VP (en fazla 5)',
      '🏰 Şehir (köyü yükseltir): 2 Gıda + 3 Elmas — +2 VP, çift üretim (en fazla 4)',
      '🃏 Gelişim kartı: 1 Elmas + 1 Tekstil + 1 Gıda',
    ],
  },
  {
    q: 'Neden buraya köy kuramıyorum?',
    a: [
      'Köy kendi yolunun ucuna kurulmalı (kurulum turları hariç).',
      'İki bina arasında en az bir boş köşe olmalı (mesafe kuralı).',
      'Yol, rakibin köyünün/şehrinin üzerinden devam edemez.',
    ],
  },
  {
    q: 'Kaynaklar nereden gelir?',
    a: [
      '🌲 Orman → Kereste, 🧱 Tepe → Beton, 🐑 Mera → Tekstil, 🌾 Tarla → Gıda, 💎 Dağ → Elmas. Çöl üretmez.',
      '💰 Yol geliri: Zar gelen arazinin kenarında yolun var ama binan yoksa 3 Altın alırsın.',
      'Vergi Memurunun durduğu arazi üretmez.',
    ],
  },
  {
    q: 'Zafer puanı (VP) nasıl kazanılır?',
    a: [
      'Köy +1, Şehir +2, Zafer Puanı kartı +1.',
      'En Uzun Yol (kesintisiz 5+ yol): +2 · Vergi Rekortmeni (3+ memur kartı): +2',
      'Ekonomik Lider (kasada 33+ Altın): +1 · 33 Altın ödeyip VP satın alma: +1 (en fazla 2 kez)',
      '10 VP\'ye ulaşıp turunu bitiren oyuncu kazanır.',
    ],
  },
  {
    q: '7 gelirse ne olur?',
    a: [
      'Kimse kaynak üretmez.',
      'Elinde 7\'den fazla kaynak (Altın hariç) olan herkes yarısını rastgele kaybeder.',
      '20+ Altını olan, altınının yarısını kaybeder.',
      'Zarı atan Vergi Memurunu taşır ve o arazideki bir rakipten 1 kaynak (kaynağı yoksa 2 Altın) alır.',
    ],
  },
  {
    q: 'Ticaret nasıl yapılır?',
    a: [
      'İhracat (bankaya sat): Gıda/Kereste 1, Beton/Tekstil 2, Elmas 3 Altın.',
      'Karaborsa (bankadan al): satış fiyatı × 2 + konum vergisi. Vergi: o arazide şehrin varsa +0, köyün +1, sadece yolun +2, hiçbir şeyin yoksa +3.',
      'Oyuncularla takas: teklif oluştur, kabul edenlerden birini seçip takası tamamla.',
      'Banka işlemleri için önce zar atmış olmalısın.',
    ],
  },
  {
    q: 'Yıkılan yol (enkaz) ne olur?',
    a: [
      'Enkaza tıklayarak yolu yeniden yapabilirsin.',
      'Eski sahibi: 1 Kereste. Başka bir oyuncu: 1 Kereste + 1 Beton + 2 Altın (yol onun olur).',
    ],
  },
  {
    q: 'Bir oyuncu oyundan düşerse ne olur?',
    a: [
      'Sırası atlanmaz, oyun onu bekler.',
      'Bağlı oyuncular oylama yapar: çoğunluk "Oyunu bitir" derse oyun biter ve en yüksek puanlı oyuncu kazanır.',
      'Düşen oyuncu 5 dakika içinde dönmezse oyun aynı şekilde otomatik biter. Dönerse oylama iptal olur.',
    ],
  },
];
