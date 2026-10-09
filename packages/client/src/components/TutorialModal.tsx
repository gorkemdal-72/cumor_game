import React, { useState, useEffect } from 'react';

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
    content: 'Sıra sana geldiğinde zarları atarsın (veya senin yerine otomatik atılır). Gelen sayıya sahip araziler, kenarında binası olan oyunculara kaynak üretir. Köy 1 kaynak, Şehir 2 kaynak üretir. Ayrıca CUMOR\'da kervan yolu (Yol Ticaret Geliri) mekaniği vardır!',
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
    content: 'Zarlar 7 geldiğinde kimse kaynak üretmez. Elinde 7 veya fazla kaynak olanlar, yarısını bankaya iade eder (Altınlar hariç). Zarı atan kişi Vergi Memuru piyonunu istediği araziye taşır, o arazi bloke olur ve bir oyuncudan rastgele kaynak çalar.',
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
    const hasSeen = localStorage.getItem('hasSeenCumorTutorial');
    if (!hasSeen) {
      setIsOpen(true);
    }

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

  const nextSlide = () => {
    if (currentSlide < tutorialSlides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      closeTutorial();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border-2 border-yellow-500/50 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        <div className="bg-slate-900 p-4 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-yellow-400">Nasıl Oynanır?</h2>
          <button onClick={closeTutorial} className="text-slate-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>
        
        <div className="p-6 flex-1 min-h-[250px] flex flex-col justify-center items-center text-center">
          <div className="text-5xl mb-4">{tutorialSlides[currentSlide].icon}</div>
          <h3 className="text-2xl font-bold text-white mb-3">{tutorialSlides[currentSlide].title}</h3>
          <p className="text-slate-300 text-lg leading-relaxed">
            {tutorialSlides[currentSlide].content}
          </p>
        </div>
        
        <div className="p-4 bg-slate-900 border-t border-slate-700 flex justify-between items-center">
          <div className="flex space-x-2">
            {tutorialSlides.map((_, idx) => (
              <div 
                key={idx} 
                className={`w-2 h-2 rounded-full ${idx === currentSlide ? 'bg-yellow-400' : 'bg-slate-600'}`}
              />
            ))}
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className="px-4 py-2 bg-slate-700 text-white rounded disabled:opacity-50 hover:bg-slate-600 transition-colors"
            >
              Geri
            </button>
            <button 
              onClick={nextSlide}
              className="px-4 py-2 bg-yellow-500 text-slate-900 font-bold rounded hover:bg-yellow-400 transition-colors"
            >
              {currentSlide === tutorialSlides.length - 1 ? 'Başla!' : 'İleri'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
