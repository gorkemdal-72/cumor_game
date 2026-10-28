import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';

const tutorialSlides = [
  {
    title: 'CUMOR: İnşa Et, Kazan!',
    content: 'CUMOR adasına hoş geldin! Amacın, adaya hükmeden en saygın ve güçlü lider olmak. 10 Zafer Puanına (VP) ulaşan ilk oyuncu oyunu kazanır!',
    icon: '👑'
  },
  {
    title: 'Kaynaklar',
    content: 'Oyunda 5 temel fiziksel kaynak (Gıda, Kereste, Beton, Tekstil, Elmas) ve likit sermaye olan Altın bulunur. Kaynakları topla, ticaret yap ve geliş!',
    icon: '🌾🪵🧱🧵💎💰'
  },
  {
    title: 'Oyuna Hazırlık',
    content: 'Kurulum yılan (snake draft) sistemine göre yapılır. Herkes sırayla 1 köy ve 1 yol kurar, sonra sondan başa doğru 2. köy ve yollar kurulur. İkinci köyünün etrafındaki kaynaklar senin başlangıç ganimetin olur!',
    icon: '🗺️'
  },
  {
    title: 'Tur Akışı',
    content: 'Sıra sana geldiğinde zarları atarsın. Gelen sayıya sahip araziler, kenarında binası olan oyunculara kaynak üretir. Köy 1 kaynak, Şehir 2 kaynak üretir. Ayrıca CUMOR\'da kervan yolu (Yol Ticaret Geliri) mekaniği vardır!',
    icon: '🎲'
  },
  {
    title: 'İnşaat ve Gelişim',
    content: 'Topladığın kaynaklarla Yol (1 Kereste+1 Beton), Köy (1 Kereste+1 Beton+1 Gıda+1 Tekstil), Şehir (2 Gıda+3 Elmas) inşa edebilir veya Gelişim Kartı alabilirsin. Unutma: Mesafe kuralına göre iki bina yan yana kurulamaz, arada en az 2 yol (1 boşluk) olmalı!',
    icon: '🏗️'
  },
  {
    title: 'Ticaret ve Karaborsa',
    content: 'Oyuncular arası takas serbesttir. Bankayla ticarette ise "İhracat" (bankaya satış) yapabilirsin. İhtiyacın olanı "Karaborsa"dan alırken, o kaynağın arazisinde şehrin/köyün olup olmamasına göre konum vergisi ödersin!',
    icon: '⚖️'
  },
  {
    title: 'Ekonomik Liderlik',
    content: 'Kasasında sürekli 33 Altın veya fazlasını bulunduran kişi "Ekonomik Lider" olur ve +1 VP kazanır. Ayrıca 33 Altın ödeyerek doğrudan kalıcı 1 VP satın alabilirsin (oyun boyu en fazla 2 kez).',
    icon: '📈'
  },
  {
    title: '7 Zarı ve Vergi Memuru',
    content: 'Zarlar 7 geldiğinde kimse kaynak üretmez. Elinde 7\'den fazla kaynak olanlar, yarısını bankaya iade eder (Altınlar hariç). Zarı atan kişi Vergi Memuru piyonunu istediği araziye taşır, o arazi bloke olur ve bir oyuncudan rastgele kaynak çalar.',
    icon: '🥷'
  },
  {
    title: 'Gelişim Kartları (Sürpriz)',
    content: '1 Tekstil + 1 Gıda + 1 Elmas ile alınır. Aynı tur oynanamaz. Vergi Memuru (Memuru taşı), Sabotaj (Yol yık), Kartel (Rakip üretimi durdur), Sigorta (Sabotajı engelle), Mühendis (2 bedava yol), Tüccar (3 bedava kaynak) ve Mercator kartlarıyla sürpriz taktikler yapabilirsin!',
    icon: '🃏'
  },
  {
    title: 'Özel Ünvanlar',
    content: 'Kesintisiz en az 5 yol yapan "En Uzun Yol" (+2 VP), en az 3 Vergi Memuru kartı açan "Vergi Rekortmeni / En Güçlü Ordu" (+2 VP) ünvanını alır.',
    icon: '⚔️'
  }
];

export const TutorialModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem('hasSeenCumorTutorial')) setIsOpen(true);

    const handleOpenTutorial = () => {
      setCurrentSlide(0);
      setIsOpen(true);
    };
    window.addEventListener('openCumorTutorial', handleOpenTutorial);
    return () => window.removeEventListener('openCumorTutorial', handleOpenTutorial);
  }, []);

  const closeTutorial = () => {
    localStorage.setItem('hasSeenCumorTutorial', 'true');
    setIsOpen(false);
  };

  const isLast = currentSlide === tutorialSlides.length - 1;
  const nextSlide = () => (isLast ? closeTutorial() : setCurrentSlide(currentSlide + 1));
  const prevSlide = () => setCurrentSlide(Math.max(0, currentSlide - 1));

  // Klavye: sağ/sol ok ile slayt değiştir (Esc Modal içinde)
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!isOpen) return null;
  const slide = tutorialSlides[currentSlide];

  return (
    <Modal
      title="Nasıl Oynanır?"
      onClose={closeTutorial}
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-label={`Slayt ${currentSlide + 1} / ${tutorialSlides.length}`}>
            {tutorialSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                aria-label={`${idx + 1}. slayt`}
                className={`h-2 rounded-full transition-all ${idx === currentSlide ? 'w-5 bg-amber-400' : 'w-2 bg-slate-600 hover:bg-slate-500'}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={prevSlide} disabled={currentSlide === 0} className="btn btn-secondary">Geri</button>
            <button onClick={nextSlide} className="btn btn-primary">{isLast ? 'Başla!' : 'İleri'}</button>
          </div>
        </div>
      }
    >
      <div className="min-h-[220px] flex flex-col items-center justify-center text-center">
        <div className="text-5xl mb-4" aria-hidden>{slide.icon}</div>
        <h3 className="text-2xl font-bold text-white mb-3">{slide.title}</h3>
        <p className="text-slate-300 leading-relaxed">{slide.content}</p>
        <p className="text-xs text-slate-500 mt-4">{currentSlide + 1} / {tutorialSlides.length}</p>
      </div>
    </Modal>
  );
};
